// Hot air balloon floating slowly across the distant sky — Tiny Glade-style
// whimsical eye-catcher. Loops a large circular path far above the island.

import * as THREE from 'three'
import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'

const BALLOON_PINK = '#E89AB8'
const BALLOON_CREAM = '#FAEFC8'
const BALLOON_RED = '#A03030'
const BASKET = '#8E6A45'
const ROPE = '#A48B6E'

export default function HotAirBalloon() {
  const ref = useRef<THREE.Group>(null)
  useFrame((s) => {
    if (!ref.current) return
    const t = s.clock.elapsedTime * 0.02  // very slow
    const radius = 35
    ref.current.position.x = Math.cos(t) * radius
    ref.current.position.z = Math.sin(t) * radius
    ref.current.position.y = 22 + Math.sin(t * 3) * 1.2  // gentle bob
    // Face direction of travel
    ref.current.rotation.y = -t + Math.PI / 2
  })

  return (
    <group ref={ref}>
      {/* Balloon body — solid base */}
      <mesh position={[0, 1.2, 0]} castShadow>
        <sphereGeometry args={[1.4, 24, 18]} />
        <meshStandardMaterial color={BALLOON_PINK} roughness={0.8} />
      </mesh>
      {/* Vertical stripes via sphere slices (phiStart/phiLength) — curve
          with the sphere instead of floating planes peeling off. */}
      {Array.from({ length: 6 }).map((_, i) => {
        const sliceStart = (i / 6) * Math.PI * 2
        const sliceLen = (Math.PI * 2) / 6 * 0.5  // half-width per stripe
        return (
          <mesh key={`stripe${i}`} position={[0, 1.2, 0]} castShadow>
            <sphereGeometry args={[1.405, 16, 14, sliceStart, sliceLen]} />
            <meshStandardMaterial color={i % 2 ? BALLOON_CREAM : BALLOON_RED} roughness={0.8} side={THREE.DoubleSide} />
          </mesh>
        )
      })}
      {/* Bottom cap */}
      <mesh position={[0, 0.05, 0]} castShadow>
        <sphereGeometry args={[0.4, 12, 6, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2]} />
        <meshStandardMaterial color={BALLOON_RED} roughness={0.6} />
      </mesh>
      {/* Ropes — 4 going down to basket */}
      {[
        [-0.2, -0.2],
        [ 0.2, -0.2],
        [-0.2,  0.2],
        [ 0.2,  0.2],
      ].map(([rx, rz], i) => (
        <mesh key={`rp${i}`} position={[rx, -0.5, rz]} castShadow>
          <cylinderGeometry args={[0.008, 0.008, 1.0, 4]} />
          <meshStandardMaterial color={ROPE} roughness={0.92} />
        </mesh>
      ))}
      {/* Wicker basket */}
      <mesh position={[0, -1.1, 0]} castShadow receiveShadow>
        <boxGeometry args={[0.5, 0.3, 0.5]} />
        <meshStandardMaterial color={BASKET} roughness={0.92} />
      </mesh>
      {/* Basket weave dark grooves */}
      {[-0.1, 0.1].map((y, i) => (
        <mesh key={`gr${i}`} position={[0, -1.1 + y, 0]}>
          <boxGeometry args={[0.502, 0.02, 0.502]} />
          <meshStandardMaterial color="#5D452B" />
        </mesh>
      ))}
    </group>
  )
}
