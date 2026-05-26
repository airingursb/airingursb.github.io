// Scattered lanterns — dim during day, full warm glow + flicker at dusk.
// V2 (scene polish B2): the day→dusk toggle is the single most cinematic
// moment in /world/; making the lanterns "ignite" sells the time-of-day
// switch as a real event rather than just a sky color change.

import { useRef, useEffect } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { LANTERN_POSITIONS } from './zones'
import { useTimeOfDay, type TimePhase } from './time-of-day'

// Perf: shared registry. Each Lantern + DuskHalo registers its refs
// into this on mount, and ONE useFrame in the Lanterns parent iterates
// all of them per frame instead of 22 separate hook callbacks.
interface LanternEntry {
  glow: THREE.MeshStandardMaterial | null
  light: THREE.PointLight | null
  halo: THREE.MeshBasicMaterial | null
  seed: number
}
const lanternRegistry: LanternEntry[] = []
function registerLantern(entry: LanternEntry) {
  lanternRegistry.push(entry)
  return () => {
    const i = lanternRegistry.indexOf(entry)
    if (i >= 0) lanternRegistry.splice(i, 1)
  }
}

const POST_DARK = '#3A2818'
const POST_WARM = '#5D452B'
const GLOW      = '#FFD58F'

// F-deep: 4-phase emissive table. Night > dusk because contrast
// against dark sky is higher (lanterns become the only warm focal
// point). Dawn slightly above day because they were burning all night.
const PHASE_EMISSIVE: Record<TimePhase, number> = {
  dawn:  0.95,
  day:   0.55,
  dusk:  2.0,
  night: 2.6,
}
const PHASE_PT_LIGHT: Record<TimePhase, number> = {
  dawn:  0.45,
  day:   0.22,
  dusk:  0.95,
  night: 1.20,
}

type Theme = 'day' | 'dusk'

function Lantern({ seed, registerInto }: { seed: number; registerInto: (e: LanternEntry) => void }) {
  const glowMatRef = useRef<THREE.MeshStandardMaterial>(null)
  const lightRef   = useRef<THREE.PointLight>(null)
  const haloMatRef = useRef<THREE.MeshBasicMaterial>(null)
  // Register refs into shared registry on mount. Parent's single
  // useFrame handles ALL animations — no per-Lantern useFrame.
  useEffect(() => {
    const entry: LanternEntry = {
      glow: glowMatRef.current,
      light: lightRef.current,
      halo: haloMatRef.current,
      seed,
    }
    return registerInto(entry)
  }, [seed, registerInto])

  return (
    <group>
      {/* Wooden post */}
      <mesh position={[0, 0.7, 0]} castShadow>
        <cylinderGeometry args={[0.08, 0.1, 1.4, 6]} />
        <meshStandardMaterial color={POST_WARM} roughness={0.92} flatShading />
      </mesh>
      {/* V2 wave 3: moss patches on post (every 3rd lantern has more
          dramatic moss — implies age + lived-in upkeep variance).
          seed is i*1.7 from parent so floor it for modulo check. */}
      {Math.floor(seed / 1.7) % 3 === 0 && (
        <>
          <mesh position={[0.08, 0.4, 0]} castShadow>
            <sphereGeometry args={[0.05, 6, 5]} />
            <meshStandardMaterial color="#5A7A4C" roughness={0.95} flatShading />
          </mesh>
          <mesh position={[-0.05, 0.25, 0.06]} castShadow>
            <sphereGeometry args={[0.035, 6, 5]} />
            <meshStandardMaterial color="#4A6B40" roughness={0.95} flatShading />
          </mesh>
        </>
      )}
      {/* Top bracket */}
      <mesh position={[0, 1.42, 0]} castShadow>
        <boxGeometry args={[0.18, 0.06, 0.18]} />
        <meshStandardMaterial color={POST_DARK} roughness={0.9} />
      </mesh>
      {/* Lantern body */}
      <mesh position={[0, 1.58, 0]} castShadow>
        <boxGeometry args={[0.2, 0.24, 0.2]} />
        <meshStandardMaterial color={POST_DARK} roughness={0.85} />
      </mesh>
      {/* Glow pane — emissive lerps via useFrame above */}
      <mesh position={[0, 1.58, 0]}>
        <boxGeometry args={[0.14, 0.16, 0.14]} />
        <meshStandardMaterial
          ref={glowMatRef}
          color={GLOW}
          emissive={GLOW}
          emissiveIntensity={PHASE_EMISSIVE.day}
        />
      </mesh>
      {/* Roof on top of lantern */}
      <mesh position={[0, 1.74, 0]} castShadow>
        <coneGeometry args={[0.15, 0.12, 4]} />
        <meshStandardMaterial color={POST_DARK} roughness={0.9} />
      </mesh>
      {/* Warm point light — intensity lerps via useFrame above */}
      <pointLight
        ref={lightRef}
        color="#FFD58F"
        intensity={PHASE_PT_LIGHT.day}
        distance={3.0}
        decay={2}
        position={[0, 1.58, 0]}
      />
      {/* Halo cone — material registered into shared registry too,
          parent useFrame animates opacity. */}
      <mesh position={[0, 0.79, 0]}>
        <coneGeometry args={[0.55, 1.58, 16, 1, true]} />
        <meshBasicMaterial
          ref={haloMatRef}
          color="#FFD58F"
          transparent
          opacity={0}
          depthWrite={false}
          side={THREE.DoubleSide}
          blending={THREE.AdditiveBlending}
        />
      </mesh>
    </group>
  )
}

const HALO_BY_PHASE: Record<TimePhase, number> = { dawn: 0.12, day: 0, dusk: 0.30, night: 0.42 }
const PHASE_ORDER: TimePhase[] = ['dawn', 'day', 'dusk', 'night']

// Single useFrame for ALL lanterns + halos. Replaces 22 separate
// per-component hooks. Computes phase targets ONCE per frame.
function LanternsAnimator() {
  const tod = useTimeOfDay()
  const idx = PHASE_ORDER.indexOf(tod.phase)
  const ne = PHASE_ORDER[(idx + 1) % PHASE_ORDER.length]
  const targetEmissive = PHASE_EMISSIVE[tod.phase] + (PHASE_EMISSIVE[ne] - PHASE_EMISSIVE[tod.phase]) * tod.blend
  const targetLight    = PHASE_PT_LIGHT[tod.phase] + (PHASE_PT_LIGHT[ne] - PHASE_PT_LIGHT[tod.phase]) * tod.blend
  const haloA = HALO_BY_PHASE[tod.phase]
  const haloB = HALO_BY_PHASE[ne]
  const haloTarget = haloA + (haloB - haloA) * tod.blend
  const flickerActive = targetEmissive > 0.85
  useFrame((s, dt) => {
    // Perf: skip entirely when steady-state day (no flicker, halo near 0,
    // and all glows have settled close to day's 0.55 emissive).
    if (!flickerActive && haloTarget < 0.05) {
      // Snap a few times to settle, then sleep
      for (const e of lanternRegistry) {
        if (e.glow && Math.abs(e.glow.emissiveIntensity - targetEmissive) > 0.01) {
          e.glow.emissiveIntensity = e.glow.emissiveIntensity + (targetEmissive - e.glow.emissiveIntensity) * 0.1
        }
        if (e.light && Math.abs(e.light.intensity - targetLight) > 0.01) {
          e.light.intensity = e.light.intensity + (targetLight - e.light.intensity) * 0.1
        }
        if (e.halo && e.halo.opacity > 0.005) {
          e.halo.opacity = e.halo.opacity * 0.9
        }
      }
      return
    }
    const t = s.clock.elapsedTime
    const k = 1 - Math.exp(-dt * 1.8)
    const k2 = 1 - Math.exp(-dt * 1.5)
    for (const e of lanternRegistry) {
      const flicker = flickerActive
        ? 1 + Math.sin(t * 7 + e.seed) * 0.06 + Math.sin(t * 13 + e.seed * 1.7) * 0.03
        : 1
      const haloFlicker = 1 + Math.sin(t * 7 + e.seed) * 0.10
      if (e.glow) {
        e.glow.emissiveIntensity = e.glow.emissiveIntensity + (targetEmissive * flicker - e.glow.emissiveIntensity) * k
      }
      if (e.light) {
        e.light.intensity = e.light.intensity + (targetLight * flicker - e.light.intensity) * k
      }
      if (e.halo) {
        const ht = haloTarget * haloFlicker
        e.halo.opacity = e.halo.opacity + (ht - e.halo.opacity) * k2
      }
    }
  })
  return null
}

export default function Lanterns({ theme: _theme }: { theme?: Theme } = {}) {
  // theme prop kept for back-compat but ignored — phase comes from useTimeOfDay.
  return (
    <group>
      <LanternsAnimator />
      {LANTERN_POSITIONS.map(([x, z], i) => (
        <group key={`l${i}`} position={[x, 0, z]}>
          <Lantern seed={i * 1.7} registerInto={registerLantern} />
        </group>
      ))}
    </group>
  )
}
