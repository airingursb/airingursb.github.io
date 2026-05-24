// Onsen (温泉) hot spring tucked into the east bluff.
// V2 scene polish C1: quintessentially Japanese, fills the empty
// east bluff (TERRAIN_BUMPS [15, 2, 5, 0.8]), and gives the existing
// drei <Sparkles> mist particles a thematic home — they read as
// rising steam from hot water instead of generic atmospheric haze.

import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { Sparkles } from '@react-three/drei'

// Placement: east of the bluff peak, on a small terrace.
const POS: [number, number, number] = [17.0, 0.45, 3.0]

const STONE_LIGHT = '#9C928A'
const STONE_DARK  = '#6D6660'
const WATER_HOT   = '#A8D8E0'
const WATER_DEEP  = '#5C8C9C'
const WOOD        = '#7A5B3C'

function HotPoolSurface({ radius = 1.0 }: { radius?: number }) {
  // The pool surface: very calm ripples (1/3 amplitude of the cold pond)
  // since hot water is denser and convects more slowly visually. Sky-blue
  // tint with bright shimmer to read as steaming.
  const ref = useRef<THREE.Mesh>(null)
  useFrame((s) => {
    const m = ref.current
    if (!m) return
    const t = s.clock.elapsedTime
    const pos = m.geometry.attributes.position
    for (let i = 0; i < pos.count; i++) {
      const px = pos.getX(i), pz = pos.getZ(i)
      const d = Math.hypot(px, pz)
      pos.setY(i, Math.sin(t * 0.9 + d * 1.6) * 0.005 + Math.cos(t * 0.5 + px * 0.6) * 0.003)
    }
    pos.needsUpdate = true
  })
  return (
    <mesh ref={ref} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]}>
      <circleGeometry args={[radius, 28]} />
      <meshStandardMaterial
        color={WATER_HOT}
        roughness={0.10}
        metalness={0.45}
        transparent
        opacity={0.78}
        emissive={WATER_HOT}
        emissiveIntensity={0.08}
      />
    </mesh>
  )
}

export default function Onsen() {
  return (
    <group position={POS}>
      {/* Pool bed — slightly recessed dark cylinder so deep water reads */}
      <mesh position={[0, -0.10, 0]} receiveShadow>
        <cylinderGeometry args={[1.05, 1.0, 0.25, 24]} />
        <meshStandardMaterial color={WATER_DEEP} roughness={0.6} />
      </mesh>

      {/* Hot water surface with gentle ripples */}
      <HotPoolSurface radius={1.0} />

      {/* Stone ring — 9 irregular rocks forming the pool perimeter */}
      {Array.from({ length: 9 }).map((_, i) => {
        const a = (i / 9) * Math.PI * 2 + (i % 2) * 0.12
        const rx = Math.cos(a) * 1.08
        const rz = Math.sin(a) * 1.08
        const r = 0.20 + (i % 4) * 0.04
        return (
          <mesh
            key={`stone${i}`}
            position={[rx, 0.08, rz]}
            rotation={[i * 0.3, i * 0.55, i * 0.2]}
            castShadow
            receiveShadow
          >
            <dodecahedronGeometry args={[r, 0]} />
            <meshStandardMaterial
              color={i % 2 ? STONE_LIGHT : STONE_DARK}
              roughness={0.94}
              flatShading
            />
          </mesh>
        )
      })}

      {/* Tiny pebbles scattered at the inside edge — wabi-sabi detail */}
      {[
        [-0.55, 0.05, 0.7],
        [0.4, 0.05, -0.75],
        [0.85, 0.05, 0.2],
        [-0.7, 0.05, -0.3],
      ].map(([px, py, pz], i) => (
        <mesh
          key={`peb${i}`}
          position={[px as number, py as number, pz as number]}
          rotation={[i * 0.7, i * 1.1, 0]}
          castShadow
        >
          <dodecahedronGeometry args={[0.06 + (i % 2) * 0.02, 0]} />
          <meshStandardMaterial color="#7E7770" roughness={0.95} flatShading />
        </mesh>
      ))}

      {/* Wooden bucket #1 — by the pool, slightly tilted */}
      <group position={[1.35, 0.05, 0.4]} rotation={[0, 0.4, 0.06]}>
        {/* Body — slatted bucket */}
        <mesh castShadow>
          <cylinderGeometry args={[0.16, 0.18, 0.28, 12]} />
          <meshStandardMaterial color={WOOD} roughness={0.88} flatShading />
        </mesh>
        {/* Two iron bands */}
        <mesh position={[0, 0.08, 0]}>
          <torusGeometry args={[0.17, 0.012, 4, 16]} />
          <meshStandardMaterial color="#3A2818" roughness={0.6} metalness={0.5} />
        </mesh>
        <mesh position={[0, -0.08, 0]}>
          <torusGeometry args={[0.18, 0.012, 4, 16]} />
          <meshStandardMaterial color="#3A2818" roughness={0.6} metalness={0.5} />
        </mesh>
        {/* Handle */}
        <mesh position={[0, 0.18, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[0.16, 0.012, 4, 12, Math.PI]} />
          <meshStandardMaterial color="#3A2818" roughness={0.6} metalness={0.5} />
        </mesh>
      </group>

      {/* Wooden bucket #2 — tipped on side a little further away */}
      <group position={[-1.35, 0.10, 0.6]} rotation={[Math.PI / 2.4, 0, 0.2]}>
        <mesh castShadow>
          <cylinderGeometry args={[0.14, 0.16, 0.24, 12]} />
          <meshStandardMaterial color={WOOD} roughness={0.88} flatShading />
        </mesh>
        <mesh position={[0, 0.07, 0]}>
          <torusGeometry args={[0.15, 0.011, 4, 16]} />
          <meshStandardMaterial color="#3A2818" roughness={0.6} metalness={0.5} />
        </mesh>
      </group>

      {/* Small folded towel — splash of red color near the pool edge */}
      <group position={[0.3, 0.18, 1.0]} rotation={[0, -0.3, 0]}>
        <mesh castShadow>
          <boxGeometry args={[0.28, 0.06, 0.14]} />
          <meshStandardMaterial color="#C13E3E" roughness={0.92} />
        </mesh>
        {/* Top fold (slightly smaller) */}
        <mesh position={[0, 0.04, 0]} castShadow>
          <boxGeometry args={[0.26, 0.04, 0.12]} />
          <meshStandardMaterial color="#E25A4C" roughness={0.92} />
        </mesh>
      </group>

      {/* Steam — rising sparkles above the pool. Higher count + size
          than ambient haze so it reads as visible vapor. */}
      <Sparkles
        count={28}
        scale={[1.6, 1.4, 1.6]}
        position={[0, 0.6, 0]}
        size={6}
        speed={0.35}
        color="#FFFFFF"
        opacity={0.55}
      />

      {/* Plus a faint warm light inside the pool — sells the heat */}
      <pointLight
        position={[0, 0.1, 0]}
        color="#FFD9B0"
        intensity={0.25}
        distance={1.6}
        decay={2}
      />
    </group>
  )
}
