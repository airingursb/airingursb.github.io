// Shared online-count source for ambient_residents + transit_npcs.
// A single module-level poll so both subsystems read one cached value.

let site = 0
let timer: ReturnType<typeof setInterval> | null = null

async function poll() {
  try {
    const res = await fetch('https://chat.ursb.me/api/online/count')
    if (res.ok) {
      const d = await res.json() as { site?: number }
      if (typeof d.site === 'number') site = d.site
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
