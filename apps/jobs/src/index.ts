import cron from 'node-cron';
import { notifyExpiringInvites } from './invite-expiry-notifier';
import { rotateJwks } from './jwks-rotation';

// Schedule the invite expiry notifier to run every hour.
cron.schedule('0 * * * *', () => {
  notifyExpiringInvites().catch((err) => console.error('Invite expiry job failed', err));
});

// Schedule JWKS rotation weekly on Sunday at 03:00.
cron.schedule('0 3 * * 0', () => {
  rotateJwks().catch((err) => console.error('JWKS rotation job failed', err));
});

console.log('Background jobs started');