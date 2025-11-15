import { FastifyRequest, FastifyReply } from 'fastify';

/**
 * Middleware to ensure the user is a doorkeeper for the target group.
 * In this demonstration every authenticated user is treated as a doorkeeper.
 * A production implementation would check the user's role in the group admin table.
 */
export async function authDoorkeeper(request: FastifyRequest, reply: FastifyReply) {
  const user = (request as any).user;
  if (!user) {
    reply.code(401).send({ error: 'Unauthenticated' });
    throw new Error('Unauthenticated');
  }
  // TODO: check user role against group admin/roles.
  return;
}