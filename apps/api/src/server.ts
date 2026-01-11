import Fastify from 'fastify';
import cors from '@fastify/cors';
import fastifyStatic from '@fastify/static';
import path from 'path';
import { registerAuthRoutes } from './routes/auth.routes';
import { registerVerifyRoutes } from './routes/verify.routes';
import { registerGroupRoutes } from './routes/groups.routes';
import { registerGroupQrRoutes } from './routes/groups';
import { registerModerationRoutes } from './routes/moderation.routes';
import { registerWebhookRoutes } from './routes/webhooks.routes';
import { registerMetricsRoutes } from './routes/metrics.routes';
import { registerJwksRoutes } from './routes/jwks.routes';

/**
 * Build and configure the Fastify server instance.
 */
export async function buildServer() {
  const app = Fastify({ logger: true });

  // CORS: allow all origins by default. For production, restrict origins.
  await app.register(cors, {
    origin: (origin, cb) => {
      cb(null, true);
    }
  });

  await app.register(fastifyStatic, {
    root: path.join(__dirname, '../public'),
    prefix: '/'
  });

  // Health check endpoint.
  app.get('/healthz', async () => ({ status: 'ok' }));

  // Register all routes under their respective namespaces.
  registerAuthRoutes(app);
  registerVerifyRoutes(app);
  registerGroupRoutes(app);
  registerGroupQrRoutes(app);
  registerModerationRoutes(app);
  registerWebhookRoutes(app);
  registerMetricsRoutes(app);
  registerJwksRoutes(app);

  return app;
}

// If this module is executed directly, start the server.
if (require.main === module) {
  buildServer()
    .then((app) => {
      const port = Number(process.env.PORT) || 8080;
      app.listen({ port, host: '0.0.0.0' }, (err, address) => {
        if (err) {
          app.log.error(err);
          process.exit(1);
        }
        app.log.info(`Server listening at ${address}`);
      });
    })
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}
