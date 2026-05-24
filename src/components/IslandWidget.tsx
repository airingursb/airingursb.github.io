// Inline homepage mini-island — V4 ("kindergarten" → "refined")
//
// V3 was rejected as kindergarten. Sub-A critique #1 (4 hrs work order):
//   1. Sakura was 8 spheres = clown wig → vendor real grove3d Sakura
//      with weeping Bezier branches + 10K instanced petals (we cap with
//      density=0.3 for the inline card)
//   2. Strip flatShading from organic surfaces (trunks/lantern/torii)
//   3. Cone-stack cedars look like Christmas trees → organicBlob slim
//      conifers with per-tree seed
//   4. Box-stack bridge → DELETED (was visual noise)
//   5. Composition: cut maple + bridge + 1 cedar + add raked gravel
//      ring for negative space ("ma")
//   6. Irimoya roof: atan2-correct slabs that meet at ridge + upturned
//      eave corners (Japanese hip-and-gable)
//   7. Bloom + Vignette postprocessing (lantern/shoji emissives pop)

import type React from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { OrbitControls, Sparkles } from '@react-three/drei'
import { EffectComposer, Bloom, Vignette, ToneMapping, SMAA } from '@react-three/postprocessing'
import { ToneMappingMode } from 'postprocessing'
import { ACESFilmicToneMapping, IcosahedronGeometry } from 'three'
import { useMemo, useRef, useEffect } from 'react'
import * as THREE from 'three'
import { Sakura } from './widget-sakura'

// ── V20: SHARED HOVER STATE + V21: MOUSE POSITION for parallax.
const hoverState = {
  active: false,
  enteredAt: 0,
  decay: 0,
}
// V27: sustained-hover dwell triggers golden-hour key shift.
// V31: on touch-only devices (no hover), auto-cycle to keep the
// payoff visible. 14s loop: 4s noon → 3s ramp → 4s golden → 3s ramp.
const IS_TOUCH = typeof window !== 'undefined' && window.matchMedia?.('(hover: none)').matches
function getDwellGolden(t: number): number {
  if (IS_TOUCH) {
    // 14s cycle, smooth triangle 0→1→0
    const phase = (t % 14) / 14
    return phase < 0.5
      ? Math.max(0, (phase - 0.29) / 0.21)
      : Math.max(0, 1 - (phase - 0.50) / 0.21)
  }
  if (hoverState.active) {
    const dwellSec = t - hoverState.enteredAt
    if (dwellSec < 3) return 0
    return Math.min(1, (dwellSec - 3) / 1.5)
  }
  const sinceLeave = t - hoverState.decay
  return Math.max(0, 1 - sinceLeave / 4)
}

// V31: detect mobile / low-end for perf gating
const IS_MOBILE = typeof window !== 'undefined' && (
  /Android|webOS|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent) ||
  (typeof window.matchMedia === 'function' && window.matchMedia('(max-width: 800px)').matches)
)
const mouseState = {
  x: 0,    // normalized -1..1
  y: 0,    // normalized -1..1
}
// V21: hover-zone state (sakura / tsukubai / cabin / null)
const hoverZone: { current: 'sakura' | 'tsukubai' | 'cabin' | null; since: number } = {
  current: null,
  since: 0,
}
function getHoverBoost(t: number): number {
  if (hoverState.active) {
    const since = t - hoverState.enteredAt
    return Math.min(1, since * 3)  // ease in over 0.33s
  }
  // Decay from last active value
  const sinceLeave = t - hoverState.decay
  return Math.max(0, 1 - sinceLeave * 0.67)  // decay over 1.5s
}

// V24: tiny hex-color channel-lerp helper (avoids THREE.Color alloc).
function lerpHex(a: string, b: string, t: number): string {
  const ar = parseInt(a.slice(1, 3), 16), ag = parseInt(a.slice(3, 5), 16), ab = parseInt(a.slice(5, 7), 16)
  const br = parseInt(b.slice(1, 3), 16), bg = parseInt(b.slice(3, 5), 16), bb = parseInt(b.slice(5, 7), 16)
  const r = Math.round(ar + (br - ar) * t)
  const g = Math.round(ag + (bg - ag) * t)
  const bl = Math.round(ab + (bb - ab) * t)
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${bl.toString(16).padStart(2, '0')}`
}

// ── V15: SHARED WIND — single source driving cedar sway, sakura
// WindSway, falling petals, chimney smoke, and cloud rotation. Ghibli
// wind is ONE wind. dir.x and dir.z form a unit-ish vector; gust spikes
// every ~24s pushing everything the SAME direction.
function getWind(t: number) {
  const gust = Math.max(0, Math.sin(t * 0.13) - 0.7) * 3.3
  // Slow direction drift over ~150s
  const dirAngle = Math.sin(t * 0.04) * 0.4
  return {
    dirX: Math.cos(dirAngle),
    dirZ: Math.sin(dirAngle),
    gust,
    swayPhase: t * 0.5,
  }
}

// ── V15: SHARED HEARTH — single source driving smoke puff rate, shoji
// breath brighten, lantern flame dim. Real hearth: smoke puff → 100ms
// later shoji brightens (light flares from stoked flame) → lantern
// dims slightly (draft). Ties cabin into one organism.
function getHearth(t: number) {
  const phase = (t * 0.25 % 1)
  const stoke = Math.max(0, 1 - Math.abs(phase - 0.2) * 4)
  return {
    phase,
    stoke,
    // V16: cranked deltas so coupling is VISIBLE not coded-only
    shojiBrighten: stoke * 0.20,   // was 0.06 — bright flare from stoked flame
    lanternDim:    stoke * 0.28,   // was 0.10 — visible draft-dim
    smokeBoost:    stoke * 1.6,    // V16: smoke puff bursts harder at stoke
  }
}

// ── Palette (bright noon Japanese garden) ───────────────────────────
const SKY            = '#CFE5F5'
const FOG_TINT       = '#E8E0D0'

const CEDAR_TRUNK    = '#2A1812'
const CEDAR_DARK     = '#385830'
const CEDAR_LIGHT    = '#4E6E40'

// V6 (Sub-A #3): warmer Ghibli-correct earth tones + sun-bleached
// grass highlight. V5 GRASS_LIGHT was dead-center sage with no warmth;
// SOIL/CLIFF were muddy defaults.
const GRASS_LIGHT    = '#A8C77A'   // warm sage with yellow tint
const GRASS_HILIGHT  = '#C7D89A'   // sun-bleached highlight patch
const GRASS_SHADE    = '#6B8A52'   // violet-cooled shade pocket
const SOIL           = '#B88560'   // warm cinnamon (was muddy #A07A55)
const SOIL_DK        = '#8C5E3E'   // cliff color, deeper for gradient
const CLIFF          = '#8C5E3E'
const CLIFF_DK       = '#6B4530'   // shadow gradient on cliff face

const GRAVEL_SAND    = '#E6DAC0'   // raked karesansui sand (cream)
const GRAVEL_LINE    = '#C5B98F'   // darker rake-line tone

const WASHI_WALL     = '#F5E8C8'
const WASHI_GLOW     = '#FFEFD0'
const WOOD_POST      = '#3A2516'
const WOOD_BEAM      = '#5A3A20'
// Roof was '#3E3845' (nearly black, swallows the bright noon scene).
// Real kawara is blue-grey with subtle warm highlight.
const TILE_ROOF_A    = '#5C6470'
const TILE_ROOF_B    = '#363C48'   // V9: widened from #454C58 (ΔL≈9→20) so per-tile jitter is actually visible
const TILE_ROOF_MOSS = '#5E7048'   // V10: pushed green channel (was #4A584A — read as shadow not moss)
const TILE_RIDGE     = '#2E3540'

const STONE_BASE     = '#A89E8E'
const STONE_HAT      = '#7E7368'
const LANTERN_GLOW   = '#FFD080'

const VERMILLION     = '#C84A35'
const TORII_BLACK    = '#1F1812'

// ── Helpers: vendor `organicBlob` from Forest.tsx so canopies have
//    per-tree silhouette variation (vs identical Christmas-tree cones)
function organicBlob(radius: number, jitterAmt: number, seed: number): THREE.BufferGeometry {
  const g = new IcosahedronGeometry(radius, 1)
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

// ── Cedar (杉) — slim conifer with 4 vertically-stretched organicBlob
//    canopies. Per-tree seed → no identical trees.
// Cedar (杉) — proper TALL THIN flame silhouette. V11: gentle wind sway.
function Cedar({ x, z, scale = 1, seed = 0 }: { x: number; z: number; scale?: number; seed?: number }) {
  const groupRef = useRef<THREE.Group>(null)
  useFrame((s) => {
    if (!groupRef.current) return
    const t = s.clock.elapsedTime
    // V16: cedars (high mass) lag wind by 0.4s vs petals reacting on t=0
    const wind = getWind(t - 0.4)
    groupRef.current.rotation.z = (Math.sin(t * 0.7 + seed * 0.5) * 0.020) + wind.dirX * (0.012 + wind.gust * 0.025)
    groupRef.current.rotation.x = (Math.cos(t * 0.55 + seed * 0.7) * 0.014) + wind.dirZ * (0.008 + wind.gust * 0.020)
  })

  const layers = useMemo(() => {
    const r = (Math.sin(seed * 3.7) + 1) * 0.5
    return [
      { y: 0.95, blob: organicBlob(0.34 + r * 0.03, 0.06, seed + 10), color: CEDAR_LIGHT },
      { y: 1.25, blob: organicBlob(0.30 + r * 0.03, 0.06, seed + 20), color: CEDAR_DARK },
      { y: 1.55, blob: organicBlob(0.25 + r * 0.03, 0.05, seed + 30), color: CEDAR_LIGHT },
      { y: 1.82, blob: organicBlob(0.20 + r * 0.02, 0.05, seed + 40), color: CEDAR_DARK },
      { y: 2.08, blob: organicBlob(0.14 + r * 0.02, 0.04, seed + 50), color: CEDAR_LIGHT },
      { y: 2.30, blob: organicBlob(0.08 + r * 0.01, 0.03, seed + 60), color: CEDAR_DARK },
    ]
  }, [seed])

  return (
    <group ref={groupRef} position={[x, 0.025, z]} scale={scale} rotation={[0, seed * 0.6, 0]}>
      {/* Slim trunk — 1.6m tall, smooth 16-seg */}
      <mesh position={[0, 0.80, 0]} castShadow>
        <cylinderGeometry args={[0.04, 0.07, 1.6, 16]} />
        <meshStandardMaterial color={CEDAR_TRUNK} roughness={0.92} />
      </mesh>
      {/* Layered organic canopy — narrow flame, vertically stretched 2.2× */}
      {layers.map((l, i) => (
        <mesh key={i} position={[0, l.y, 0]} geometry={l.blob} scale={[0.9, 2.2, 0.9]} castShadow>
          <meshStandardMaterial color={l.color} roughness={0.93} />
        </mesh>
      ))}
    </group>
  )
}

// ── Minka cabin with IRIMOYA roof (atan2-derived hip-and-gable) ─────
function MinkaCabin() {
  const CABIN_W = 1.1
  const CABIN_D = 0.78
  const WALL_H = 0.5
  // ROOF_RISE 0.42 (38% pitch) was too shallow for irimoya. Real ones
  // are 50-60%. Bumped to 0.58 so the roof reads as a proper tile-roof
  // silhouette, not a barn shed.
  const ROOF_RISE = 0.58
  const X_OVERHANG = 0.22
  const Z_OVERHANG = 0.20
  const slabHalfWidth = CABIN_W / 2 + X_OVERHANG
  const slabLen = Math.hypot(slabHalfWidth, ROOF_RISE)
  const slabTilt = Math.atan2(ROOF_RISE, slabHalfWidth)
  const slabDepth = CABIN_D + 2 * Z_OVERHANG
  const SLAB_THICK = 0.05

  // Gable triangle for irimoya end walls (small upper triangle)
  const gableShape = useMemo(() => {
    const s = new THREE.Shape()
    s.moveTo(-CABIN_W / 2, 0)
    s.lineTo(CABIN_W / 2, 0)
    s.lineTo(0, ROOF_RISE)
    s.closePath()
    return s
  }, [])

  return (
    <group position={[-0.55, 0.05, 0.0]} rotation={[0, 0.32, 0]}>
      {/* Stone foundation strip */}
      <mesh position={[0, 0.08, 0]} castShadow receiveShadow>
        <boxGeometry args={[CABIN_W + 0.1, 0.1, CABIN_D + 0.12]} />
        <meshStandardMaterial color="#A09680" roughness={0.95} />
      </mesh>
      {/* Engawa (raised wood deck on front side) */}
      <mesh position={[0, 0.05, CABIN_D / 2 + 0.11]} castShadow receiveShadow>
        <boxGeometry args={[CABIN_W + 0.16, 0.06, 0.22]} />
        <meshStandardMaterial color="#8B6A48" roughness={0.9} />
      </mesh>
      {/* Engawa support posts */}
      {[-CABIN_W / 2 + 0.04, CABIN_W / 2 - 0.04].map((px, i) => (
        <mesh key={`epost${i}`} position={[px, 0.025, CABIN_D / 2 + 0.21]} castShadow>
          <cylinderGeometry args={[0.018, 0.018, 0.05, 8]} />
          <meshStandardMaterial color={WOOD_BEAM} roughness={0.92} />
        </mesh>
      ))}

      {/* Walls — bright cream washi */}
      <mesh position={[0, 0.08 + WALL_H / 2, 0]} castShadow receiveShadow>
        <boxGeometry args={[CABIN_W, WALL_H, CABIN_D]} />
        <meshStandardMaterial color={WASHI_WALL} roughness={0.88} />
      </mesh>
      {/* 4 exposed corner posts (smooth round) */}
      {(
        [
          [-CABIN_W / 2 + 0.02, 0.08 + WALL_H / 2, -CABIN_D / 2 + 0.02],
          [CABIN_W / 2 - 0.02, 0.08 + WALL_H / 2, -CABIN_D / 2 + 0.02],
          [-CABIN_W / 2 + 0.02, 0.08 + WALL_H / 2, CABIN_D / 2 - 0.02],
          [CABIN_W / 2 - 0.02, 0.08 + WALL_H / 2, CABIN_D / 2 - 0.02],
        ] as Array<[number, number, number]>
      ).map((p, i) => (
        <mesh key={`pst${i}`} position={p} castShadow>
          <cylinderGeometry args={[0.028, 0.028, WALL_H + 0.05, 10]} />
          <meshStandardMaterial color={WOOD_POST} roughness={0.92} />
        </mesh>
      ))}
      {/* Horizontal beam under roof eaves (nageshi) */}
      <mesh position={[0, 0.08 + WALL_H - 0.02, CABIN_D / 2 + 0.005]} castShadow>
        <boxGeometry args={[CABIN_W + 0.04, 0.05, 0.04]} />
        <meshStandardMaterial color={WOOD_BEAM} roughness={0.92} />
      </mesh>

      {/* Shoji window — V13: breath animation via useFrame component */}
      <BreathingShoji
        position={[0, 0.08 + WALL_H * 0.6, CABIN_D / 2 + 0.003]}
        size={[CABIN_W * 0.78, WALL_H * 0.55]}
      />
      {/* Shoji grid frame (5 vertical × 3 horizontal) */}
      {[-0.34, -0.17, 0, 0.17, 0.34].map((vx, i) => (
        <mesh key={`vbar${i}`} position={[vx * CABIN_W * 0.78, 0.08 + WALL_H * 0.6, CABIN_D / 2 + 0.004]}>
          <boxGeometry args={[0.014, WALL_H * 0.55, 0.003]} />
          <meshStandardMaterial color={WOOD_POST} roughness={0.88} />
        </mesh>
      ))}
      {[-0.32, 0, 0.32].map((hy, i) => (
        <mesh key={`hbar${i}`} position={[0, 0.08 + WALL_H * 0.6 + hy * WALL_H * 0.55 / 2, CABIN_D / 2 + 0.004]}>
          <boxGeometry args={[CABIN_W * 0.78, 0.014, 0.003]} />
          <meshStandardMaterial color={WOOD_POST} roughness={0.88} />
        </mesh>
      ))}

      {/* === IRIMOYA roof — atan2-correct slabs meet at ridge === */}
      {(['left', 'right'] as const).map((side) => {
        const sign = side === 'left' ? -1 : 1
        return (
          <group
            key={side}
            position={[sign * slabHalfWidth, 0.08 + WALL_H, 0]}
            rotation={[0, 0, -sign * slabTilt]}
          >
            {/* Solid roof slab */}
            <mesh position={[-sign * slabLen / 2, 0, 0]} castShadow receiveShadow>
              <boxGeometry args={[slabLen, SLAB_THICK, slabDepth]} />
              <meshStandardMaterial color={TILE_ROOF_A} roughness={0.78} flatShading />
            </mesh>
            {/* 14 horizontal tile courses w/ per-tile jitter + moss tone.
                V9: widened color range + moss override on ~15% of tiles
                (real kawara has random moss patches, not perfect rows). */}
            {Array.from({ length: 14 }).map((_, i) => {
              const frac = (i + 0.5) / 14
              // V24 BUGFIX: per-render Color allocation removed.
              // Pre-compute string color, let Three.js parse string (cheaper).
              const jitter = Math.pow(
                (Math.sin(i * 7.3 + (sign > 0 ? 1.7 : 0)) + 1) * 0.5,
                0.6,
              )
              const isMoss = ((i * 5 + (sign > 0 ? 3 : 0)) % 7) === 0
              // Lerp via channel math (no THREE.Color alloc in render path)
              const colorStr = isMoss
                ? TILE_ROOF_MOSS
                : lerpHex(TILE_ROOF_A, TILE_ROOF_B, jitter)
              return (
                <mesh
                  key={`tile${side}${i}`}
                  position={[-sign * frac * slabLen, SLAB_THICK / 2 + 0.012, 0]}
                >
                  <boxGeometry args={[slabLen / 14 * 0.88, 0.020, slabDepth - 0.04]} />
                  <meshStandardMaterial
                    color={colorStr}
                    roughness={0.85}
                    flatShading
                  />
                </mesh>
              )
            })}
            {/* Upturned eave corners — small thin wedges flicked up at the
                two front-corner ends. Subtle but signals "Japanese". */}
            {[-slabDepth / 2 + 0.04, slabDepth / 2 - 0.04].map((zEnd, i) => (
              <mesh
                key={`flick${side}${i}`}
                position={[-sign * slabLen * 0.92, 0.03, zEnd]}
                rotation={[0, 0, -sign * 0.18]}
                castShadow
              >
                <boxGeometry args={[0.12, 0.025, 0.08]} />
                <meshStandardMaterial color={TILE_ROOF_A} roughness={0.78} flatShading />
              </mesh>
            ))}
          </group>
        )
      })}

      {/* Front + back gable triangles (real shapeGeometry) */}
      {[CABIN_D / 2 + 0.005, -(CABIN_D / 2 + 0.005)].map((zz, i) => (
        <mesh
          key={`gable${i}`}
          position={[0, 0.08 + WALL_H, zz]}
          rotation={[0, i === 1 ? Math.PI : 0, 0]}
        >
          <shapeGeometry args={[gableShape]} />
          <meshStandardMaterial color={WOOD_BEAM} side={THREE.DoubleSide} roughness={0.88} />
        </mesh>
      ))}

      {/* Ridge cap — beefy box on ridge line */}
      <mesh position={[0, 0.08 + WALL_H + ROOF_RISE + 0.03, 0]} castShadow>
        <boxGeometry args={[0.18, 0.10, slabDepth + 0.04]} />
        <meshStandardMaterial color={TILE_RIDGE} roughness={0.7} />
      </mesh>
      {/* 2 onigawara end finials on the ridge — V7: squat outward-canted
          wedges instead of upright party-hat cones. Real onigawara curl
          outward along the ridge axis. */}
      {[(slabDepth - 0.04) / 2, -(slabDepth - 0.04) / 2].map((zz, i) => {
        const cantSign = i === 0 ? 1 : -1
        return (
          <group key={`onig${i}`} position={[0, 0.08 + WALL_H + ROOF_RISE + 0.10, zz]}>
            <mesh rotation={[cantSign * 0.35, 0, 0]} castShadow>
              <boxGeometry args={[0.10, 0.10, 0.06]} />
              <meshStandardMaterial color="#1F2530" roughness={0.7} flatShading />
            </mesh>
            <mesh position={[0, 0.07, cantSign * 0.04]} castShadow>
              <sphereGeometry args={[0.030, 10, 8]} />
              <meshStandardMaterial color="#1F2530" roughness={0.75} />
            </mesh>
          </group>
        )
      })}
    </group>
  )
}

// ── Stone lantern (smooth-shaded, no flat) ──────────────────────────
function StoneLantern({ x, z }: { x: number; z: number }) {
  const flameRef = useRef<THREE.Group>(null)
  // V13: 2-octave flame flicker. V18: dims 300ms AFTER smoke puffs (draft pull).
  useFrame((s) => {
    if (!flameRef.current) return
    const t = s.clock.elapsedTime
    const hearth = getHearth(t - 0.30)
    const intensity = 0.85 + Math.sin(t * 4.3) * 0.08 + Math.sin(t * 11.7) * 0.04 - hearth.lanternDim
    flameRef.current.traverse((obj) => {
      const m = obj as THREE.Mesh
      if (m.isMesh && m.material) {
        const mat = m.material as THREE.MeshStandardMaterial
        if (mat.emissive) mat.emissiveIntensity = intensity
      }
    })
  })
  return (
    <group position={[x, 0.025, z]} scale={0.45}>
      {/* Hex base */}
      <mesh position={[0, 0.06, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[0.20, 0.22, 0.12, 8]} />
        <meshStandardMaterial color={STONE_BASE} roughness={0.95} />
      </mesh>
      <mesh position={[0, 0.27, 0]} castShadow>
        <cylinderGeometry args={[0.06, 0.075, 0.30, 10]} />
        <meshStandardMaterial color={STONE_BASE} roughness={0.95} />
      </mesh>
      <mesh position={[0, 0.45, 0]} castShadow>
        <cylinderGeometry args={[0.14, 0.16, 0.04, 8]} />
        <meshStandardMaterial color={STONE_HAT} roughness={0.95} />
      </mesh>
      <mesh position={[0, 0.56, 0]} castShadow>
        <boxGeometry args={[0.22, 0.16, 0.22]} />
        <meshStandardMaterial color={STONE_BASE} roughness={0.92} />
      </mesh>
      {/* 4 glowing window panes — wrapped in flameRef for flicker */}
      <group ref={flameRef}>
        {([
          [0, 0.56, 0.111, 0],
          [0, 0.56, -0.111, Math.PI],
          [0.111, 0.56, 0, Math.PI / 2],
          [-0.111, 0.56, 0, -Math.PI / 2],
        ] as Array<[number, number, number, number]>).map((p, i) => (
          <mesh key={i} position={[p[0], p[1], p[2]]} rotation={[0, p[3], 0]}>
            <planeGeometry args={[0.13, 0.11]} />
            <meshStandardMaterial
              color={LANTERN_GLOW}
              emissive={LANTERN_GLOW}
              emissiveIntensity={0.9}
              roughness={0.4}
            />
          </mesh>
        ))}
      </group>
      {/* Roof (6-sided low pyramid) */}
      <mesh position={[0, 0.74, 0]} castShadow>
        <coneGeometry args={[0.27, 0.16, 6]} />
        <meshStandardMaterial color={STONE_HAT} roughness={0.95} flatShading />
      </mesh>
      <mesh position={[0, 0.86, 0]} castShadow>
        <sphereGeometry args={[0.042, 12, 10]} />
        <meshStandardMaterial color={STONE_HAT} roughness={0.92} />
      </mesh>
    </group>
  )
}

// ── Torii (smooth posts, slight kasagi curve via two stacked layers) ─
function Torii({ x, z, rotY = 0 }: { x: number; z: number; rotY?: number }) {
  return (
    <group position={[x, 0.025, z]} rotation={[0, rotY, 0]} scale={0.75}>
      {[-0.45, 0.45].map((px, i) => (
        <mesh key={i} position={[px, 0.65, 0]} castShadow>
          <cylinderGeometry args={[0.06, 0.078, 1.3, 14]} />
          <meshStandardMaterial color={VERMILLION} roughness={0.7} />
        </mesh>
      ))}
      {/* Nuki (lower beam, between pillars, vermillion) */}
      <mesh position={[0, 1.04, 0]} castShadow>
        <boxGeometry args={[0.75, 0.08, 0.10]} />
        <meshStandardMaterial color={VERMILLION} roughness={0.7} />
      </mesh>
      {/* Kasagi (upper beam, black, overhangs) — two-layer to fake curve */}
      <mesh position={[0, 1.26, 0]} castShadow>
        <boxGeometry args={[1.18, 0.10, 0.14]} />
        <meshStandardMaterial color={TORII_BLACK} roughness={0.65} />
      </mesh>
      <mesh position={[0, 1.36, 0]} castShadow>
        <boxGeometry args={[1.12, 0.05, 0.11]} />
        <meshStandardMaterial color={TORII_BLACK} roughness={0.65} />
      </mesh>
      {/* Center support (gakuzuka) */}
      <mesh position={[0, 1.15, 0]} castShadow>
        <boxGeometry args={[0.05, 0.13, 0.06]} />
        <meshStandardMaterial color={VERMILLION} roughness={0.7} />
      </mesh>
    </group>
  )
}

// ── Raked karesansui gravel ring around the cabin — "ma" / negative
//    space marker. Concentric flat tori suggest the rake lines.
function RakedGravel() {
  return (
    <group position={[-0.55, 0.052, 0.0]}>
      {/* Sand disk */}
      <mesh receiveShadow>
        <cylinderGeometry args={[0.95, 0.95, 0.005, 48]} />
        <meshStandardMaterial color={GRAVEL_SAND} roughness={1.0} />
      </mesh>
      {/* Concentric rake-line tori — V24 BUGFIX: y 0.004→0.010 (was
          intersecting sand disk causing z-fighting on mobile) */}
      {[0.55, 0.68, 0.81, 0.92].map((r, i) => (
        <mesh key={i} position={[0, 0.010, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <torusGeometry args={[r, 0.005, 4, 64]} />
          <meshStandardMaterial color={GRAVEL_LINE} roughness={0.95} />
        </mesh>
      ))}
      {/* 1 small mossy stone in the gravel for wabi-sabi */}
      <mesh position={[0.35, 0.04, 0.45]} castShadow>
        <dodecahedronGeometry args={[0.10, 0]} />
        <meshStandardMaterial color="#7E7368" roughness={0.95} flatShading />
      </mesh>
      <mesh position={[0.35, 0.10, 0.45]}>
        <sphereGeometry args={[0.06, 12, 10]} />
        <meshStandardMaterial color="#6A8A55" roughness={0.95} />
      </mesh>
    </group>
  )
}

// Tsukubai — Japanese stone water basin with bamboo spout.
// Real gardens always have water or a stone substitute. Adds wabi-sabi
// + the dark water disk makes the lantern bloom catch beautifully.
function Tsukubai({ x, z }: { x: number; z: number }) {
  return (
    <group position={[x, 0.025, z]} scale={0.55}>
      {/* Stone basin block (square, slightly rounded look via box) */}
      <mesh position={[0, 0.13, 0]} castShadow receiveShadow>
        <boxGeometry args={[0.34, 0.26, 0.34]} />
        <meshStandardMaterial color={STONE_BASE} roughness={0.95} flatShading />
      </mesh>
      {/* Deeper stone trim around top edge */}
      <mesh position={[0, 0.27, 0]} castShadow>
        <boxGeometry args={[0.40, 0.04, 0.40]} />
        <meshStandardMaterial color={STONE_HAT} roughness={0.95} flatShading />
      </mesh>
      {/* Basin lip — small torus around the rim makes the cavity read */}
      <mesh position={[0, 0.27, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.13, 0.012, 8, 22]} />
        <meshStandardMaterial color={STONE_HAT} roughness={0.95} />
      </mesh>
      {/* Recessed water surface — V14: animated micro-ripple via WaterSurface */}
      <WaterSurface />
      {/* Bamboo spout — V7: spout end now ABOVE basin pouring DOWN.
          Group pivot = spout tip at (0, 0.32, 0) directly above basin
          center. Cylinder body extends up-and-back at 45° via Z-rot. */}
      <group position={[0, 0.32, 0]} rotation={[0, 0, -Math.PI / 4]}>
        {/* Bamboo body — local +Y, so after rotation extends up-and-+X */}
        <mesh position={[0, 0.225, 0]} castShadow>
          <cylinderGeometry args={[0.025, 0.025, 0.45, 12]} />
          <meshStandardMaterial color="#A89055" roughness={0.85} />
        </mesh>
        {/* 3 bamboo node rings */}
        {[0.075, 0.225, 0.375].map((dy, i) => (
          <mesh key={i} position={[0, dy, 0]}>
            <torusGeometry args={[0.027, 0.005, 6, 14]} />
            <meshStandardMaterial color="#6E5A2E" roughness={0.85} />
          </mesh>
        ))}
        {/* Spout opening cap (slight overhang at tip) */}
        <mesh position={[0, -0.005, 0]}>
          <torusGeometry args={[0.026, 0.004, 6, 14]} />
          <meshStandardMaterial color="#6E5A2E" roughness={0.85} />
        </mesh>
      </group>
      {/* V10: tapered stream (narrow at spout, wide at impact) + animated
          ripples. V12: y position corrected so stream EXACTLY spans
          spout tip → water surface. */}
      <WaterStream />
      {/* Small base stones (genkan-ish, around the basin) */}
      {([
        [0.30, 0.04, 0.16, 0.07],
        [-0.28, 0.04, -0.12, 0.06],
        [-0.16, 0.04, 0.28, 0.05],
      ] as Array<[number, number, number, number]>).map((p, i) => (
        <mesh key={i} position={[p[0], p[1], p[2]]} castShadow>
          <dodecahedronGeometry args={[p[3], 0]} />
          <meshStandardMaterial color={STONE_HAT} roughness={0.95} flatShading />
        </mesh>
      ))}
    </group>
  )
}

// Vertex-displaced + vertex-COLORED ground plane.
// V11: per-vertex color lerps warmth based on displacement+radial, so
// the grass reads as continuous breathing terrain not flat painted disk
// with decal patches on top.
function makeDisplacedGroundGeo(): THREE.BufferGeometry {
  const g = new THREE.CircleGeometry(2.05, 64)
  const pos = g.attributes.position
  const cBase = new THREE.Color(GRASS_LIGHT)
  const cHi = new THREE.Color(GRASS_HILIGHT)
  const cLo = new THREE.Color(GRASS_SHADE)
  const colors = new Float32Array(pos.count * 3)
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), y = pos.getY(i)
    const d = Math.hypot(x, y)
    let displaceZ = 0
    if (d > 0.01) {
      const n = Math.sin(x * 4.2) * Math.cos(y * 3.7) + Math.sin((x + y) * 2.8)
      displaceZ = n * 0.025
      pos.setZ(i, displaceZ)
    }
    // Color = lerp shade→hilight by displacement+noise. Bumps get sun.
    const noise = (Math.sin(x * 1.7 + y * 2.3) + Math.cos(x * 2.9 - y * 1.5)) * 0.5
    const t = Math.max(0, Math.min(1, 0.5 + displaceZ * 12 + noise * 0.35))
    const c = t < 0.5
      ? new THREE.Color().lerpColors(cLo, cBase, t * 2)
      : new THREE.Color().lerpColors(cBase, cHi, (t - 0.5) * 2)
    colors[i * 3] = c.r
    colors[i * 3 + 1] = c.g
    colors[i * 3 + 2] = c.b
  }
  pos.needsUpdate = true
  g.setAttribute('color', new THREE.BufferAttribute(colors, 3))
  g.computeVertexNormals()
  return g
}

// V24: deleted dead LightShafts function (~40 LOC) — replaced by drei
// Sparkles in V12, never re-mounted.

function Island() {
  const groundGeo = useMemo(makeDisplacedGroundGeo, [])
  useEffect(() => () => groundGeo.dispose(), [groundGeo])  // V26: dispose hygiene
  return (
    <group>
      {/* Grass top — vertex-colored displaced plane.
          V11: removed decal circles in favor of per-vertex color lerp
          so terrain warmth follows the bump map continuously. */}
      <mesh
        geometry={groundGeo}
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, 0.05, 0]}
        receiveShadow
      >
        <meshStandardMaterial vertexColors roughness={0.96} />
      </mesh>
      {/* Cylinder side rim */}
      <mesh position={[0, 0, 0]} receiveShadow>
        <cylinderGeometry args={[2.05, 2.05, 0.10, 64]} />
        <meshStandardMaterial color={GRASS_LIGHT} roughness={0.96} />
      </mesh>

      {/* Soil — warmer cinnamon */}
      <mesh position={[0, -0.18, 0]} castShadow>
        <cylinderGeometry args={[2.05, 1.7, 0.28, 36]} />
        <meshStandardMaterial color={SOIL} roughness={0.95} flatShading />
      </mesh>

      {/* Cliff — 2 layers for gradient (V5 was single brown lump) */}
      <mesh position={[0, -0.78, 0]} castShadow>
        <coneGeometry args={[1.65, 0.85, 32]} />
        <meshStandardMaterial color={CLIFF} roughness={0.95} flatShading />
      </mesh>
      <mesh position={[0, -1.15, 0]} castShadow>
        <coneGeometry args={[1.30, 0.65, 28]} />
        <meshStandardMaterial color={CLIFF_DK} roughness={0.95} flatShading />
      </mesh>

      {/* 3 rock outcrops on cliff face */}
      {([
        [1.20, -0.55, 0.55, 0.18],
        [-0.85, -0.45, 1.20, 0.16],
        [-0.60, -0.75, -1.10, 0.14],
      ] as Array<[number, number, number, number]>).map((p, i) => (
        <mesh
          key={`rock${i}`}
          position={[p[0], p[1], p[2]]}
          rotation={[i, i * 0.7, i * 0.3]}
          castShadow
        >
          <dodecahedronGeometry args={[p[3], 0]} />
          <meshStandardMaterial color="#7A6555" roughness={0.95} flatShading />
        </mesh>
      ))}
    </group>
  )
}

// ── Tobi-ishi (stepping stones) — torii → gravel edge.
// V6 ended INSIDE the gravel ring (overlap). V7: end at the gravel
// ring's torii-facing edge so stones VISUALLY connect to it.
function SteppingStones() {
  // V8: stones go from torii (0.65, 1.55) to TSUKUBAI (0.95, 0.4) —
  // the canonical tea-ceremony approach. (V7 went to gravel ring edge
  // which led "to nothing".)
  const points: Array<[number, number, number]> = [
    [0.55, 1.32, 0.1],
    [0.62, 1.08, -0.3],
    [0.70, 0.88, 0.5],
    [0.78, 0.70, -0.2],
    [0.85, 0.55, 0.4],
  ]
  return (
    <group>
      {points.map((p, i) => (
        <mesh
          key={i}
          position={[p[0], 0.058, p[1]]}
          rotation={[0, p[2] + i * 0.17, 0]}
          scale={[1, 0.5, 1.2]}
          castShadow
          receiveShadow
        >
          <dodecahedronGeometry args={[0.095, 0]} />
          <meshStandardMaterial color="#9C9085" roughness={0.95} flatShading />
        </mesh>
      ))}
    </group>
  )
}

// ── FallenPetals — sakura petals scattered on the ground.
// V6 were 14mm pink dots (rice grains). V7: elongated teardrop ovals
// via shapeGeometry (5-lobe sakura petal silhouette).
function makePetalShape(): THREE.Shape {
  const s = new THREE.Shape()
  // Teardrop with DEEPER V-notch at tip (V7 notch was 0.038 — too shallow)
  s.moveTo(0, 0)
  s.bezierCurveTo(-0.024, 0.018, -0.030, 0.044, 0, 0.060)
  s.bezierCurveTo(-0.006, 0.045, -0.003, 0.038, 0, 0.030)
  s.bezierCurveTo(0.003, 0.038, 0.006, 0.045, 0, 0.060)
  s.bezierCurveTo(0.030, 0.044, 0.024, 0.018, 0, 0)
  return s
}

function FallenPetals() {
  const petalGeo = useMemo(() => new THREE.ShapeGeometry(makePetalShape(), 8), [])
  // V25: dispose on unmount (was leaking on hot-reload / route change)
  useEffect(() => () => petalGeo.dispose(), [petalGeo])
  const positions = useMemo(() => {
    const out: Array<{ x: number; z: number; rot: number; scale: number }> = []
    // V8: fewer + bigger petals read better at autorotate speed
    for (let i = 0; i < 38; i++) {
      const a = Math.random() * Math.PI * 2
      const r = Math.sqrt(Math.random()) * 0.95
      out.push({
        x: Math.cos(a) * r,
        z: Math.sin(a) * r,
        rot: Math.random() * Math.PI * 2,
        scale: 1.0 + Math.random() * 0.8,
      })
    }
    return out
  }, [])
  return (
    <group position={[0.55, 0.058, -0.35]}>
      {positions.map((p, i) => (
        <mesh
          key={i}
          position={[p.x, 0, p.z]}
          // V10: petal rotation.x variance — real fallen petals curl
          rotation={[-Math.PI / 2 + (Math.sin(i * 4.3) * 0.15), 0, p.rot]}
          scale={p.scale}
          geometry={petalGeo}
        >
          <meshStandardMaterial
            color={i % 3 === 0 ? '#FFEAF1' : i % 2 ? '#F5C8D6' : '#FFD8E3'}
            roughness={0.9}
            side={THREE.DoubleSide}
          />
        </mesh>
      ))}
    </group>
  )
}

// ── AnimatedSun — V14: subtle breathing on the main directional light.
// 90s cycle: intensity ±0.06, color #FFE8C0 → #FFD8A0 → #FFE8C0.
// Owns the sun light entirely (replaces the static directionalLight).
// V27: SkyMood — fog warms on dwell.
// V29: ALSO updates --island-dwell CSS var on the canvas wrapper so the
// outer CSS sky gradient lerps in lockstep (breaks the last cool-blue
// border around the warmed in-canvas scene).
function SkyMood() {
  const { scene, gl } = useThree()
  const cFog = useMemo(() => new THREE.Color(FOG_TINT), [])
  const cGoldenSky = useMemo(() => new THREE.Color('#F0D8B0'), [])
  const scratch = useMemo(() => new THREE.Color(), [])
  useFrame((s) => {
    const dwell = getDwellGolden(s.clock.elapsedTime)
    if (scene.fog) {
      scratch.copy(cFog).lerp(cGoldenSky, dwell)
      ;(scene.fog as THREE.Fog).color.copy(scratch)
    }
    // V29: drive the outer CSS sky gradient via the canvas wrapper var
    const canvasEl = gl.domElement
    const wrapper = canvasEl.closest('.island-card-canvas') as HTMLElement | null
    if (wrapper) wrapper.style.setProperty('--island-dwell', String(dwell))
  })
  return null
}

function AnimatedSun() {
  const lightRef = useRef<THREE.DirectionalLight>(null)
  const cWarm = useMemo(() => new THREE.Color('#FFE8C0'), [])
  const cAmber = useMemo(() => new THREE.Color('#FFD8A0'), [])
  const cGolden = useMemo(() => new THREE.Color('#FFB870'), [])
  const scratch = useMemo(() => new THREE.Color(), [])
  useFrame((s) => {
    if (!lightRef.current) return
    const t = s.clock.elapsedTime
    const cycle = (Math.sin(t * 0.07) + 1) * 0.5
    const dwell = getDwellGolden(t)
    lightRef.current.intensity = 2.44 + Math.sin(t * 0.07) * 0.06 - dwell * 0.20
    scratch.copy(cWarm).lerp(cAmber, cycle * 0.6).lerp(cGolden, dwell)
    lightRef.current.color = scratch
    // V28: sun POSITION lowers on dwell — shadows lengthen with the warmth
    lightRef.current.position.x = 4 + dwell * 1.5
    lightRef.current.position.y = 5.5 - dwell * 1.3
    lightRef.current.position.z = 3 - dwell * 0.4
  })
  return (
    <directionalLight
      ref={lightRef}
      position={[4, 5.5, 3]}
      intensity={2.5}
      color="#FFE8C0"
      castShadow
      shadow-mapSize={[2048, 2048]}
      shadow-camera-near={0.5}
      shadow-camera-far={14}
      shadow-camera-left={-3.5}
      shadow-camera-right={3.5}
      shadow-camera-top={3.5}
      shadow-camera-bottom={-3.5}
      shadow-bias={-0.0008}
    />
  )
}

// ── AnimatedHearthLight — V17: pointLight at cabin shoji pulses with hearth.
function AnimatedHearthLight() {
  const ref = useRef<THREE.PointLight>(null)
  useFrame((s) => {
    if (!ref.current) return
    // V18: cast light follows shoji (also lag 150ms vs smoke)
    const hearth = getHearth(s.clock.elapsedTime - 0.15)
    ref.current.intensity = 0.7 + hearth.shojiBrighten * 0.8
  })
  return (
    <pointLight
      ref={ref}
      position={[-0.55, 0.45, 0.40]}
      intensity={0.7}
      distance={1.8}
      decay={2}
      color="#FFEFD0"
    />
  )
}

// ── BreathingShoji — paper window with subtle emissive lerp.
// V13: cabin reads as inhabited, not LED-lit.
function BreathingShoji({ position, size }: {
  position: [number, number, number]
  size: [number, number]
}) {
  const ref = useRef<THREE.MeshStandardMaterial>(null)
  useFrame((s) => {
    if (!ref.current) return
    const t = s.clock.elapsedTime
    const hearth = getHearth(t - 0.15)
    // V20: hover flare adds extra brighten
    const hover = getHoverBoost(t)
    ref.current.emissiveIntensity = 0.42 + Math.sin(t * 0.6) * 0.05 + hearth.shojiBrighten + hover * 0.18
  })
  return (
    <mesh position={position}>
      <planeGeometry args={size} />
      <meshStandardMaterial
        ref={ref}
        color={WASHI_GLOW}
        emissive={WASHI_GLOW}
        emissiveIntensity={0.45}
        roughness={0.5}
      />
    </mesh>
  )
}

// ── DistantClouds — slow-drifting white puff cluster BELOW the island.
function DistantClouds() {
  const groupRef = useRef<THREE.Group>(null)
  useFrame((s) => {
    if (!groupRef.current) return
    const t = s.clock.elapsedTime
    const wind = getWind(t)
    // V15: rotation speed scaled by shared wind gust
    groupRef.current.rotation.y = t * 0.012 * (1 + wind.gust * 0.5)
  })
  const puffs: Array<[number, number, number, number]> = [
    [3.8, -2.6, 1.0, 0.85],
    [-3.5, -2.8, -1.2, 0.95],
    [1.0, -3.0, 3.6, 0.7],
    [-1.5, -2.5, -3.4, 0.75],
    [3.2, -2.9, -2.6, 0.65],
    [-2.8, -2.7, 2.8, 0.6],
  ]
  return (
    <group ref={groupRef}>
      {puffs.map((p, i) => (
        <group key={i} position={[p[0], p[1], p[2]]} scale={p[3]}>
          <mesh>
            <sphereGeometry args={[0.45, 16, 12]} />
            <meshBasicMaterial color="#FFFFFF" transparent opacity={0.55} />
          </mesh>
          <mesh position={[0.30, 0.05, 0.10]}>
            <sphereGeometry args={[0.32, 14, 10]} />
            <meshBasicMaterial color="#F8F4EC" transparent opacity={0.50} />
          </mesh>
          <mesh position={[-0.25, -0.05, -0.12]}>
            <sphereGeometry args={[0.28, 14, 10]} />
            <meshBasicMaterial color="#FFFFFF" transparent opacity={0.50} />
          </mesh>
        </group>
      ))}
    </group>
  )
}

// ── V23: MidCloudWisps — 4 small wispy puffs drifting across the
// mountain mid-ground z=-6 to -8, completing horizon depth.
function MidCloudWisps() {
  const refs = [
    useRef<THREE.Group>(null),
    useRef<THREE.Group>(null),
    useRef<THREE.Group>(null),
    useRef<THREE.Group>(null),
  ]
  const seeds = [
    { startX: -6, z: -6.5, y: 0.3, speed: 0.12, scale: 0.55 },
    { startX: -4, z: -7.5, y: 0.0, speed: 0.09, scale: 0.7 },
    { startX: -7, z: -7.0, y: 0.6, speed: 0.10, scale: 0.5 },
    { startX: -5, z: -8.5, y: 0.2, speed: 0.07, scale: 0.65 },
  ]
  useFrame((s) => {
    const t = s.clock.elapsedTime
    refs.forEach((r, i) => {
      if (!r.current) return
      const sd = seeds[i]
      const x = ((sd.startX + t * sd.speed) % 14) - 7
      r.current.position.set(x, sd.y, sd.z)
    })
  })
  return (
    <>
      {refs.map((r, i) => {
        const sd = seeds[i]
        return (
          <group key={i} ref={r} scale={sd.scale}>
            <mesh>
              <sphereGeometry args={[0.35, 12, 10]} />
              <meshBasicMaterial color="#F5F0E8" transparent opacity={0.42} depthWrite={false} />
            </mesh>
            <mesh position={[0.32, -0.04, 0]}>
              <sphereGeometry args={[0.25, 10, 8]} />
              <meshBasicMaterial color="#FAF8F2" transparent opacity={0.38} depthWrite={false} />
            </mesh>
            <mesh position={[-0.28, 0.02, 0]}>
              <sphereGeometry args={[0.22, 10, 8]} />
              <meshBasicMaterial color="#F5F0E8" transparent opacity={0.40} depthWrite={false} />
            </mesh>
          </group>
        )
      })}
    </>
  )
}

// ── V23: PathMoss — small green patches between stepping stones.
// Static, but adds the wabi-sabi "old garden, well-trodden" detail.
function PathMoss() {
  // Positions between consecutive stones (midpoints + slight offsets)
  const patches: Array<[number, number, number, number]> = [
    [0.48, 1.20, 0.08, 0.5],     // between stone 0 and 1
    [0.35, 1.02, -0.06, 0.4],
    [0.21, 0.88, 0.05, 0.45],
    [0.08, 0.76, -0.04, 0.4],
    [0.00, 0.69, 0.03, 0.35],
  ]
  return (
    <group>
      {patches.map((p, i) => (
        <mesh
          key={i}
          position={[p[0], 0.058, p[1]]}
          rotation={[-Math.PI / 2, 0, p[2]]}
          scale={p[3]}
        >
          <circleGeometry args={[0.08, 12]} />
          <meshStandardMaterial color="#7AA868" roughness={0.95} />
        </mesh>
      ))}
    </group>
  )
}

// ── V21: ParallaxRig — diorama-in-window effect. Camera subtly
// tracks mouse position (lerped) → scene reads as a peep-box, not a video.
function ParallaxRig() {
  const { camera } = useThree()
  const baseX = 2.9
  const baseY = 1.5
  const baseZ = 3.7
  useFrame((_, dt) => {
    const targetX = baseX + mouseState.x * 0.25
    const targetY = baseY + mouseState.y * -0.15  // invert Y so up looks down
    const lerpAmt = Math.min(1, dt * 3)
    camera.position.x += (targetX - camera.position.x) * lerpAmt
    camera.position.y += (targetY - camera.position.y) * lerpAmt
    camera.position.z = baseZ
    // (OrbitControls handles lookAt at target; no manual lookAt needed)
  })
  return null
}

// ── V21: DistantMountains — low-poly silhouettes behind the island
// for scale reference + atmospheric perspective.
// V22: blend mountain colors toward FOG_TINT (atmospheric perspective)
// + stagger baseline so peaks don't all sit on one horizontal line.
function DistantMountains() {
  // V25: use top-level pure-channel lerpHex (was shadowing with
  // alloc-heavy THREE.Color version)
  const lerpToFog = (hex: string, t: number) => lerpHex(hex, FOG_TINT, t)

  const layers: Array<{
    z: number
    fogMix: number
    opacity: number
    offsets: Array<[number, number, number, number]>  // x, h, r, baseY-jitter
  }> = [
    {
      z: -7.5,
      fogMix: 0.32,
      opacity: 0.55,
      offsets: [[-4.2, 0.95, 1.4, 0.10], [-1.4, 1.20, 1.6, -0.05], [1.5, 0.80, 1.3, 0.15], [3.6, 1.05, 1.5, 0]],
    },
    {
      z: -9,
      fogMix: 0.55,
      opacity: 0.40,
      offsets: [[-5, 1.30, 1.8, -0.10], [-1.8, 1.50, 2.0, 0.20], [2, 1.40, 1.9, -0.05], [5, 1.55, 2.1, 0.10]],
    },
    {
      z: -11,
      fogMix: 0.75,
      opacity: 0.28,
      offsets: [[-3, 1.75, 2.4, 0.15], [1.2, 1.95, 2.6, -0.10], [4, 1.65, 2.2, 0.20]],
    },
  ]
  return (
    <group>
      {layers.map((L, li) => (
        <group key={li} position={[0, -1.0, L.z]}>
          {L.offsets.map((o, i) => (
            <mesh
              key={i}
              position={[o[0], o[1] * 0.5 + o[3], 0]}
              rotation={[0, 0, (li + i) * 0.13]}
            >
              <coneGeometry args={[o[2], o[1] * 2, 9]} />
              <meshBasicMaterial
                color={lerpToFog('#B8C5D0', L.fogMix)}
                transparent
                opacity={L.opacity}
                depthWrite={false}
              />
            </mesh>
          ))}
        </group>
      ))}
    </group>
  )
}

// ── V21: HoverZoneHotspots — invisible meshes detect which scene
// region the cursor is over. Triggers context-aware bursts.
function HoverZoneHotspots() {
  return (
    <>
      {/* V24 BUGFIX: visible={false} skips raycasting → hover never fires.
          Use opacity={0} + colorWrite={false} instead so pointer events fire. */}
      {/* Sakura zone */}
      <mesh
        position={[0.55, 0.8, -0.35]}
        onPointerOver={() => { hoverZone.current = 'sakura'; hoverZone.since = performance.now() / 1000 }}
        onPointerOut={() => { hoverZone.current = null }}
      >
        <sphereGeometry args={[0.7, 8, 8]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} colorWrite={false} />
      </mesh>
      {/* Tsukubai zone */}
      <mesh
        position={[0.95, 0.35, 0.40]}
        onPointerOver={() => { hoverZone.current = 'tsukubai'; hoverZone.since = performance.now() / 1000 }}
        onPointerOut={() => { hoverZone.current = null }}
      >
        <boxGeometry args={[0.35, 0.5, 0.35]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} colorWrite={false} />
      </mesh>
      {/* Cabin zone */}
      <mesh
        position={[-0.55, 0.45, 0.0]}
        onPointerOver={() => { hoverZone.current = 'cabin'; hoverZone.since = performance.now() / 1000 }}
        onPointerOut={() => { hoverZone.current = null }}
      >
        <boxGeometry args={[1.2, 0.8, 0.8]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} colorWrite={false} />
      </mesh>

      {/* Zone-gated reactive sparkle bursts */}
      <ZoneSparkles />
    </>
  )
}

// V22: zone-specific reactions tied to scene assets (not generic sparkles).
//   sakura → handled via sakuraBoost in FallingPetals
//   tsukubai → 4 falling water droplet cylinders
//   cabin → upward heat shimmer (translucent warm additive plane)
function ZoneSparkles() {
  const drops = [
    useRef<THREE.Mesh>(null),
    useRef<THREE.Mesh>(null),
    useRef<THREE.Mesh>(null),
    useRef<THREE.Mesh>(null),
  ]
  const heatRef = useRef<THREE.Mesh>(null)
  const tsuOpRef = useRef(0)
  const heatOpRef = useRef(0)

  useFrame((s) => {
    const t = s.clock.elapsedTime
    const tsuActive = hoverZone.current === 'tsukubai' ? 1 : 0
    tsuOpRef.current += (tsuActive - tsuOpRef.current) * 0.18
    drops.forEach((r, i) => {
      const m = r.current
      if (!m) return
      const phase = (t * 1.8 + i * 0.42) % 1
      const y = 0.7 - phase * 0.45
      m.position.set(0.95 + (i - 1.5) * 0.025, y, 0.40 + (i % 2 === 0 ? -0.02 : 0.02))
      const mat = m.material as THREE.MeshStandardMaterial
      mat.opacity = tsuOpRef.current * 0.85
    })
    const heatActive = hoverZone.current === 'cabin' ? 1 : 0
    heatOpRef.current += (heatActive - heatOpRef.current) * 0.18
    if (heatRef.current) {
      const mat = heatRef.current.material as THREE.MeshBasicMaterial
      mat.opacity = heatOpRef.current * 0.22
      heatRef.current.position.y = 0.95 + Math.sin(t * 1.5) * 0.04
    }
  })

  return (
    <>
      {drops.map((r, i) => (
        <mesh key={i} ref={r} renderOrder={2}>
          <cylinderGeometry args={[0.005, 0.008, 0.06, 6]} />
          <meshStandardMaterial
            color="#A8C8D8"
            emissive="#A8C8D8"
            emissiveIntensity={0.3}
            transparent
            opacity={0}
            depthWrite={false}
          />
        </mesh>
      ))}
      <mesh ref={heatRef} position={[-0.55, 0.95, -0.15]} renderOrder={2}>
        <planeGeometry args={[0.4, 0.65]} />
        <meshBasicMaterial
          color="#FFD080"
          transparent
          opacity={0}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
          side={THREE.DoubleSide}
        />
      </mesh>
    </>
  )
}

// ── UpperCumulus — V14: high cumulus band ABOVE the island, drifting
// OPPOSITE to lower clouds (parallax). Gives bird something to fly past.
function UpperCumulus() {
  const groupRef = useRef<THREE.Group>(null)
  useFrame((s) => {
    if (!groupRef.current) return
    // Opposite direction to DistantClouds for parallax depth
    groupRef.current.rotation.y = -s.clock.elapsedTime * 0.009
  })
  const puffs: Array<[number, number, number, number]> = [
    [4.5, 3.4, -2.0, 1.0],
    [-3.8, 3.6, 1.5, 0.9],
    [0.5, 3.2, 4.0, 0.8],
    [3.0, 3.8, 2.5, 0.7],
  ]
  return (
    <group ref={groupRef}>
      {puffs.map((p, i) => (
        <group key={i} position={[p[0], p[1], p[2]]} scale={p[3]}>
          <mesh>
            <sphereGeometry args={[0.5, 14, 10]} />
            <meshBasicMaterial color="#FFFFFF" transparent opacity={0.25} />
          </mesh>
          <mesh position={[0.32, 0.04, 0.10]}>
            <sphereGeometry args={[0.35, 14, 10]} />
            <meshBasicMaterial color="#FAF8F2" transparent opacity={0.22} />
          </mesh>
        </group>
      ))}
    </group>
  )
}

// ── BirdFlyby — V14: pair of birds (hero + smaller backgrounder for flock feel).
function BirdFlyby() {
  const heroRef = useRef<THREE.Mesh>(null)
  const bgRef = useRef<THREE.Mesh>(null)
  const wingShape = useMemo(() => {
    const s = new THREE.Shape()
    s.moveTo(-0.06, 0)
    s.quadraticCurveTo(-0.03, 0.020, 0, 0)
    s.quadraticCurveTo(0.03, 0.020, 0.06, 0)
    s.quadraticCurveTo(0.03, -0.005, 0, 0.002)
    s.quadraticCurveTo(-0.03, -0.005, -0.06, 0)
    return s
  }, [])
  const geo = useMemo(() => new THREE.ShapeGeometry(wingShape, 8), [wingShape])
  useEffect(() => () => geo.dispose(), [geo])  // V26: dispose hygiene
  useFrame((s) => {
    const t = s.clock.elapsedTime
    const period = 22
    // V17: bird reacts to shared wind (drifts laterally + banks on gust)
    const wind = getWind(t)
    // Hero bird
    if (heroRef.current) {
      const phase = t % period
      if (phase > 12) {
        heroRef.current.visible = false
      } else {
        heroRef.current.visible = true
        const x = -4 + (phase / 12) * 8
        const y = 2.4 + Math.sin(phase * 0.6) * 0.18 + wind.dirZ * 0.15
        heroRef.current.position.set(x, y, -1.2)
        heroRef.current.rotation.z = -Math.sin(phase * 6) * 0.5 + wind.gust * 0.3
      }
    }
    // BG bird
    if (bgRef.current) {
      const phase = (t - 2) % period
      if (phase < 0 || phase > 14) {
        bgRef.current.visible = false
      } else {
        bgRef.current.visible = true
        const x = -4.5 + (phase / 14) * 9
        const y = 2.9 + Math.sin(phase * 0.55) * 0.14 + wind.dirZ * 0.12
        bgRef.current.position.set(x, y, -1.8)
        bgRef.current.rotation.z = -Math.sin(phase * 5.5) * 0.5 + wind.gust * 0.25
      }
    }
  })
  return (
    <>
      <mesh ref={heroRef} geometry={geo} renderOrder={3}>
        <meshBasicMaterial color="#2A2018" side={THREE.DoubleSide} />
      </mesh>
      <mesh ref={bgRef} geometry={geo} scale={0.55} renderOrder={3}>
        <meshBasicMaterial color="#3A2818" side={THREE.DoubleSide} transparent opacity={0.75} />
      </mesh>
    </>
  )
}

// ── FallingPetals — sakura petals drifting down from canopy.
// The Ghibli money shot. Each petal: drift down ~0.05/s, sin X drift,
// tumble rot.z. Respawns at canopy Y when it hits ground.
function FallingPetals() {
  const COUNT = 60
  const ref = useRef<THREE.InstancedMesh>(null)
  const petalGeo = useMemo(() => new THREE.ShapeGeometry(makePetalShape(), 8), [])
  // V24: dispose on unmount
  useEffect(() => () => petalGeo.dispose(), [petalGeo])
  const seeds = useMemo(() =>
    Array.from({ length: COUNT }).map(() => ({
      x: 0.55 + (Math.random() - 0.5) * 1.4,
      y: 0.1 + Math.random() * 1.5,
      z: -0.35 + (Math.random() - 0.5) * 1.4,
      phaseX: Math.random() * Math.PI * 2,
      phaseR: Math.random() * Math.PI * 2,
      speed: 0.7 + Math.random() * 0.6,
      scale: 0.7 + Math.random() * 0.6,
      tintIdx: Math.floor(Math.random() * 3),
    })), [])
  // V24: hoist per-frame allocs (was 3600+ Color/Object3D per second)
  const dummy = useMemo(() => new THREE.Object3D(), [])
  const tints = useMemo(() => ['#FFEAF1', '#F5C8D6', '#FFD8E3'].map((c) => new THREE.Color(c)), [])
  const wetColor = useMemo(() => new THREE.Color('#D8A8C0'), [])
  const scratchColor = useMemo(() => new THREE.Color(), [])

  useFrame((s) => {
    if (!ref.current) return
    const t = s.clock.elapsedTime
    // V24: dummy/tints/wetColor/scratchColor are hoisted via useMemo
    // V15: SHARED wind drives drift direction + gust
    // V20: hover boost adds to gust. V22: sakura-zone hover 1.5× boost.
    const wind = getWind(t)
    const hover = getHoverBoost(t)
    const sakuraBoost = hoverZone.current === 'sakura' ? 1.5 : 1
    const effectiveGust = wind.gust + hover * 1.5 * sakuraBoost
    const TSUKUBAI_X = 0.95
    const TSUKUBAI_Z = 0.40
    const TSUKUBAI_R = 0.065   // 0.118 * 0.55 scale
    seeds.forEach((sd, i) => {
      const ySpan = 1.6
      const yOffset = (t * 0.07 * sd.speed * (1 + effectiveGust * 0.4)) % ySpan
      const y = sd.y - yOffset
      const wrappedY = y < 0.06 ? y + ySpan : y
      // Wind direction biases dx/dz + (gust + hover) amplifies
      const dx = (Math.sin(t * 0.4 + sd.phaseX) * 0.05 + wind.dirX * 0.025) * (1 + effectiveGust)
      const dz = (Math.cos(t * 0.3 + sd.phaseX) * 0.04 + wind.dirZ * 0.020) * (1 + effectiveGust)
      const px = sd.x + dx
      const pz = sd.z + dz
      // V18: petal-water landing — lerp Y + freeze tumble at rest.
      const dxBasin = px - TSUKUBAI_X
      const dzBasin = pz - TSUKUBAI_Z
      const distBasin = Math.hypot(dxBasin, dzBasin)
      let resting = false
      if (distBasin < TSUKUBAI_R && wrappedY < 0.40) {
        const targetY = 0.257
        const lerpT = Math.min(1, (0.40 - wrappedY) * 4)
        const lerpedY = wrappedY + (targetY - wrappedY) * lerpT
        const px2 = wrappedY < 0.28 ? TSUKUBAI_X + dxBasin * 0.6 : px
        const pz2 = wrappedY < 0.28 ? TSUKUBAI_Z + dzBasin * 0.6 : pz
        dummy.position.set(px2, lerpedY, pz2)
        resting = wrappedY < 0.27
      } else {
        dummy.position.set(px, wrappedY, pz)
      }
      // V19: smooth tumble damping — blend over wrappedY 0.32→0.27
      // so petal eases to rest over ~0.7s instead of hard snap.
      const restBlend = Math.max(0, Math.min(1, (0.32 - wrappedY) / 0.05))
      const tumbleAmp = 1 - restBlend
      dummy.rotation.set(
        -Math.PI / 2 + Math.sin(t * 0.8 + sd.phaseR) * 0.5 * tumbleAmp,
        (t * 0.6 + sd.phaseR) * (1 - restBlend * 0.7),
        Math.cos(t * 0.7 + sd.phaseR) * 0.4 * tumbleAmp + restBlend * sd.phaseR * 0.3,
      )
      // V19: color darkens when wet (paper-darkening sim).
      // V24 BUGFIX: was overwritten by base tint below; now we set
      // EITHER the wet lerp OR the base, not both per frame.
      if (restBlend > 0.5 && i % 3 !== 0) {
        scratchColor.lerpColors(tints[sd.tintIdx], wetColor, (restBlend - 0.5) * 2)
        ref.current!.setColorAt(i, scratchColor)
      } else {
        ref.current!.setColorAt(i, tints[sd.tintIdx])
      }
      dummy.scale.setScalar(sd.scale)
      dummy.updateMatrix()
      ref.current!.setMatrixAt(i, dummy.matrix)
      // (V24: color set above based on rest state — no duplicate write here)
    })
    ref.current.instanceMatrix.needsUpdate = true
    if (ref.current.instanceColor) ref.current.instanceColor.needsUpdate = true
  })

  return (
    <instancedMesh
      ref={ref}
      args={[petalGeo, undefined as any, COUNT]}
      frustumCulled={false}
    >
      <meshStandardMaterial
        color="#FFD8E3"
        roughness={0.9}
        side={THREE.DoubleSide}
        transparent
        opacity={0.92}
      />
    </instancedMesh>
  )
}

// ── WindSway — wraps any group + applies gentle X/Z rotation sway.
function WindSway({ children, amp = 0.018, freq = 0.5, phase = 0 }: {
  children: React.ReactNode
  amp?: number
  freq?: number
  phase?: number
}) {
  const ref = useRef<THREE.Group>(null)
  useFrame((s) => {
    if (!ref.current) return
    const t = s.clock.elapsedTime
    ref.current.rotation.z = Math.sin(t * freq + phase) * amp
    ref.current.rotation.x = Math.cos(t * freq * 0.7 + phase * 1.3) * amp * 0.5
  })
  return <group ref={ref}>{children}</group>
}

// ── WaterSurface — basin water with animated micro-ripple vertex
// displacement + lowered metalness (was chrome mirror).
function WaterSurface() {
  const geo = useMemo(() => new THREE.CircleGeometry(0.118, 28), [])
  // V24: dispose on unmount (geometry leaks on hot-reload / route change)
  useEffect(() => () => geo.dispose(), [geo])
  const ref = useRef<THREE.Mesh>(null)
  useFrame((s) => {
    if (!ref.current) return
    const t = s.clock.elapsedTime
    const pos = ref.current.geometry.attributes.position
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i), y = pos.getY(i)
      const d = Math.hypot(x, y)
      pos.setZ(i, Math.sin(t * 1.8 + d * 28) * 0.0015 + Math.cos(t * 1.3 + x * 22) * 0.0010)
    }
    pos.needsUpdate = true
    // V24 BUGFIX: recompute normals so ripples are visible under lighting
    ref.current.geometry.computeVertexNormals()
  })
  return (
    <mesh ref={ref} geometry={geo} position={[0, 0.255, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
      <meshStandardMaterial
        color="#2A4C58"
        roughness={0.25}
        metalness={0.40}
        envMapIntensity={1.1}
      />
    </mesh>
  )
}

// ── WaterStream — tapered cylinder + animated 3-ripple expansion.
//    Scale loop hides cylinder respawn discontinuity.
function WaterStream() {
  const ripples = [
    useRef<THREE.Mesh>(null),
    useRef<THREE.Mesh>(null),
    useRef<THREE.Mesh>(null),
  ]
  useFrame((s) => {
    const t = s.clock.elapsedTime
    ripples.forEach((r, i) => {
      const m = r.current
      if (!m) return
      // V13: desync stagger (was 0.4/1.2 = perfectly synced triplets)
      const phase = ((t * 0.8 + i * 0.45) % 1.35) / 1.35
      const scale = 0.5 + phase * 1.0
      m.scale.set(scale, 1, scale)
      const mat = m.material as THREE.MeshStandardMaterial
      mat.opacity = (1 - phase) * 0.7
    })
  })
  return (
    <>
      {/* Stream — tapered, narrow at spout. V12: y 0.295→0.288, length
          0.085→0.065 so stream exactly spans spout tip (y=0.32) →
          water surface (y=0.255). */}
      <mesh position={[0, 0.288, 0]}>
        <cylinderGeometry args={[0.008, 0.014, 0.065, 10]} />
        <meshStandardMaterial
          color="#A8C8D8"
          emissive="#A8C8D8"
          emissiveIntensity={0.15}
          transparent
          opacity={0.85}
          depthWrite={false}
        />
      </mesh>
      {/* 3 animated ripples — expanding tori */}
      {ripples.map((r, i) => (
        <mesh
          key={i}
          ref={r}
          position={[0, 0.256, 0]}
          rotation={[-Math.PI / 2, 0, 0]}
        >
          <torusGeometry args={[0.08, 0.0035, 4, 32]} />
          <meshStandardMaterial
            color="#A8C8D8"
            roughness={0.35}
            metalness={0.4}
            transparent
            opacity={0.6}
          />
        </mesh>
      ))}
    </>
  )
}

// ── ChimneySmoke — V10: scale-clamp at phase boundaries hides reset.
function ChimneySmoke() {
  const puffs = [
    useRef<THREE.Mesh>(null),
    useRef<THREE.Mesh>(null),
    useRef<THREE.Mesh>(null),
  ]
  useFrame((s) => {
    const t = s.clock.elapsedTime
    // V16: smoke (rising / dispersed) lags wind by 0.8s
    const wind = getWind(t - 0.8)
    const hearth = getHearth(t)
    puffs.forEach((r, i) => {
      const m = r.current
      if (!m) return
      const phase = (t * 0.25 + i * 0.9) % 2.7
      m.position.y = 0.05 + phase * 0.45
      m.position.x = Math.sin(t * 0.5 + i) * 0.08 + phase * (0.08 + wind.dirX * 0.06)
      m.position.z = Math.cos(t * 0.4 + i * 0.7) * 0.05 + phase * wind.dirZ * 0.05
      // V10: scale-clamp at phase boundaries hides reset teleport
      // V16: stoke boost — bigger puff burst at hearth peak
      const baseScale = (0.6 + phase * 0.5) * (1 + hearth.smokeBoost * (i === 0 ? 0.6 : 0.3))
      const fadeIn = Math.min(1, phase * 4)
      const fadeOut = Math.min(1, (2.7 - phase) * 2)
      m.scale.setScalar(baseScale * fadeIn * fadeOut)
      const mat = m.material as THREE.MeshBasicMaterial
      mat.opacity = Math.max(0, 0.55 - phase * 0.18) * fadeIn * fadeOut
    })
  })
  return (
    <group position={[-0.50, 0.78, -0.15]}>
      {puffs.map((r, i) => (
        <mesh key={i} ref={r}>
          <sphereGeometry args={[0.08, 12, 10]} />
          <meshBasicMaterial color="#F5F0E8" transparent opacity={0.55} />
        </mesh>
      ))}
    </group>
  )
}

export default function IslandWidget() {
  return (
    <Canvas
      shadows={!IS_MOBILE}   // V31: skip shadow pass on mobile (~30% faster)
      camera={{ position: [2.9, 1.5, 3.7], fov: 28 }}
      dpr={IS_MOBILE ? [1, 1.2] : [1, 1.5]}   // V31: lower DPR cap on mobile
      gl={{
        antialias: true,
        alpha: true,
        toneMapping: ACESFilmicToneMapping,
        toneMappingExposure: 1.18,
      }}
      style={{ width: '100%', height: '100%' }}
      // V20: hover poke. V21: track mouse XY for parallax + zone.
      onPointerEnter={() => {
        hoverState.active = true
        hoverState.enteredAt = performance.now() / 1000
      }}
      onPointerLeave={() => {
        hoverState.active = false
        hoverState.decay = performance.now() / 1000
        mouseState.x = 0
        mouseState.y = 0
      }}
      onPointerMove={(e) => {
        const rect = (e.currentTarget as HTMLCanvasElement).getBoundingClientRect()
        mouseState.x = ((e.clientX - rect.left) / rect.width - 0.5) * 2   // -1..1
        mouseState.y = ((e.clientY - rect.top) / rect.height - 0.5) * 2
      }}
    >
      {/* No <color> bg — let CSS radial-gradient sky show through */}
      <fog attach="fog" args={[FOG_TINT, 8, 17]} />
      {/* V27: sky+fog mood shift on sustained hover (golden hour) */}
      <SkyMood />

      {/* Lighting — bright noon, Studio Ghibli golden hour balance */}
      <hemisphereLight args={['#FFF3DC', '#9CBC78', 0.95]} />
      <ambientLight intensity={0.60} color="#FFF6DC" />
      {/* V14: animated breathing sun (90s cycle, ±0.06 intensity, warm→amber) */}
      <AnimatedSun />
      <directionalLight position={[-3, 2.5, -3]} intensity={0.55} color="#C8DCEC" />
      {/* Violet fill from below — Ghibli signature shadow tint (Sub-A #3 #3) */}
      <directionalLight position={[-2, -1, 2]} intensity={0.18} color="#B8A0C8" />
      {/* V10: warm pointLight at cabin shoji → gravitational anchor.
          V17: pulse in lockstep with hearth (cast light reveals
          inner flame stoke to outside world). */}
      <AnimatedHearthLight />

      {/* === Scene === */}
      <Island />
      <SteppingStones />
      <FallenPetals />
      <RakedGravel />
      <MinkaCabin />
      <ChimneySmoke />

      {/* Hero sakura — V11: wrapped in WindSway for the canopy breath */}
      <WindSway amp={0.018} freq={0.5}>
        <group position={[0.55, 0, -0.35]} scale={0.55}>
          <Sakura
            position={[0, 0, 0]}
            seed={20260524}
            size={1.0}
            density={0.65}
            hero={true}
            rotY={0.4}
            tint="#fad9e4"
          />
        </group>
      </WindSway>

      {/* 2 cedars in back (cut 1 for breathing room) */}
      <Cedar x={-1.15} z={-1.05} scale={1.0} seed={1} />
      <Cedar x={-0.30} z={-1.45} scale={0.88} seed={2} />

      {/* Lantern + torii */}
      <StoneLantern x={-0.10} z={0.70} />
      <Torii x={0.65} z={1.55} rotY={-0.35} />

      {/* Tsukubai stone water basin */}
      <Tsukubai x={0.95} z={0.4} />

      {/* V12: drei Sparkles for atmospheric haze (replaces flat-plane
          light shafts that looked like tissue paper from oblique angles).
          40 small warm motes drifting in the sun-air zone above the
          scene. */}
      <Sparkles
        count={45}
        size={3}
        scale={[3.6, 2.2, 3.6]}
        position={[0, 1.3, 0]}
        color="#FFE8C0"
        speed={0.25}
        opacity={0.65}
      />

      {/* Falling petals — Ghibli money shot. Drift down from canopy. */}
      <FallingPetals />

      {/* V13: distant cloud puffs BELOW the island (sky-castle sell) */}
      <DistantClouds />
      {/* V14: upper cumulus band drifting opposite — parallax stratification */}
      <UpperCumulus />

      {/* V13: bird flyby — V14: pair (hero + bg for flock feel) */}
      <BirdFlyby />

      {/* V23: mid-cloud wisps drifting across mountain mid-ground */}
      <MidCloudWisps />
      {/* V23: moss/lichen between stepping stones (always-on micro-life) */}
      <PathMoss />

      <OrbitControls
        target={[0.15, 0.35, 0.10]}
        enablePan={false}
        enableZoom={false}
        enableRotate={false}
        autoRotate
        autoRotateSpeed={0.55}
      />

      {/* V21: mouse parallax + scene-depth layers */}
      <ParallaxRig />
      <DistantMountains />
      <HoverZoneHotspots />

      {/* Postprocessing — tuned for bright noon. V31: drop Bloom on
          mobile (single most expensive pass per frame). */}
      <EffectComposer multisampling={0}>
        {!IS_MOBILE && (
          <Bloom intensity={0.35} luminanceThreshold={0.85} luminanceSmoothing={0.5} mipmapBlur />
        )}
        <Vignette eskil={false} offset={0.40} darkness={0.25} />
        <ToneMapping mode={ToneMappingMode.ACES_FILMIC} />
        <SMAA />
      </EffectComposer>
    </Canvas>
  )
}
