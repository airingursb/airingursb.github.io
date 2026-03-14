import { createHmac, randomUUID, timingSafeEqual } from 'crypto';
import config from './config.js';

const ALGORITHM = 'sha256';
const ENCODING = 'hex';

/**
 * Compute HMAC-SHA256 of `data` using the configured secret.
 * @param {string} data
 * @returns {string} hex digest
 */
function hmac(data) {
  return createHmac(ALGORITHM, config.hmacSecret).update(data).digest(ENCODING);
}

/**
 * Generate a new visitor token.
 * @returns {{ visitorId: string, token: string }}
 */
export function createToken() {
  const visitorId = randomUUID();
  const signature = hmac(visitorId);
  return { visitorId, token: `${visitorId}.${signature}` };
}

/**
 * Verify a visitor token.
 * Uses constant-time comparison to prevent timing attacks.
 * @param {string} token  — "visitorId.signature" format
 * @returns {string|null} visitorId on success, null on failure
 */
export function verifyToken(token) {
  if (typeof token !== 'string') return null;

  const dotIdx = token.indexOf('.');
  if (dotIdx === -1) return null;

  const visitorId = token.slice(0, dotIdx);
  const provided = token.slice(dotIdx + 1);
  const expected = hmac(visitorId);

  if (!visitorId || !provided) return null;

  // Both buffers must be the same length for timingSafeEqual
  const providedBuf = Buffer.from(provided, ENCODING);
  const expectedBuf = Buffer.from(expected, ENCODING);

  if (providedBuf.length !== expectedBuf.length) return null;

  try {
    if (!timingSafeEqual(providedBuf, expectedBuf)) return null;
  } catch {
    return null;
  }

  return visitorId;
}
