interface InviteRecord {
  inviteUrl?: string;
  qrMediaId?: string;
  expiresAt?: number;
}

const inviteStore: Record<string, InviteRecord> = {};

export function setInvite(groupId: string, inviteUrl?: string, qrMediaId?: string, expiresAt?: number) {
  inviteStore[groupId] = { inviteUrl, qrMediaId, expiresAt };
}

export function getInvite(groupId: string): InviteRecord | undefined {
  const rec = inviteStore[groupId];
  if (!rec) return undefined;
  if (rec.expiresAt && rec.expiresAt < Date.now()) {
    return undefined;
  }
  return rec;
}

export function purgeExpiredInvites() {
  const now = Date.now();
  for (const id of Object.keys(inviteStore)) {
    const rec = inviteStore[id];
    if (rec.expiresAt && rec.expiresAt < now) {
      delete inviteStore[id];
    }
  }
}

/**
 * Retrieve a list of invites that will expire within the given number of hours.
 * Useful for notifying organizers about upcoming expirations. Returns an array
 * of objects with the groupId and invite metadata. Only invites with an
 * expiresAt timestamp in the future (but before now + window) are included.
 *
 * @param hours Number of hours within which to consider an invite expiring
 */
export function getInvitesExpiringWithin(hours: number): Array<{ groupId: string; inviteUrl?: string; qrMediaId?: string; expiresAt: number }> {
  const soon = Date.now() + hours * 60 * 60 * 1000;
  const results: Array<{ groupId: string; inviteUrl?: string; qrMediaId?: string; expiresAt: number }> = [];
  for (const groupId of Object.keys(inviteStore)) {
    const rec = inviteStore[groupId];
    if (rec.expiresAt && rec.expiresAt > Date.now() && rec.expiresAt <= soon) {
      results.push({ groupId, inviteUrl: rec.inviteUrl, qrMediaId: rec.qrMediaId, expiresAt: rec.expiresAt });
    }
  }
  return results;
}