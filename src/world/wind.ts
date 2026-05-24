// Shared wind/gust state — single source of truth for the WindSway
// wrapper + any future ambient effects that want to react to gusts.
// V2 scene polish B4: real wind has rhythm. The scene previously had
// constant wind (sin amplitude) which read as "always on". Periodic
// gusts every ~27s transform ambient into *event* — leaves cluster,
// trees lean harder, clothesline swings wider, briefly.

// Returns 0..1 — the current gust intensity multiplier on top of the
// baseline wind. Most of the time returns 0 (calm); spikes to 1 for
// ~3 seconds every 27 seconds.
export function getGust(t: number): number {
  const PERIOD = 27
  const phase = (t % PERIOD) / PERIOD
  const SPIKE_START = 0.82
  const SPIKE_END   = 0.93
  if (phase < SPIKE_START || phase > SPIKE_END) return 0
  const u = (phase - SPIKE_START) / (SPIKE_END - SPIKE_START)
  // Bell curve so the gust ramps up + holds slightly + ramps down
  // rather than being a sharp spike.
  return Math.sin(u * Math.PI)
}
