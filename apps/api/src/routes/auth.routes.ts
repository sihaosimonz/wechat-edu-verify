import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { v4 as uuidv4 } from 'uuid';

interface LoginBody {
  code: string;
}

/**
 * Register authentication routes. For this demonstration we provide a stub that
 * exchanges a WeChat login code for a session token. In production this would
 * call the `jscode2session` API to retrieve an openid and session key.
 */
export function registerAuthRoutes(app: FastifyInstance) {
  app.post('/auth/wechat/login', async (request: FastifyRequest, reply: FastifyReply) => {
    const body = request.body as LoginBody;
    // Normally you would call WeChat's jscode2session API with the code to obtain an openid.
    // Here we generate a dummy openid for demonstration.
    const openid = body.code ? `openid_${body.code.substring(0, 8)}` : uuidv4();
    const userId = openid; // For demo we use openid as userId
    // Generate a simple session token; in production sign a JWT or session cookie.
    const sessionToken = Buffer.from(`${userId}`).toString('base64');
    // Respond with the session token. The client should store this and send it
    // in subsequent requests via the Authorization header.
    reply.send({ session_token: sessionToken, openid });
  });
}