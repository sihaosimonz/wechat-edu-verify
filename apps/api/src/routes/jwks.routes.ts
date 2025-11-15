import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { getPublicJwks } from '../services/jwt';

/**
 * Register the JWKS route. This serves the JSON Web Key Set containing the
 * public keys used to verify JWTs issued by this service. Clients can cache
 * this response and use the `kid` header in tokens to select the correct key.
 */
export function registerJwksRoutes(app: FastifyInstance) {
  app.get('/.well-known/jwks.json', async (_request: FastifyRequest, reply: FastifyReply) => {
    reply.send(getPublicJwks());
  });
}