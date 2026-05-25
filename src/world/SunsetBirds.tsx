// V2 wave 3: V-formation flock of birds gliding across the dusk sky.
// Day: invisible. Dusk: tiny dark silhouettes drift across the horizon
// from west to east, looping every ~45s. Classic Ghibli sunset cue.

import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { useTimeOfDay, type TimePhase } from './time-of-day'

type Theme = 'day' | 'dusk'

// F: per-phase bird visibility. Dawn = sparse departure (low), day = 0,
// dusk = full V-formation, night = 0 (birds gone home).
const PHASE_BIRD_OPACITY: Record<TimePhase, number> = {
  dawn: 0.35,
  day: 0,
  dusk: 0.78,
  night: 0,
}

// 7 birds in classic V formation (1 lead + 3 on each wing)
const FORMATION: Array<[number, number]> = [
  [ 0.0,  0.0],   // lead
  [-0.6,  0.4], [-1.2, 0.8], [-1.8, 1.2],   // left wing
  [ 0.6,  0.4], [ 1.2, 0.8], [ 1.8, 1.2],   // right wing
]

const ALT_Y = 22       // high in the sky
const ALT_Z = -42      // far back at the horizon
const TRAVEL_X_START = -60
const TRAVEL_X_END   =  60
const LOOP_DURATION  = 60   // seconds — slow, almost imperceptible

export default function SunsetBirds({ theme: _theme }: { theme?: Theme } = {}) {
  // theme prop ignored — phase from time-of-day drives visibility.
  const tod = useTimeOfDay()
  const groupRef = useRef<THREE.Group>(null)
  // Two refs per bird — one per plane in the crossed-plane "+" silhouette.
  // V2 bug (caught by Sub-A delivery audit): matRefs only captured the
  // FIRST plane's material, so the second stayed at opacity=0 forever.
  // That defeated the whole point of the wedge — at dusk only the
  // horizontal plane was visible, edge-on at certain angles.
  const matRefs = useRef<Array<THREE.MeshBasicMaterial | null>>([])
  const matRefs2 = useRef<Array<THREE.MeshBasicMaterial | null>>([])

  // Birds wing-flap timing (each bird slightly offset). Hoisted to
  // the top of the component (was below the position useFrame) so
  // the combined useFrame below can read it.
  const wingRef = useRef<Array<THREE.Group | null>>([])

  // V2 final polish: combine the two useFrame hooks into one + add
  // early-return when scene is at day-theme and birds have fully
  // faded out. Was running wing-flap + position calc + opacity lerp
  // every frame even when the flock was 100% invisible.
  useFrame((s, dt) => {
    if (!groupRef.current) return
    const t = s.clock.elapsedTime

    // F: opacity from 4-phase time. dawn 0.35 / day 0 / dusk 0.78 / night 0.
    // Lerp between current and next phase's value via blend.
    const order: TimePhase[] = ['dawn', 'day', 'dusk', 'night']
    const idx = order.indexOf(tod.phase)
    const a = PHASE_BIRD_OPACITY[tod.phase]
    const b = PHASE_BIRD_OPACITY[order[(idx + 1) % order.length]]
    const targetOpacity = a + (b - a) * tod.blend
    const k = 1 - Math.exp(-dt * 1.0)
    let maxOpacity = 0
    for (const m of matRefs.current) {
      if (!m) continue
      m.opacity = m.opacity + (targetOpacity - m.opacity) * k
      if (m.opacity > maxOpacity) maxOpacity = m.opacity
    }
    for (const m of matRefs2.current) {
      if (!m) continue
      m.opacity = m.opacity + (targetOpacity - m.opacity) * k
    }
    // Early-return: when fully faded out (day or night), skip wing flap
    // + position update. Birds aren't visible, no point computing motion.
    if (targetOpacity < 0.01 && maxOpacity < 0.01) return

    // Drift west → east on loop
    const phase = (t % LOOP_DURATION) / LOOP_DURATION
    const x = TRAVEL_X_START + (TRAVEL_X_END - TRAVEL_X_START) * phase
    groupRef.current.position.x = x
    // Slight up-down bob to simulate gliding
    groupRef.current.position.y = ALT_Y + Math.sin(t * 0.4) * 0.8

    // Wing flap (Z-rotation per bird, slight offset)
    for (let i = 0; i < wingRef.current.length; i++) {
      const g = wingRef.current[i]
      if (g) g.rotation.z = Math.sin(t * 3.5 + i * 0.4) * 0.18
    }
  })

  return (
    <group ref={groupRef} position={[0, ALT_Y, ALT_Z]}>
      {FORMATION.map(([fx, fz], i) => (
        <group key={`b${i}`} ref={(el) => { wingRef.current[i] = el }} position={[fx, 0, fz]}>
          {/* Sub-A wave-3: was 3-segment cone = flat triangle facing one
              way; bird's-eye camera saw edge-on 1px line. Now 2 crossed
              wedge planes (X + Z) forming a tiny "+" silhouette that
              reads from any angle. Both planes set depthWrite=false +
              identical renderOrder so dusk bloom doesn't halo one. */}
          <mesh rotation={[Math.PI / 2, 0, 0]} renderOrder={3}>
            <planeGeometry args={[0.65, 0.20]} />
            <meshBasicMaterial
              ref={(m) => { matRefs.current[i] = m }}
              color="#1A1A1A"
              transparent
              opacity={0}
              side={THREE.DoubleSide}
              depthWrite={false}
            />
          </mesh>
          <mesh rotation={[Math.PI / 2, 0, Math.PI / 2]} renderOrder={3}>
            <planeGeometry args={[0.65, 0.20]} />
            <meshBasicMaterial
              ref={(m) => { matRefs2.current[i] = m }}
              color="#1A1A1A"
              transparent
              opacity={0}
              side={THREE.DoubleSide}
              depthWrite={false}
            />
          </mesh>
        </group>
      ))}
    </group>
  )
}
