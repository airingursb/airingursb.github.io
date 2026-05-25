// Thin wrapper around the global umami analytics object. Safe to call from
// anywhere — no-ops when umami hasn't loaded yet (script is deferred) OR
// when the user has tracker blocking.

type UmamiGlobal = {
  track: (event: string, data?: Record<string, unknown>) => void
  identify?: (data: Record<string, unknown>) => void
}

declare global {
  interface Window { umami?: UmamiGlobal }
}

export function trackEvent(event: string, data?: Record<string, unknown>): void {
  try {
    if (typeof window === 'undefined') return
    const u = window.umami
    if (!u || typeof u.track !== 'function') return
    u.track(event, data)
  } catch {
    // never let analytics throw into game code
  }
}
