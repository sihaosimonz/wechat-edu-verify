import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { authDoorkeeper } from '../middlewares/authDoorkeeper';
import { verifyToken } from '../services/jwt';
import { getVerification } from '../services/verification';

/**
 * Register moderation routes for doorkeepers. These routes allow moderators to
 * verify a user’s status using a QR token or by manual lookup. Responses
 * never reveal the full email and include only minimal information.
 */
export function registerModerationRoutes(app: FastifyInstance) {
  /**
   * POST /moderation/verify-scan
   * Verify a user using a short‑lived token. Returns whether the user is verified,
   * the expiry time, and a masked email domain.
   */
  app.post('/moderation/verify-scan', { preHandler: [authDoorkeeper] }, async (request: FastifyRequest, reply: FastifyReply) => {
    const body = request.body as any;
    const token = body?.token;
    if (!token) {
      reply.code(400).send({ error: 'Missing token' });
      return;
    }
    try {
      const payload = verifyToken(token, 'miniapp:groups');
      const rec = getVerification(payload.sub);
      if (!rec) {
        reply.send({ ok: false });
        return;
      }
      // Mask email domain by showing only the domain part.
      const domain = rec.domain;
      reply.send({ ok: true, valid_until: new Date(rec.validUntil).toISOString(), email_domain: domain });
    } catch (e) {
      reply.code(400).send({ ok: false });
    }
  });

  /**
   * POST /moderation/lookup
   * Manually look up a user by userId and return minimal verification info. In a real
   * implementation, the userId would be resolved from a handle or temporary code.
   */
  app.post('/moderation/lookup', { preHandler: [authDoorkeeper] }, async (request: FastifyRequest, reply: FastifyReply) => {
    const body = request.body as any;
    const userId = body?.userId;
    if (!userId) {
      reply.code(400).send({ error: 'Missing userId' });
      return;
    }
    const rec = getVerification(userId);
    if (!rec) {
      reply.send({ ok: false });
      return;
    }
    reply.send({ ok: true, valid_until: new Date(rec.validUntil).toISOString(), email_domain: rec.domain });
  });
}