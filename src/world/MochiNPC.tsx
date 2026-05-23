// Mochi NPC — small brown bear standing next to the cabin door.
// Procedural geometry (no sprite) so he reads as a distinct 3D inhabitant
// vs the panda billboard avatar.

import * as THREE from 'three'
import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'

const BEAR_BODY    = '#7A4E2A'
const BEAR_BELLY   = '#A87A52'
const BEAR_NOSE    = '#2A1A12'
const BEAR_EYE     = '#1a0e08'
const SCARF        = '#A03030'
const SCARF_DARK   = '#7E2424'

export default function MochiNPC() {
  // Position: just east of cabin door (cabin at [-2, -1], door faces +Z south)
  // Slightly forward so he's a visible companion to the avatar.
  // y=0.65 chosen to clear porch step without colliding with awning at any
  // orbit polar angle.
  const pos: [number, number, number] = [-0.6, 0.65, 1.6]
  const headRef = useRef<THREE.Group>(null)
  const bodyRef = useRef<THREE.Group>(null)

  useFrame((s) => {
    const t = s.clock.elapsedTime
    if (headRef.current) {
      // Gentle head wobble (looking around lazily)
      headRef.current.rotation.y = Math.sin(t * 0.5) * 0.3
    }
    if (bodyRef.current) {
      // Breathing
      bodyRef.current.scale.y = 1 + Math.sin(t * 1.2) * 0.02
    }
  })

  return (
    <group position={pos}>
      {/* Contact shadow */}
      <mesh position={[0, -0.58, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[0.4, 16]} />
        <meshStandardMaterial color="#000000" transparent opacity={0.4} />
      </mesh>

      <group ref={bodyRef}>
        {/* Body — chubby capsule */}
        <mesh position={[0, 0, 0]} castShadow receiveShadow>
          <capsuleGeometry args={[0.28, 0.4, 8, 12]} />
          <meshStandardMaterial color={BEAR_BODY} roughness={0.92} />
        </mesh>
        {/* Belly */}
        <mesh position={[0, -0.05, 0.18]} castShadow>
          <sphereGeometry args={[0.2, 12, 10]} />
          <meshStandardMaterial color={BEAR_BELLY} roughness={0.94} />
        </mesh>
        {/* Scarf — wrapped around neck (red, matching cabin door) */}
        <mesh position={[0, 0.3, 0]} castShadow>
          <torusGeometry args={[0.24, 0.06, 8, 16]} />
          <meshStandardMaterial color={SCARF} roughness={0.85} />
        </mesh>
        {/* Scarf hanging end */}
        <mesh position={[0.1, 0.16, 0.18]} rotation={[0.2, 0.3, 0.1]} castShadow>
          <boxGeometry args={[0.08, 0.22, 0.04]} />
          <meshStandardMaterial color={SCARF_DARK} roughness={0.85} />
        </mesh>
      </group>

      {/* Head */}
      <group ref={headRef} position={[0, 0.55, 0]}>
        {/* Head sphere */}
        <mesh castShadow>
          <sphereGeometry args={[0.26, 16, 14]} />
          <meshStandardMaterial color={BEAR_BODY} roughness={0.92} />
        </mesh>
        {/* Snout */}
        <mesh position={[0, -0.05, 0.2]} castShadow>
          <sphereGeometry args={[0.12, 10, 8]} />
          <meshStandardMaterial color={BEAR_BELLY} roughness={0.92} />
        </mesh>
        {/* Nose */}
        <mesh position={[0, -0.04, 0.31]}>
          <sphereGeometry args={[0.04, 8, 6]} />
          <meshStandardMaterial color={BEAR_NOSE} roughness={0.5} />
        </mesh>
        {/* Round ears */}
        <mesh position={[-0.18, 0.18, 0]} castShadow>
          <sphereGeometry args={[0.1, 10, 8]} />
          <meshStandardMaterial color={BEAR_BODY} roughness={0.92} />
        </mesh>
        <mesh position={[0.18, 0.18, 0]} castShadow>
          <sphereGeometry args={[0.1, 10, 8]} />
          <meshStandardMaterial color={BEAR_BODY} roughness={0.92} />
        </mesh>
        {/* Inner ears */}
        <mesh position={[-0.18, 0.18, 0.04]}>
          <sphereGeometry args={[0.06, 8, 6]} />
          <meshStandardMaterial color={SCARF_DARK} roughness={0.85} />
        </mesh>
        <mesh position={[0.18, 0.18, 0.04]}>
          <sphereGeometry args={[0.06, 8, 6]} />
          <meshStandardMaterial color={SCARF_DARK} roughness={0.85} />
        </mesh>
        {/* Eyes */}
        <mesh position={[-0.08, 0.04, 0.24]}>
          <sphereGeometry args={[0.025, 8, 6]} />
          <meshStandardMaterial color={BEAR_EYE} />
        </mesh>
        <mesh position={[0.08, 0.04, 0.24]}>
          <sphereGeometry args={[0.025, 8, 6]} />
          <meshStandardMaterial color={BEAR_EYE} />
        </mesh>
        {/* Eye highlights */}
        <mesh position={[-0.075, 0.05, 0.255]}>
          <sphereGeometry args={[0.008, 6, 5]} />
          <meshStandardMaterial color="#FFFFFF" />
        </mesh>
        <mesh position={[0.085, 0.05, 0.255]}>
          <sphereGeometry args={[0.008, 6, 5]} />
          <meshStandardMaterial color="#FFFFFF" />
        </mesh>
      </group>

      {/* Stubby legs */}
      <mesh position={[-0.15, -0.4, 0]} castShadow>
        <sphereGeometry args={[0.12, 10, 8]} />
        <meshStandardMaterial color={BEAR_BODY} roughness={0.92} />
      </mesh>
      <mesh position={[0.15, -0.4, 0]} castShadow>
        <sphereGeometry args={[0.12, 10, 8]} />
        <meshStandardMaterial color={BEAR_BODY} roughness={0.92} />
      </mesh>

      {/* Arms */}
      <mesh position={[-0.3, 0.05, 0.05]} rotation={[0, 0, 0.3]} castShadow>
        <capsuleGeometry args={[0.08, 0.16, 6, 8]} />
        <meshStandardMaterial color={BEAR_BODY} roughness={0.92} />
      </mesh>
      <mesh position={[0.3, 0.05, 0.05]} rotation={[0, 0, -0.3]} castShadow>
        <capsuleGeometry args={[0.08, 0.16, 6, 8]} />
        <meshStandardMaterial color={BEAR_BODY} roughness={0.92} />
      </mesh>
    </group>
  )
}
