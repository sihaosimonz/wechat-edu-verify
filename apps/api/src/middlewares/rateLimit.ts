import { FastifyRequest, FastifyReply } from 'fastify';
import { metrics } from '../services/metrics';

/**
 * Rate limiting middleware implementing per‑email, per‑openid, and per‑IP request budgets.
 * All counters reset every hour. A resend timer enforces a minimum interval between requests
 * to the same email by the same user.
 *
 * In production this should be backed by a distributed key/value store (e.g. Redis) to
 * support multiple server instances and persistence across restarts.
 */

interface Counter {
  count: number;
  expiresAt: number;
}

// In‑memory counters keyed by type.
const emailCounters: Record<string, Counter> = {};
const openidCounters: Record<string, Counter> = {};
const ipCounters: Record<string, Counter> = {};
const resendTimers: Record<string, number> = {};

const RATE_LIMITS = {
  reqPerEmailHour: 3,
  reqPerOpenIdHour: 5,
  reqPerIpHour: 20,
  resendMinIntervalSec: 60
};

function incrementMap(map: Record<string, Counter>, key: string, limit: number): boolean {
  const now = Date.now();
  const rec = map[key];
  if (!rec || rec.expiresAt < now) {
    map[key] = { count: 1, expiresAt: now + 60 * 60 * 1000 };
    return true;
  }
  rec.count += 1;
  return rec.count <= limit;
}

export async function rateLimit(request: FastifyRequest, reply: FastifyReply) {
  const user = (request as any).user;
  const body = request.body as any;
  const email: string | undefined = body?.email?.toLowerCase();
  const openid: string | undefined = user?.openid;
  const ip: string | undefined = request.ip;

  // Check counters for email, openid, ip.
  if (email) {
    const ok = incrementMap(emailCounters, email, RATE_LIMITS.reqPerEmailHour);
    if (!ok) {
      // Increment metrics for rate limit hits
      metrics.rateLimitHitsTotal.inc();
      reply.code(429).send({ error: 'Too many requests for this email' });
      throw new Error('Email rate limit exceeded');
    }
    const resendKey = `${openid || ''}:${email}`;
    const lastSent = resendTimers[resendKey];
    const now = Date.now();
    if (lastSent && now - lastSent < RATE_LIMITS.resendMinIntervalSec * 1000) {
      metrics.rateLimitHitsTotal.inc();
      reply.code(429).send({ error: 'Please wait before requesting another code' });
      throw new Error('Resend interval not met');
    }
    resendTimers[resendKey] = now;
  }
  if (openid) {
    const ok2 = incrementMap(openidCounters, openid, RATE_LIMITS.reqPerOpenIdHour);
    if (!ok2) {
      metrics.rateLimitHitsTotal.inc();
      reply.code(429).send({ error: 'Too many requests' });
      throw new Error('User rate limit exceeded');
    }
  }
  if (ip) {
    const ok3 = incrementMap(ipCounters, ip, RATE_LIMITS.reqPerIpHour);
    if (!ok3) {
      metrics.rateLimitHitsTotal.inc();
      reply.code(429).send({ error: 'Too many requests from this IP' });
      throw new Error('IP rate limit exceeded');
    }
  }
}