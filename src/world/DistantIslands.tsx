// 3 distant smaller islands floating far from the main island.
// Each has a single tree or small structure. They sit in the cloud sea
// and add depth + suggest a wider world.

import * as THREE from 'three'

const GRASS = '#7FB36A'
const STONE = '#6E5F4D'
const TRUNK = '#5A4128'
const FOLIAGE = '#5A7A4C'

function TinyIsland({ position, scale = 1, tree = true, windmill = false }: {
  position: [number, number, number]
  scale?: number
  tree?: boolean
  windmill?: boolean
}) {
  return (
    <group position={position} scale={scale}>
      {/* Grass top */}
      <mesh position={[0, 0, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[1.6, 1.4, 0.3, 12]} />
        <meshStandardMaterial color={GRASS} roughness={0.95} flatShading />
      </mesh>
      {/* Stone underside */}
      <mesh position={[0, -0.4, 0]} castShadow>
        <coneGeometry args={[1.4, 0.9, 12, 1]} />
        <meshStandardMaterial color={STONE} roughness={0.96} flatShading />
      </mesh>

      {/* Optional pine tree */}
      {tree && (
        <group position={[0.1, 0.15, -0.1]}>
          <mesh position={[0, 0.7, 0]} castShadow>
            <cylinderGeometry args={[0.12, 0.16, 1.4, 6]} />
            <meshStandardMaterial color={TRUNK} flatShading />
          </mesh>
          {[1.5, 1.85, 2.1].map((y, i) => (
            <mesh key={i} position={[0, y, 0]} castShadow>
              <coneGeometry args={[0.6 - i * 0.12, 0.6 - i * 0.1, 8]} />
              <meshStandardMaterial color={FOLIAGE} flatShading />
            </mesh>
          ))}
        </group>
      )}

      {/* Optional windmill */}
      {windmill && (
        <group position={[0, 0.15, 0]}>
          {/* Tower */}
          <mesh position={[0, 0.9, 0]} castShadow>
            <cylinderGeometry args={[0.22, 0.32, 1.8, 8]} />
            <meshStandardMaterial color="#E8E0D0" roughness={0.9} flatShading />
          </mesh>
          {/* Cap */}
          <mesh position={[0, 1.95, 0]} castShadow>
            <coneGeometry args={[0.3, 0.4, 8]} />
            <meshStandardMaterial color="#5C3A22" roughness={0.92} />
          </mesh>
          {/* Sails — 4 paddles */}
          <Windmill />
        </group>
      )}
    </group>
  )
}

function Windmill() {
  const ref = useRef<THREE.Group>(null)
  useFrame((s) => {
    if (ref.current) ref.current.rotation.z = s.clock.elapsedTime * 0.6
  })
  return (
    <group ref={ref} position={[0.06, 1.85, 0]}>
      {Array.from({ length: 4 }).map((_, i) => {
        const a = (i / 4) * Math.PI * 2
        return (
          <group key={i} rotation={[0, 0, a]}>
            <mesh position={[0.45, 0, 0]} castShadow>
              <boxGeometry args={[0.7, 0.1, 0.04]} />
              <meshStandardMaterial color="#FAEFC8" roughness={0.85} />
            </mesh>
          </group>
        )
      })}
      {/* Hub */}
      <mesh>
        <sphereGeometry args={[0.06, 8, 6]} />
        <meshStandardMaterial color="#3A2516" />
      </mesh>
    </group>
  )
}

import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'

export default function DistantIslands() {
  return (
    <group>
      {/* Pulled back to 4 → 2 for cleaner horizon — keep windmill island + far one */}
      <TinyIsland position={[42, -5, 30]} scale={1.4} tree={false} windmill={true} />
      <TinyIsland position={[-30, -8, 40]} scale={1.2} tree={true} />
    </group>
  )
}
