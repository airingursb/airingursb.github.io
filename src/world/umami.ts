// Thin wrapper around the global umami analytics object — safe to call
// from any world component, no-ops when umami hasn't loaded yet.
// Avoids `declare global Window { umami }` to prevent dupe-declaration
// conflicts with src/lounge/umami.ts (different module trees).

type UmamiGlobal = {
  track: (event: string, data?: Record<string, unknown>) => void
}

export function trackWorld(event: string, data?: Record<string, unknown>): void {
  try {
    if (typeof window === 'undefined') return
    const u = (window as unknown as { umami?: UmamiGlobal }).umami
    if (!u || typeof u.track !== 'function') return
    u.track(event, data)
  } catch {
    // never let analytics throw into render code
  }
}
