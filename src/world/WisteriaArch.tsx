// V2 wave 3 finale: wisteria arch over the path between cabin and
// fox shrine. Mid-frequency silhouette that the scene was missing —
// the only diagonal/arched mid-height element. Lavender hanging
// blossoms sway with wind gusts (perfect WindSway customer).
//
// Sub-A wave-3 final-polish #5.

import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { getGust } from './wind'

const POST_WOOD     = '#5D452B'
const POST_DARK     = '#3A2818'
const VINE_GREEN    = '#3F5A35'
const WISTERIA_A    = '#B8A0D0'   // pale lavender
const WISTERIA_B    = '#9A7CB8'   // mid lavender
const WISTERIA_C    = '#7A5EA0'   // deep lavender

// Place over the path mid-way between cabin (-2, -1) and fox shrine
// (-4.6, -6.5). Heading roughly NW.
const POS: [number, number, number] = [-3.3, 0, -3.8]
const ROT_Y = -0.5   // aligned along path heading

// One hanging cluster of wisteria blossoms — top wider, narrowing
// downward. 3 ovoids in lavender gradient. Sways more on gust.
function WisteriaCluster({ position, scale = 1, phase }: { position: [number, number, number]; scale?: number; phase: number }) {
  const ref = useRef<THREE.Group>(null)
  useFrame((s) => {
    if (!ref.current) return
    const t = s.clock.elapsedTime
    const gust = getGust(t)
    // Bell-rope-style sway — calm pendulum + sharper whip on gust
    ref.current.rotation.x = Math.sin(t * 1.1 + phase) * (0.05 + gust * 0.25)
    ref.current.rotation.z = Math.cos(t * 0.8 + phase) * (0.04 + gust * 0.22)
  })
  return (
    <group ref={ref} position={position} scale={scale}>
      {/* Wisteria racemes — 3 stacked tapered ovoids */}
      <mesh position={[0, -0.10, 0]} castShadow>
        <sphereGeometry args={[0.10, 8, 6]} />
        <meshStandardMaterial color={WISTERIA_A} roughness={0.88} flatShading />
      </mesh>
      <mesh position={[0, -0.22, 0]} castShadow>
        <sphereGeometry args={[0.085, 8, 6]} />
        <meshStandardMaterial color={WISTERIA_B} roughness={0.88} flatShading />
      </mesh>
      <mesh position={[0, -0.32, 0]} castShadow>
        <sphereGeometry args={[0.06, 8, 6]} />
        <meshStandardMaterial color={WISTERIA_C} roughness={0.88} flatShading />
      </mesh>
      {/* Tiny tip blossom — accent */}
      <mesh position={[0, -0.40, 0]}>
        <sphereGeometry args={[0.03, 6, 5]} />
        <meshStandardMaterial color={WISTERIA_C} roughness={0.88} />
      </mesh>
    </group>
  )
}

export default function WisteriaArch() {
  // 8 hanging clusters spaced along the top beam
  const clusterPositions: Array<[number, number, number, number]> = [
    [-1.20, 1.95, -0.05, 0.95, 0.2],
    [-0.90, 1.98,  0.10, 1.00, 0.7],
    [-0.55, 2.00, -0.10, 0.92, 1.3],
    [-0.20, 2.02,  0.05, 1.05, 2.1],
    [ 0.20, 2.02, -0.05, 0.98, 2.7],
    [ 0.55, 2.00,  0.10, 0.90, 3.4],
    [ 0.90, 1.98, -0.10, 1.02, 4.0],
    [ 1.20, 1.95,  0.05, 0.96, 4.6],
  ] as never[]

  return (
    <group position={POS} rotation={[0, ROT_Y, 0]}>
      {/* Two vertical posts — slightly tapered, weathered wood */}
      {[-1.40, 1.40].map((px, i) => (
        <group key={`post${i}`}>
          <mesh position={[px, 1.05, 0]} castShadow receiveShadow>
            <cylinderGeometry args={[0.08, 0.10, 2.10, 8]} />
            <meshStandardMaterial color={POST_WOOD} roughness={0.95} flatShading />
          </mesh>
          {/* Post foot — small stone base */}
          <mesh position={[px, 0.10, 0]} castShadow>
            <cylinderGeometry args={[0.15, 0.18, 0.20, 8]} />
            <meshStandardMaterial color="#9C928A" roughness={0.95} flatShading />
          </mesh>
        </group>
      ))}

      {/* Top horizontal beam */}
      <mesh position={[0, 2.10, 0]} rotation={[0, 0, 0]} castShadow>
        <boxGeometry args={[3.0, 0.10, 0.12]} />
        <meshStandardMaterial color={POST_DARK} roughness={0.92} flatShading />
      </mesh>
      {/* Beam end blocks (cleat overhang) */}
      {[-1.45, 1.45].map((bx, i) => (
        <mesh key={`bb${i}`} position={[bx, 2.10, 0]} castShadow>
          <boxGeometry args={[0.16, 0.18, 0.14]} />
          <meshStandardMaterial color={POST_DARK} roughness={0.92} flatShading />
        </mesh>
      ))}

      {/* Two intermediate cross-braces to support the vine load */}
      {[-0.70, 0.70].map((bx, i) => (
        <mesh key={`xb${i}`} position={[bx, 2.07, 0]} rotation={[0, 0, 0.04 * (i === 0 ? -1 : 1)]} castShadow>
          <boxGeometry args={[1.1, 0.06, 0.08]} />
          <meshStandardMaterial color={POST_WOOD} roughness={0.92} flatShading />
        </mesh>
      ))}

      {/* Vine running along the top beam — green creeper texture via
          5 small foliage spheres along the top */}
      {[-1.30, -0.65, 0, 0.65, 1.30].map((vx, i) => (
        <mesh key={`vine${i}`} position={[vx, 2.18, 0]} castShadow>
          <sphereGeometry args={[0.14, 8, 6]} />
          <meshStandardMaterial color={VINE_GREEN} roughness={0.94} flatShading />
        </mesh>
      ))}

      {/* The hanging wisteria clusters — 8 of them, swaying with wind */}
      {clusterPositions.map((p, i) => (
        <WisteriaCluster
          key={`cl${i}`}
          position={[p[0], p[1], p[2]]}
          scale={p[3]}
          phase={p[4] as number}
        />
      ))}
    </group>
  )
}
