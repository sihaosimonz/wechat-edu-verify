import { FastifyInstance } from 'fastify';
import { metricsRoute } from '../services/metrics';

/**
 * Register the Prometheus metrics endpoint.
 */
export function registerMetricsRoutes(app: FastifyInstance) {
  metricsRoute(app);
}