/**
 * Verification store and helper functions. Maintains the server‑side record of
 * which user/email has been verified, along with validity windows and token ids.
 * In production this should be persisted in a database.
 */
export interface VerificationRecord {
  userId: string;
  email: string;
  domain: string;
  verifiedAt: number;
  validUntil: number;
  jti: string;
  revoked: boolean;
}

const verificationStore: Record<string, VerificationRecord> = {};

/**
 * Upsert a verification record for a user.
 */
export function upsertVerification(rec: VerificationRecord) {
  verificationStore[rec.userId] = rec;
}

/**
 * Get the current verification record for a user.
 */
export function getVerification(userId: string): VerificationRecord | undefined {
  const rec = verificationStore[userId];
  if (!rec) return undefined;
  // Check expiration; if expired remove it and return undefined.
  if (rec.validUntil < Date.now() || rec.revoked) {
    delete verificationStore[userId];
    return undefined;
  }
  return rec;
}

/**
 * Revoke a verification record for a user. Marks it as revoked and removes it.
 */
export function revokeVerification(userId: string) {
  const rec = verificationStore[userId];
  if (rec) {
    rec.revoked = true;
    delete verificationStore[userId];
  }
}

/**
 * Delete all data for a user.
 */
export function deleteUser(userId: string) {
  delete verificationStore[userId];
}