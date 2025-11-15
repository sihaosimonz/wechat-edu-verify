import client from 'prom-client';

/**
 * Prometheus metrics definitions.
 */
export const metrics = {
  otpSendTotal: new client.Counter({ name: 'otp_send_total', help: 'Total OTP codes sent' }),
  otpSendFailedTotal: new client.Counter({ name: 'otp_send_failed_total', help: 'OTP send failures' }),
  otpVerifySuccessTotal: new client.Counter({ name: 'otp_verify_success_total', help: 'Successful OTP verifications' }),
  otpVerifyFailedTotal: new client.Counter({ name: 'otp_verify_failed_total', help: 'Failed OTP verifications' }),
  rateLimitHitsTotal: new client.Counter({ name: 'rate_limit_hits_total', help: 'Rate limit rejections' }),
  deliverabilityBouncesTotal: new client.Counter({ name: 'deliverability_bounces_total', help: 'Email bounces or complaints' }),
  inviteFetchTotal: new client.Counter({ name: 'invite_fetch_total', help: 'Invite fetches' }),
  botInviteSuccessTotal: new client.Counter({ name: 'bot_invite_success_total', help: 'Successful bot invites' }),
  botInviteFailedTotal: new client.Counter({ name: 'bot_invite_failed_total', help: 'Failed bot invites' })
};

export function metricsRoute(fastifyInstance: any) {
  fastifyInstance.get('/metrics', async (_, reply) => {
    reply.type('text/plain');
    return client.register.metrics();
  });
}