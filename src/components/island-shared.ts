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

// ─────────────────────────────────────────────────────────────────────
// SHARED HOOKS — pure functions of time, read by many useFrame loops.
// Centralizing them = "one wind", "one hearth", "one dwell" so the
// scene behaves like one organism not 22 separately animated objects.
// ─────────────────────────────────────────────────────────────────────

export function getWind(t: number) {
  const gust = Math.max(0, Math.sin(t * 0.13) - 0.7) * 3.3
  const dirAngle = Math.sin(t * 0.04) * 0.4
  return {
    dirX: Math.cos(dirAngle),
    dirZ: Math.sin(dirAngle),
    gust,
    swayPhase: t * 0.5,
  }
}

export function getHearth(t: number) {
  const phase = (t * 0.25 % 1)
  const stoke = Math.max(0, 1 - Math.abs(phase - 0.2) * 4)
  return {
    phase,
    stoke,
    shojiBrighten: stoke * 0.20,
    lanternDim: stoke * 0.28,
    smokeBoost: stoke * 1.6,
  }
}

// V44 BUGFIX: `enteredAt/decay` are written from pointer handlers using
// `performance.now()/1000` (wall clock since nav start). The `t` arg
// here is `state.clock.elapsedTime` (Three.js Canvas-mount clock).
// Mixing them gave silently-negative dwell times → golden hour + boost
// never triggered. Compare against the same wall clock used at write.
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

export function getHoverBoost(_t: number): number {
  const now = typeof performance !== 'undefined' ? performance.now() / 1000 : 0
  if (hoverState.active) {
    const since = now - hoverState.enteredAt
    return Math.min(1, since * 3)
  }
  const sinceLeave = now - hoverState.decay
  return Math.max(0, 1 - sinceLeave * 0.67)
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

export const SKY            = '#CFE5F5'
export const FOG_TINT       = '#E8E0D0'

export const CEDAR_TRUNK    = '#2A1812'
export const CEDAR_DARK     = '#385830'
export const CEDAR_LIGHT    = '#4E6E40'

// V6: warmer Ghibli-correct earth tones + sun-bleached grass highlight.
// V5 was dead-center sage with no warmth; SOIL/CLIFF were muddy defaults.
export const GRASS_LIGHT    = '#A8C77A'
export const GRASS_HILIGHT  = '#C7D89A'
export const GRASS_SHADE    = '#6B8A52'
export const SOIL           = '#B88560'
export const SOIL_DK        = '#8C5E3E'
export const CLIFF          = '#8C5E3E'
export const CLIFF_DK       = '#6B4530'

export const GRAVEL_SAND    = '#E6DAC0'
export const GRAVEL_LINE    = '#C5B98F'

export const WASHI_WALL     = '#F5E8C8'
export const WASHI_GLOW     = '#FFEFD0'
export const WOOD_POST      = '#3A2516'
export const WOOD_BEAM      = '#5A3A20'

// Roof was '#3E3845' (nearly black, swallowed the bright noon scene).
// Real kawara is blue-grey with subtle warm highlight.
export const TILE_ROOF_A    = '#5C6470'
export const TILE_ROOF_B    = '#363C48'    // V9: widened ΔL for visible jitter
export const TILE_ROOF_MOSS = '#5E7048'    // V10: green-shifted (was shadowy)
export const TILE_RIDGE     = '#2E3540'

export const STONE_BASE     = '#A89E8E'
export const STONE_HAT      = '#7E7368'
export const LANTERN_GLOW   = '#FFD080'

export const VERMILLION     = '#C84A35'
export const TORII_BLACK    = '#1F1812'
