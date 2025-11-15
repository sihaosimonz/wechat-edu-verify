import { FastifyRequest, FastifyReply } from 'fastify';
import { getTranslator } from '../services/i18n';

/**
 * Middleware that selects a translation bundle based on the Accept-Language header
 * and attaches a translator function to the request. Templates can call
 * `request.t('key')` to get localised strings.
 */
export async function i18n(request: FastifyRequest, reply: FastifyReply) {
  const langHeader = request.headers['accept-language'];
  let lang: string = 'en';
  if (typeof langHeader === 'string') {
    lang = langHeader.split(',')[0];
  }
  const t = getTranslator(lang);
  (request as any).t = t;
}