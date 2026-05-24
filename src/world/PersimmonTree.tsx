// V2 wave 3: small persimmon tree (柿木) near cabin. Adds a touch of
// warm orange to the cabin clearing palette + seasonal "autumn-ish"
// feel. Persimmons are deeply tied to Japanese country-house imagery
// (think Totoro). The fruits also gust-react via WindSway.

import WindSway from './WindSway'
import { getGust } from './wind'
import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

const TRUNK      = '#5D452B'
const TRUNK_DK   = '#3D2E1A'
const LEAF_GREEN = '#4A6B40'
const PERSIMMON  = '#E89A4A'
const PERSIMMON_DK = '#C97B30'
const PERSIMMON_STEM = '#3A2516'

// Just south-west of cabin (cabin at -2,-1), tucked between cabin and
// the gravel path leading to the easel.
const POS: [number, number, number] = [-4.2, 0, 0.4]

function PersimmonFruit({ position }: { position: [number, number, number] }) {
  // Tiny orange ball with darker bottom + 4 sepal leaves on top.
  const ref = useRef<THREE.Group>(null)
  useFrame((s) => {
    if (!ref.current) return
    const t = s.clock.elapsedTime
    const gust = getGust(t)
    // Subtle swing on its stem + harder swing on gust
    ref.current.rotation.z = Math.sin(t * 1.8 + position[0]) * (0.05 + gust * 0.20)
    ref.current.rotation.x = Math.cos(t * 1.5 + position[2]) * 0.03 * (1 + gust * 1.5)
  })
  return (
    <group ref={ref} position={position}>
      {/* Tiny stem */}
      <mesh position={[0, 0.08, 0]}>
        <cylinderGeometry args={[0.004, 0.004, 0.06, 4]} />
        <meshStandardMaterial color={PERSIMMON_STEM} />
      </mesh>
      {/* Fruit body — slightly squashed sphere */}
      <mesh castShadow scale={[1.0, 0.85, 1.0]}>
        <sphereGeometry args={[0.075, 10, 8]} />
        <meshStandardMaterial color={PERSIMMON} roughness={0.7} />
      </mesh>
      {/* Darker bottom hue (cheap fake of bottom shadow) */}
      <mesh position={[0, -0.04, 0]} scale={[1.0, 0.4, 1.0]}>
        <sphereGeometry args={[0.07, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <meshStandardMaterial color={PERSIMMON_DK} roughness={0.75} />
      </mesh>
      {/* Sepal leaves on top — 4 small triangles */}
      {[0, Math.PI / 2, Math.PI, Math.PI * 1.5].map((a, i) => (
        <mesh
          key={`sp${i}`}
          position={[Math.cos(a) * 0.04, 0.07, Math.sin(a) * 0.04]}
          rotation={[0.3 * Math.cos(a), a, 0.3 * Math.sin(a)]}
        >
          <coneGeometry args={[0.025, 0.04, 3]} />
          <meshStandardMaterial color={LEAF_GREEN} roughness={0.85} flatShading />
        </mesh>
      ))}
    </group>
  )
}

export default function PersimmonTree() {
  // Pre-distribute fruits across the canopy with some randomness baked in
  const fruits: Array<[number, number, number]> = [
    [ 0.30,  1.50,  0.20],
    [-0.35,  1.45, -0.10],
    [ 0.12,  1.65, -0.30],
    [-0.10,  1.30,  0.35],
    [ 0.40,  1.30, -0.25],
    [-0.45,  1.60,  0.05],
    [ 0.05,  1.80,  0.10],
    [ 0.25,  1.40,  0.40],
  ]

  return (
    <group position={POS}>
      {/* Trunk — slightly leaning for character */}
      <mesh position={[0, 0.55, 0]} rotation={[0, 0, 0.04]} castShadow receiveShadow>
        <cylinderGeometry args={[0.07, 0.10, 1.10, 8]} />
        <meshStandardMaterial color={TRUNK} roughness={0.94} flatShading />
      </mesh>
      {/* 3 spreading main branches */}
      <mesh position={[0.20, 1.20, 0.10]} rotation={[0.1, 0, -0.5]} castShadow>
        <cylinderGeometry args={[0.04, 0.05, 0.6, 6]} />
        <meshStandardMaterial color={TRUNK_DK} roughness={0.93} flatShading />
      </mesh>
      <mesh position={[-0.20, 1.25, -0.05]} rotation={[-0.1, 0, 0.55]} castShadow>
        <cylinderGeometry args={[0.04, 0.05, 0.6, 6]} />
        <meshStandardMaterial color={TRUNK_DK} roughness={0.93} flatShading />
      </mesh>
      <mesh position={[0.05, 1.30, -0.25]} rotation={[-0.55, 0, 0.05]} castShadow>
        <cylinderGeometry args={[0.035, 0.045, 0.55, 6]} />
        <meshStandardMaterial color={TRUNK_DK} roughness={0.93} flatShading />
      </mesh>

      {/* Canopy — WindSway-wrapped 3-blob foliage cluster */}
      <WindSway amp={0.025} freq={0.85}>
        <mesh position={[0, 1.55, 0]} castShadow>
          <sphereGeometry args={[0.50, 12, 10]} />
          <meshStandardMaterial color={LEAF_GREEN} roughness={0.93} flatShading />
        </mesh>
        <mesh position={[0.25, 1.62, 0.10]} castShadow>
          <sphereGeometry args={[0.38, 12, 10]} />
          <meshStandardMaterial color="#5A7A4C" roughness={0.93} flatShading />
        </mesh>
        <mesh position={[-0.28, 1.50, -0.05]} castShadow>
          <sphereGeometry args={[0.36, 12, 10]} />
          <meshStandardMaterial color="#3F5A35" roughness={0.93} flatShading />
        </mesh>
      </WindSway>

      {/* Persimmon fruits scattered through the canopy */}
      {fruits.map((p, i) => (
        <PersimmonFruit key={`pm${i}`} position={p} />
      ))}

      {/* Two fallen fruits on the ground — wabi-sabi detail */}
      <mesh position={[0.45, 0.08, -0.15]} castShadow>
        <sphereGeometry args={[0.06, 8, 6]} />
        <meshStandardMaterial color={PERSIMMON_DK} roughness={0.85} />
      </mesh>
      <mesh position={[-0.30, 0.08, 0.25]} castShadow>
        <sphereGeometry args={[0.055, 8, 6]} />
        <meshStandardMaterial color={PERSIMMON} roughness={0.85} />
      </mesh>
    </group>
  )
}
