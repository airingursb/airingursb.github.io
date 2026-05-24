// V2 wave 3: V-formation flock of birds gliding across the dusk sky.
// Day: invisible. Dusk: tiny dark silhouettes drift across the horizon
// from west to east, looping every ~45s. Classic Ghibli sunset cue.

import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

type Theme = 'day' | 'dusk'

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

export default function SunsetBirds({ theme }: { theme: Theme }) {
  const groupRef = useRef<THREE.Group>(null)
  const matRefs = useRef<Array<THREE.MeshBasicMaterial | null>>([])

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

    // Opacity fade based on theme — invisible at day, full at dusk
    const targetOpacity = theme === 'dusk' ? 0.78 : 0
    const k = 1 - Math.exp(-dt * 1.0)
    let maxOpacity = 0
    for (const m of matRefs.current) {
      if (!m) continue
      m.opacity = m.opacity + (targetOpacity - m.opacity) * k
      if (m.opacity > maxOpacity) maxOpacity = m.opacity
    }
    // Early-return: when fully faded out at day, skip wing flap +
    // position update entirely. Birds aren't visible, no point
    // computing their motion.
    if (theme === 'day' && maxOpacity < 0.01) return

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
