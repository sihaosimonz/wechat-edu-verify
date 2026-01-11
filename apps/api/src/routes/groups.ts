import { FastifyInstance } from 'fastify';

export function registerGroupQrRoutes(app: FastifyInstance) {
  /**
   * GET /groups/qr
   * Return the current invite QR image URL.
   */
  app.get('/groups/qr', async () => {
    return { qrUrl: '/qrcodes/current.png' };
  });
}
