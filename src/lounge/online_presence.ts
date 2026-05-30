// Shared online-count source for ambient_residents + transit_npcs.
// A single module-level poll so both subsystems read one cached value.

let site = 0
let countries: Record<string, number> = {}
let timer: ReturnType<typeof setInterval> | null = null
const listeners = new Set<() => void>()

/** Subscribe to count updates (fires after each poll whose value changed). Returns an unsubscribe fn. */
export function onOnlineChange(cb: () => void): () => void {
  listeners.add(cb)
  return () => { listeners.delete(cb) }
}

async function poll() {
  try {
    const res = await fetch('https://chat.ursb.me/api/online/count')
    if (res.ok) {
      const d = await res.json() as { site?: number; countries?: Record<string, number> }
      if (d.countries && typeof d.countries === 'object') countries = d.countries
      if (typeof d.site === 'number' && d.site !== site) {
        site = d.site
        for (const cb of listeners) { try { cb() } catch {} }
      }
    }
  } catch { /* keep last */ }
}

export function startOnlinePolling() {
  if (timer) return
  void poll()
  timer = setInterval(() => void poll(), 45_000)
}

export function stopOnlinePolling() {
  if (timer) { clearInterval(timer); timer = null }
}

export function getOnlineSite(): number { return site }

/** Country-code → online-count map from the last poll, e.g. { CN: 7, SG: 1 }. */
export function getOnlineCountries(): Record<string, number> { return countries }
