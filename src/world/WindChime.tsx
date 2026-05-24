// Japanese 风铃 (furin / wind chime) hanging from a pine branch near
// the hammock reading nook. Sways with wind + gusts.
//
// V2 scene polish wave 3: the reading nook had no auditory implication
// (it's silent geometry). A wind chime suggests sound + makes the
// trees feel "occupied" by something other than the hammock.
// Geometry: small dome bell + clapper + paper strip (tanzaku) hanging
// below. Whole assembly sways via WindSway.

import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import WindSway from './WindSway'
import { getGust } from './wind'

const BELL_GLASS = '#A8D8E0'
const BELL_RIM   = '#7AB0BC'
const STRING     = '#5D452B'
const PAPER      = '#F4EAD5'
const PAPER_INK  = '#3A2516'

// Position: hanging from a branch near the hammock-spot pines.
// Reading zone is at (-4, -12); chime hangs slightly forward/east.
const POS: [number, number, number] = [-2.6, 3.4, -11.0]

// The paper tanzaku strip below the bell whips more dramatically on
// gust than the bell itself (light paper, more wind-responsive).
function Tanzaku() {
  const ref = useRef<THREE.Mesh>(null)
  useFrame((s) => {
    const m = ref.current
    if (!m) return
    const t = s.clock.elapsedTime
    const gust = getGust(t)
    // Always-on small sway + gust boost
    const sway = Math.sin(t * 1.4) * (0.12 + gust * 0.40)
    m.rotation.z = sway
    m.rotation.x = Math.cos(t * 0.9) * 0.06 * (1 + gust * 1.5)
  })
  return (
    <mesh ref={ref} position={[0, -0.18, 0]}>
      <planeGeometry args={[0.05, 0.18]} />
      <meshStandardMaterial color={PAPER} roughness={0.85} side={THREE.DoubleSide} />
    </mesh>
  )
}

export default function WindChime() {
  return (
    <group position={POS}>
      {/* Suspending string from branch */}
      <mesh position={[0, 0.18, 0]}>
        <cylinderGeometry args={[0.006, 0.006, 0.36, 4]} />
        <meshStandardMaterial color={STRING} roughness={0.85} />
      </mesh>

      {/* Bell + tanzaku swing slightly together — wrap in WindSway
          so they react to gusts too. */}
      <WindSway amp={0.06} freq={1.2}>
        {/* Glass dome bell (half-sphere with rim ring) */}
        <mesh castShadow>
          <sphereGeometry args={[0.075, 14, 10, 0, Math.PI * 2, 0, Math.PI / 2]} />
          <meshStandardMaterial
            color={BELL_GLASS}
            roughness={0.25}
            metalness={0.55}
            transparent
            opacity={0.78}
          />
        </mesh>
        {/* Bell rim (slight ring at the open base) */}
        <mesh position={[0, -0.01, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[0.073, 0.005, 4, 16]} />
          <meshStandardMaterial color={BELL_RIM} roughness={0.4} metalness={0.6} />
        </mesh>
        {/* Tiny clapper hanging inside */}
        <mesh position={[0, -0.04, 0]}>
          <sphereGeometry args={[0.012, 6, 5]} />
          <meshStandardMaterial color={BELL_RIM} metalness={0.7} roughness={0.3} />
        </mesh>
        {/* Tanzaku paper strip below — has its own animation */}
        <Tanzaku />
      </WindSway>
    </group>
  )
}
