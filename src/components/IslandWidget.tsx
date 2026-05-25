// Inline homepage mini-island — R3F scene that previews /world/.
//
// Mounts via Astro client:visible (only when scrolled into view).
// frameloop="never" toggles to "always" on IntersectionObserver visible
// + back to "never" on visibilitychange hidden — costs 0 frames when
// off-screen or tab-backgrounded.
//
// ─── FILE MAP (~1430 LOC; V52.8 — atmospherics cleanup) ───
//   Cedar         : slim conifer + WindSway + canopy geo dispose
//   MinkaCabin    : irimoya roof + dormer + shoji + chimney
//   StoneLantern  : 2-octave flicker + interior pointLight
//   Torii         : vermillion posts + kasagi
//   RakedGravel   : concentric tori around cabin ("ma")
//   Tsukubai      : bamboo spout + water stream + ripples
//   DisplacedCliff: ridged-noise vertex displacement (island base)
//   Island        : ground disc + scene root
//   SteppingStones: varied geometry + tea-master jog
//   FallenPetals  : sakura petals scattered on ground
//   AnimatedSun   : directional light, 90s breathing + dwell golden-hour
//   HearthLight   : pointLight inside cabin, pulses with hearth phase
//   PathMoss      : green patches between stepping stones
//   ChimneySmoke  : 3 puffs rising on hearth-cycle phase
//   ParallaxRig   : V52 owns camera position + lookAt every frame
//   FallingPetals : InstancedMesh drift-down from canopy
//   WaterSurface  : tsukubai water plane with ripples
//   WaterStream   : bamboo spout to basin trickle
//   Canvas root   : EffectComposer (Bloom + SMAA), frameloop gating,
//                   ContextLossHandlers (V44 leak fix)
//
// ─── DELETED V52 (pet redesign — were for inline-card framing) ───
//   SkyMood, DistantClouds, MidCloudWisps, DistantMountains,
//   HoverZoneHotspots, ZoneSparkles, UpperCumulus, BirdFlyby (~340 LOC).
//   See breadcrumb comments at each former site for the why.
//
// ─── COORDINATION (the "one organism" trick) ───
//   All hooks (getWind, getHearth, getDwellGolden, getHoverBoost) read
//   shared module state from ./island-shared. Read by ~12 child useFrame
//   loops (was 20 before V52.8 cleanup) so the scene feels coherent:
//   smoke → shoji → lantern lag, golden hour cascade across sun colour
//   + position + (in card) CSS sky gradient.
//
// ─── HISTORY ───
//   V3 was rejected as "kindergarten" → V4-V42 ~40 Sub-A iterations →
//   CTO review 9.4/10. V43 extracted island-shared.ts. V44 i18n + this
//   doc block. Full iteration notes in git log.

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
  // V52.8: SKY + FOG_TINT no longer used (SkyMood/DistantMountains deleted)
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
// V11: gentle wind sway.
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

  // V44 LEAK FIX: dispose canopy BufferGeometries on unmount. Without
  // this, every Cedar instance leaks 6 GPU buffers (strict-mode double-
  // mount, HMR, or Astro view-transition would compound the leak).
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
      // V53.1 elegance pass (Sub-A): paired anticipation+exhale every
      // ~12s — long slow inhale (scale up) followed by sharp exhale
      // (scale settle). Replaces uniform sin breath which read as a
      // mechanical pulse. The slow base sin remains as background.
      const baseBreath = Math.sin(t * 0.9) * 0.018
      const deepCycle = (t % 12) / 12
      // 0.4 → 0.6 of cycle: deep inhale rise. 0.6 → 0.7: exhale fall.
      let deep = 0
      if (deepCycle > 0.40 && deepCycle < 0.60) deep = Math.sin((deepCycle - 0.40) / 0.20 * Math.PI / 2) * 0.025
      else if (deepCycle >= 0.60 && deepCycle < 0.70) deep = (1 - (deepCycle - 0.60) / 0.10) * 0.025
      bodyRef.current.scale.y = 1 + baseBreath + deep
    }
    if (tailRef.current) {
      // V53.1 elegance pass (Sub-A): a sleeping cat's tail is mostly
      // DEAD still — pre-V53.1 was constant sin micro-twitch that
      // read as 'rigged puppet'. Now: nothing 95% of the time, with
      // an irregular sharp flick every ~5-10s (slow noise drifts the
      // period so it never feels metronomic).
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
  useFrame((s) => {
    if (!flameRef.current) return
    const t = s.clock.elapsedTime
    const hearth = getHearth(t - 0.30)
    // V53 elegance round 6 (Sub-A final): lantern flame WAS the last
    // honest periodic oscillator (pure 4.3+11.7 Hz sin) in a scene where
    // every other rhythm now couples to getWind. The 4.3Hz beat is the
    // one giveaway if the viewer's eye lingers on the bloom halo. Adding
    // wind.gust * 0.06 makes the flame lean into the gust like a real
    // candle behind shoji — same wind that's blowing the petals also
    // disturbs the flame.
    const wind = getWind(t - 0.30)
    const intensity =
      0.85 +
      Math.sin(t * 4.3) * 0.08 +
      Math.sin(t * 11.7) * 0.04 +
      wind.gust * 0.06 -
      hearth.lanternDim
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
  // V53 shimenawa — sagging rice-straw rope strung between the two
  // posts at the nuki level, with three zigzag white shide paper
  // streamers. The white shide on vermillion torii is the highest-
  // contrast "READ AS SHRINE" cultural signal that survives at
  // pet-canvas scale. Geometry pre-built once, no per-frame work.
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
        <group key={`shide${i}`} position={[sx, 0.84 + 0.10 * (1 - 4 * (sx / 0.84) * (sx / 0.84)) - 0.10, 0.01]}>
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
    color: '#FFD8E3', roughness: 0.92, side: THREE.DoubleSide,
  }), [])
  useEffect(() => () => { petalGeo.dispose(); mat.dispose() }, [petalGeo, mat])
  // Pre-compute static positions on first render. Most cluster near the
  // lantern base (downwind from the cherry tree); a few trace along the
  // outer rake ring; one or two near the mossy stone.
  useEffect(() => {
    const m = ref.current
    if (!m) return
    const dummy = new THREE.Object3D()
    const tints = ['#FFEAF1', '#F5C8D6', '#FFD8E3']
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
      // V53.1: scale bump 0.7-1.5 → 1.0-1.8 so petals read on the
      // 250×250 pet canvas. At lower scale they were dust-grain dots
      // visually invisible past the bloom pass.
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

// ── Raked karesansui gravel ring around the cabin — "ma" / negative
//    space marker. Concentric flat tori suggest the rake lines.
// V53 elegance (Sub-A): pre-V53 used 4 perfect torusGeometry rings,
// reading as 'compass-drawn' not 'raked yesterday'. Real karesansui
// has rake lines that BULGE outward around obstacles (the mossy stone
// here) — the gardener sweeps a wider arc to avoid it. Now each ring
// is a TubeGeometry over a CatmullRom curve with per-angle radius
// perturbed by (a) a slow sin to add micro-irregularity, and (b) a
// gaussian bulge centered on the angle to the mossy stone.
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
      {/* Deeper stone trim around top edge — V53 mat: cap finish */}
      <mesh position={[0, 0.27, 0]} castShadow>
        <boxGeometry args={[0.40, 0.04, 0.40]} />
        <meshStandardMaterial color={STONE_HAT} roughness={0.78} metalness={0.05} flatShading />
      </mesh>
      {/* Basin lip — small torus around the rim makes the cavity read */}
      <mesh position={[0, 0.27, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.13, 0.012, 8, 22]} />
        <meshStandardMaterial color={STONE_HAT} roughness={0.78} metalness={0.05} />
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

// V35: DisplacedCliff — single mesh w/ ridged-noise vertex displacement
// instead of stacked smooth cones. Gives the island jagged overhangs +
// vertical erosion grooves + exposed-root edge feel.
function makeDisplacedCliffGeo(): THREE.BufferGeometry {
  const g = new THREE.CylinderGeometry(2.05, 1.4, 1.45, 48, 8)
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
      // Ridged: abs-fold makes peaks instead of waves
      const ridged = Math.abs(n1 + n2 + n3) * 0.5
      // Outward bulge — more on cliff face (lower y), less on top (higher y)
      const yFactor = (1 - (y + 0.725) / 1.45)  // 0 at top, 1 at bottom
      const radial = 1 + ridged * 0.18 * yFactor + (Math.sin(angle * 23 + y * 4) * 0.04) * yFactor
      pos.setX(i, x * radial)
      pos.setZ(i, z * radial)
    }
    // Vertex color: lerp soil→cliff by Y (top=soil, bottom=cliff_dk)
    const yNorm = (y + 0.725) / 1.45  // 0 bottom, 1 top
    let c: THREE.Color
    if (yNorm > 0.7) {
      c = new THREE.Color().lerpColors(cSoil, cSoil, 0) // top: pure soil
    } else if (yNorm > 0.4) {
      c = new THREE.Color().lerpColors(cSoilDk, cSoil, (yNorm - 0.4) / 0.3)
    } else {
      c = new THREE.Color().lerpColors(cCliffDk, cCliff, yNorm / 0.4)
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
  // V36: non-uniform XZ scale + small azimuthal rotation breaks the
  // button-mushroom axisymmetry. From any orbit angle the silhouette is
  // now intentional, not a revolved profile.
  return (
    <mesh
      geometry={geo}
      position={[0, -0.725, 0]}
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
      {/* V36: grass disk wrapped in SAME non-uniform scale + rotation as
          DisplacedCliff so the grass edge matches the cliff edge (was
          a perfect circle on top of an oblong base — read as "coin on
          mushroom"). */}
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

      {/* V35: soil + cliff merged into ONE displaced cylinder using
          ridged noise — was lathe-spun cake silhouette (Sub-A fresh-eye:
          "looks like a wood-lathe slice, not a Ghibli mountain"). */}
      <DisplacedCliff />
    </group>
  )
}

// V8/V36: tobi-ishi stones — torii → tsukubai tea-ceremony axis.
// V36: vary size/shape per stone (was 5 identical for-loop clones).
// Largest stone sits at the torii threshold (real-garden convention).
function SteppingStones() {
  // V37: tea-master rhythm — stones JOG left-right so the walker
  // breaks stride and looks. Was monotonic smooth arc (read as
  // "spline sampled at fixed t"). Now: x oscillates ±0.08 against
  // the underlying torii→basin axis.
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

// ── FallenPetals — sakura petals scattered on the ground.
// V6 were 14mm pink dots (rice grains). V7: elongated teardrop ovals
// via shapeGeometry (5-lobe sakura petal silhouette).
// (makePetalShape moved to island-shared.ts)

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
  // V53 elegance pass (Sub-A): 38 fallen petals are STONE DEAD — when
  // a gust kicks the furin/smoke/sakura into surge, the eye expects
  // SOMETHING in the ground petals to flutter (real petals lift an
  // edge on wind). Nudge rotation.x on a sparse subset of indexed
  // petals when wind.gust passes 0.35 threshold — slow ramp, sparse
  // selection, never all petals = lifelike not "wave goes through".
  const grpRef = useRef<THREE.Group>(null)
  const lightPetals = useMemo(() => [3, 11, 17, 24, 31], [])  // indexed light petals
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
// V53 elegance pass (Sub-A): pre-V53 only intensity pulsed — color
// stayed at cool WASHI_GLOW. Real paper lit by hearth fire warms
// toward orange at fire peak and cools back as embers settle. Now
// emissive COLOR lerps toward an ember-orange tint on hearth.shojiBrighten,
// so the hearth pulse reads as "fire breathing inside the cabin"
// not just "lamp brightness adjusting".
const SHOJI_EMBER = '#FFB070'
function BreathingShoji({ position, size }: {
  position: [number, number, number]
  size: [number, number]
}) {
  const ref = useRef<THREE.MeshStandardMaterial>(null)
  const baseColor = useMemo(() => new THREE.Color(WASHI_GLOW), [])
  const emberColor = useMemo(() => new THREE.Color(SHOJI_EMBER), [])
  const scratch = useMemo(() => new THREE.Color(), [])
  useFrame((s) => {
    if (!ref.current) return
    const t = s.clock.elapsedTime
    const hearth = getHearth(t - 0.15)
    // V20: hover flare adds extra brighten
    const hover = getHoverBoost(t)
    // V53 materials (Sub-A 5/5 impact): bump base 0.42→0.62 so the
    // shoji's steady-state crosses the Bloom luminanceThreshold (0.85)
    // gently. Pre-V53 only peaked into bloom on hover — the cabin's
    // 'gravitational anchor' glow was invisible to the post pass for
    // 95% of the time. Now the cabin genuinely radiates as the hero
    // warm-light anchor at all times.
    ref.current.emissiveIntensity = 0.62 + Math.sin(t * 0.6) * 0.05 + hearth.shojiBrighten + hover * 0.18
    // V53: warm tint shift on hearth peak — fire's hue bleeds through paper
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



// ── V23: PathMoss — small green patches between stepping stones.
// Static, but adds the wabi-sabi "old garden, well-trodden" detail.
function PathMoss() {
  // V53 elegance (Sub-A): pre-V53 was 5 identical green circles in
  // perfect color+roughness — read as 'emoji stickers dropped on
  // path' against the variance-rich surroundings. Now: 3-tone palette
  // varies per patch, slight per-patch tilt (catches sun
  // differently), and each patch is a 2-blob lobe (a main disc + a
  // smaller offset partner) so silhouette is organic not coin-like.
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

// ── V21: ParallaxRig — diorama-in-window effect. Camera subtly
// tracks mouse position (lerped) → scene reads as a peep-box, not a video.
// V52.2 (Sub-A critical fix): base coords MUST match the Canvas-prop
// camera or this useFrame silently overwrites it within 1 frame +
// re-call lookAt every frame because OrbitControls was removed in V52
// (the previous "no manual lookAt needed" comment is now wrong).
// Parallax amplitude reduced for pet — large camera swings on a small
// 220×220 widget over-magnify.
function ParallaxRig() {
  const { camera } = useThree()
  const baseX = 2.6     // matches Canvas prop [2.6, 2.0, 9.5]
  const baseY = 2.0
  const baseZ = 9.5     // V52.7: 8.5 → 9.5. Sub-A V52.6 verify used
                        // 16:9 aspect by mistake — pet canvas is SQUARE
                        // 1:1, so visible half-width = half-height (no
                        // horizontal extra). At baseZ=8.5 the disc
                        // front-corner (z=+1.6, depth 6.9) had half-
                        // width only 1.98 vs disc x=2.15 → 0.17 clip.
                        // baseZ=9.5: depth to front-corner ≈ 7.9 →
                        // half-width 2.27 → 0.12 margin even at the
                        // closest point.
  useFrame((_, dt) => {
    const targetX = baseX + mouseState.x * 0.15   // V21 had 0.25 — too much for pet
    const targetY = baseY + mouseState.y * -0.10  // V21 had -0.15
    const lerpAmt = Math.min(1, dt * 3)
    camera.position.x += (targetX - camera.position.x) * lerpAmt
    camera.position.y += (targetY - camera.position.y) * lerpAmt
    camera.position.z = baseZ
    camera.lookAt(0, 0.85, 0)   // V52.2: now owned here (no OrbitControls)
  })
  return null
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
  // V53.2: wetColor + scratchColor removed (no water surface to wet on)

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
    // V53.2: Tsukubai removed (karesansui IS dry water). Petal-water-
    // landing logic deleted — petals now simply drift and respawn on
    // their continuous Y loop. The wet-color lerp also dropped since
    // there's no water to wet on.
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
      // V19: tumble — full amplitude always now that no rest state exists
      dummy.rotation.set(
        -Math.PI / 2 + Math.sin(t * 0.8 + sd.phaseR) * 0.5,
        t * 0.6 + sd.phaseR,
        Math.cos(t * 0.7 + sd.phaseR) * 0.4,
      )
      ref.current!.setColorAt(i, tints[sd.tintIdx])
      dummy.scale.setScalar(sd.scale)
      dummy.updateMatrix()
      ref.current!.setMatrixAt(i, dummy.matrix)
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
// V53 elegance pass (Sub-A critique): pre-V53 was pure sin(t*freq)
// metronome — after ~12s your eye locked onto the loop. Worse, cedars
// + sakura all breathed in lockstep so wind didn't read as a *field*
// passing through. Now couples to the shared getWind() signal so
// foliage breathes WITH the gust that's already driving petals + smoke
// + furin, with per-tree lag (phase doubles as lag seconds). The sin
// term shrinks to a 40% sub-rhythm so the gust dominates the silhouette.
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
    // V53 elegance (Sub-A): pre-V53 was a symmetric standing wave
    // (sin(t*1.8 + d*28)) — every ring inflated/deflated in unison
    // around center, reading as 'water breathing' not 'water'. Real
    // basin water has travelling wavelets from the impact point that
    // decay toward the rim. Negative d*42 makes rings travel OUTWARD,
    // exp(-d*6) damps at the rim, second term breaks radial symmetry.
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i), y = pos.getY(i)
      const d = Math.hypot(x, y)
      pos.setZ(i,
        Math.sin(t * 2.4 - d * 42) * 0.0018 * Math.exp(-d * 6)
        + Math.sin(t * 1.1 + x * 18 - y * 14) * 0.0008,
      )
    }
    pos.needsUpdate = true
    // V24 BUGFIX: recompute normals so ripples are visible under lighting
    ref.current.geometry.computeVertexNormals()
  })
  return (
    <mesh ref={ref} geometry={geo} position={[0, 0.255, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
      {/* V53 mat (Sub-A): basin water swapped from meshStandard
          (color/metalness 0.4/rough 0.25 — read as 'infinity pool
          chrome') to meshPhysical with clearcoat + transmission.
          Shallow stone-basin water is a lacquer-thin top layer,
          not a metal sheen. ior 1.33 matches real water. Same
          family of treatment as the furin glass bell — consistency
          = harmony. Killing metalness also fixes a subtle bluish-
          chrome glint that was competing with sakura pinks under
          tone mapping. */}
      <meshPhysicalMaterial
        color="#3A5A66"
        roughness={0.18}
        metalness={0.0}
        clearcoat={1.0}
        clearcoatRoughness={0.15}
        transmission={0.35}
        thickness={0.08}
        ior={1.33}
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
      // V53 elegance pass (Sub-A): real chimney smoke is CLUMPY — two
      // puffs close together, then a long pause. Pre-V53 had each
      // puff offset by exactly +0.9s → conveyor-belt cadence visible.
      // Now: slow-noise jitter on the per-puff phase offset (±0.4s
      // wobble) so puffs irregularly bunch and stretch.
      const jitter = Math.sin(t * 0.11 + i * 2.3) * 0.4
      const phase = (t * 0.25 + i * 0.9 + jitter) % 2.7
      m.position.y = 0.05 + phase * 0.45
      m.position.x = Math.sin(t * 0.5 + i) * 0.08 + phase * (0.08 + wind.dirX * 0.06)
      m.position.z = Math.cos(t * 0.4 + i * 0.7) * 0.05 + phase * wind.dirZ * 0.05
      // V10: scale-clamp at phase boundaries hides reset teleport
      // V16: stoke boost — bigger puff burst at hearth peak
      // V53 (Sub-A 8): bump stoke boost amplitude so the hearth pulse
      // VISIBLY causes smoke surge — pre-V53 stoke just dimly nudged
      // (0.6/0.3) and most viewers couldn't see the causal link
      // (hearth stoke → smoke surge). Bumped to 1.2/0.6 — puff 0 leads
      // with a clearly bigger burst when the fire is stoked, puffs 1+2
      // ride the resulting surge. Causality now reads.
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

// V52.2 (Sub-A fix D): CameraSetup deleted. The useEffect ran ONCE on
// mount, then ParallaxRig's useFrame overwrote camera.position +
// rotation within 1 frame — dead code. ParallaxRig now owns lookAt.

// V44 LEAK FIX: WebGL context-loss/restore handlers now live in this
// child component instead of Canvas onCreated. onCreated has no cleanup
// hook, so listeners accumulated on the canvas DOM element across
// strict-mode double-mount / HMR / Astro view-transition remounts.
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
    const onRestored = () => {
      const wrap = document.getElementById('island-3d-canvas-wrap')
      if (wrap) {
        wrap.classList.remove('island-webgl-failed')
        wrap.classList.add('island-loaded')
      }
    }
    el.addEventListener('webglcontextlost', onLost, { passive: false } as AddEventListenerOptions)
    el.addEventListener('webglcontextrestored', onRestored)
    return () => {
      el.removeEventListener('webglcontextlost', onLost)
      el.removeEventListener('webglcontextrestored', onRestored)
    }
  }, [gl])
  return null
}

// V53: RotatingScene — slow Y-rotation on the whole island.
// V53.1: rate slowed 60s → 180s/turn per user feedback ("旋转的有点快").
// Pauses on hover so the user can inspect the side they're looking at.
// Lights stay outside this group (world-fixed) so shading is consistent
// across all rotation angles.
function RotatingScene({ children }: { children: React.ReactNode }) {
  const ref = useRef<THREE.Group>(null)
  const RATE = (Math.PI * 2) / 180   // one full turn per 3 minutes (baseline)
  // V53 composition (Sub-A impact 4/5): pre-V53 was a constant
  // dt*RATE — money pose (sakura facing camera, y=0) existed for 0
  // frames, and the user-as-passerby has no "is it moving?" feedback.
  // Now ease the rotation: slow 4× when sakura faces camera (y≈0
  // mod 2π), normal speed at y=π (back of disc). Total period
  // stretches ~1.6× (still under 5min), but the hero pose holds
  // for ~15-20s per cycle. Bonus: the speed CHANGE catches the
  // eye, killing the 'is it even moving?' question at first glance.
  useFrame((_, dt) => {
    if (!ref.current) return
    if (hoverState.active) return    // freeze on hover
    const y = ref.current.rotation.y
    // ease(y): 0.25 at y=0 (sakura facing), 1.0 at y=π (sakura behind)
    // (1 - cos(y))/2 ranges 0..1 with min at y=0
    const ease = 0.25 + 0.75 * ((1 - Math.cos(y)) / 2)
    ref.current.rotation.y = (y + dt * RATE * ease) % (Math.PI * 2)
  })
  return <group ref={ref}>{children}</group>
}

export default function IslandWidget() {
  // V41: pause render loop when widget is off-screen or tab is hidden.
  // Saves significant battery + GPU on homepage (~10 other cards
  // visible above the fold) without affecting visible-state quality.
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
    function onVisChange() {
      tabVisible = !document.hidden
      update()
    }
    document.addEventListener('visibilitychange', onVisChange)
    return () => {
      io.disconnect()
      document.removeEventListener('visibilitychange', onVisChange)
    }
  }, [])
  return (
    <div ref={canvasWrapRef} style={{ width: '100%', height: '100%' }}>
    <Canvas
      shadows={!IS_MOBILE}
      // V52 pet cutout: framing for square 220×220 pet canvas.
      // Island disc has x-extent ±2.15 (radius 2.05 × non-uniform scale
      // 1.05). To fit the whole disc width in a square canvas the
      // visible width at island distance must be ≥ 4.3 units.
      // V52.7: camera [2.6, 2.0, 9.5] fov 32 for SQUARE 1:1 canvas.
      // Visible half-width = half-height = (depth) · tan(16°). At the
      // disc center plane (depth ≈ 9.0): half-width 2.57; at front-
      // corner (depth ≈ 7.9): half-width 2.27 — both clear the disc
      // x-extent ±2.15 with margin. Tilt from raised y (2.0) gives
      // a slight bird's-eye so the disc reads as a round blob.
      camera={{ position: [2.6, 2.0, 9.5], fov: 32 }}
      dpr={IS_MOBILE ? [1, 1.2] : [1, 1.5]}
      // V41: pause off-screen. V50 a11y: reduced-motion users get a
      // single static render ("demand" + one initial invalidate from R3F
      // mount) so animations never start — defense in depth alongside
      // the CSS rule that hides the widget for reduced-motion users.
      frameloop={paused ? 'never' : (PREFERS_REDUCED_MOTION ? 'demand' : 'always')}
      gl={{
        antialias: true,
        alpha: true,
        toneMapping: ACESFilmicToneMapping,
        // V53 (Sub-A 12): exposure 1.18 → 1.12 — after density+bloom
        // bumps the sakura crown was bleeding into Bloom's mouth
        // (highlights post-tonemap landing at 0.88-0.92 vs threshold
        // 0.85), reading as soft pink cloud not petals. 1.12 keeps
        // midtone warmth while pulling crown + golden-hour amber back
        // out of bloom's grab range; shoji stays as deliberate bloom.
        toneMappingExposure: 1.12,
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
        hoverZone.current = null
      }}
      onPointerMove={(e) => {
        const rect = (e.currentTarget as HTMLCanvasElement).getBoundingClientRect()
        mouseState.x = ((e.clientX - rect.left) / rect.width - 0.5) * 2   // -1..1
        mouseState.y = ((e.clientY - rect.top) / rect.height - 0.5) * 2
        // V53 interactivity (Sub-A 7th pass): hoverZone WAS DEAD CODE.
        // Read in FallingPetals (sakura-zone gust 1.5×) but never
        // assigned anywhere. Now map normalized mouseState into zones
        // matching post-V53 layout: sakura is upper-right (after the
        // x 0.55→0.40, z -0.35→0.15 reframe), tsukubai is lower-right,
        // cabin is left third. Hovering the sakura area now actually
        // triggers the petal gust boost — discoverable because the
        // user already moved cursor there for a reason.
        const mx = mouseState.x, my = mouseState.y
        hoverZone.current =
          (mx > 0.15 && my < 0.20) ? 'sakura' :
          (mx > 0.20 && my > 0.35) ? 'tsukubai' :
          (mx < -0.15) ? 'cabin' : null
      }}
    >
      {/* V44: wire WebGL ctx-loss/restore handlers (with cleanup) */}
      <ContextLossHandlers />
      {/* No <color> bg — alpha:true canvas, page bg shows through.
          V52 pet cutout: NO fog. Fog draws sky-colored haze onto distant
          objects, which on a transparent-bg canvas reads as a rectangle
          of color (= visible canvas edge = PiP feel). The whole island
          should be in sharp focus instead. Removed entirely. */}
      {/* V27: sky+fog mood shift on sustained hover (golden hour).
          V52: removed for pet — no fog to tint, no .island-card-canvas
          wrapper to drive (we're now in .island-pet). Static lighting. */}

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

      {/* === Scene === V53: everything anchored to the island lives
          inside RotatingScene so the whole disc + its inhabitants turn
          as one unit. Atmospherics (Sparkles, FallingPetals) stay
          OUTSIDE since they're frame-relative drifts, not island parts. */}
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
        {/* V53 first-impression fix (Sub-A 11): density 0.65→1.0
            bumps fluff petals 455 → 700 (+54%) so the sakura's
            silhouette mass beats the dark cliff as primary shape
            at 220×220 first-glance. Keep hero=false to preserve
            frustum-top clearance (hero=true would also bump
            canopyRY 1.4→2.0 + canopyCY +0.4 → canopy top y≈3.75
            vs frustum 3.25; that path requires scale reduction). */}
        <WindSway amp={0.018} freq={0.5}>
          <group position={[0.40, 0, 0.15]} scale={0.56}>
            <Sakura
              position={[0, 0, 0]}
              seed={20260524}
              size={1.0}
              density={1.0}
              hero={false}
              rotY={0.4}
              tint="#fad9e4"
            />
          </group>
        </WindSway>

        {/* 2 cedars in back (cut 1 for breathing room) */}
        <Cedar x={-1.15} z={-1.05} scale={1.0} seed={1} />
        <Cedar x={-0.30} z={-1.45} scale={0.88} seed={2} />

        {/* Lantern + torii. V36: lantern at scale 0.70 reads at engawa-
            handrail height (real ishidoro is shoulder-tall). */}
        <StoneLantern x={-0.10} z={0.70} />
        {/* V53.1: was z=1.55 — too close to disc front edge (z_extent
          ±1.60). With rotY=-0.35 (~-20°) the FRONT post rotated
          off the disc into empty space → user reported "torii floating".
          Pulled to z=1.05 + softened rotation so both posts stay on
          grass at every rotation angle of RotatingScene. */}
      <Torii x={0.45} z={1.05} rotY={-0.25} />

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
