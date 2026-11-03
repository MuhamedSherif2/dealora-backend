import crypto from 'node:crypto';
import { env } from '../config/env.js';

export const RESET_CODE_TTL_MS = 15 * 60 * 1000; // the code is valid for 15 minutes
export const MAX_RESET_ATTEMPTS = 5; // wrong guesses before the code is burned
export const RESEND_COOLDOWN_MS = 60 * 1000; // at most one new code per minute

// 6 digits from a cryptographically secure source
export const generateResetCode = () => String(crypto.randomInt(0, 1000000)).padStart(6, '0');

// Only the hash is stored in the database; the plain code exists only in the WhatsApp/email message
export const hashResetCode = (code) =>
  crypto.createHmac('sha256', env.jwtSecret).update(String(code)).digest('hex');

export const codesMatch = (code, storedHash) => {
  const a = Buffer.from(hashResetCode(code), 'hex');
  const b = Buffer.from(String(storedHash), 'hex');
  return a.length === b.length && crypto.timingSafeEqual(a, b);
};
