export type Phase = 'dawn' | 'day' | 'dusk' | 'night'

const PHASE_COLORS: Record<Phase, { color: number; alpha: number }> = {
  dawn:  { color: 0xffb070, alpha: 0.18 },
  day:   { color: 0xffffff, alpha: 0.00 },
  dusk:  { color: 0xa060c0, alpha: 0.22 },
  night: { color: 0x0a1838, alpha: 0.40 }
}

export function getCurrentPhase(now: Date = new Date()): Phase {
  const h = now.getHours()
  if (h >= 5 && h < 8) return 'dawn'
  if (h >= 8 && h < 17) return 'day'
  if (h >= 17 && h < 20) return 'dusk'
  return 'night'
}

export function getPhaseColor(p: Phase): { color: number; alpha: number } {
  return PHASE_COLORS[p]
}

const BOUNDARIES_MIN = [5 * 60, 8 * 60, 17 * 60, 20 * 60]
const LERP_WINDOW = 15

function lerpColor(
  a: { color: number; alpha: number },
  b: { color: number; alpha: number },
  t: number
): { color: number; alpha: number } {
  const ar = (a.color >> 16) & 0xff, ag = (a.color >> 8) & 0xff, ab = a.color & 0xff
  const br = (b.color >> 16) & 0xff, bg = (b.color >> 8) & 0xff, bb = b.color & 0xff
  const r = Math.round(ar + (br - ar) * t)
  const g = Math.round(ag + (bg - ag) * t)
  const bl = Math.round(ab + (bb - ab) * t)
  return { color: (r << 16) | (g << 8) | bl, alpha: a.alpha + (b.alpha - a.alpha) * t }
}

function phaseAtMinutes(mins: number): Phase {
  const h = Math.floor(((mins % 1440) + 1440) % 1440 / 60)
  if (h >= 5 && h < 8) return 'dawn'
  if (h >= 8 && h < 17) return 'day'
  if (h >= 17 && h < 20) return 'dusk'
  return 'night'
}

/** Lerp within ±LERP_WINDOW minutes of a phase boundary for smooth transition. */
export function getOverlayAt(now: Date = new Date()): { color: number; alpha: number } {
  const minutes = now.getHours() * 60 + now.getMinutes()
  for (const b of BOUNDARIES_MIN) {
    const delta = minutes - b
    if (Math.abs(delta) <= LERP_WINDOW) {
      const before = phaseAtMinutes(b - LERP_WINDOW - 1)
      const after = phaseAtMinutes(b + LERP_WINDOW + 1)
      const t = (delta + LERP_WINDOW) / (LERP_WINDOW * 2)
      return lerpColor(PHASE_COLORS[before], PHASE_COLORS[after], t)
    }
  }
  return PHASE_COLORS[getCurrentPhase(now)]
}

// V23.30 — coherent wind direction.
//
// Drifting outdoor particles (cherry blossoms in spring grove, autumn
// leaves in grove/balcony, beach sand) previously each picked their own
// asymmetric drift in seasonal_decor.ts. That looked incoherent — the
// blossoms blew west while sand blew east. A single shared wind angle
// per day makes the world feel like one weather system.
//
// Deterministic per day so a player who reloads in the same session
// sees the same wind, but it shifts overnight.
export function getWindStrength(now: Date = new Date()): number {
  // Hash YYYYMMDD into a stable [-1, +1] value
  const dayKey = now.getFullYear() * 10000 + (now.getMonth() + 1) * 100 + now.getDate()
  // Simple LCG-style scramble to avoid neighboring days being too similar
  const h = (dayKey * 9301 + 49297) % 233280
  // Map to [-1, +1] but bias away from exactly 0 (always SOME wind)
  const raw = (h / 233280) * 2 - 1
  return raw >= 0 ? Math.max(0.4, raw) : Math.min(-0.4, raw)
}
