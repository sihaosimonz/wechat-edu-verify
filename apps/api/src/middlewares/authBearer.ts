import { FastifyRequest, FastifyReply } from 'fastify';
import { verifyToken } from '../services/jwt';

/**
 * Middleware to verify a bearer JWT with a given expected audience.
 * Attaches the token payload to the request as `tokenPayload`.
 */
export function authBearer(expectedAudience: string) {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    const authHeader = request.headers['authorization'];
    if (!authHeader) {
      reply.code(401).send({ error: 'Missing authorization' });
      throw new Error('Missing authorization');
    }
    const token = authHeader.replace(/^Bearer\s+/i, '');
    try {
      const payload = verifyToken(token, expectedAudience);
      (request as any).tokenPayload = payload;
    } catch (e) {
      reply.code(401).send({ error: 'Invalid token' });
      throw new Error('Invalid token');
    }
  };
}