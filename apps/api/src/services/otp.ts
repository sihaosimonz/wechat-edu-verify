import * as argon2 from 'argon2';
import { randomBytes } from 'crypto';

interface OtpRecord {
  email: string;
  codeHash: string;
  expiresAt: number;
  attempts: number;
}

const otpStore: Record<string, OtpRecord[]> = {};

/**
 * Generate a six‑digit numeric OTP.
 */
export function generateOtp(length: number = 6): string {
  const digits: number[] = [];
  while (digits.length < length) {
    const buf = randomBytes(1);
    const digit = buf[0] % 10;
    digits.push(digit);
  }
  return digits.join('');
}

/**
 * Store an OTP for a user/email with a specified TTL (in minutes).
 */
export async function storeOtp(userId: string, email: string, otp: string, ttlMinutes: number): Promise<void> {
  const codeHash = await argon2.hash(otp, { type: argon2.argon2id });
  const expiresAt = Date.now() + ttlMinutes * 60 * 1000;
  const record: OtpRecord = { email, codeHash, expiresAt, attempts: 0 };
  if (!otpStore[userId]) {
    otpStore[userId] = [];
  }
  otpStore[userId].push(record);
}

/**
 * Verify an OTP for a given user/email. Enforces single‑use semantics by removing
 * the OTP record after verification. Limits the number of attempts per OTP.
 */
export async function checkOtp(userId: string, email: string, otp: string, maxAttempts: number = 10): Promise<boolean> {
  const records = otpStore[userId];
  if (!records) return false;
  const idx = records.findIndex((rec) => rec.email.toLowerCase() === email.toLowerCase());
  if (idx === -1) return false;
  const record = records[idx];
  // Remove expired OTP.
  if (record.expiresAt < Date.now()) {
    records.splice(idx, 1);
    return false;
  }
  record.attempts += 1;
  const valid = await argon2.verify(record.codeHash, otp);
  // Remove record after verifying to enforce single use.
  records.splice(idx, 1);
  return valid && record.attempts <= maxAttempts;
}

/**
 * Purge expired OTP records. Should be called periodically.
 */
export function purgeExpiredOtps(): void {
  const now = Date.now();
  for (const userId of Object.keys(otpStore)) {
    otpStore[userId] = otpStore[userId].filter((rec) => rec.expiresAt >= now);
    if (otpStore[userId].length === 0) delete otpStore[userId];
  }
}