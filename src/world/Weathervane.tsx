// Tall hero element on the cabin ridge — copper weathervane that
// adds vertical silhouette interest. Slowly rotates in the wind.

import * as THREE from 'three'
import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'

const COPPER       = '#B87341'
const COPPER_DARK  = '#7A4E2A'

export default function Weathervane() {
  // Sits on top of cabin chimney area: cabin at (0, 0.5), chimney at x = +1.3
  const arrowRef = useRef<THREE.Group>(null)
  useFrame((s) => {
    if (arrowRef.current) {
      // Slowly drift like wind
      arrowRef.current.rotation.y = Math.sin(s.clock.elapsedTime * 0.15) * 0.6 + Math.PI / 4
    }
  })

  return (
    <group position={[0, 0.5, 0]}>
      {/* Tall vertical pole — high metalness for Bloom pop (Sub-A gap #5) */}
      <mesh position={[0, 3.4, 0]} castShadow>
        <cylinderGeometry args={[0.04, 0.04, 1.4, 8]} />
        <meshStandardMaterial color={COPPER_DARK} roughness={0.25} metalness={0.9} />
      </mesh>

      {/* Cardinal direction letters cross (N E S W) — 2 cross bars */}
      <group position={[0, 3.9, 0]}>
        <mesh rotation={[0, 0, 0]}>
          <boxGeometry args={[0.7, 0.04, 0.04]} />
          <meshStandardMaterial color={COPPER_DARK} roughness={0.25} metalness={0.9} />
        </mesh>
        <mesh rotation={[0, Math.PI / 2, 0]}>
          <boxGeometry args={[0.7, 0.04, 0.04]} />
          <meshStandardMaterial color={COPPER_DARK} roughness={0.25} metalness={0.9} />
        </mesh>
        {/* N letter */}
        <mesh position={[0, 0.12, -0.4]} castShadow>
          <boxGeometry args={[0.1, 0.16, 0.02]} />
          <meshStandardMaterial color={COPPER} roughness={0.2} metalness={0.95} />
        </mesh>
        {/* S */}
        <mesh position={[0, 0.12, 0.4]} castShadow>
          <boxGeometry args={[0.1, 0.16, 0.02]} />
          <meshStandardMaterial color={COPPER} roughness={0.2} metalness={0.95} />
        </mesh>
        {/* E */}
        <mesh position={[0.4, 0.12, 0]} castShadow>
          <boxGeometry args={[0.02, 0.16, 0.1]} />
          <meshStandardMaterial color={COPPER} roughness={0.2} metalness={0.95} />
        </mesh>
        {/* W */}
        <mesh position={[-0.4, 0.12, 0]} castShadow>
          <boxGeometry args={[0.02, 0.16, 0.1]} />
          <meshStandardMaterial color={COPPER} roughness={0.2} metalness={0.95} />
        </mesh>
      </group>

      {/* Rooster-shaped arrow that rotates with wind */}
      <group ref={arrowRef} position={[0, 4.3, 0]}>
        {/* Arrow body — long horizontal */}
        <mesh position={[0, 0, 0]} castShadow>
          <boxGeometry args={[0.8, 0.06, 0.02]} />
          <meshStandardMaterial color={COPPER} roughness={0.2} metalness={0.95} />
        </mesh>
        {/* Arrow tip — triangle on east end */}
        <mesh position={[0.45, 0, 0]} rotation={[0, 0, -Math.PI / 2]} castShadow>
          <coneGeometry args={[0.08, 0.14, 3]} />
          <meshStandardMaterial color={COPPER} roughness={0.2} metalness={0.95} />
        </mesh>
        {/* Rooster body silhouette — small fan tail on west end */}
        <mesh position={[-0.4, 0.08, 0]} castShadow>
          <boxGeometry args={[0.18, 0.2, 0.02]} />
          <meshStandardMaterial color={COPPER} roughness={0.2} metalness={0.95} />
        </mesh>
        {/* Rooster head */}
        <mesh position={[-0.35, 0.16, 0]} castShadow>
          <sphereGeometry args={[0.05, 8, 6]} />
          <meshStandardMaterial color={COPPER} roughness={0.2} metalness={0.95} />
        </mesh>
      </group>

      {/* Decorative orb base */}
      <mesh position={[0, 2.7, 0]} castShadow>
        <sphereGeometry args={[0.08, 10, 8]} />
        <meshStandardMaterial color={COPPER_DARK} roughness={0.6} metalness={0.7} />
      </mesh>
    </group>
  )
}
