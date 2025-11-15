import { FastifyRequest, FastifyReply } from 'fastify';

/**
 * Middleware to authenticate a user session based on an Authorization header.
 * Expects a base64-encoded user identifier in the format produced by the login endpoint.
 * Attaches a `user` object to the request if valid.
 */
export async function authSession(request: FastifyRequest, reply: FastifyReply) {
  const authHeader = request.headers['authorization'];
  if (!authHeader) {
    reply.code(401).send({ error: 'Missing session token' });
    throw new Error('Missing session token');
  }
  const token = authHeader.replace(/^Bearer\s+/i, '');
  try {
    const decoded = Buffer.from(token, 'base64').toString('utf8');
    // In this demo the userId is the decoded value and openid equals userId
    const userId = decoded;
    const openid = decoded;
    (request as any).user = { id: userId, openid };
  } catch (e) {
    reply.code(401).send({ error: 'Invalid session token' });
    throw new Error('Invalid session token');
  }
}