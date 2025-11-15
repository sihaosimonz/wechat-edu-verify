import { FastifyRequest, FastifyReply } from 'fastify';

/**
 * Idempotency middleware for the OTP request endpoint. Ensures that repeated
 * requests with the same idempotency key from the same user/email within a
 * short window return a 202 Accepted response without sending another email.
 */

interface IdemRecord {
  expiresAt: number;
}

const idemStore: Record<string, IdemRecord> = {};

export async function idempotency(request: FastifyRequest, reply: FastifyReply) {
  const key = request.headers['idempotency-key'] as string | undefined;
  if (!key) {
    return;
  }
  const user = (request as any).user;
  const body = request.body as any;
  const email = body?.email?.toLowerCase() || 'unknown';
  const openid = user?.openid || 'anon';
  const cacheKey = `${openid}:${email}:${key}`;
  const now = Date.now();
  const rec = idemStore[cacheKey];
  if (rec && rec.expiresAt > now) {
    // Duplicate detected: respond 202 and short-circuit.
    reply.code(202).send({ message: 'If eligible, you will receive a code via email.' });
    throw new Error('Idempotent repeat');
  }
  // Store new idempotency record with 60s TTL.
  idemStore[cacheKey] = { expiresAt: now + 60 * 1000 };
}