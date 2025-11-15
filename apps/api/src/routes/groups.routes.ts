import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { authSession } from '../middlewares/authSession';
import { authBearer } from '../middlewares/authBearer';
import { inviteViaBot } from '../services/bots/index';
import { getVerification } from '../services/verification';
import { setInvite, getInvite } from '../services/invites';
import { v4 as uuidv4 } from 'uuid';

interface Group {
  id: string;
  name: string;
  platform: string;
  organizerId: string;
  ownershipVerified: boolean;
  policy: {
    allowedDomains: string[];
    validDays: number;
    requireReverifyOnTerm: boolean;
  };
  joinMethod: 'invite_qr' | 'auto';
  admins: Record<string, 'organizer' | 'doorkeeper'>;
}

const groups: Record<string, Group> = {};
const ownershipChallenges: Record<string, { code: string; expiresAt: number }> = {};

export function registerGroupRoutes(app: FastifyInstance) {
  /**
   * POST /groups
   * Create a new group.
   */
  app.post('/groups', { preHandler: [authSession] }, async (request: FastifyRequest, reply: FastifyReply) => {
    const body = request.body as any;
    const user = (request as any).user;
    const id = uuidv4();
    groups[id] = {
      id,
      name: body?.name || 'Unnamed Group',
      platform: body?.platform || 'wechat',
      organizerId: user.id,
      ownershipVerified: false,
      policy: {
        allowedDomains: (process.env.ALLOWED_DOMAINS || '*.edu').split(',').map((d) => d.trim()),
        validDays: parseInt(process.env.VERIFY_TERM_DAYS || '120', 10),
        requireReverifyOnTerm: true
      },
      joinMethod: 'invite_qr',
      admins: { [user.id]: 'organizer' }
    };
    reply.send({ id });
  });

  /**
   * POST /groups/:id/ownership/start
   * Initiate an ownership challenge by generating a six‑digit code.
   */
  app.post('/groups/:id/ownership/start', { preHandler: [authSession] }, async (request: FastifyRequest, reply: FastifyReply) => {
    const groupId = request.params['id'] as string;
    const group = groups[groupId];
    const user = (request as any).user;
    if (!group || group.organizerId !== user.id) {
      reply.code(403).send({ error: 'Not authorized' });
      return;
    }
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    ownershipChallenges[groupId] = { code, expiresAt: Date.now() + 15 * 60 * 1000 };
    reply.send({ code, instructions: 'Change the group name to include this code or post it in the group chat and then call /ownership/confirm' });
  });

  /**
   * POST /groups/:id/ownership/confirm
   * Confirm the ownership challenge by providing the code.
   */
  app.post('/groups/:id/ownership/confirm', { preHandler: [authSession] }, async (request: FastifyRequest, reply: FastifyReply) => {
    const groupId = request.params['id'] as string;
    const group = groups[groupId];
    const user = (request as any).user;
    if (!group || group.organizerId !== user.id) {
      reply.code(403).send({ error: 'Not authorized' });
      return;
    }
    const body = request.body as any;
    const challenge = ownershipChallenges[groupId];
    if (!challenge || challenge.expiresAt < Date.now()) {
      reply.code(400).send({ error: 'No active challenge or expired' });
      return;
    }
    if (body?.code !== challenge.code) {
      reply.code(400).send({ error: 'Incorrect code' });
      return;
    }
    group.ownershipVerified = true;
    delete ownershipChallenges[groupId];
    reply.send({ ok: true });
  });

  /**
   * POST /groups/:id/policy
   * Update a group’s verification policy.
   */
  app.post('/groups/:id/policy', { preHandler: [authSession] }, async (request: FastifyRequest, reply: FastifyReply) => {
    const groupId = request.params['id'] as string;
    const group = groups[groupId];
    const user = (request as any).user;
    if (!group || group.organizerId !== user.id) {
      reply.code(403).send({ error: 'Not authorized' });
      return;
    }
    const body = request.body as any;
    if (body?.allowedDomains) {
      group.policy.allowedDomains = body.allowedDomains;
    }
    if (body?.validDays) {
      group.policy.validDays = body.validDays;
    }
    if (typeof body?.requireReverifyOnTerm === 'boolean') {
      group.policy.requireReverifyOnTerm = body.requireReverifyOnTerm;
    }
    reply.send({ ok: true });
  });

  /**
   * POST /groups/:id/invite
   * Upload or refresh an invite for a group.
   */
  app.post('/groups/:id/invite', { preHandler: [authSession] }, async (request: FastifyRequest, reply: FastifyReply) => {
    const groupId = request.params['id'] as string;
    const group = groups[groupId];
    const user = (request as any).user;
    if (!group || group.organizerId !== user.id) {
      reply.code(403).send({ error: 'Not authorized' });
      return;
    }
    const body = request.body as any;
    const inviteUrl = body?.inviteUrl;
    const qrMediaId = body?.qrMediaId;
    const expiresAt = body?.expiresAt ? new Date(body.expiresAt).getTime() : undefined;
    setInvite(groupId, inviteUrl, qrMediaId, expiresAt);
    reply.send({ ok: true });
  });

  /**
   * GET /groups/:id/invite
   * Fetch the current invite for a group. Requires a valid verification token
   * (audience miniapp:groups) in the Authorization header.
   */
  app.get('/groups/:id/invite', { preHandler: [authBearer('miniapp:groups')] }, async (request: FastifyRequest, reply: FastifyReply) => {
    const groupId = request.params['id'] as string;
    const group = groups[groupId];
    if (!group) {
      reply.code(404).send({ error: 'Group not found' });
      return;
    }
    // Ensure user is verified on server side.
    const tokenPayload = (request as any).tokenPayload;
    const userId = tokenPayload.sub;
    const verification = getVerification(userId);
    if (!verification) {
      reply.code(403).send({ error: 'Not verified' });
      return;
    }
    const invite = getInvite(groupId);
    if (!invite || !invite.inviteUrl) {
      reply.code(410).send({ error: 'Invite not available' });
      return;
    }
    reply.send({ invite_url: invite.inviteUrl, qr_media_id: invite.qrMediaId, expires_at: invite.expiresAt ? new Date(invite.expiresAt).toISOString() : undefined });
  });

  /**
   * POST /groups/:id/join
   * Attempt to join a group via bot auto‑admission. Requires verification token.
   */
  app.post('/groups/:id/join', { preHandler: [authBearer('miniapp:groups')] }, async (request: FastifyRequest, reply: FastifyReply) => {
    const groupId = request.params['id'] as string;
    const group = groups[groupId];
    if (!group) {
      reply.code(404).send({ error: 'Group not found' });
      return;
    }
    // Ensure user is verified.
    const tokenPayload = (request as any).tokenPayload;
    const userId = tokenPayload.sub;
    const vRec = getVerification(userId);
    if (!vRec) {
      reply.code(403).send({ error: 'Not verified' });
      return;
    }
    if (group.joinMethod !== 'auto') {
      reply.code(400).send({ error: 'This group does not support auto admission' });
      return;
    }
    // Attempt to invite via bot.
    const res = await inviteViaBot(groupId, userId);
    if (res.ok) {
      reply.send({ status: 'invited' });
    } else {
      reply.code(500).send({ error: 'Bot invitation failed', detail: res.detail });
    }
  });

  /**
   * POST /groups/:id/admins
   * Add a doorkeeper to the group. Only the organizer can do this.
   */
  app.post('/groups/:id/admins', { preHandler: [authSession] }, async (request: FastifyRequest, reply: FastifyReply) => {
    const groupId = request.params['id'] as string;
    const group = groups[groupId];
    const user = (request as any).user;
    if (!group || group.organizerId !== user.id) {
      reply.code(403).send({ error: 'Not authorized' });
      return;
    }
    const body = request.body as any;
    const adminUserId = body?.userId;
    const role: 'doorkeeper' | 'organizer' = body?.role || 'doorkeeper';
    if (!adminUserId) {
      reply.code(400).send({ error: 'Missing userId' });
      return;
    }
    group.admins[adminUserId] = role;
    reply.send({ ok: true });
  });
}