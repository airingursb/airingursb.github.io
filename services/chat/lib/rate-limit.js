/**
 * Simple in-memory rate limiter.
 *
 * Policy: each IP is limited to MAX_REQUESTS requests within a WINDOW_MS window.
 * A cleanup interval runs every CLEANUP_INTERVAL_MS to evict expired entries.
 */

const MAX_REQUESTS = 20;          // requests per window
const WINDOW_MS = 60 * 60 * 1000; // 1 hour in ms
const CLEANUP_INTERVAL_MS = 10 * 60 * 1000; // 10 minutes

/** @type {Map<string, { count: number, windowStart: number }>} */
const store = new Map();

// Periodic cleanup — .unref() so the timer does not keep the process alive.
const cleanupTimer = setInterval(() => {
  const now = Date.now();
  for (const [ip, entry] of store) {
    if (now - entry.windowStart >= WINDOW_MS) {
      store.delete(ip);
    }
  }
}, CLEANUP_INTERVAL_MS);
cleanupTimer.unref();

/**
 * Check whether the given IP is within rate-limit bounds.
 * Mutates the store to track usage.
 *
 * @param {string} ip
 * @returns {{ allowed: true } | { allowed: false, retryAfter: number }}
 */
export function checkRateLimit(ip) {
  const now = Date.now();
  const entry = store.get(ip);

  if (!entry || now - entry.windowStart >= WINDOW_MS) {
    // New window
    store.set(ip, { count: 1, windowStart: now });
    return { allowed: true };
  }

  if (entry.count < MAX_REQUESTS) {
    entry.count += 1;
    return { allowed: true };
  }

  // Over limit — tell the client how long to wait
  const retryAfter = Math.ceil((WINDOW_MS - (now - entry.windowStart)) / 1000);
  return { allowed: false, retryAfter };
}
