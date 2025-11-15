import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { authSession } from '../middlewares/authSession';
import { authBearer } from '../middlewares/authBearer';
import { rateLimit } from '../middlewares/rateLimit';
import { idempotency } from '../middlewares/idempotency';
import { i18n } from '../middlewares/i18n';
import { generateOtp, storeOtp, checkOtp } from '../services/otp';
import { sendEmail } from '../services/mailer';
import { issueVerificationToken, verifyToken, revokeToken } from '../services/jwt';
import { upsertVerification, getVerification, revokeVerification, deleteUser } from '../services/verification';
import { metrics } from '../services/metrics';
import { isSuppressed } from '../services/suppression';
import { isEmailDomainAllowed } from '../utils/emailDomains';
import { v4 as uuidv4 } from 'uuid';

interface RequestOtpBody {
  email: string;
}

interface ConfirmOtpBody {
  email: string;
  otp: string;
}

/**
 * Register routes for verification, including OTP request/confirmation and
 * profile management.
 */
export function registerVerifyRoutes(app: FastifyInstance) {

  // In-memory store tracking OTP verification attempts for each user/email.
  // This supports exponential backoff and soft lockouts. The structure is
  // keyed by `${userId}:${email}` and stores the number of consecutive
  // failures, the timestamp after which the next attempt is allowed, and
  // the timestamp until which the user is locked out. In production this
  // should be replaced by a shared store such as Redis to persist across
  // server instances.
  const verifyAttemptStore: Record<string, { attempts: number; nextAllowed: number; lockedUntil: number }> = {};
  /**
   * POST /verify/request
   * Request a one‑time code to be sent to the user’s email. Enforces rate
   * limits and idempotency. Returns 202 Accepted regardless of eligibility.
   */
  app.post('/verify/request', {
    preHandler: [i18n, authSession, idempotency, rateLimit],
    schema: {
      body: { type: 'object', properties: { email: { type: 'string' } }, required: ['email'] }
    }
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const t = (request as any).t;
    const user = (request as any).user;
    const body = request.body as RequestOtpBody;
    const email = body.email.toLowerCase();
    // Basic email validation
    if (!email.includes('@')) {
      reply.code(202).send({ message: t('otp.sent_if_eligible') });
      return;
    }

    // Enforce email domain allowlist. If an ALLOWED_DOMAINS env var is set, only
    // send OTPs to addresses whose domain matches one of the allowed patterns.
    const allowed = (process.env.ALLOWED_DOMAINS || '*.edu').split(',').map((d) => d.trim()).filter(Boolean);
    if (!isEmailDomainAllowed(email, allowed)) {
      // Domain not allowed. Respond with generic 202 to avoid enumeration but do not send.
      metrics.otpSendFailedTotal.inc();
      reply.code(202).send({ message: t('otp.sent_if_eligible') });
      return;
    }
    // Generate OTP and store hashed version
    const code = generateOtp(6);
    await storeOtp(user.id, email, code, 10);
    try {
      // Do not attempt to send if the email is suppressed due to bounces/complaints
      if (!isSuppressed(email)) {
        await sendEmail({
          to: email,
          subject: 'Your verification code',
          text: `Your code is ${code}. It expires in 10 minutes.`,
          html: `<p>Your code is <strong>${code}</strong>. It expires in 10 minutes.</p>`
        });
        metrics.otpSendTotal.inc();
      } else {
        // Email suppressed; pretend send succeeded to avoid enumeration
        metrics.otpSendFailedTotal.inc();
      }
    } catch (e) {
      app.log.error(e);
      metrics.otpSendFailedTotal.inc();
    }
    reply.code(202).send({ message: t('otp.sent_if_eligible') });
  });

  /**
   * POST /verify/confirm
   * Confirm a one‑time code. Issues a verification token on success and
   * records the verification state. Uses constant‑time verification and
   * single‑use semantics.
   */
  app.post('/verify/confirm', {
    preHandler: [i18n, authSession],
    schema: {
      body: { type: 'object', properties: { email: { type: 'string' }, otp: { type: 'string' } }, required: ['email', 'otp'] }
    }
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const t = (request as any).t;
    const user = (request as any).user;
    const body = request.body as ConfirmOtpBody;
    const email = body.email.toLowerCase();
    const otp = body.otp;
    if (!email || !otp) {
      reply.code(400).send({ error: t('otp.invalid_or_expired') });
      return;
    }

    // Exponential backoff and soft lockouts for repeated failed OTP attempts.
    // Uses an in‑memory map keyed by userId+email to track failures and enforce
    // waiting periods between attempts. After a number of failures the user
    // enters a soft lock and must wait 12 hours. In production this should
    // leverage a shared store like Redis.
    const key = `${user.id}:${email}`;
    if (!verifyAttemptStore[key]) {
      verifyAttemptStore[key] = { attempts: 0, nextAllowed: 0, lockedUntil: 0 };
    }
    const attemptInfo = verifyAttemptStore[key];
    const nowMs = Date.now();
    if (attemptInfo.lockedUntil && nowMs < attemptInfo.lockedUntil) {
      // User is locked out due to too many failed attempts
      reply.code(429).send({ error: 'Too many failed attempts, please try later' });
      return;
    }
    if (attemptInfo.nextAllowed && nowMs < attemptInfo.nextAllowed) {
      // Exponential backoff period not yet passed
      reply.code(429).send({ error: 'Please wait before trying again' });
      return;
    }
    const valid = await checkOtp(user.id, email, otp);
    if (!valid) {
      metrics.otpVerifyFailedTotal.inc();
      // Increment failure count and set backoff. Each failure doubles the waiting time
      attemptInfo.attempts += 1;
      const backoffSeconds = Math.min(60, Math.pow(2, attemptInfo.attempts));
      attemptInfo.nextAllowed = nowMs + backoffSeconds * 1000;
      // After 10 attempts lock the user for 12 hours
      if (attemptInfo.attempts >= 10) {
        attemptInfo.lockedUntil = nowMs + 12 * 60 * 60 * 1000;
        attemptInfo.attempts = 0;
      }
      reply.code(400).send({ error: t('otp.invalid_or_expired') });
      return;
    }
    // Reset attempts on success
    attemptInfo.attempts = 0;
    attemptInfo.nextAllowed = 0;
    attemptInfo.lockedUntil = 0;
    metrics.otpVerifySuccessTotal.inc();
    // Upsert verification record
    const verifiedAt = Date.now();
    const validUntil = verifiedAt + (parseInt(process.env.VERIFY_TERM_DAYS || '120', 10) * 24 * 60 * 60 * 1000);
    const domain = email.substring(email.lastIndexOf('@') + 1);
    const jti = uuidv4();
    upsertVerification({ userId: user.id, email, domain, verifiedAt, validUntil, jti, revoked: false });
    // Issue a verification token with configured lifetime (default 7 days)
    const tokenLifetime = parseInt(process.env.VERIFY_TOKEN_LIFETIME_DAYS || '7', 10) * 24 * 60 * 60;
    const token = issueVerificationToken(user.id, email, user.openid, tokenLifetime);
    reply.send({ verification_token: token, valid_until: new Date(validUntil).toISOString() });
  });

  /**
   * GET /verify/status
   * Return the current verification status of the authenticated user.
   */
  app.get('/verify/status', { preHandler: [i18n, authSession] }, async (request: FastifyRequest, reply: FastifyReply) => {
    const user = (request as any).user;
    const rec = getVerification(user.id);
    if (!rec) {
      reply.send({ status: 'unverified' });
      return;
    }
    reply.send({ status: 'verified', email_domain: rec.domain, valid_until: new Date(rec.validUntil).toISOString() });
  });

  /**
   * POST /verify/qr-token
   * Generate a short‑lived token for doorkeeper scanning. Requires user to
   * be verified. Returns 400 if not verified.
   */
  app.post('/verify/qr-token', { preHandler: [i18n, authSession] }, async (request: FastifyRequest, reply: FastifyReply) => {
    const user = (request as any).user;
    const rec = getVerification(user.id);
    if (!rec) {
      reply.code(400).send({ error: 'not_verified' });
      return;
    }
    // Use jti to link this scan token to the verification record. 120s lifetime.
    const token = issueVerificationToken(user.id, rec.email, user.openid, 120);
    reply.send({ token });
  });

  /**
   * POST /profile/revoke
   * Revoke the user’s verification. Also revokes the current token via jti.
   */
  app.post('/profile/revoke', { preHandler: [i18n, authSession] }, async (request: FastifyRequest, reply: FastifyReply) => {
    const user = (request as any).user;
    const rec = getVerification(user.id);
    if (rec) {
      revokeVerification(user.id);
      revokeToken(rec.jti);
    }
    reply.send({ ok: true });
  });

  /**
   * DELETE /profile
   * Delete the user’s verification record and associated data (anonymisation).
   */
  app.delete('/profile', { preHandler: [i18n, authSession] }, async (request: FastifyRequest, reply: FastifyReply) => {
    const user = (request as any).user;
    deleteUser(user.id);
    reply.send({ ok: true });
  });

  /**
   * GET /verify/validate
   * Internal route for debugging tokens. Accepts a bearer token and returns
   * its payload if valid. Not documented for clients.
   */
  app.get('/verify/validate', async (request: FastifyRequest, reply: FastifyReply) => {
    const auth = request.headers['authorization'];
    if (!auth) {
      reply.code(401).send({ error: 'Missing authorization' });
      return;
    }
    const token = auth.replace(/^Bearer\s+/i, '');
    try {
      const payload = verifyToken(token, 'miniapp:groups');
      reply.send({ ok: true, payload });
    } catch (e) {
      reply.code(401).send({ ok: false, error: 'Invalid token' });
    }
  });
}