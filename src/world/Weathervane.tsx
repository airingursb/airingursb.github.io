// Copper weathervane — sits ON the cabin ridge (was a hardcoded
// world-origin position before, so it floated in air east of the
// cabin which is at zone `chat` = [-2, 0, -1]).

import * as THREE from 'three'
import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { getZone } from './zones'
import { getGust } from './wind'

const COPPER       = '#B87341'
const COPPER_DARK  = '#7A4E2A'

// Must match the values in Cabin.tsx (kept in sync by hand).
const CABIN_WALL_H = 1.9
const CABIN_ROOF_RISE = 1.05
// Ridge cap is centered at (WALL_H + ROOF_RISE + 0.04) with height 0.14,
// so its TOP is at WALL_H + ROOF_RISE + 0.11. The weathervane base
// (decorative orb) sits ON that top.
const RIDGE_TOP_Y = CABIN_WALL_H + CABIN_ROOF_RISE + 0.11

export default function Weathervane() {
  const cabin = getZone('chat')
  const [cabinX, cabinZ] = cabin.pos

  const arrowRef = useRef<THREE.Group>(null)
  // V2 wave 3: weathervane responds to gust. Calm: slow drift around
  // NE. Gust event: quick whip ~1.5 rad over 3s, then slow return.
  // This is what a weathervane is FOR — a wind sensor — so it should
  // be the most visibly wind-reactive thing on the roof.
  useFrame((s) => {
    if (!arrowRef.current) return
    const t = s.clock.elapsedTime
    const gust = getGust(t)
    // Base drift (calm) + gust-driven sharper swing
    const driftCalm = Math.sin(t * 0.15) * 0.6
    const gustKick = gust * 1.8 * Math.sin(t * 4)
    arrowRef.current.rotation.y = driftCalm + gustKick + Math.PI / 4
  })

  return (
    <group position={[cabinX, RIDGE_TOP_Y, cabinZ]}>
      {/* Decorative orb at the very base — sits on the ridge cap */}
      <mesh position={[0, 0.05, 0]} castShadow>
        <sphereGeometry args={[0.08, 10, 8]} />
        <meshStandardMaterial color={COPPER_DARK} roughness={0.6} metalness={0.7} />
      </mesh>

      {/* Tall vertical pole — extends UP from the ridge */}
      <mesh position={[0, 0.05 + 0.75, 0]} castShadow>
        <cylinderGeometry args={[0.04, 0.04, 1.5, 8]} />
        <meshStandardMaterial color={COPPER_DARK} roughness={0.25} metalness={0.9} />
      </mesh>

      {/* Cardinal direction cross (N E S W) near the top */}
      <group position={[0, 0.05 + 1.4, 0]}>
        <mesh rotation={[0, 0, 0]}>
          <boxGeometry args={[0.7, 0.04, 0.04]} />
          <meshStandardMaterial color={COPPER_DARK} roughness={0.25} metalness={0.9} />
        </mesh>
        <mesh rotation={[0, Math.PI / 2, 0]}>
          <boxGeometry args={[0.7, 0.04, 0.04]} />
          <meshStandardMaterial color={COPPER_DARK} roughness={0.25} metalness={0.9} />
        </mesh>
        <mesh position={[0, 0.12, -0.4]} castShadow>
          <boxGeometry args={[0.1, 0.16, 0.02]} />
          <meshStandardMaterial color={COPPER} roughness={0.2} metalness={0.95} />
        </mesh>
        <mesh position={[0, 0.12, 0.4]} castShadow>
          <boxGeometry args={[0.1, 0.16, 0.02]} />
          <meshStandardMaterial color={COPPER} roughness={0.2} metalness={0.95} />
        </mesh>
        <mesh position={[0.4, 0.12, 0]} castShadow>
          <boxGeometry args={[0.02, 0.16, 0.1]} />
          <meshStandardMaterial color={COPPER} roughness={0.2} metalness={0.95} />
        </mesh>
        <mesh position={[-0.4, 0.12, 0]} castShadow>
          <boxGeometry args={[0.02, 0.16, 0.1]} />
          <meshStandardMaterial color={COPPER} roughness={0.2} metalness={0.95} />
        </mesh>
      </group>

      {/* Rooster arrow on top — rotates with wind */}
      <group ref={arrowRef} position={[0, 0.05 + 1.75, 0]}>
        <mesh position={[0, 0, 0]} castShadow>
          <boxGeometry args={[0.8, 0.06, 0.02]} />
          <meshStandardMaterial color={COPPER} roughness={0.2} metalness={0.95} />
        </mesh>
        <mesh position={[0.45, 0, 0]} rotation={[0, 0, -Math.PI / 2]} castShadow>
          <coneGeometry args={[0.08, 0.14, 3]} />
          <meshStandardMaterial color={COPPER} roughness={0.2} metalness={0.95} />
        </mesh>
        <mesh position={[-0.4, 0.08, 0]} castShadow>
          <boxGeometry args={[0.18, 0.2, 0.02]} />
          <meshStandardMaterial color={COPPER} roughness={0.2} metalness={0.95} />
        </mesh>
        <mesh position={[-0.35, 0.16, 0]} castShadow>
          <sphereGeometry args={[0.05, 8, 6]} />
          <meshStandardMaterial color={COPPER} roughness={0.2} metalness={0.95} />
        </mesh>
      </group>
    </group>
  )
}
