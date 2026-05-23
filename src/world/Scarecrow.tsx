// Scale anchor — a friendly 1.7m scarecrow in the meadow.
// Per Sub-A iter-3 gap #6 — gives the eye a "this is human-scale" cue.

import * as THREE from 'three'
import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'

const STAKE   = '#5D452B'
const STRAW   = '#E5C77A'
const STRAW_D = '#A8855C'
const SHIRT   = '#A03030'
const HAT     = '#5C3A22'

export default function Scarecrow() {
  const armRef = useRef<THREE.Group>(null)
  useFrame((s) => {
    if (armRef.current) {
      // Gentle wave in the wind
      armRef.current.rotation.z = Math.sin(s.clock.elapsedTime * 0.4) * 0.04
    }
  })
  return (
    <group position={[3.5, 0, -6.0]}>
      {/* Vertical stake */}
      <mesh position={[0, 0.85, 0]} castShadow>
        <cylinderGeometry args={[0.04, 0.05, 1.7, 6]} />
        <meshStandardMaterial color={STAKE} roughness={0.92} />
      </mesh>
      {/* Crossbar for arms */}
      <mesh position={[0, 1.25, 0]} castShadow>
        <boxGeometry args={[1.1, 0.06, 0.06]} />
        <meshStandardMaterial color={STAKE} />
      </mesh>

      {/* Shirt (torso) */}
      <mesh position={[0, 1.05, 0]} castShadow>
        <boxGeometry args={[0.45, 0.55, 0.2]} />
        <meshStandardMaterial color={SHIRT} roughness={0.9} />
      </mesh>

      {/* Sleeves with straw poking out */}
      <group ref={armRef}>
        {/* Left sleeve */}
        <mesh position={[-0.32, 1.2, 0]} rotation={[0, 0, 0.1]} castShadow>
          <cylinderGeometry args={[0.08, 0.07, 0.5, 8]} />
          <meshStandardMaterial color={SHIRT} roughness={0.9} />
        </mesh>
        {/* Straw bundle at cuff */}
        {Array.from({ length: 5 }).map((_, i) => (
          <mesh key={`ls${i}`} position={[-0.4, 0.95 + (i % 2) * 0.04, -0.02 + (i - 2) * 0.04]} rotation={[0, 0, 0.5]} castShadow>
            <coneGeometry args={[0.015, 0.18, 4]} />
            <meshStandardMaterial color={i % 2 ? STRAW : STRAW_D} flatShading />
          </mesh>
        ))}
        {/* Right sleeve */}
        <mesh position={[0.32, 1.2, 0]} rotation={[0, 0, -0.1]} castShadow>
          <cylinderGeometry args={[0.08, 0.07, 0.5, 8]} />
          <meshStandardMaterial color={SHIRT} roughness={0.9} />
        </mesh>
        {/* Straw bundle at right cuff */}
        {Array.from({ length: 5 }).map((_, i) => (
          <mesh key={`rs${i}`} position={[0.4, 0.95 + (i % 2) * 0.04, -0.02 + (i - 2) * 0.04]} rotation={[0, 0, -0.5]} castShadow>
            <coneGeometry args={[0.015, 0.18, 4]} />
            <meshStandardMaterial color={i % 2 ? STRAW : STRAW_D} flatShading />
          </mesh>
        ))}
      </group>

      {/* Head — round straw ball */}
      <mesh position={[0, 1.55, 0]} castShadow>
        <sphereGeometry args={[0.18, 12, 10]} />
        <meshStandardMaterial color={STRAW} roughness={0.95} flatShading />
      </mesh>
      {/* Eyes — small dark cross stitches */}
      <mesh position={[-0.07, 1.59, 0.16]} rotation={[0, 0, Math.PI / 4]}>
        <boxGeometry args={[0.05, 0.005, 0.005]} />
        <meshStandardMaterial color="#1a1a1a" />
      </mesh>
      <mesh position={[-0.07, 1.59, 0.16]} rotation={[0, 0, -Math.PI / 4]}>
        <boxGeometry args={[0.05, 0.005, 0.005]} />
        <meshStandardMaterial color="#1a1a1a" />
      </mesh>
      <mesh position={[0.07, 1.59, 0.16]} rotation={[0, 0, Math.PI / 4]}>
        <boxGeometry args={[0.05, 0.005, 0.005]} />
        <meshStandardMaterial color="#1a1a1a" />
      </mesh>
      <mesh position={[0.07, 1.59, 0.16]} rotation={[0, 0, -Math.PI / 4]}>
        <boxGeometry args={[0.05, 0.005, 0.005]} />
        <meshStandardMaterial color="#1a1a1a" />
      </mesh>
      {/* Stitched smile */}
      <mesh position={[0, 1.5, 0.16]}>
        <torusGeometry args={[0.05, 0.005, 4, 12, Math.PI]} />
        <meshStandardMaterial color="#1a1a1a" />
      </mesh>

      {/* Wide-brimmed hat */}
      <group position={[0, 1.72, 0]}>
        {/* Brim */}
        <mesh castShadow>
          <cylinderGeometry args={[0.32, 0.32, 0.04, 16]} />
          <meshStandardMaterial color={HAT} roughness={0.92} />
        </mesh>
        {/* Crown */}
        <mesh position={[0, 0.1, 0]} castShadow>
          <cylinderGeometry args={[0.16, 0.18, 0.18, 12]} />
          <meshStandardMaterial color={HAT} roughness={0.92} />
        </mesh>
        {/* Hat band */}
        <mesh position={[0, 0.04, 0]}>
          <cylinderGeometry args={[0.181, 0.181, 0.04, 12]} />
          <meshStandardMaterial color={SHIRT} roughness={0.85} />
        </mesh>
      </group>

      {/* Bird perched on the shoulder */}
      <group position={[0.32, 1.4, 0]}>
        <mesh castShadow>
          <sphereGeometry args={[0.07, 10, 8]} />
          <meshStandardMaterial color="#3F5C42" roughness={0.85} />
        </mesh>
        <mesh position={[0.06, 0.04, 0]} castShadow>
          <sphereGeometry args={[0.04, 8, 6]} />
          <meshStandardMaterial color="#3F5C42" />
        </mesh>
        <mesh position={[0.1, 0.02, 0]} rotation={[0, 0, -Math.PI / 2]}>
          <coneGeometry args={[0.015, 0.04, 4]} />
          <meshStandardMaterial color="#E29A4A" />
        </mesh>
      </group>
    </group>
  )
}
