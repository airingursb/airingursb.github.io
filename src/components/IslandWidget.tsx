// Homepage mini floating-island widget — a stripped-down R3F preview of
// /world/ that hints at the full diorama without paying the full perf
// cost (no postprocessing, no particles, no water, no instanced grass,
// no shadows, no Suspense — all geometry is synchronous primitives).
//
// Lazy-loaded via Astro `client:visible` so it doesn't touch homepage
// LCP. Auto-rotates slowly; user can't drag (click intent is reserved
// for navigating to /world/). On hover the widget lifts + glows
// (CSS). Hidden on mobile (CSS media query).

import { Canvas } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'

const PINE_TRUNK   = '#5A4128'
const PINE_FOL_A   = '#5A7A4C'
const PINE_FOL_B   = '#4A6B40'
const ISLAND_GRASS = '#7AA565'
const ISLAND_SOIL  = '#8E7458'
const ISLAND_CLIFF = '#5D452B'
const CABIN_LOG    = '#9E7A52'
const CABIN_ROOF   = '#5A3A20'
const CABIN_DOOR   = '#A03030'
const CABIN_WIN    = '#FFE4A8'
const SAKURA_PINK  = '#FAD9E4'

function Pine({ x, z, scale = 1 }: { x: number; z: number; scale?: number }) {
  return (
    <group position={[x, 0.025, z]} scale={scale}>
      {/* Trunk */}
      <mesh position={[0, 0.18, 0]}>
        <cylinderGeometry args={[0.05, 0.07, 0.36, 6]} />
        <meshStandardMaterial color={PINE_TRUNK} flatShading />
      </mesh>
      {/* Stacked canopy cones */}
      <mesh position={[0, 0.5, 0]}>
        <coneGeometry args={[0.26, 0.4, 7]} />
        <meshStandardMaterial color={PINE_FOL_A} flatShading />
      </mesh>
      <mesh position={[0, 0.78, 0]}>
        <coneGeometry args={[0.20, 0.32, 7]} />
        <meshStandardMaterial color={PINE_FOL_B} flatShading />
      </mesh>
      <mesh position={[0, 1.02, 0]}>
        <coneGeometry args={[0.14, 0.26, 7]} />
        <meshStandardMaterial color={PINE_FOL_A} flatShading />
      </mesh>
    </group>
  )
}

function MiniIsland() {
  return (
    <group>
      {/* Grass top (slight dome via small Y offset) */}
      <mesh position={[0, 0, 0]} receiveShadow>
        <cylinderGeometry args={[1.85, 1.85, 0.1, 28]} />
        <meshStandardMaterial color={ISLAND_GRASS} roughness={0.94} />
      </mesh>
      {/* Soil layer */}
      <mesh position={[0, -0.18, 0]}>
        <cylinderGeometry args={[1.85, 1.55, 0.28, 28]} />
        <meshStandardMaterial color={ISLAND_SOIL} roughness={0.95} flatShading />
      </mesh>
      {/* Cliff drop (inverted cone) */}
      <mesh position={[0, -0.85, 0]}>
        <coneGeometry args={[1.55, 1.0, 18]} />
        <meshStandardMaterial color={ISLAND_CLIFF} roughness={0.95} flatShading />
      </mesh>

      {/* === Cabin block === */}
      <group position={[-0.35, 0.05, 0.15]} rotation={[0, 0.2, 0]}>
        {/* Walls */}
        <mesh position={[0, 0.28, 0]}>
          <boxGeometry args={[0.82, 0.5, 0.62]} />
          <meshStandardMaterial color={CABIN_LOG} roughness={0.9} flatShading />
        </mesh>
        {/* Gabled roof — single pyramidal cone (4-sided) */}
        <mesh position={[0, 0.66, 0]} rotation={[0, Math.PI / 4, 0]}>
          <coneGeometry args={[0.7, 0.42, 4]} />
          <meshStandardMaterial color={CABIN_ROOF} roughness={0.95} flatShading />
        </mesh>
        {/* Door */}
        <mesh position={[0, 0.22, 0.315]}>
          <boxGeometry args={[0.18, 0.28, 0.02]} />
          <meshStandardMaterial color={CABIN_DOOR} roughness={0.85} />
        </mesh>
        {/* Glowing window */}
        <mesh position={[0.22, 0.36, 0.315]}>
          <boxGeometry args={[0.16, 0.14, 0.015]} />
          <meshStandardMaterial
            color={CABIN_WIN}
            emissive={CABIN_WIN}
            emissiveIntensity={0.7}
            roughness={0.4}
          />
        </mesh>
        {/* Tiny chimney */}
        <mesh position={[0.28, 0.85, -0.18]}>
          <boxGeometry args={[0.1, 0.22, 0.1]} />
          <meshStandardMaterial color="#6B6358" roughness={0.95} flatShading />
        </mesh>
      </group>

      {/* === 4 pines scattered around the island === */}
      <Pine x={0.9}  z={-0.4} scale={1.0} />
      <Pine x={-1.1} z={-0.6} scale={0.85} />
      <Pine x={0.6}  z={0.85} scale={0.95} />
      <Pine x={-0.8} z={0.95} scale={0.75} />

      {/* === Sakura pink puff (3 jittered spheres, hints at hero tree) === */}
      <group position={[-1.25, 0.6, 0.2]}>
        <mesh position={[0, 0, 0]}>
          <icosahedronGeometry args={[0.32, 1]} />
          <meshStandardMaterial color={SAKURA_PINK} roughness={0.9} flatShading />
        </mesh>
        <mesh position={[0.18, 0.16, 0.1]}>
          <icosahedronGeometry args={[0.22, 1]} />
          <meshStandardMaterial color="#FFE2EE" roughness={0.9} flatShading />
        </mesh>
        <mesh position={[-0.15, 0.1, -0.08]}>
          <icosahedronGeometry args={[0.20, 1]} />
          <meshStandardMaterial color={SAKURA_PINK} roughness={0.9} flatShading />
        </mesh>
        {/* Tiny trunk underneath */}
        <mesh position={[0, -0.34, 0]}>
          <cylinderGeometry args={[0.04, 0.05, 0.5, 6]} />
          <meshStandardMaterial color="#3C2818" flatShading />
        </mesh>
      </group>
    </group>
  )
}

export default function IslandWidget() {
  return (
    <Canvas
      camera={{ position: [3.2, 2.0, 3.2], fov: 32 }}
      dpr={[1, 1.5]}
      gl={{ antialias: true, alpha: true }}
      style={{ background: 'transparent', width: '100%', height: '100%' }}
    >
      {/* Lighting — warm afternoon (matches /world/ palette but no shadows) */}
      <hemisphereLight args={['#FFD9A8', '#5A3A28', 0.55]} />
      <ambientLight intensity={0.35} color="#FFE4C0" />
      <directionalLight position={[3, 4, 2]} intensity={1.4} color="#FFD09A" />
      <directionalLight position={[-2, 3, -3]} intensity={0.45} color="#FAD6B0" />

      <MiniIsland />

      <OrbitControls
        target={[0, 0.3, 0]}
        enablePan={false}
        enableZoom={false}
        enableRotate={false}
        autoRotate
        autoRotateSpeed={0.6}
      />
    </Canvas>
  )
}
