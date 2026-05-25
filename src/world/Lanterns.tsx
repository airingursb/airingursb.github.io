// Scattered lanterns — dim during day, full warm glow + flicker at dusk.
// V2 (scene polish B2): the day→dusk toggle is the single most cinematic
// moment in /world/; making the lanterns "ignite" sells the time-of-day
// switch as a real event rather than just a sky color change.

import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { LANTERN_POSITIONS } from './zones'
import { useTimeOfDay, type TimePhase } from './time-of-day'

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

function Lantern({ seed }: { seed: number }) {
  const glowMatRef = useRef<THREE.MeshStandardMaterial>(null)
  const lightRef   = useRef<THREE.PointLight>(null)
  const tod = useTimeOfDay()
  // Lerp between current and next phase by blend
  const order: TimePhase[] = ['dawn', 'day', 'dusk', 'night']
  const idx = order.indexOf(tod.phase)
  const ne = order[(idx + 1) % order.length]
  const targetEmissive = PHASE_EMISSIVE[tod.phase] + (PHASE_EMISSIVE[ne] - PHASE_EMISSIVE[tod.phase]) * tod.blend
  const targetLight    = PHASE_PT_LIGHT[tod.phase] + (PHASE_PT_LIGHT[ne] - PHASE_PT_LIGHT[tod.phase]) * tod.blend
  // Flicker enabled when emissive is high (dusk/night/dawn glow)
  const flickerActive = targetEmissive > 0.85

  useFrame((s, dt) => {
    const k = 1 - Math.exp(-dt * 1.8)
    const t = s.clock.elapsedTime
    const flicker = flickerActive
      ? 1 + Math.sin(t * 7 + seed) * 0.06 + Math.sin(t * 13 + seed * 1.7) * 0.03
      : 1

    if (glowMatRef.current) {
      const cur = glowMatRef.current.emissiveIntensity
      glowMatRef.current.emissiveIntensity = cur + (targetEmissive * flicker - cur) * k
    }
    if (lightRef.current) {
      const cur = lightRef.current.intensity
      lightRef.current.intensity = cur + (targetLight * flicker - cur) * k
    }
  })

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
          emissiveIntensity={DAY_EMISSIVE}
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
        intensity={DAY_PT_LIGHT}
        distance={3.0}
        decay={2}
        position={[0, 1.58, 0]}
      />
      {/* V2 wave 3: warm halo cone beneath the lantern — only visible
          at dusk (theme-aware via DuskHalo component). Reads as the
          warm light pool the lantern casts down onto the ground. */}
      <DuskHalo theme={theme} seed={seed} />
    </group>
  )
}

function DuskHalo({ theme, seed }: { theme: Theme; seed: number }) {
  const matRef = useRef<THREE.MeshBasicMaterial>(null)
  useFrame((s, dt) => {
    const m = matRef.current
    if (!m) return
    const t = s.clock.elapsedTime
    // Subtle flicker tied to the lantern's own flicker for coherence
    const flicker = 1 + Math.sin(t * 7 + seed) * 0.10
    const target = theme === 'dusk' ? 0.30 * flicker : 0
    const k = 1 - Math.exp(-dt * 1.5)
    m.opacity = m.opacity + (target - m.opacity) * k
  })
  return (
    <mesh position={[0, 0.79, 0]}>
      {/* Sub-A fix: cone now spans apex at y=1.58 (lantern body) to
          base at y=0 (ground). Height 1.58, center y=0.79. */}
      <coneGeometry args={[0.55, 1.58, 16, 1, true]} />
      <meshBasicMaterial
        ref={matRef}
        color="#FFD58F"
        transparent
        opacity={0}
        depthWrite={false}
        side={THREE.DoubleSide}
        blending={THREE.AdditiveBlending}
      />
    </mesh>
  )
}

export default function Lanterns({ theme: _theme }: { theme?: Theme } = {}) {
  // theme prop kept for back-compat but ignored — Lantern reads phase
  // directly from useTimeOfDay().
  return (
    <group>
      {LANTERN_POSITIONS.map(([x, z], i) => (
        <group key={`l${i}`} position={[x, 0, z]}>
          <Lantern seed={i * 1.7} />
        </group>
      ))}
    </group>
  )
}
