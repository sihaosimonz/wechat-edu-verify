import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { metrics } from '../services/metrics';
import { addSuppressedEmail } from '../services/suppression';

// The suppression list is now managed in services/suppression.ts

export function registerWebhookRoutes(app: FastifyInstance) {
  /**
   * POST /webhooks/email
   * Handle bounce and complaint webhooks from the email provider. Expects a JSON
   * body with a `type` field ('bounce' or 'complaint') and an `email` field.
   */
  app.post('/webhooks/email', async (request: FastifyRequest, reply: FastifyReply) => {
    const body = request.body as any;
    const type = body?.type;
    const email = body?.email;
    if (!type || !email) {
      reply.code(400).send({ error: 'Invalid webhook payload' });
      return;
    }
    if (type === 'bounce' || type === 'complaint') {
      // Add the email to the global suppression list and increment bounce metric
      addSuppressedEmail(email);
      metrics.deliverabilityBouncesTotal.inc();
    }
    reply.send({ ok: true });
  });
}