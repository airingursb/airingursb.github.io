// V6.4 — Weather model.
// Deterministic per UTC date so all visitors see the same sky.
// Probabilities are season-aware:
//   spring (Mar–May)  → 55% clear, 25% cloudy, 18% rain, 2% storm
//   summer (Jun–Aug)  → 65% clear, 22% cloudy, 11% rain, 2% storm
//   autumn (Sep–Nov)  → 50% clear, 28% cloudy, 19% rain, 3% storm
//   winter (Dec–Feb)  → 50% clear, 25% cloudy, 22% snow, 3% storm

export type Weather = 'clear' | 'cloudy' | 'rain' | 'snow' | 'storm'

function seasonOf(d: Date): 'spring' | 'summer' | 'autumn' | 'winter' {
  const m = d.getUTCMonth() + 1
  if (m >= 3 && m <= 5) return 'spring'
  if (m >= 6 && m <= 8) return 'summer'
  if (m >= 9 && m <= 11) return 'autumn'
  return 'winter'
}

function hashDate(d: Date): number {
  const y = d.getUTCFullYear(), mo = d.getUTCMonth() + 1, da = d.getUTCDate()
  let h = y * 73856093 ^ mo * 19349663 ^ da * 83492791
  h = (h ^ (h >>> 13)) * 1274126177
  return ((h ^ (h >>> 16)) >>> 0) % 1000  // 0..999
}

export function getWeatherForDate(d: Date): Weather {
  const r = hashDate(d)
  const s = seasonOf(d)
  if (s === 'spring') {
    if (r < 550) return 'clear'
    if (r < 800) return 'cloudy'
    if (r < 980) return 'rain'
    return 'storm'
  }
  if (s === 'summer') {
    if (r < 650) return 'clear'
    if (r < 870) return 'cloudy'
    if (r < 980) return 'rain'
    return 'storm'
  }
  if (s === 'autumn') {
    if (r < 500) return 'clear'
    if (r < 780) return 'cloudy'
    if (r < 970) return 'rain'
    return 'storm'
  }
  // winter
  if (r < 500) return 'clear'
  if (r < 750) return 'cloudy'
  if (r < 970) return 'snow'
  return 'storm'
}
