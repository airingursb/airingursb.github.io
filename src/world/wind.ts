// Shared wind/gust state — single source of truth for the WindSway
// wrapper + any future ambient effects that want to react to gusts.
// V2 scene polish B4: real wind has rhythm. The scene previously had
// constant wind (sin amplitude) which read as "always on". Periodic
// gusts every ~27s transform ambient into *event* — leaves cluster,
// trees lean harder, clothesline swings wider, briefly.

// Returns 0..1 — the current gust intensity multiplier on top of the
// baseline wind. Most of the time returns 0 (calm); spikes to 1 for
// ~3 seconds every 27 seconds.
export const WIND_GUST_PERIOD = 27
export function getGust(t: number): number {
  const phase = (t % WIND_GUST_PERIOD) / WIND_GUST_PERIOD
  const SPIKE_START = 0.82
  const SPIKE_END   = 0.93
  if (phase < SPIKE_START || phase > SPIKE_END) return 0
  const u = (phase - SPIKE_START) / (SPIKE_END - SPIKE_START)
  // Bell curve so the gust ramps up + holds slightly + ramps down
  // rather than being a sharp spike.
  return Math.sin(u * Math.PI)
}

// Continuous baseline-wind phase (0..1) — used by AmbientAudio's wind
// soundscape so the visual sway + audio gust LFO share a single clock.
// Computed as fractional position within the 27s gust cycle so visuals
// and audio crest together. Returns 0..1.
export function getWindBasePhase(t: number): number {
  return (t % WIND_GUST_PERIOD) / WIND_GUST_PERIOD
}
