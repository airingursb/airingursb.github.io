// Inline homepage mini-island — R3F scene that previews /world/.
//
// Mounts via Astro client:visible (only when scrolled into view).
// frameloop="never" toggles to "always" on IntersectionObserver visible
// + back to "never" on visibilitychange hidden — costs 0 frames when
// off-screen or tab-backgrounded.
//
// ─── FILE MAP ───
//   Cedar             : slim conifer + per-tree internal wind
//   MinkaCabin        : irimoya roof + shoji + chimney
//                       (+ FurinChime under front-right eave)
//                       (+ EngawaCat curled loaf on front-left engawa)
//   StoneLantern      : 2-octave flicker + wind.gust coupling + inner pointLight
//   Torii             : vermillion posts + kasagi + shimenawa rope + 3 shide
//   RakedGravel       : irregular rake-line tubes (bulge around mossy stone)
//                       + KaresansuiPetals (22 fallen on rings)
//   DisplacedCliff    : ridged-noise vertex displacement (island base)
//   Island            : ground disc + scene root
//   SteppingStones    : varied geometry + tea-master jog
//   FallenPetals      : sakura petals scattered on ground + flutter on gust
//   AnimatedSun       : directional light, 90s breathing + golden-hour dwell
//   HearthLight       : pointLight inside cabin, pulses with hearth phase
//   PathMoss          : 3-tone 2-lobe patches between stepping stones
//   ChimneySmoke      : 3 puffs, jittered phase + hearth-stoke surge
//   ParallaxRig       : owns camera position + lookAt every frame
//   FallingPetals     : InstancedMesh drift-down from canopy
//   BreathingShoji    : emissive lerp + ember-warm tint shift on hearth peak
//   RotatingScene     : 3-min turn, eased 4× slower at sakura-forward dwell
//   Canvas root       : EffectComposer (Bloom + SMAA), frameloop gating
//
// ─── COORDINATION (the "one organism" trick) ───
//   All hooks (getWind, getHearth, getDwellGolden, getHoverBoost) read
//   shared module state from ./island-shared. Read by ~14 child useFrame
//   loops so the scene feels coherent: a single gust drives sakura
//   sway + petals + smoke + furin + lantern flame + cat ear simultaneously.

import type React from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { Sparkles } from '@react-three/drei'
import { EffectComposer, Bloom, ToneMapping, SMAA } from '@react-three/postprocessing'
import { ToneMappingMode } from 'postprocessing'
import { ACESFilmicToneMapping } from 'three'
import { useMemo, useRef, useEffect, useState } from 'react'
import * as THREE from 'three'
import { Sakura } from './widget-sakura'
import {
  hoverState, mouseState, hoverZone,
  IS_TOUCH, IS_MOBILE, PREFERS_REDUCED_MOTION,
  getWind, getHearth, getDwellGolden, getHoverBoost,
  lerpHex, organicBlob, makePetalShape,
  // Palette
  CEDAR_TRUNK, CEDAR_DARK, CEDAR_LIGHT,
  GRASS_LIGHT, GRASS_HILIGHT, GRASS_SHADE,
  SOIL, SOIL_DK, CLIFF, CLIFF_DK,
  GRAVEL_SAND, GRAVEL_LINE,
  WASHI_WALL, WASHI_GLOW, WOOD_POST, WOOD_BEAM,
  TILE_ROOF_A, TILE_ROOF_B, TILE_ROOF_MOSS, TILE_RIDGE,
  STONE_BASE, STONE_HAT, LANTERN_GLOW,
  VERMILLION, TORII_BLACK,
} from './island-shared'

// ── Palette + shared hooks (hoverState, getWind, getHearth, etc.)
//    are imported from ./island-shared. See that file's top comment for
//    why module-mutable shared state vs. React Context.

// (organicBlob moved to island-shared.ts)

// ── Cedar (杉) — slim conifer with 4 vertically-stretched organicBlob
//    canopies. Per-tree seed → no identical trees.
function Cedar({ x, z, scale = 1, seed = 0 }: { x: number; z: number; scale?: number; seed?: number }) {
  const groupRef = useRef<THREE.Group>(null)
  useFrame((s) => {
    if (!groupRef.current) return
    const t = s.clock.elapsedTime
    // High-mass cedars lag wind by 0.4s vs petals (which react on t=0)
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

  // Dispose canopy buffers — 6 per Cedar would leak under strict-mode
  // double-mount, HMR, or Astro view-transition.
  useEffect(() => () => { layers.forEach((l) => l.blob.dispose()) }, [layers])

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
    // COUPLED TO: KaresansuiPetals positions (around line 670) derive
    // their per-petal coords assuming this cabin origin (-0.55, 0.05, 0)
    // and the lantern origin (-0.10, 0.70). Moving either by more than
    // ~0.05u will visibly drift the fallen-petal clusters off the rake
    // lines they're supposed to ride. If you reposition the cabin, also
    // re-derive the seed array in KaresansuiPetals.
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
                Real kawara tile has random moss patches, not perfect rows
                — ~15% of tiles use the moss override. */}
            {Array.from({ length: 14 }).map((_, i) => {
              const frac = (i + 0.5) / 14
              // Pre-compute color string (lerpHex avoids per-render
              // THREE.Color allocation in the hot render path)
              const jitter = Math.pow(
                (Math.sin(i * 7.3 + (sign > 0 ? 1.7 : 0)) + 1) * 0.5,
                0.6,
              )
              const isMoss = ((i * 5 + (sign > 0 ? 3 : 0)) % 7) === 0
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
      {/* 2 onigawara end finials — squat outward-canted wedges.
          Real onigawara curl outward along the ridge axis (not
          upright party-hat cones). */}
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

      {/* === V53 furin (江戸風鈴) — hanging under the front-right eave ===
          Glass bell + clapper + tanzaku paper strip. The whole chime
          sways from its hanging point when wind gusts. Reads as "this
          house is lived in" at a glance even from across the pet canvas.
          Position is in cabin-local coords so it inherits the cabin's
          0.32 rad rotation automatically. */}
      <FurinChime localX={CABIN_W / 2 - 0.05} eaveY={0.08 + WALL_H + ROOF_RISE * 0.08} localZ={CABIN_D / 2 + Z_OVERHANG * 0.45} />

      {/* === V53 lazy cat curled on the engawa ===
          Sub-A: "strongest 'miniature world is INHABITED' signal
          possible at this scale". Dark loaf-shape against the warm
          engawa wood = unmistakable mammal. Subtle breath + 4-5s tail
          twitch animation. Local position on left side of engawa so
          it doesn't block the shoji glow. */}
      <EngawaCat localX={-CABIN_W / 2 + 0.18} engawaY={0.08} localZ={CABIN_D / 2 + 0.15} />
    </group>
  )
}

// ── V53 Furin (Edo wind chime) — hangs from the cabin eave on a tiny
//    cord, sways on wind.gust. The tanzaku (paper strip) trails below
//    the bell and flares more aggressively than the bell itself
//    (it's lighter — physics intuition through animation amp).
function FurinChime({ localX, eaveY, localZ }: { localX: number; eaveY: number; localZ: number }) {
  const groupRef = useRef<THREE.Group>(null)
  const tanzakuRef = useRef<THREE.Group>(null)
  useFrame((s) => {
    const t = s.clock.elapsedTime
    const wind = getWind(t)
    const hover = getHoverBoost(t)
    const drive = wind.gust + hover * 0.8
    if (groupRef.current) {
      // Bell rocks ±0.10 calm, ±0.32 peak gust. Cross-axis offset
      // gives a believable hanging-string motion (not a 1-axis swing).
      groupRef.current.rotation.z = Math.sin(t * 1.6) * 0.10 + wind.dirX * 0.20 + drive * 0.32
      groupRef.current.rotation.x = Math.cos(t * 1.3) * 0.06 + wind.dirZ * 0.15 + drive * 0.18
    }
    if (tanzakuRef.current) {
      // Tanzaku has more inertia → swings wider and lags slightly.
      tanzakuRef.current.rotation.z = Math.sin(t * 1.5 - 0.3) * 0.22 + drive * 0.55
      tanzakuRef.current.rotation.x = Math.cos(t * 1.2 - 0.3) * 0.14 + drive * 0.30
    }
  })
  return (
    <group position={[localX, eaveY, localZ]}>
      {/* Cord from eave to bell (pivot at top) */}
      <group ref={groupRef}>
        <mesh position={[0, -0.045, 0]}>
          <cylinderGeometry args={[0.0018, 0.0018, 0.09, 4]} />
          <meshStandardMaterial color="#4a3a2a" roughness={0.95} />
        </mesh>
        {/* Glass bell — open hemisphere, sky-blue tint, subtle emissive
            so it catches the bloom pass like a tiny lit globe at dusk-ish moments. */}
        <mesh position={[0, -0.105, 0]} rotation={[Math.PI, 0, 0]} castShadow>
          <sphereGeometry args={[0.028, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2]} />
          <meshStandardMaterial
            color="#BFE3F0"
            emissive="#7FC9DC"
            emissiveIntensity={0.18}
            roughness={0.25}
            metalness={0.05}
            transparent
            opacity={0.78}
            side={THREE.DoubleSide}
          />
        </mesh>
        {/* Bell rim — thin torus to make the open-bottom read */}
        <mesh position={[0, -0.122, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <torusGeometry args={[0.026, 0.0028, 6, 16]} />
          <meshStandardMaterial color="#A9D8E6" roughness={0.4} />
        </mesh>
        {/* Tiny inner clapper (zetsu) — small dark sphere hanging
            inside the bell. Reads as "this thing makes noise". */}
        <mesh position={[0, -0.110, 0]}>
          <sphereGeometry args={[0.006, 6, 5]} />
          <meshStandardMaterial color="#2A2A30" roughness={0.6} />
        </mesh>
        {/* Tanzaku — paper strip hanging from clapper. Its own group
            so it can sway with extra amp/lag. */}
        <group ref={tanzakuRef} position={[0, -0.115, 0]}>
          <mesh position={[0, -0.055, 0.001]} castShadow>
            <planeGeometry args={[0.013, 0.085]} />
            <meshStandardMaterial color="#E85A6B" roughness={0.9} side={THREE.DoubleSide} />
          </mesh>
          {/* Subtle white sub-band at bottom of tanzaku (real furin
              tanzaku usually have a thin printed border). */}
          <mesh position={[0, -0.092, 0.0012]}>
            <planeGeometry args={[0.013, 0.012]} />
            <meshStandardMaterial color="#F9F0F2" roughness={0.85} side={THREE.DoubleSide} />
          </mesh>
        </group>
      </group>
    </group>
  )
}

// ── V53 EngawaCat — sleeping loaf cat on cabin porch.
//    Single most-impactful "INHABITED" tell at pet scale per Sub-A.
//    Loaf shape (squashed body + head), curled tail, faint breath,
//    slow tail flick every ~5s. Charcoal #28232B for high contrast
//    against the warm-wood engawa.
function EngawaCat({ localX, engawaY, localZ }: { localX: number; engawaY: number; localZ: number }) {
  const bodyRef = useRef<THREE.Group>(null)
  const tailRef = useRef<THREE.Group>(null)
  const earRef = useRef<THREE.Mesh>(null)
  useFrame((s) => {
    const t = s.clock.elapsedTime
    if (bodyRef.current) {
      // Anticipation + exhale every ~12s on top of a slow base sin —
      // uniform sin alone read as 'mechanical pulse', the deep cycle
      // makes the breath feel like a sleeping creature.
      const baseBreath = Math.sin(t * 0.9) * 0.018
      const deepCycle = (t % 12) / 12
      // 0.4-0.6: inhale rise. 0.6-0.7: exhale fall.
      let deep = 0
      if (deepCycle > 0.40 && deepCycle < 0.60) deep = Math.sin((deepCycle - 0.40) / 0.20 * Math.PI / 2) * 0.025
      else if (deepCycle >= 0.60 && deepCycle < 0.70) deep = (1 - (deepCycle - 0.60) / 0.10) * 0.025
      bodyRef.current.scale.y = 1 + baseBreath + deep
    }
    if (tailRef.current) {
      // Sleeping cat's tail is mostly DEAD still — irregular sharp
      // flick every ~5-10s (slow noise drifts the period so it never
      // feels metronomic). Constant micro-twitch reads as 'rigged'.
      const period = 7 + Math.sin(t * 0.13) * 2.5    // 4.5–9.5s, drifting
      const p = (t % period) / period
      const flick = p > 0.93 ? Math.sin((p - 0.93) / 0.07 * Math.PI) * 0.28 : 0
      tailRef.current.rotation.y = flick
    }
    if (earRef.current) {
      // Rare ear twitch — paired to tail flick events (both signal
      // light disturbance during shallow sleep). Squashes ear briefly.
      const period = 7 + Math.sin(t * 0.13) * 2.5
      const p = (t % period) / period
      const twitch = p > 0.95 ? Math.sin((p - 0.95) / 0.05 * Math.PI) * 0.18 : 0
      earRef.current.scale.y = 1 - twitch
    }
  })
  return (
    <group position={[localX, engawaY, localZ]} rotation={[0, -0.4, 0]} scale={1.5}>
      <group ref={bodyRef}>
        {/* Body — squashed loaf (egg/sphere with low Y scale) */}
        <mesh position={[0, 0.038, 0]} castShadow>
          <sphereGeometry args={[0.058, 14, 10]} />
          <meshStandardMaterial color="#28232B" roughness={0.92} />
        </mesh>
        {/* Belly — a hair lighter so the body has a subtle silhouette */}
        <mesh position={[0, 0.022, 0.018]} castShadow>
          <sphereGeometry args={[0.045, 12, 8]} />
          <meshStandardMaterial color="#3A3438" roughness={0.92} />
        </mesh>
        {/* Head — tucked forward, slightly to the side as if asleep */}
        <mesh position={[0.052, 0.052, -0.005]} castShadow>
          <sphereGeometry args={[0.034, 12, 10]} />
          <meshStandardMaterial color="#28232B" roughness={0.92} />
        </mesh>
        {/* Two tiny ears (triangle cones). Outer ear is earRef so it
            can twitch on the rare flick events (paired to tail flick). */}
        <mesh ref={earRef} position={[0.062, 0.082, -0.020]} rotation={[0, 0, 0.25]} castShadow>
          <coneGeometry args={[0.012, 0.022, 4]} />
          <meshStandardMaterial color="#28232B" roughness={0.92} flatShading />
        </mesh>
        <mesh position={[0.062, 0.082, 0.010]} rotation={[0, 0, 0.25]} castShadow>
          <coneGeometry args={[0.012, 0.022, 4]} />
          <meshStandardMaterial color="#28232B" roughness={0.92} flatShading />
        </mesh>
        {/* Snout — tiny lighter triangle, hint of face */}
        <mesh position={[0.085, 0.044, 0.0]} castShadow>
          <sphereGeometry args={[0.018, 8, 6]} />
          <meshStandardMaterial color="#3A3438" roughness={0.92} />
        </mesh>
      </group>
      {/* Tail — curled around the body, animated independently so the
          flick reads as separate motion from the breath. Pivot at body
          rear (-X side of cat). */}
      <group ref={tailRef} position={[-0.04, 0.04, 0.02]}>
        <mesh position={[-0.038, 0.012, 0.012]} rotation={[0.4, 0.6, -0.1]} castShadow>
          <cylinderGeometry args={[0.008, 0.012, 0.090, 6]} />
          <meshStandardMaterial color="#28232B" roughness={0.92} />
        </mesh>
        {/* Tail tip — small bulb */}
        <mesh position={[-0.072, 0.025, 0.024]} castShadow>
          <sphereGeometry args={[0.010, 8, 6]} />
          <meshStandardMaterial color="#28232B" roughness={0.92} />
        </mesh>
      </group>
    </group>
  )
}

// ── Stone lantern (smooth-shaded, no flat) ──────────────────────────
function StoneLantern({ x, z }: { x: number; z: number }) {
  const flameRef = useRef<THREE.Group>(null)
  // F-sync: lantern intensity multiplier by real time. Brighter at
  // night (~1.8×), normal at noon (~1.0×). Lanterns are for darkness.
  const biasRef = useRef(1)
  useEffect(() => {
    const update = () => {
      const b = getTimeBias()
      // bias.intensity ranges 0.18 (midnight) to 2.15 (noon).
      // Map 2.15 → 1.0 (noon multiplier), 0.18 → 1.85 (midnight).
      biasRef.current = 1.85 - (b.intensity / 2.15) * 0.85
    }
    update()
    const id = setInterval(update, 60000)
    return () => clearInterval(id)
  }, [])
  useFrame((s) => {
    if (!flameRef.current) return
    const t = s.clock.elapsedTime
    const hearth = getHearth(t - 0.30)
    const wind = getWind(t - 0.30)
    const baseIntensity =
      0.85 +
      Math.sin(t * 4.3) * 0.08 +
      Math.sin(t * 11.7) * 0.04 +
      wind.gust * 0.06 -
      hearth.lanternDim
    const intensity = baseIntensity * biasRef.current
    flameRef.current.traverse((obj) => {
      const m = obj as THREE.Mesh
      if (m.isMesh && m.material) {
        const mat = m.material as THREE.MeshStandardMaterial
        if (mat.emissive) mat.emissiveIntensity = intensity
      }
    })
  })
  return (
    <group position={[x, 0.025, z]} scale={0.70}>
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
        {/* V53 mat (Sub-A): hat-cap pieces get micro metalness so the
            sun gives a faint highlight ridge — separates 'rain-polished
            cap' from 'weathered base' that stays matte. */}
        <meshStandardMaterial color={STONE_HAT} roughness={0.78} metalness={0.05} />
      </mesh>
      <mesh position={[0, 0.56, 0]} castShadow>
        <boxGeometry args={[0.22, 0.16, 0.22]} />
        <meshStandardMaterial color={STONE_BASE} roughness={0.92} />
      </mesh>
      {/* V35: glow panes inset 0.005 into stone (was sticker on surface).
          Plus a small pointLight at chamber center for real flame
          bounce on the stone hat above. */}
      <group ref={flameRef}>
        {([
          [0, 0.56, 0.106, 0],
          [0, 0.56, -0.106, Math.PI],
          [0.106, 0.56, 0, Math.PI / 2],
          [-0.106, 0.56, 0, -Math.PI / 2],
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
        {/* Tiny inner pointLight — bounces warm glow onto the stone hat */}
        <pointLight position={[0, 0.56, 0]} intensity={0.35} distance={0.45} decay={2} color={LANTERN_GLOW} />
      </group>
      {/* Roof (6-sided low pyramid) — V53 mat: cap gets micro metalness */}
      <mesh position={[0, 0.74, 0]} castShadow>
        <coneGeometry args={[0.27, 0.16, 6]} />
        <meshStandardMaterial color={STONE_HAT} roughness={0.78} metalness={0.05} flatShading />
      </mesh>
      <mesh position={[0, 0.86, 0]} castShadow>
        <sphereGeometry args={[0.042, 12, 10]} />
        <meshStandardMaterial color={STONE_HAT} roughness={0.78} metalness={0.05} />
      </mesh>
    </group>
  )
}

// ── Torii (smooth posts, slight kasagi curve via two stacked layers) ─
function Torii({ x, z, rotY = 0 }: { x: number; z: number; rotY?: number }) {
  // Shimenawa — sagging rice-straw rope strung between the two posts
  // at the nuki level, with three zigzag white shide paper streamers.
  // White shide on vermillion torii is the highest-contrast 'this is
  // a Shinto shrine' cultural signal that survives at pet-canvas scale.
  const shimenawaGeo = useMemo(() => {
    // Catenary sag between x=-0.42 and x=0.42 at y=0.94 → 0.84 (mid).
    const pts: THREE.Vector3[] = []
    const N = 22
    for (let i = 0; i <= N; i++) {
      const t = i / N
      const x = -0.42 + t * 0.84
      // Catenary: cosh-shape sag, normalized so endpoints meet 0.94.
      const sag = 0.10 * (1 - 4 * (t - 0.5) * (t - 0.5))
      pts.push(new THREE.Vector3(x, 0.94 - sag, 0))
    }
    const curve = new THREE.CatmullRomCurve3(pts)
    return new THREE.TubeGeometry(curve, 22, 0.024, 6, false)
  }, [])
  useEffect(() => () => shimenawaGeo.dispose(), [shimenawaGeo])
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
      {/* V53 shimenawa — rice-straw rope sagging below the nuki */}
      <mesh geometry={shimenawaGeo} castShadow>
        <meshStandardMaterial color="#E8DEBC" roughness={0.95} flatShading />
      </mesh>
      {/* 3 shide (paper zigzag streamers) hanging from the shimenawa */}
      {[-0.26, 0, 0.26].map((sx, i) => (
        <group key={`shide${i}`} position={[sx, 0.94 - 0.10 * (1 - 4 * (sx / 0.84) * (sx / 0.84)) - 0.02, 0.01]}>
          {/* Top fold */}
          <mesh position={[0, -0.04, 0]}>
            <planeGeometry args={[0.045, 0.08]} />
            <meshStandardMaterial color="#FBF7EE" roughness={0.85} side={THREE.DoubleSide} />
          </mesh>
          {/* Stepped lower folds (zigzag silhouette via 2 offset planes) */}
          <mesh position={[-0.018, -0.115, 0.002]} rotation={[0, 0, -0.05]}>
            <planeGeometry args={[0.045, 0.06]} />
            <meshStandardMaterial color="#FBF7EE" roughness={0.85} side={THREE.DoubleSide} />
          </mesh>
          <mesh position={[0.018, -0.175, 0.004]} rotation={[0, 0, 0.05]}>
            <planeGeometry args={[0.045, 0.06]} />
            <meshStandardMaterial color="#FBF7EE" roughness={0.85} side={THREE.DoubleSide} />
          </mesh>
        </group>
      ))}
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

// ── V53 KaresansuiPetals — petals blown into the rake lines.
//    Real Japanese gardens during sakura season have petals collected
//    along the rake ridges — wind catches in the grooves. Adds visible
//    warm-pink dots against the cool gravel sand and tells a tiny
//    story: "the wind blew petals in yesterday, the gardener will
//    sweep them this afternoon." InstancedMesh for ~22 petals — much
//    cheaper than per-mesh given they're all the same geo+material.
function KaresansuiPetals() {
  const COUNT = 22
  const ref = useRef<THREE.InstancedMesh>(null)
  const petalGeo = useMemo(() => new THREE.ShapeGeometry(makePetalShape(), 6), [])
  const mat = useMemo(() => new THREE.MeshStandardMaterial({
    color: '#F8C8DA', roughness: 0.92, side: THREE.DoubleSide,
  }), [])
  useEffect(() => () => { petalGeo.dispose(); mat.dispose() }, [petalGeo, mat])
  // Pre-compute static positions on first render. Most cluster near the
  // lantern base (downwind from the cherry tree); a few trace along the
  // outer rake ring; one or two near the mossy stone.
  useEffect(() => {
    const m = ref.current
    if (!m) return
    const dummy = new THREE.Object3D()
    const tints = ['#F8D6E0', '#EFB8CC', '#F8C8DA']
    const scratch = new THREE.Color()
    // Cluster: lantern base (lantern @ -0.10, 0.70 in world coords;
    // karesansui group is at -0.55 so local offset = 0.45, 0.70).
    // Plus a few along the outer rake ring (radius ~0.88) and a couple
    // randomly. 0.054 is just above the gravel surface (sand @ 0.005,
    // group y = 0.052, so local y = ~0.012 to clear z-fight).
    const seeds: Array<[number, number, number]> = [
      // 12 in a soft cluster around lantern base (within radius ~0.20)
      [0.45, 0.70, 0], [0.49, 0.74, 0.8], [0.41, 0.66, 1.6], [0.46, 0.62, 2.3],
      [0.53, 0.71, 3.1], [0.38, 0.73, 4.0], [0.42, 0.78, 4.7], [0.50, 0.66, 5.4],
      [0.55, 0.74, 0.4], [0.36, 0.69, 1.2], [0.48, 0.81, 2.0], [0.40, 0.62, 2.9],
      // 6 along the outer rake ring (~0.82 radius from group origin)
      [0.62, 0.55, 1.1], [0.30, 0.78, 0.4], [-0.20, 0.81, 2.2], [-0.55, 0.50, 0.7],
      [-0.78, 0.10, 3.3], [-0.40, -0.62, 5.0],
      // 4 near the mossy stone (mossy stone at local 0.35, 0.45)
      [0.30, 0.51, 1.9], [0.38, 0.40, 0.5], [0.43, 0.47, 3.7], [0.27, 0.43, 4.4],
    ]
    seeds.forEach((s, i) => {
      const [lx, lz, rot] = s
      dummy.position.set(lx, 0.012, lz)
      // Curl variance — real fallen petals don't all lie perfectly flat
      dummy.rotation.set(
        -Math.PI / 2 + Math.sin(i * 4.7) * 0.18,
        0,
        rot,
      )
      // 1.0-1.8 scale — at the pet canvas's 220px any smaller and
      // petals read as dust-grain dots invisible past the bloom pass.
      dummy.scale.setScalar(1.0 + (Math.sin(i * 11.3) + 1) * 0.4)
      dummy.updateMatrix()
      m.setMatrixAt(i, dummy.matrix)
      scratch.set(tints[i % 3])
      m.setColorAt(i, scratch)
    })
    m.instanceMatrix.needsUpdate = true
    if (m.instanceColor) m.instanceColor.needsUpdate = true
    m.frustumCulled = false
  }, [])
  return <instancedMesh ref={ref} args={[petalGeo, mat, COUNT]} />
}

// ── Raked karesansui gravel — 'ma' (negative space) marker around
//    the cabin. Rake lines BULGE outward around the mossy stone (the
//    gardener sweeps a wider arc to avoid it) — flat tori would read
//    'compass-drawn' not 'raked yesterday'. Each ring: TubeGeometry
//    over a CatmullRom curve with per-angle radius perturbed by a
//    slow sin (micro-irregularity) plus a gaussian bulge centered on
//    the stone angle.
const MOSS_STONE_LOCAL: [number, number] = [0.35, 0.45]   // matches mesh below
function buildRakeRing(r: number, ringIdx: number): THREE.BufferGeometry {
  // Mossy stone angle from gravel center (local origin)
  const mossAngle = Math.atan2(MOSS_STONE_LOCAL[1], MOSS_STONE_LOCAL[0])
  const pts: THREE.Vector3[] = []
  const N = 96
  for (let i = 0; i <= N; i++) {
    const theta = (i / N) * Math.PI * 2
    // Micro-irregularity sin (different phase per ring)
    const micro = Math.sin(theta * 3 + ringIdx * 1.7) * 0.012
    // Gaussian bulge around mossy stone (peaks +0.04 at mossAngle,
    // sigma ~0.4 rad). Wrap-aware angular distance.
    let da = theta - mossAngle
    if (da > Math.PI) da -= Math.PI * 2
    else if (da < -Math.PI) da += Math.PI * 2
    const bulge = Math.exp(-(da * da) / (2 * 0.4 * 0.4)) * 0.04
    const rr = r + micro + bulge
    pts.push(new THREE.Vector3(Math.cos(theta) * rr, 0, Math.sin(theta) * rr))
  }
  const curve = new THREE.CatmullRomCurve3(pts, true)
  return new THREE.TubeGeometry(curve, N, 0.005, 4, true)
}
function RakedGravel() {
  // Pre-build all 4 rings once
  const ringGeos = useMemo(() => [0.55, 0.68, 0.81, 0.92].map((r, i) => buildRakeRing(r, i)), [])
  useEffect(() => () => ringGeos.forEach((g) => g.dispose()), [ringGeos])
  return (
    <group position={[-0.55, 0.052, 0.0]}>
      {/* Sand disk */}
      <mesh receiveShadow>
        <cylinderGeometry args={[0.95, 0.95, 0.005, 48]} />
        <meshStandardMaterial color={GRAVEL_SAND} roughness={1.0} />
      </mesh>
      {/* V53 rake lines — slightly irregular curves bulging around the
          mossy stone (the gardener swept around it). Pre-built tube
          geos, zero runtime cost. */}
      {ringGeos.map((g, i) => (
        <mesh key={i} position={[0, 0.010, 0]} geometry={g}>
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
      {/* V53: fallen petals blown into the rake ridges */}
      <KaresansuiPetals />
    </group>
  )
}

// Vertex-displaced + vertex-COLORED ground plane.
// Per-vertex color lerps warmth based on displacement+radial so the
// grass reads as continuous breathing terrain, not a flat painted disk
// with decal patches on top.
function makeDisplacedGroundGeo(): THREE.BufferGeometry {
  const g = new THREE.CircleGeometry(2.05, 64)
  const pos = g.attributes.position
  const cBase = new THREE.Color(GRASS_LIGHT)
  const cHi = new THREE.Color(GRASS_HILIGHT)
  const cLo = new THREE.Color(GRASS_SHADE)
  const cSoilDk = new THREE.Color(SOIL_DK)
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
    // Rim soil-bleed: over the outer ~15% of the radius (d > 1.74),
    // blend grass → SOIL_DK so the seam reads as 'grass thinning to
    // exposed soil' instead of a hard color discontinuity at the
    // cliff edge. Angular noise breaks the ring into uneven patches
    // (some spots bare brown, others still grassy) — looks like real
    // wear, not a painted band. Uses existing palette color → stays
    // in family with the cliff top.
    if (d > 1.74) {
      const angle = Math.atan2(y, x)
      const rimNoise = Math.sin(angle * 6.7) * 0.5 + Math.cos(angle * 11.3 + 1.4) * 0.35
      // edge falloff: 0 at d=1.74, 1 at d=2.05; gated by noise so the
      // bare-soil patches are uneven (range ~0.25–0.85 at the rim)
      const edge = Math.min(1, (d - 1.74) / 0.31)
      const soilMix = Math.max(0, Math.min(0.85, edge * (0.55 + rimNoise * 0.35)))
      c.lerp(cSoilDk, soilMix)
    }
    colors[i * 3] = c.r
    colors[i * 3 + 1] = c.g
    colors[i * 3 + 2] = c.b
  }
  pos.needsUpdate = true
  g.setAttribute('color', new THREE.BufferAttribute(colors, 3))
  g.computeVertexNormals()
  return g
}

// DisplacedCliff — single mesh w/ ridged-noise vertex displacement.
// Stacked smooth cones would read 'lathe-spun cake' (a fresh-eye
// reviewer's exact phrase) — ridged noise gives jagged overhangs +
// vertical erosion grooves + exposed-root edge feel.
function makeDisplacedCliffGeo(): THREE.BufferGeometry {
  // Pre-V53.5 was a 2.05 → 1.4 cylinder (29% taper) — looked like a
  // 'tan flowerpot' under the grass. Real floating-island silhouette:
  // dramatic teardrop taper (top → narrow rocky point), pronounced
  // erosion grooves, downward stalactite features at the bottom.
  // Bumped: bottom radius 1.4 → 0.55 (73% taper), height 1.45 → 1.85
  // (deeper drop), ridged amp 0.18 → 0.34 (more visible grooves),
  // bottom stretch factor adds vertical stalactite-like elongation
  // at the apex.
  const TOP_R = 2.05
  const BOT_R = 0.55
  const HEIGHT = 1.85
  const g = new THREE.CylinderGeometry(TOP_R, BOT_R, HEIGHT, 56, 12)
  const pos = g.attributes.position
  const colors = new Float32Array(pos.count * 3)
  const cSoil = new THREE.Color(SOIL)
  const cSoilDk = new THREE.Color(SOIL_DK)
  const cCliff = new THREE.Color(CLIFF)
  const cCliffDk = new THREE.Color(CLIFF_DK)
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i)
    const rOrig = Math.hypot(x, z)
    if (rOrig > 0.01) {
      const angle = Math.atan2(z, x)
      // Ridged noise — multi-octave for jagged overhangs
      const n1 = Math.sin(angle * 7.3 + y * 0.8) * 0.5
      const n2 = Math.cos(angle * 11.7 - y * 1.2) * 0.25
      const n3 = Math.sin(angle * 19.1 + y * 2.3) * 0.12
      const n4 = Math.sin(angle * 29 + y * 3.1) * 0.06   // micro detail
      const ridged = Math.abs(n1 + n2 + n3 + n4) * 0.5
      // yFactor: 0 at top, 1 at bottom — erosion concentrates at the
      // dry-cliff face (lower portion), top stays soil-smooth
      const yFactor = (1 - (y + HEIGHT / 2) / HEIGHT)
      // Boost the radial expansion AT the cliff face (yFactor > 0.3)
      // so the silhouette gets jagged outcrops, not just bumps
      const ridgedBoost = yFactor > 0.3 ? ridged * 0.42 : ridged * 0.18
      const radial = 1 + ridgedBoost * yFactor + (Math.sin(angle * 23 + y * 4) * 0.05) * yFactor
      pos.setX(i, x * radial)
      pos.setZ(i, z * radial)
      // Stalactite stretch — the lowest ring of vertices gets pulled
      // DOWN substantially along angle-driven phase, giving 4-6 hanging
      // 'fang' rocks. User feedback: bottom looked "smooth/poo-like"
      // because the original 0.18+0.10 fangs were too subtle. Bumped
      // to 0.36+0.22+0.12 (3-octave) for true rocky underside drama.
      // Also extended fang zone from bottom 0.1 to bottom 0.25 so the
      // sculpting catches more vertices and reads as natural erosion.
      if (y < -HEIGHT / 2 + 0.25) {
        const fangFalloff = Math.min(1, (-HEIGHT / 2 + 0.25 - y) * 4)
        const stalactite = (Math.max(0, Math.sin(angle * 5 + 1.7)) * 0.36
                         +  Math.max(0, Math.sin(angle * 8 + 3.2)) * 0.22
                         +  Math.max(0, Math.sin(angle * 12.5 + 0.4)) * 0.12) * fangFalloff
        pos.setY(i, y - stalactite)
      }
    }
    // Vertex color: lerp soil→cliff by Y (top=soil, bottom=cliff_dk).
    // BUMP the bottom darkness — was lerping to cliff_dk at yNorm 0,
    // but the bottom 20% should go DEEPER than cliff_dk for cave-
    // shadow drama. Real rocky undersides have near-black recesses.
    const yNorm = (y + HEIGHT / 2) / HEIGHT  // 0 bottom, 1 top
    let c: THREE.Color
    if (yNorm > 0.78) {
      c = cSoil.clone()
    } else if (yNorm > 0.45) {
      c = new THREE.Color().lerpColors(cSoilDk, cSoil, (yNorm - 0.45) / 0.33)
    } else if (yNorm > 0.18) {
      c = new THREE.Color().lerpColors(cCliffDk, cCliff, (yNorm - 0.18) / 0.27)
    } else {
      // Bottom 18% — push toward near-black shadow recess.
      const shadowMix = 1 - yNorm / 0.18  // 0 at yNorm 0.18, 1 at bottom
      c = cCliffDk.clone().multiplyScalar(1 - shadowMix * 0.55)
    }
    // Vertical erosion drip streaks — narrow angular bands darken
    // top-to-bottom (mimics rain+mineral run-off on real rock).
    // ^6/^8 sin powers → ~5-7 thin streaks around the cliff; yFactor
    // weights strongest at bottom. multiplyScalar darkens without
    // hue shift, so they stay in the soil/cliff family.
    if (yNorm < 0.78 && rOrig > 0.01) {
      const angle = Math.atan2(z, x)
      const streak = Math.pow(Math.max(0, Math.sin(angle * 9.3 + 0.7)), 6)
                   + Math.pow(Math.max(0, Math.sin(angle * 14.1 + 2.1)), 8)
      const streakStrength = streak * (1 - (y + HEIGHT / 2) / HEIGHT) * 0.35
      c.multiplyScalar(1 - streakStrength)
    }
    colors[i * 3] = c.r
    colors[i * 3 + 1] = c.g
    colors[i * 3 + 2] = c.b
  }
  pos.needsUpdate = true
  g.setAttribute('color', new THREE.BufferAttribute(colors, 3))
  g.computeVertexNormals()
  return g
}

function DisplacedCliff() {
  const geo = useMemo(makeDisplacedCliffGeo, [])
  useEffect(() => () => geo.dispose(), [geo])
  // Non-uniform XZ scale + small azimuthal rotation breaks the
  // 'button mushroom' axisymmetry — from any rotation angle the
  // silhouette reads intentional, not lathe-revolved.
  return (
    <mesh
      geometry={geo}
      // Position so the cylinder's TOP plane (y=+HEIGHT/2 local) sits
      // at world y=0 (where the grass disc lives). New HEIGHT=1.85 →
      // top at y=0 means mesh center at y=-0.925 (was -0.725 at H=1.45).
      position={[0, -0.925, 0]}
      scale={[1.05, 1.0, 0.78]}
      rotation={[0, 0.35, 0]}
      castShadow
      receiveShadow
    >
      <meshStandardMaterial vertexColors roughness={0.95} flatShading />
    </mesh>
  )
}

function Island() {
  const groundGeo = useMemo(makeDisplacedGroundGeo, [])
  useEffect(() => () => groundGeo.dispose(), [groundGeo])
  return (
    <group scale={[1.05, 1.0, 0.78]} rotation={[0, 0.35, 0]}>
      {/* Grass disk wrapped in SAME non-uniform scale + rotation as
          DisplacedCliff so the grass edge matches the cliff edge. */}
      <mesh
        geometry={groundGeo}
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, 0.05, 0]}
        receiveShadow
      >
        <meshStandardMaterial vertexColors roughness={0.96} />
      </mesh>
      <mesh position={[0, 0, 0]} receiveShadow>
        <cylinderGeometry args={[2.05, 2.05, 0.10, 64]} />
        <meshStandardMaterial color={GRASS_LIGHT} roughness={0.96} />
      </mesh>
      <DisplacedCliff />
    </group>
  )
}

// Tobi-ishi (stepping stones) along the path. Tea-master rhythm:
// stones JOG ±0.08 against the torii→cabin axis so the imagined
// walker breaks stride and looks. Largest stone sits at the torii
// threshold (real-garden convention).
function SteppingStones() {
  const stones: Array<[number, number, number, number, number, number, 0 | 1 | 2]> = [
    [0.55, 1.32, 0.1, 0.14, 1.1, 1.4, 0],   // largest at torii threshold
    [0.54, 1.10, -0.3, 0.09, 1.0, 1.0, 2],   // jog LEFT
    [0.72, 0.92, 0.5, 0.10, 0.9, 1.3, 1],    // jog RIGHT (kidney box)
    [0.68, 0.74, -0.2, 0.085, 1.2, 0.9, 0],  // small jog left
    [0.86, 0.58, 0.4, 0.10, 1.0, 1.1, 2],    // big jog right (largest at basin)
  ]
  return (
    <group>
      {stones.map((s, i) => (
        <mesh
          key={i}
          position={[s[0], 0.058, s[1]]}
          rotation={[0, s[2] + i * 0.17, 0]}
          scale={[s[4], 0.5, s[5]]}
          castShadow
          receiveShadow
        >
          {s[6] === 0
            ? <dodecahedronGeometry args={[s[3], 0]} />
            : s[6] === 1
              ? <boxGeometry args={[s[3] * 1.6, s[3] * 0.8, s[3] * 2.1]} />
              : <sphereGeometry args={[s[3] * 1.1, 8, 6]} />}
          <meshStandardMaterial
            color={i % 2 === 0 ? '#9C9085' : '#8A7E72'}
            roughness={0.95}
            flatShading
          />
        </mesh>
      ))}
    </group>
  )
}

// FallenPetals — sakura petals scattered on the ground.
// Each petal uses an elongated teardrop oval (5-lobe sakura silhouette).
function FallenPetals() {
  const petalGeo = useMemo(() => new THREE.ShapeGeometry(makePetalShape(), 8), [])
  useEffect(() => () => petalGeo.dispose(), [petalGeo])
  const positions = useMemo(() => {
    const out: Array<{ x: number; z: number; rot: number; scale: number }> = []
    // 38 petals — fewer + bigger reads better at the auto-rotate speed
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
  // Sparse flutter on gust: nudge rotation.x on 5 indexed petals when
  // wind.gust > 0.05 — sparse selection so it reads as 'lifelike rustle',
  // never as 'wave passing through'.
  const grpRef = useRef<THREE.Group>(null)
  const lightPetals = useMemo(() => [3, 11, 17, 24, 31], [])
  useFrame((s) => {
    const grp = grpRef.current
    if (!grp) return
    const t = s.clock.elapsedTime
    const wind = getWind(t)
    if (wind.gust < 0.05) return    // calm — do nothing (perf + stillness)
    lightPetals.forEach((idx, k) => {
      const m = grp.children[idx] as THREE.Mesh | undefined
      if (!m) return
      const baseTilt = -Math.PI / 2 + Math.sin(idx * 4.3) * 0.15
      // Lift edge by up to 0.5 rad on peak gust, per-petal phase offset
      const lift = wind.gust * 0.6 * Math.sin(t * 3.2 + k * 1.7)
      m.rotation.x = baseTilt + lift
    })
  })
  return (
    <group ref={grpRef} position={[0.55, 0.058, -0.35]}>
      {positions.map((p, i) => (
        <mesh
          key={i}
          position={[p.x, 0, p.z]}
          // Real fallen petals curl — rotation.x variance per index
          rotation={[-Math.PI / 2 + (Math.sin(i * 4.3) * 0.15), 0, p.rot]}
          scale={p.scale}
          geometry={petalGeo}
        >
          <meshStandardMaterial
            color={i % 3 === 0 ? '#F8D6E0' : i % 2 ? '#EFB8CC' : '#F8C8DA'}
            roughness={0.9}
            side={THREE.DoubleSide}
          />
        </mesh>
      ))}
    </group>
  )
}

// F-sync: pet sun is now BIASED by real time of day. Pet and /world/
// stay coherent — same hour, both bright at noon, both dim at 2am.
// Keeps the 90s breathing cycle + golden-hour dwell on TOP of the bias.
// Returns intensity multiplier + color shift + Y bias for current time.
function getTimeBias() {
  if (typeof window === 'undefined') return { intensity: 1, color: '#FFE8C0', sunY: 5.5 }
  const mins = new Date().getHours() * 60 + new Date().getMinutes()
  // 4 phase anchors: dawn 5:00, noon 12:00, dusk 18:00, midnight 0:00
  // Lerp between adjacent anchors.
  const anchors = [
    { mins: 0,    intensity: 0.18, color: '#5A6088', sunY: -1.5 },   // midnight
    { mins: 300,  intensity: 0.85, color: '#FFAE82', sunY: 2.5 },    // dawn 5:00
    { mins: 720,  intensity: 2.15, color: '#FFE8C0', sunY: 5.5 },    // noon 12:00
    { mins: 1080, intensity: 1.45, color: '#FF9A6A', sunY: 3.0 },    // dusk 18:00
    { mins: 1440, intensity: 0.18, color: '#5A6088', sunY: -1.5 },   // midnight (wraps)
  ]
  let i = 0
  while (i < anchors.length - 1 && mins >= anchors[i + 1].mins) i++
  const a = anchors[i]
  const b = anchors[i + 1] || anchors[anchors.length - 1]
  const blend = (mins - a.mins) / (b.mins - a.mins || 1)
  const easeBlend = 0.5 - Math.cos(blend * Math.PI) * 0.5
  const intensity = a.intensity + (b.intensity - a.intensity) * easeBlend
  const sunY = a.sunY + (b.sunY - a.sunY) * easeBlend
  // Color lerp via THREE.Color
  const c = new THREE.Color(a.color).lerp(new THREE.Color(b.color), easeBlend)
  return { intensity, color: '#' + c.getHexString(), sunY }
}

// AnimatedSun — directional key light. 90s breathing cycle warms
// from cream → amber, with a 'golden hour dwell' that lowers the sun
// position so shadows lengthen with the warmth. NOW BIASED by real
// time of day (F-sync) so pet matches /world/'s ambient mood.
function AnimatedSun() {
  const lightRef = useRef<THREE.DirectionalLight>(null)
  const cAmber = useMemo(() => new THREE.Color('#FFD8A0'), [])
  const cGolden = useMemo(() => new THREE.Color('#FFB870'), [])
  const scratch = useMemo(() => new THREE.Color(), [])
  const biasColor = useMemo(() => new THREE.Color(), [])
  // Re-read time bias every 60s (sufficient for ambient)
  const biasRef = useRef(getTimeBias())
  useEffect(() => {
    const id = setInterval(() => { biasRef.current = getTimeBias() }, 60000)
    return () => clearInterval(id)
  }, [])
  useFrame((s) => {
    if (!lightRef.current) return
    const t = s.clock.elapsedTime
    const cycle = (Math.sin(t * 0.07) + 1) * 0.5
    const dwell = getDwellGolden(t)
    const bias = biasRef.current
    // Bias intensity by time of day. Breathing + dwell layer ON TOP.
    lightRef.current.intensity = bias.intensity * (1 + Math.sin(t * 0.07) * 0.04) - dwell * 0.15
    biasColor.set(bias.color)
    scratch.copy(biasColor).lerp(cAmber, cycle * 0.3).lerp(cGolden, dwell)
    lightRef.current.color = scratch
    // Sun POSITION: y biased by time, dwell still lowers it further.
    lightRef.current.position.x = 4 + dwell * 1.5
    lightRef.current.position.y = bias.sunY - dwell * 1.3
    lightRef.current.position.z = 3 - dwell * 0.4
  })
  return (
    <directionalLight
      ref={lightRef}
      position={[4, 5.5, 3]}
      intensity={2.5}
      color="#FFE8C0"
      castShadow
      // 1024² is plenty at a 220×220 canvas — 2048² halved the
      // shadow-pass cost for zero visible difference.
      shadow-mapSize={[1024, 1024]}
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

// AnimatedHearthLight — pointLight at the cabin shoji that pulses
// with the hearth cycle. 0.15s lag behind the shoji emissive (which
// itself lags smoke) so the light bounce reads as 'cast follows source'.
function AnimatedHearthLight() {
  const ref = useRef<THREE.PointLight>(null)
  useFrame((s) => {
    if (!ref.current) return
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
      // Bounce light is the FIRE itself, before it diffuses through
      // paper — slightly warmer than the WASHI_GLOW it lights up.
      // Tuned against V53.5 cooler-overall palette so the hearth
      // bounce reads as 'fire under paper', not 'lamp behind shade'.
      color="#FFD9A0"
    />
  )
}

// BreathingShoji — paper window. Cabin reads as inhabited (not
// LED-lit) via emissive intensity lerp + warm tint shift on hearth
// peak. Base intensity 0.62 crosses the Bloom threshold (0.85)
// gently so the cabin radiates as a constant warm-light anchor.
const SHOJI_EMBER = '#FFB070'
function BreathingShoji({ position, size }: {
  position: [number, number, number]
  size: [number, number]
}) {
  const ref = useRef<THREE.MeshStandardMaterial>(null)
  const baseColor = useMemo(() => new THREE.Color(WASHI_GLOW), [])
  const emberColor = useMemo(() => new THREE.Color(SHOJI_EMBER), [])
  const scratch = useMemo(() => new THREE.Color(), [])
  // F-sync: shoji glow brighter at night, dimmer at noon. Inside-out
  // perception — paper window glows MORE against dark sky.
  const biasRef = useRef(1)
  useEffect(() => {
    const update = () => {
      const b = getTimeBias()
      // Map intensity 2.15 (noon) → 0.55× shoji, 0.18 (midnight) → 1.4×
      biasRef.current = 1.4 - (b.intensity / 2.15) * 0.85
    }
    update()
    const id = setInterval(update, 60000)
    return () => clearInterval(id)
  }, [])
  useFrame((s) => {
    if (!ref.current) return
    const t = s.clock.elapsedTime
    const hearth = getHearth(t - 0.15)
    const hover = getHoverBoost(t)
    ref.current.emissiveIntensity = (0.62 + Math.sin(t * 0.6) * 0.05 + hearth.shojiBrighten + hover * 0.18) * biasRef.current
    // Warm tint shift on hearth peak — fire's hue bleeds through paper
    scratch.copy(baseColor).lerp(emberColor, Math.max(0, Math.min(0.6, hearth.shojiBrighten * 1.2)))
    ref.current.emissive.copy(scratch)
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



// PathMoss — small green patches between stepping stones; wabi-sabi
// 'well-trodden garden' detail. Each patch is a 2-blob lobe (main
// disc + smaller offset partner) with palette+tilt variance — flat
// uniform circles read as 'emoji stickers' against the variance-rich
// surroundings.
function PathMoss() {
  // Positions between consecutive stones (midpoints + slight offsets)
  const patches: Array<[number, number, number, number]> = [
    [0.48, 1.20, 0.08, 0.5],     // between stone 0 and 1
    [0.35, 1.02, -0.06, 0.4],
    [0.21, 0.88, 0.05, 0.45],
    [0.08, 0.76, -0.04, 0.4],
    [0.00, 0.69, 0.03, 0.35],
  ]
  const mossPalette = ['#7AA868', '#6B9658', '#8AB87A']
  return (
    <group>
      {patches.map((p, i) => (
        <group key={i} position={[p[0], 0.058, p[1]]}>
          {/* Main disc — slight tilt catches the sun direction */}
          <mesh
            rotation={[-Math.PI / 2 + Math.sin(i * 2.3) * 0.08, 0, p[2]]}
            scale={p[3]}
          >
            <circleGeometry args={[0.08, 12]} />
            <meshStandardMaterial color={mossPalette[i % 3]} roughness={0.95} />
          </mesh>
          {/* Smaller lobe — offset partner makes silhouette organic */}
          <mesh
            position={[Math.sin(i * 5.1) * 0.04, 0.001, Math.cos(i * 5.1) * 0.04]}
            rotation={[-Math.PI / 2 + Math.cos(i * 1.9) * 0.06, 0, p[2] + 0.5]}
            scale={p[3] * 0.7}
          >
            <circleGeometry args={[0.04, 10]} />
            <meshStandardMaterial color={mossPalette[(i + 1) % 3]} roughness={0.95} />
          </mesh>
        </group>
      ))}
    </group>
  )
}

// ParallaxRig — diorama-in-window effect. Camera subtly tracks mouse
// position (lerped) so the scene reads as a peep-box, not a video.
// Owns camera position + lookAt every frame; base coords MUST match
// the Canvas-prop camera. baseZ 9.5 chosen for SQUARE 1:1 220×220
// pet canvas: at z=9.5 the disc front-corner has half-width 2.27 vs
// disc x-extent 2.15 — 0.12 unit margin at closest point.
function ParallaxRig() {
  const { camera } = useThree()
  const baseX = 2.6     // matches Canvas prop [2.6, 2.0, 9.5]
  const baseY = 2.0
  const baseZ = 9.5
  useFrame((_, dt) => {
    // ±0.15 / ±0.10 — subtle parallax for a small pet (more feels arcade-y)
    const targetX = baseX + mouseState.x * 0.15
    const targetY = baseY + mouseState.y * -0.10
    const lerpAmt = Math.min(1, dt * 3)
    camera.position.x += (targetX - camera.position.x) * lerpAmt
    camera.position.y += (targetY - camera.position.y) * lerpAmt
    camera.position.z = baseZ
    camera.lookAt(0, 0.85, 0)
  })
  return null
}




// FallingPetals — sakura petals drifting down from the canopy.
// Each petal drifts on shared wind (gust + direction) and tumbles.
// Sakura-zone hover boosts gust 1.5×, hover anywhere adds 1.5× more
// to effective gust — gives "the island reacts to your cursor".
function FallingPetals() {
  const COUNT = 60
  const ref = useRef<THREE.InstancedMesh>(null)
  const petalGeo = useMemo(() => new THREE.ShapeGeometry(makePetalShape(), 8), [])
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
  // Hoisted per-frame allocs — bare object literals here would create
  // 3600+ THREE.Color and Object3D per second.
  const dummy = useMemo(() => new THREE.Object3D(), [])
  // V53.5 sat-up to match the canopy bloom (#F6C8D8). Previously
  // #FFEAF1 / #F5C8D6 / #FFD8E3 averaged ~16% sat; after canopy
  // tint jumped 13%→28% the falling petals read 'bleached' next
  // to the tree they came from. Now ~26% sat avg — same family.
  const tints = useMemo(() => ['#F8D6E0', '#EFB8CC', '#F8C8DA'].map((c) => new THREE.Color(c)), [])

  useFrame((s) => {
    if (!ref.current) return
    const t = s.clock.elapsedTime
    const wind = getWind(t)
    const hover = getHoverBoost(t)
    const sakuraBoost = hoverZone.current === 'sakura' ? 1.5 : 1
    const effectiveGust = wind.gust + hover * 1.5 * sakuraBoost
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
      dummy.position.set(px, wrappedY, pz)
      dummy.rotation.set(
        -Math.PI / 2 + Math.sin(t * 0.8 + sd.phaseR) * 0.5,
        t * 0.6 + sd.phaseR,
        Math.cos(t * 0.7 + sd.phaseR) * 0.4,
      )
      dummy.scale.setScalar(sd.scale)
      dummy.updateMatrix()
      ref.current!.setMatrixAt(i, dummy.matrix)
    })
    ref.current.instanceMatrix.needsUpdate = true
  })

  // Per-instance tints are STATIC (each seed's tintIdx is set once) —
  // write them in a one-shot effect, not in the per-frame loop. Was
  // causing a 60×3-float instanceColor GPU re-upload every frame.
  useEffect(() => {
    const m = ref.current
    if (!m) return
    seeds.forEach((sd, i) => m.setColorAt(i, tints[sd.tintIdx]))
    if (m.instanceColor) m.instanceColor.needsUpdate = true
  }, [seeds, tints])

  return (
    <instancedMesh
      ref={ref}
      args={[petalGeo, undefined as unknown as THREE.Material, COUNT]}
      frustumCulled={false}
    >
      <meshStandardMaterial
        color="#F8C8DA"
        roughness={0.9}
        side={THREE.DoubleSide}
        transparent
        opacity={0.92}
      />
    </instancedMesh>
  )
}

// WindSway — wraps any group + applies gentle X/Z rotation sway
// COUPLED to the shared getWind() field. Phase doubles as per-tree
// lag (in seconds) so taller/looser things gust more, and the sin
// sub-rhythm is only 40% of the gust amplitude — wind reads as a
// coherent field passing through, not 22 independent loops.
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
    // phase: 0 (sakura, no lag) → up to 2s (small cedars in back)
    const wind = getWind(t - phase * 0.6)
    // Per-instance amplitude variation — taller/looser trees gust more
    const ampVar = 0.6 + phase * 0.2
    // Direction bias from wind field + light sub-rhythm + gust kick
    ref.current.rotation.z =
      wind.dirX * amp * 1.2 +
      Math.sin(t * freq + phase) * amp * 0.40 +
      wind.gust * amp * 1.8 * ampVar
    ref.current.rotation.x =
      wind.dirZ * amp * 0.7 +
      Math.cos(t * freq * 0.7 + phase * 1.3) * amp * 0.25 +
      wind.gust * amp * 0.9 * ampVar
  })
  return <group ref={ref}>{children}</group>
}

// ChimneySmoke — 3 puffs rising from the cabin chimney. Real chimney
// smoke is CLUMPY (two puffs close, then a long pause) — slow-noise
// jitter on per-puff phase ±0.4s avoids the 'conveyor belt' cadence.
// Hearth.smokeBoost lifts puff 0 (leader) by 1.2× and puffs 1+2 by
// 0.6× — viewer SEES the hearth stoke cause a smoke surge.
function ChimneySmoke() {
  const puffs = [
    useRef<THREE.Mesh>(null),
    useRef<THREE.Mesh>(null),
    useRef<THREE.Mesh>(null),
  ]
  useFrame((s) => {
    const t = s.clock.elapsedTime
    // Smoke (high mass / dispersed) lags wind by 0.8s
    const wind = getWind(t - 0.8)
    const hearth = getHearth(t)
    puffs.forEach((r, i) => {
      const m = r.current
      if (!m) return
      const jitter = Math.sin(t * 0.11 + i * 2.3) * 0.4
      const phase = (t * 0.25 + i * 0.9 + jitter) % 2.7
      m.position.y = 0.05 + phase * 0.45
      m.position.x = Math.sin(t * 0.5 + i) * 0.08 + phase * (0.08 + wind.dirX * 0.06)
      m.position.z = Math.cos(t * 0.4 + i * 0.7) * 0.05 + phase * wind.dirZ * 0.05
      // Fade-in/out at phase boundaries hides the reset teleport
      const baseScale = (0.6 + phase * 0.5) * (1 + hearth.smokeBoost * (i === 0 ? 1.2 : 0.6))
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

// WebGL context-loss/restore handlers — must live in a child component
// (not Canvas onCreated, which has no cleanup hook) so listeners
// don't accumulate on the canvas across strict-mode / HMR / Astro
// view-transition remounts.
function ContextLossHandlers() {
  const gl = useThree((s) => s.gl)
  useEffect(() => {
    const el = gl.domElement
    const onLost = (e: Event) => {
      e.preventDefault()
      const wrap = document.getElementById('island-3d-canvas-wrap')
      if (wrap) {
        wrap.classList.remove('island-loaded')
        wrap.classList.add('island-webgl-failed')
      }
    }
    // No onRestored handler: R3F doesn't auto-recreate the
    // WebGLRenderer or re-upload geometries/materials after a
    // 'webglcontextrestored' event — even though the context is
    // technically alive, all useMemo'd buffers are orphaned and the
    // canvas would render blank. Optimistically flipping back to
    // 'island-loaded' would HIDE the skeleton + hint and show the
    // user an empty 220×220 transparent square with no recovery
    // affordance. Honest UX: stay in failed state until refresh
    // (the existing wrapper click handler still navigates to /world/
    // as the recovery path).
    el.addEventListener('webglcontextlost', onLost, { passive: false } as AddEventListenerOptions)
    return () => {
      el.removeEventListener('webglcontextlost', onLost)
    }
  }, [gl])
  return null
}

// RotatingScene — slow Y-rotation on the whole island (3-min baseline).
// Eases 4× slower when sakura faces camera (y≈0) so the hero pose
// holds ~15-20s per cycle — without the ease, the money pose existed
// for 0 frames. Pauses on hover. Lights stay outside this group
// (world-fixed) so shading is consistent across all rotation angles.
function RotatingScene({ children }: { children: React.ReactNode }) {
  const ref = useRef<THREE.Group>(null)
  const RATE = (Math.PI * 2) / 180   // one full turn per 3 minutes (baseline)
  useFrame((_, dt) => {
    if (!ref.current) return
    if (hoverState.active) return    // freeze on hover
    const y = ref.current.rotation.y
    // (1 - cos(y))/2 ranges 0..1 with min at y=0 (sakura facing)
    const ease = 0.25 + 0.75 * ((1 - Math.cos(y)) / 2)
    ref.current.rotation.y = (y + dt * RATE * ease) % (Math.PI * 2)
  })
  return <group ref={ref}>{children}</group>
}

// ParallaxBreath — outer wrapper that adds:
//   1. Mouse-following tilt: ±0.045 rad on X (pitch) + Z (roll) based
//      on mouseState. Subtle "the island leans toward your cursor."
//   2. Idle breathing: when NOT hovered, slow 8s-period sine Y-translate
//      ±0.04 — the island appears to rise + settle gently.
// Both effects are CRITICALLY DAMPED so they ease in/out instead of
// snapping when hover state changes. Position composed with the
// existing camera framing — does NOT replace it.
function ParallaxBreath({ children }: { children: React.ReactNode }) {
  const ref = useRef<THREE.Group>(null)
  // Smoothed values approach target each frame (low-pass filter feel)
  const smX = useRef(0)
  const smZ = useRef(0)
  const t = useRef(0)
  useFrame((_, dt) => {
    if (!ref.current) return
    t.current += dt
    // Target tilt from mouseState. Sub-A: 0.045 rad was invisible at
    // the 220px canvas → bumped to 0.095 for a clearly noticeable lean
    // without being cartoony. Critical damping smoothing prevents snap.
    const targetX = hoverState.active ? mouseState.y *  0.095 : 0
    const targetZ = hoverState.active ? mouseState.x * -0.095 : 0
    smX.current += (targetX - smX.current) * Math.min(1, dt * 6)
    smZ.current += (targetZ - smZ.current) * Math.min(1, dt * 6)
    ref.current.rotation.x = smX.current
    ref.current.rotation.z = smZ.current
    // Idle breathing — 8s period, ±0.08 Y translate (was 0.04 — too
    // subtle to register at camera distance). Half when hovered so
    // mouse tilt is the primary motion but the island still feels alive.
    const phase = (t.current / 8) * Math.PI * 2
    const breathAmp = hoverState.active ? 0.025 : 0.08
    ref.current.position.y = Math.sin(phase) * breathAmp
  })
  return <group ref={ref}>{children}</group>
}

export default function IslandWidget() {
  // Pause render loop when widget is off-screen OR tab is hidden —
  // saves real battery on the homepage which has ~10 other cards
  // visible above the fold, without affecting visible-state quality.
  const [paused, setPaused] = useState(false)
  const canvasWrapRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (typeof window === 'undefined') return
    let visible = true
    let tabVisible = !document.hidden
    function update() {
      setPaused(!(visible && tabVisible))
    }
    const io = new IntersectionObserver((entries) => {
      visible = entries.some(e => e.isIntersecting)
      update()
    }, { threshold: 0.05 })
    if (canvasWrapRef.current) io.observe(canvasWrapRef.current)
    // If user hovered the pet then alt-tabbed away / OS sleep /
    // closed laptop without crossing the canvas edge, pointerleave
    // never fires → hoverState.active stays true forever →
    // RotatingScene freezes mid-rotation + hover-boost stays at peak.
    // Reset on visibilitychange/blur as belt-and-suspenders so a
    // 24h tab session can't strand the scene in hover-locked state.
    function clearStickyHover() {
      if (!hoverState.active) return
      hoverState.active = false
      hoverState.decay = performance.now() / 1000
      mouseState.x = 0
      mouseState.y = 0
      hoverZone.current = null
    }
    function onVisChange() {
      tabVisible = !document.hidden
      if (document.hidden) clearStickyHover()
      update()
    }
    document.addEventListener('visibilitychange', onVisChange)
    window.addEventListener('blur', clearStickyHover)
    return () => {
      io.disconnect()
      document.removeEventListener('visibilitychange', onVisChange)
      window.removeEventListener('blur', clearStickyHover)
    }
  }, [])
  return (
    <div ref={canvasWrapRef} style={{ width: '100%', height: '100%' }}>
    <Canvas
      shadows={!IS_MOBILE}
      // Camera tuned for the SQUARE 1:1 220×220 pet canvas. At depth
      // 9.5 the visible half-width = half-height = 9.5·tan(16°) ≈ 2.57
      // — clears the disc x-extent ±2.15 with margin even at the
      // closer front-corner (depth ≈ 7.9, half ≈ 2.27).
      camera={{ position: [2.6, 2.0, 9.5], fov: 32 }}
      dpr={IS_MOBILE ? [1, 1.2] : [1, 1.5]}
      // Off-screen / hidden-tab → 'never' (battery saver).
      // Reduced-motion → 'demand' (single static render via R3F's
      // initial invalidate — animations never start).
      frameloop={paused ? 'never' : (PREFERS_REDUCED_MOTION ? 'demand' : 'always')}
      gl={{
        antialias: true,
        alpha: true,
        toneMapping: ACESFilmicToneMapping,
        // 1.12 keeps midtone warmth while pulling the sakura crown +
        // golden-hour amber back out of Bloom's threshold (0.85) —
        // higher and the crown reads as 'soft pink cloud' not petals.
        toneMappingExposure: 1.12,
      }}
      style={{ width: '100%', height: '100%' }}
      onPointerEnter={() => {
        hoverState.active = true
        hoverState.enteredAt = performance.now() / 1000
      }}
      onPointerLeave={() => {
        hoverState.active = false
        hoverState.decay = performance.now() / 1000
        mouseState.x = 0
        mouseState.y = 0
        hoverZone.current = null
      }}
      onPointerMove={(e) => {
        const rect = (e.currentTarget as HTMLCanvasElement).getBoundingClientRect()
        mouseState.x = ((e.clientX - rect.left) / rect.width - 0.5) * 2   // -1..1
        mouseState.y = ((e.clientY - rect.top) / rect.height - 0.5) * 2
        // Map normalized cursor to a hover zone (read by FallingPetals
        // for sakura-area 1.5× gust boost). Hovering the sakura area
        // is discoverable — the user already moved their cursor there.
        const mx = mouseState.x, my = mouseState.y
        hoverZone.current =
          (mx > 0.15 && my < 0.35) ? 'sakura' :
          (mx < -0.15) ? 'cabin' : null
      }}
    >
      <ContextLossHandlers />
      {/* No <color> bg + no fog — alpha:true canvas, page bg shows
          through. Fog would draw sky-colored haze onto distant objects
          which on a transparent-bg canvas reads as a rectangle of
          color (visible canvas edge = PiP frame feel). */}

      {/* Lighting — bright noon, Studio Ghibli golden hour balance */}
      {/* V53.4 (Sub-A 16 mood tune): hemi 0.95 → 0.78 + ambient 0.60
          → 0.50 — paired with sun -12%, the warm interior light
          sources (hearth/lantern/shoji) take more relative weight.
          'Lit refuge against night' read, not 'daytime postcard'. */}
      <hemisphereLight args={['#FFF3DC', '#9CBC78', 0.78]} />
      <ambientLight intensity={0.50} color="#FFF6DC" />
      {/* V14: animated breathing sun (90s cycle, ±0.06 intensity, warm→amber) */}
      <AnimatedSun />
      <directionalLight position={[-3, 2.5, -3]} intensity={0.55} color="#C8DCEC" />
      {/* Violet fill from below — Ghibli signature shadow tint (Sub-A #3 #3) */}
      {/* Violet under-fill — Ghibli shadow-tint. Re-aimed to rake
          more directly UP the new V53.5 cliff fang-rocks (which
          hang straight down) instead of sidelong, and intensity
          bumped 0.18→0.26 since the new dramatic taper has less
          surface area to receive the tint. */}
      <directionalLight position={[-1, -1.5, 1]} intensity={0.26} color="#B8A0C8" />
      {/* V10: warm pointLight at cabin shoji → gravitational anchor.
          V17: pulse in lockstep with hearth (cast light reveals
          inner flame stoke to outside world). */}
      <AnimatedHearthLight />

      {/* === Scene === V53: everything anchored to the island lives
          inside RotatingScene so the whole disc + its inhabitants turn
          as one unit. Atmospherics (Sparkles, FallingPetals) stay
          OUTSIDE since they're frame-relative drifts, not island parts.
          V54: ParallaxBreath wraps RotatingScene — adds mouse-following
          tilt (hover) + 8s idle breathing Y-translate. */}
      <ParallaxBreath>
      <RotatingScene>
        <Island />
        <SteppingStones />
        <FallenPetals />
        <RakedGravel />
        <MinkaCabin />
        <ChimneySmoke />

        {/* WindSway wrap. V52.6: scale 0.56 caps sakura canopy peak
            at y=3.19 to clear the y=3.25 frustum top.
            V53 reframe (Sub-A impact 5/5): pre-V53 sakura at z=-0.35
            sat BEHIND the torii in camera depth — vermillion gate
            stole the first glance and pink hero was upstaged. Move
            forward to z=0.15 so trunk + canopy crown the right third
            INSTEAD of peeking over the gate. Keep scale 0.56 to
            preserve frustum-top clearance. Also x 0.55 → 0.40 to
            redistribute mass leftward (right side was overloaded
            with sakura + torii + tsukubai). */}
        {/* density 1.0 (not hero=true) — boosts fluff to 700 so the
            sakura's silhouette beats the cliff at 220×220 first-glance;
            hero=true would bump canopyRY 1.4→2.0 + canopyCY +0.4 and
            clip the y=3.25 frustum top at scale 0.56.
            tint #F6C8D8 (sat 28%) reclaims chromatic-hero against the
            now-saturated cool grass — pre-V53.5 #fad9e4 (sat 13%)
            sat above the warm grass, but the V53.5 desat shifted that
            balance. Matches the FallingPetals 3-shade family. */}
        <WindSway amp={0.018} freq={0.5}>
          <group position={[0.40, 0, 0.15]} scale={0.56}>
            <Sakura
              position={[0, 0, 0]}
              seed={20260524}
              size={1.0}
              density={1.0}
              hero={false}
              rotY={0.4}
              tint="#F6C8D8"
            />
          </group>
        </WindSway>

        {/* 2 cedars in back (cut 1 for breathing room) */}
        <Cedar x={-1.15} z={-1.05} scale={1.0} seed={1} />
        <Cedar x={-0.30} z={-1.45} scale={0.88} seed={2} />

        {/* Lantern (scale 0.70 reads at engawa-handrail height — real
            ishidoro is shoulder-tall).
            COUPLED TO: KaresansuiPetals petal coords assume this
            lantern at (-0.10, 0.70). Moving > ~0.05u drifts the
            cluster of fallen petals around its base off-center. */}
        <StoneLantern x={-0.10} z={0.70} />
        {/* Torii: pulled to z=1.05 + rotY -0.42 so both posts stay
            on disc (z_extent ±1.6) and the gate's opening funnels
            toward the cabin/lantern axis instead of competing with
            sakura on the same diagonal. */}
      {/* rotY -0.25 → -0.42 (~10° more CW): the torii's opening now
          faces the cabin/lantern axis, framing the path through the
          stepping stones toward the shoji glow instead of competing
          with the sakura on the same upper-right diagonal. */}
      <Torii x={0.45} z={1.05} rotY={-0.42} />

        {/* V53.2 (Sub-A reverse pass): Tsukubai removed.
            Karesansui IS dry water — having literal water + symbolic
            water was the un-Japanese mistake. At 220×220 the basin
            was a sub-pixel detail (bamboo spout ~3px, basin lip torus
            invisible) competing with sakura+lantern for the bloom
            budget. Path now ends in contemplative negative space —
            more 'ma', more 大道至简. Component code kept on disk for
            possible re-enable. */}
        {/* <Tsukubai x={0.95} z={0.4} /> */}
      </RotatingScene>
      </ParallaxBreath>

      {/* V12: drei Sparkles for atmospheric haze (replaces flat-plane
          light shafts that looked like tissue paper from oblique angles).
          40 small warm motes drifting in the sun-air zone above the
          scene. */}
      {/* V52.2 (Sub-A fix C): scale tightened from [3.6, 2.2, 3.6] →
          [2.4, 1.8, 2.4] + position lowered (1.3 → 1.0) so sparkle
          motes drift WITHIN the island silhouette, not above as a
          rectangular cloud. The drift volume was visible as a soft
          rectangle = subtle "scene box" tell. */}
      {/* V52.4: y 1.0 → 1.3 — lift sparkle volume so floor (y - half
          extent = 1.3 - 0.9 = 0.4) sits ABOVE the stepping stones,
          not on them. Otherwise the haze reads as ground dust = soft
          rectangular tell on the disc. */}
      <Sparkles
        count={45}
        size={3}
        scale={[2.4, 1.8, 2.4]}
        position={[0, 1.3, 0]}
        color="#FFE8C0"
        speed={0.25}
        opacity={0.65}
      />

      {/* Falling petals — Ghibli money shot. Drift down from canopy. */}
      <FallingPetals />

      {/* moss/lichen between stepping stones (always-on micro-life) */}
      <PathMoss />

      {/* mouse parallax — slight head-turn when cursor approaches the pet.
          Owns camera position + lookAt every frame (OrbitControls removed
          in V52, so this is the only thing keeping the camera on-target). */}
      <ParallaxRig />

      {/* Postprocessing: Bloom for emissives (shoji + lantern + smoke
          glints) + SMAA. NO Vignette — its rectangular corner darken
          would draw the canvas edge back into view on a transparent
          pet canvas (= PiP frame feel). Bloom skipped on mobile (most
          expensive pass per frame). */}
      <EffectComposer multisampling={0}>
        {!IS_MOBILE && (
          <Bloom intensity={0.35} luminanceThreshold={0.85} luminanceSmoothing={0.5} mipmapBlur />
        )}
        <ToneMapping mode={ToneMappingMode.ACES_FILMIC} />
        <SMAA />
      </EffectComposer>
    </Canvas>
    </div>
  )
}
