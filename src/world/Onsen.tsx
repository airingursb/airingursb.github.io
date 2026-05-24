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

      {/* V2 wave 3: karesansui (枯山水) — small raked-gravel zen garden
          northeast of the pool. Pale sand bed + 3 concentric circle
          rake patterns + 2 standing "mountain" stones. Tiny wabi-sabi
          contemplation spot adjacent to the bath. */}
      <group position={[-1.6, 0, -1.2]}>
        {/* Sand bed — pale rectangle */}
        <mesh position={[0, 0.045, 0]} receiveShadow rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[1.3, 1.0]} />
          <meshStandardMaterial color="#E8DCC0" roughness={0.98} />
        </mesh>
        {/* 3 raked concentric rings around a center stone (groove via
            thin ring meshes on top of the sand) */}
        {[0.16, 0.26, 0.38].map((r, i) => (
          <mesh key={`rake${i}`} position={[-0.15, 0.046, 0.08]} rotation={[-Math.PI / 2, 0, 0]}>
            <ringGeometry args={[r, r + 0.012, 24]} />
            <meshStandardMaterial color="#BCAE92" roughness={0.92} side={THREE.DoubleSide} />
          </mesh>
        ))}
        {/* Center stone of the karesansui (tallest, asymmetric) */}
        <mesh position={[-0.15, 0.12, 0.08]} rotation={[0.1, 0.6, 0.15]} castShadow>
          <dodecahedronGeometry args={[0.10, 0]} />
          <meshStandardMaterial color="#6D6660" roughness={0.95} flatShading />
        </mesh>
        {/* Two satellite mountain stones offset to upper-right */}
        <mesh position={[0.35, 0.08, -0.15]} rotation={[0.2, 0.3, 0]} castShadow>
          <dodecahedronGeometry args={[0.075, 0]} />
          <meshStandardMaterial color="#7E7770" roughness={0.95} flatShading />
        </mesh>
        <mesh position={[0.45, 0.07, 0.10]} rotation={[0.1, 1.0, 0.1]} castShadow>
          <dodecahedronGeometry args={[0.060, 0]} />
          <meshStandardMaterial color="#5D5852" roughness={0.95} flatShading />
        </mesh>
        {/* Wooden frame border (4 thin planks) */}
        {[
          [ 0,    0.045,  0.50, 1.30, 0.012, 0.05],
          [ 0,    0.045, -0.50, 1.30, 0.012, 0.05],
          [-0.65, 0.045,  0,    0.05, 0.012, 1.00],
          [ 0.65, 0.045,  0,    0.05, 0.012, 1.00],
        ].map((b, i) => (
          <mesh
            key={`fr${i}`}
            position={[b[0] as number, b[1] as number, b[2] as number]}
            castShadow
          >
            <boxGeometry args={[b[3] as number, b[4] as number, b[5] as number]} />
            <meshStandardMaterial color="#5D452B" roughness={0.92} />
          </mesh>
        ))}
      </group>

      {/* V2 wave 3: 脱衣場 (dressing platform) just south of the pool
          with folded yukata + geta sandals + small wooden tray.
          Same "Airing just slipped into the water" beat as the rocker
          tea cup — implies recent inhabitant activity. */}
      <group position={[0.4, 0, -1.7]} rotation={[0, 0.15, 0]}>
        {/* Plank platform (脱衣場) */}
        <mesh position={[0, 0.04, 0]} castShadow receiveShadow>
          <boxGeometry args={[1.4, 0.08, 0.9]} />
          <meshStandardMaterial color={WOOD} roughness={0.92} flatShading />
        </mesh>
        {/* Plank seam lines (2 grooves running long side) */}
        <mesh position={[0, 0.082, -0.15]}>
          <boxGeometry args={[1.36, 0.003, 0.01]} />
          <meshStandardMaterial color="#5D452B" />
        </mesh>
        <mesh position={[0, 0.082, 0.15]}>
          <boxGeometry args={[1.36, 0.003, 0.01]} />
          <meshStandardMaterial color="#5D452B" />
        </mesh>

        {/* Folded yukata — soft indigo with a white obi sash */}
        <group position={[-0.35, 0.08, 0]}>
          {/* Yukata fold — flat rectangle stacked */}
          <mesh castShadow>
            <boxGeometry args={[0.32, 0.05, 0.38]} />
            <meshStandardMaterial color="#3E5878" roughness={0.92} />
          </mesh>
          <mesh position={[0, 0.045, 0]} castShadow>
            <boxGeometry args={[0.30, 0.04, 0.36]} />
            <meshStandardMaterial color="#4A6890" roughness={0.92} />
          </mesh>
          {/* White obi sash on top */}
          <mesh position={[0, 0.075, 0]} castShadow>
            <boxGeometry args={[0.32, 0.022, 0.08]} />
            <meshStandardMaterial color="#F4EAD5" roughness={0.85} />
          </mesh>
        </group>

        {/* Pair of geta (wooden sandals) — two slabs each with two
            small teeth on bottom. Slightly turned outward. */}
        {[-0.20, 0.12].map((gx, i) => (
          <group key={`geta${i}`} position={[0.30 + gx, 0.08, 0.15 - i * 0.30]} rotation={[0, i === 0 ? 0.18 : -0.20, 0]}>
            {/* Sole plank */}
            <mesh castShadow>
              <boxGeometry args={[0.20, 0.025, 0.10]} />
              <meshStandardMaterial color="#8E6A45" roughness={0.88} />
            </mesh>
            {/* Two teeth underneath */}
            <mesh position={[-0.06, -0.025, 0]}>
              <boxGeometry args={[0.025, 0.04, 0.10]} />
              <meshStandardMaterial color="#5D452B" roughness={0.92} />
            </mesh>
            <mesh position={[0.06, -0.025, 0]}>
              <boxGeometry args={[0.025, 0.04, 0.10]} />
              <meshStandardMaterial color="#5D452B" roughness={0.92} />
            </mesh>
            {/* Cloth strap (thong) — single V across top */}
            <mesh position={[0, 0.018, 0.025]} rotation={[0.4, 0, 0]}>
              <cylinderGeometry args={[0.004, 0.004, 0.06, 4]} />
              <meshStandardMaterial color="#C13E3E" roughness={0.85} />
            </mesh>
            <mesh position={[0, 0.018, -0.025]} rotation={[-0.4, 0, 0]}>
              <cylinderGeometry args={[0.004, 0.004, 0.06, 4]} />
              <meshStandardMaterial color="#C13E3E" roughness={0.85} />
            </mesh>
          </group>
        ))}

        {/* Small wooden tray with a bar of soap + tiny brush */}
        <group position={[0.55, 0.08, -0.05]}>
          <mesh castShadow>
            <boxGeometry args={[0.22, 0.02, 0.14]} />
            <meshStandardMaterial color="#A87E55" roughness={0.92} />
          </mesh>
          <mesh position={[-0.05, 0.025, 0]} castShadow>
            <boxGeometry args={[0.06, 0.02, 0.04]} />
            <meshStandardMaterial color="#F4EAD5" roughness={0.85} />
          </mesh>
          <mesh position={[0.04, 0.018, 0]} rotation={[0, 0.3, 0]} castShadow>
            <cylinderGeometry args={[0.008, 0.008, 0.10, 6]} />
            <meshStandardMaterial color="#5D452B" roughness={0.88} />
          </mesh>
        </group>
      </group>
    </group>
  )
}
