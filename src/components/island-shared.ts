// Shared state, helpers, and palette for the homepage IslandWidget.
//
// Extracted from IslandWidget.tsx (V43 architecture split) so the
// scene-content file (~1700 LOC) can focus on geometry/JSX without
// also being the source-of-truth for palette + cross-cutting hooks.
//
// EVERYTHING IN THIS FILE IS SAFE TO IMPORT WITHOUT WebGL/R3F. Module
// load runs in browser (window-guarded) but does no Three.js work,
// no React rendering, no GL calls.

import * as THREE from 'three'

// ─────────────────────────────────────────────────────────────────────
// MODULE-LEVEL MUTABLE STATE — read by useFrame callbacks in many
// components; written by Canvas pointer handlers in IslandWidget.tsx.
// Module-level (not Context) is intentional: zero re-render cost +
// works without prop-drilling across the 22 child components.
// ─────────────────────────────────────────────────────────────────────

export const hoverState = {
  active: false,
  enteredAt: 0,
  decay: 0,
}

export const mouseState = {
  x: 0,
  y: 0,
}

export const hoverZone: {
  current: 'sakura' | 'tsukubai' | 'cabin' | null
  since: number
} = {
  current: null,
  since: 0,
}

// ─────────────────────────────────────────────────────────────────────
// ENVIRONMENT DETECTION (evaluated once at module load)
// ─────────────────────────────────────────────────────────────────────

export const IS_TOUCH = typeof window !== 'undefined' &&
  window.matchMedia?.('(hover: none)').matches

export const IS_MOBILE = typeof window !== 'undefined' && (
  (typeof navigator !== 'undefined' && /Android|webOS|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent)) ||
  (typeof window.matchMedia === 'function' && window.matchMedia('(max-width: 800px)').matches)
)

// Vestibular-disorder users (prefers-reduced-motion) should not see
// autorotate / wind sway / petal fall / sun breath / lantern flicker.
// Read once at module load — toggling the OS setting mid-session
// requires reload (acceptable, this is rare).
export const PREFERS_REDUCED_MOTION =
  typeof window !== 'undefined' &&
  typeof window.matchMedia === 'function' &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches

// ─────────────────────────────────────────────────────────────────────
// SHARED HOOKS — pure functions of time, read by many useFrame loops.
// Centralizing them = "one wind", "one hearth", "one dwell" so the
// scene behaves like one organism not 22 separately animated objects.
// ─────────────────────────────────────────────────────────────────────

// THREE-ENVELOPE GUST so the scene has both ambient breathing AND
// occasional 'event' drama:
//   baseGust  — regular ~48s period, peak ~0.99 (continuous wind)
//   sigGust   — rare ~78s period, peak ~0.99 (the 'whole-island
//               reacts' signature moment — sakura shakes + petals
//               release + furin swings + smoke surges + lantern
//               flame leans + fallen petals flutter, all together)
//   firstGust — one-time burst at t=8-12s so a fresh visitor sees
//               the signature event within their first attention
//               window (rather than maybe missing it for 30+s)
// Scratch singletons — getWind/getHearth are called from ~10 + 4
// useFrame loops respectively (~840 object allocs/sec at 60fps if
// they returned fresh literals). All callers read the fields
// IMMEDIATELY before the next getWind/getHearth call, so a shared
// mutable singleton per-function is safe + GC-free.
const _windScratch = { dirX: 1, dirZ: 0, gust: 0, swayPhase: 0 }
export function getWind(t: number) {
  const baseGust = Math.max(0, Math.sin(t * 0.13) - 0.7) * 3.3
  const sigGust = Math.max(0, Math.sin(t * 0.081 + 1.5) - 0.82) * 5.5
  const firstGust = (t > 8 && t < 12) ? Math.sin((t - 8) / 4 * Math.PI) * 1.4 : 0
  // Peripheral-vision attention-reclaim: a tiny ~15s pulse at ~10%
  // of base amplitude. The pet sits bottom-left, peripheral to where
  // the user's eyes start (main content). M-cell pathway needs
  // temporal contrast events to recapture attention. Without this,
  // dead-air between ~24s baseGust spikes leaves the pet 'invisible'
  // to peripheral notice — the user acknowledges its silhouette once,
  // then never looks again. 0.88 threshold + 0.9 multiplier keeps
  // this strictly below sigGust so the BIG gust still feels singular.
  const microGust = Math.max(0, Math.sin(t * 0.42) - 0.88) * 0.9
  const dirAngle = Math.sin(t * 0.04) * 0.4
  _windScratch.dirX = Math.cos(dirAngle)
  _windScratch.dirZ = Math.sin(dirAngle)
  _windScratch.gust = baseGust + sigGust + firstGust + microGust
  _windScratch.swayPhase = t * 0.5
  return _windScratch
}

const _hearthScratch = { phase: 0, stoke: 0, shojiBrighten: 0, lanternDim: 0, smokeBoost: 0 }
export function getHearth(t: number) {
  const phase = (t * 0.25 % 1)
  const stoke = Math.max(0, 1 - Math.abs(phase - 0.2) * 4)
  _hearthScratch.phase = phase
  _hearthScratch.stoke = stoke
  _hearthScratch.shojiBrighten = stoke * 0.20
  _hearthScratch.lanternDim = stoke * 0.28
  _hearthScratch.smokeBoost = stoke * 1.6
  return _hearthScratch
}

// Hover dwell + boost: the DESKTOP branches use `performance.now()/1000`
// (wall clock) to match the pointer-handler write sites — comparing
// against `t` (Canvas clock) silently gives negative dwell times.
// The IS_TOUCH branches deliberately use `t` since they synthesize a
// periodic cycle (no hover state to compare against), so any
// monotonic time works.
export function getDwellGolden(t: number): number {
  if (IS_TOUCH) {
    const phase = (t % 14) / 14
    return phase < 0.5
      ? Math.max(0, (phase - 0.29) / 0.21)
      : Math.max(0, 1 - (phase - 0.50) / 0.21)
  }
  const now = typeof performance !== 'undefined' ? performance.now() / 1000 : t
  if (hoverState.active) {
    const dwellSec = now - hoverState.enteredAt
    if (dwellSec < 3) return 0
    return Math.min(1, (dwellSec - 3) / 1.5)
  }
  const sinceLeave = now - hoverState.decay
  return Math.max(0, 1 - sinceLeave / 4)
}

export function getHoverBoost(t: number): number {
  // Mirror getDwellGolden's IS_TOUCH branch: on touch devices,
  // pointer events never fire on the canvas (taps navigate via the
  // role=link wrap), so without a synthetic loop the furin / petals
  // / shoji never get the hover-boost theater they're tuned around.
  // Synthetic 11s phase loop puts touch users on a steady cadence
  // of soft pulses — same animation budget desktop hover delivers.
  if (IS_TOUCH) {
    const phase = (t % 11) / 11
    return phase < 0.45
      ? Math.max(0, (phase - 0.25) / 0.20)
      : Math.max(0, 1 - (phase - 0.45) / 0.30)
  }
  const now = typeof performance !== 'undefined' ? performance.now() / 1000 : 0
  if (hoverState.active) {
    const since = now - hoverState.enteredAt
    return Math.min(1, since * 3)
  }
  // Asymmetric decay (1.2/s = ~0.83s back to rest) — faster than the
  // ramp-up so the scene returns to baseline before the user's eye
  // does. The pet is 220px and users brush past it constantly; a
  // slow decay leaves it 'stuck excited' on subsequent hovers.
  const sinceLeave = now - hoverState.decay
  return Math.max(0, 1 - sinceLeave * 1.2)
}

// ─────────────────────────────────────────────────────────────────────
// PURE COLOR HELPER — channel-math hex lerp (avoids THREE.Color alloc
// in hot render paths).
// ─────────────────────────────────────────────────────────────────────

export function lerpHex(a: string, b: string, t: number): string {
  const ar = parseInt(a.slice(1, 3), 16)
  const ag = parseInt(a.slice(3, 5), 16)
  const ab = parseInt(a.slice(5, 7), 16)
  const br = parseInt(b.slice(1, 3), 16)
  const bg = parseInt(b.slice(3, 5), 16)
  const bb = parseInt(b.slice(5, 7), 16)
  const r = Math.round(ar + (br - ar) * t)
  const g = Math.round(ag + (bg - ag) * t)
  const bl = Math.round(ab + (bb - ab) * t)
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${bl.toString(16).padStart(2, '0')}`
}

// ─────────────────────────────────────────────────────────────────────
// GEOMETRY HELPERS — reused across components for organic shapes.
// ─────────────────────────────────────────────────────────────────────

export function organicBlob(radius: number, jitterAmt: number, seed: number): THREE.BufferGeometry {
  const g = new THREE.IcosahedronGeometry(radius, 1)
  const pos = g.attributes.position
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i)
    const n = Math.sin(x * 12.9 + seed) * Math.cos(z * 17.3 + seed * 1.7)
    pos.setX(i, x + n * jitterAmt * 0.5)
    pos.setY(i, y + Math.sin(y * 9.1 + seed) * jitterAmt)
    pos.setZ(i, z + Math.cos(x * 7.7 + seed * 2.3) * jitterAmt * 0.5)
  }
  pos.needsUpdate = true
  g.computeVertexNormals()
  return g
}

export function makePetalShape(): THREE.Shape {
  const s = new THREE.Shape()
  s.moveTo(0, 0)
  s.bezierCurveTo(-0.024, 0.018, -0.030, 0.044, 0, 0.060)
  s.bezierCurveTo(-0.006, 0.045, -0.003, 0.038, 0, 0.030)
  s.bezierCurveTo(0.003, 0.038, 0.006, 0.045, 0, 0.060)
  s.bezierCurveTo(0.030, 0.044, 0.024, 0.018, 0, 0)
  return s
}

// ─────────────────────────────────────────────────────────────────────
// PALETTE — single source of truth for every color in the scene.
// Iteration history kept in comments for context (which colors were
// muddy defaults vs. intentional Ghibli-correct choices).
// ─────────────────────────────────────────────────────────────────────

// V53.5: SKY + FOG_TINT removed (V52 pet-cutout decision — no fog,
// no sky background; alpha:true canvas shows page bg through).

export const CEDAR_TRUNK    = '#2A1812'
// Cedar greens cool-shifted +6° toward teal + desat ~4%. Classic
// plein-air aerial-perspective trick: distant foliage loses chroma
// toward sky-tint before it loses value. The 2 cedars sit at the
// back of the disc (z=-1.05/-1.45) — without this shift they read
// as mid-plane mass competing with the cabin warm tones; the cool
// tint pushes them into 'back row' where they belong.
export const CEDAR_DARK     = '#3D5A3E'
export const CEDAR_LIGHT    = '#566E54'

// Ghibli earth tones — warmer than naive sage/mud defaults.
// Grass tuned to bridge to the V53.5 weathered teardrop cliff.
// Pre-V53.5 #A8C77A read as 'neon Easter-egg' against the now-
// cooler darker rock — desaturated -6% + value -5% (#9BB870)
// kills the cartoonish seam without losing the lush-top reading.
export const GRASS_LIGHT    = '#9BB870'
export const GRASS_HILIGHT  = '#BACC8E'
export const GRASS_SHADE    = '#5F7E48'
export const SOIL           = '#B88560'
export const SOIL_DK        = '#8C5E3E'
export const CLIFF          = '#8C5E3E'
export const CLIFF_DK       = '#6B4530'

export const GRAVEL_SAND    = '#E6DAC0'
export const GRAVEL_LINE    = '#C5B98F'

export const WASHI_WALL     = '#F5E8C8'
// Bumped warmer (#FFEFD0 → #FFE2A8) after V53.5 base+grass+cedar
// cooled — at 91% lightness cream the shoji was reading near-white
// against the new desaturated surroundings, losing its 'sole warm
// refuge' character. Now reads as lit washi paper, not glare.
export const WASHI_GLOW     = '#FFE2A8'
export const WOOD_POST      = '#3A2516'
export const WOOD_BEAM      = '#5A3A20'

// Real kawara is blue-grey with subtle warm highlight. ΔL between
// ROOF_A and ROOF_B is wide so the tile jitter reads visibly.
export const TILE_ROOF_A    = '#5C6470'
export const TILE_ROOF_B    = '#363C48'
export const TILE_ROOF_MOSS = '#5E7048'
export const TILE_RIDGE     = '#2E3540'

export const STONE_BASE     = '#A89E8E'
export const STONE_HAT      = '#7E7368'
// Bumped warmer #FFD080 → #FFB860 after V53.5 shoji bumped to
// #FFE2A8. Lantern used to be the scene's hottest hue but the
// warmer washi ate the warmth lane — pushing flame to amber-orange
// (hue 32°, sat +12%, V −8%) re-opens the temperature gap so the
// lantern still reads as the hottest pinpoint + justifies the inner
// pointLight bloom.
export const LANTERN_GLOW   = '#FFB860'

// V53.5: shifted toward shu-iro/persimmon (#C84A35 → #D05636).
// Pre-V53.5 vermillion sat at hue 9° leaning crimson. After
// sakura+shoji+lantern all pulled into the amber-warm family,
// the torii was the lone cool-red — broke the family. Hue 9°→13°,
// sat -2%, V +3% joins it to the amber warm-lane.
export const VERMILLION     = '#D05636'
export const TORII_BLACK    = '#1F1812'
