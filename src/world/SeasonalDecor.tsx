// Seasonal decorations — D.
//
// Top-level component that conditionally mounts sub-components per
// current season. Most decoration is geometry-only + a couple of
// instanced particle systems. Zero cost when season is 'default'.

import { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { useSeason, type Season } from './seasonal'

// Cabin door anchor — pulls from Cabin.tsx's known placement. Cabin
// is at world position (-2, 0, -1) facing +z, door at front-center.
// If Cabin moves these need to follow.
const CABIN_POS: [number, number, number] = [-2, 0, -1]
const DOOR_FRONT_Z = 1.6   // approx front-face z relative to cabin

// === 春节 — Couplets flanking the cabin door + occasional small
//              fireworks puff at the distant horizon ===
function LunarNewYearCouplets() {
  return (
    <group position={CABIN_POS}>
      {/* Vertical couplet strips on either side of front door */}
      {[-0.9, 0.9].map((sx, i) => (
        <group key={`coup${i}`} position={[sx, 1.6, DOOR_FRONT_Z]}>
          {/* Red paper strip */}
          <mesh castShadow>
            <boxGeometry args={[0.20, 1.6, 0.02]} />
            <meshStandardMaterial color="#C8242A" roughness={0.88} />
          </mesh>
          {/* Gold ink "characters" — abstract gold blocks (no real text;
              would require canvas texture; the gold pattern reads as
              calligraphy at distance) */}
          {[0.55, 0.25, -0.05, -0.35, -0.65].map((cy, ci) => (
            <mesh key={`ch${i}-${ci}`} position={[0, cy, 0.012]}>
              <planeGeometry args={[0.10, 0.10]} />
              <meshStandardMaterial color="#E8B860" emissive="#A88030" emissiveIntensity={0.25} roughness={0.5} />
            </mesh>
          ))}
        </group>
      ))}
      {/* Horizontal banner above the door — 福 */}
      <group position={[0, 2.65, DOOR_FRONT_Z]}>
        <mesh castShadow>
          <boxGeometry args={[1.9, 0.32, 0.02]} />
          <meshStandardMaterial color="#C8242A" roughness={0.88} />
        </mesh>
        {/* Big gold character block in center */}
        <mesh position={[0, 0, 0.012]}>
          <planeGeometry args={[0.22, 0.22]} />
          <meshStandardMaterial color="#E8B860" emissive="#A88030" emissiveIntensity={0.3} roughness={0.5} />
        </mesh>
      </group>
    </group>
  )
}

// === Distant horizon fireworks — small additive bursts over the
// cloud-sea horizon. Triggers every 8-15s. Suggests celebration in
// the next village over without dominating the scene. ===
function DistantFireworks() {
  const groupRef = useRef<THREE.Group>(null)
  const stateRef = useRef({
    activeBursts: [] as Array<{ at: number; pos: [number, number, number]; hue: string }>,
    nextSpawn: 0,
  })
  const palette = ['#FFD08A', '#FF8060', '#80B8FF', '#FFB04A', '#E060A8', '#A0FF80']
  // Reuse 22 sphere meshes — particles cycle through them. Avoids
  // per-burst alloc/dispose.
  const SPHERES = 22
  const sphereRefs = useMemo(
    () => Array.from({ length: SPHERES }, () => ({ current: null as THREE.Mesh | null })),
    [],
  )
  // Pre-computed Fibonacci-sphere directions
  const dirs = useMemo(() => {
    const arr: Array<[number, number, number]> = []
    for (let i = 0; i < SPHERES; i++) {
      const phi = Math.acos(1 - 2 * (i + 0.5) / SPHERES)
      const theta = Math.PI * (1 + Math.sqrt(5)) * i
      arr.push([Math.sin(phi) * Math.cos(theta), Math.cos(phi) * 0.6 + 0.4, Math.sin(phi) * Math.sin(theta)])
    }
    return arr
  }, [])
  useFrame((s) => {
    const t = s.clock.elapsedTime
    const st = stateRef.current
    // Spawn new burst on schedule
    if (t > st.nextSpawn) {
      st.activeBursts.push({
        at: t,
        // Random distant horizon point — pick from 4 quadrants
        pos: [
          (Math.random() - 0.5) * 60,
          10 + Math.random() * 6,
          (Math.random() - 0.5) * 60,
        ],
        hue: palette[Math.floor(Math.random() * palette.length)],
      })
      st.nextSpawn = t + 8 + Math.random() * 7
    }
    // GC old bursts
    st.activeBursts = st.activeBursts.filter((b) => t - b.at < 1.8)
    // Layout particles for first active burst (simple — only animate one
    // at a time visually, but keep multiple in the stack so overlap
    // is possible)
    const burst = st.activeBursts[0]
    if (!burst || !groupRef.current) {
      // Hide all spheres
      sphereRefs.forEach((r) => { if (r.current) (r.current.material as THREE.MeshBasicMaterial).opacity = 0 })
      return
    }
    groupRef.current.position.set(burst.pos[0], burst.pos[1], burst.pos[2])
    const age = t - burst.at
    const p = Math.min(1, age / 1.6)
    sphereRefs.forEach((r, i) => {
      const m = r.current
      if (!m) return
      const [dx, dy, dz] = dirs[i]
      const SPEED = 3.0
      const G = 4.0
      m.position.x = dx * SPEED * age
      m.position.y = dy * SPEED * age - 0.5 * G * age * age
      m.position.z = dz * SPEED * age
      const mat = m.material as THREE.MeshBasicMaterial
      mat.color.set(burst.hue)
      mat.opacity = (1 - p) * (1 - p) * 0.9
      m.scale.setScalar(0.08 + (1 - p) * 0.10)
    })
  })
  return (
    <group ref={groupRef}>
      {dirs.map((_, i) => (
        <mesh key={i} ref={(el) => { sphereRefs[i].current = el }}>
          <sphereGeometry args={[1, 6, 5]} />
          <meshBasicMaterial
            color="#FFD08A"
            transparent
            opacity={0}
            depthWrite={false}
            blending={THREE.AdditiveBlending}
          />
        </mesh>
      ))}
    </group>
  )
}

// === 中秋 — extra-large warm moon hanging high in sky + plate of
// mooncakes (月饼) sitting near the bandstand ===
function MidAutumnMoon() {
  const moonRef = useRef<THREE.Mesh>(null)
  // Slow breathing glow on the moon's bloom-friendly emissive
  useFrame((s) => {
    if (!moonRef.current) return
    const t = s.clock.elapsedTime
    const mat = moonRef.current.material as THREE.MeshBasicMaterial
    // Color drift very subtle 0.96 → 1.0
    const k = 0.96 + Math.sin(t * 0.3) * 0.04
    mat.color.setRGB(1.0 * k, 0.92 * k, 0.78 * k)
  })
  return (
    <mesh ref={moonRef} position={[14, 26, -20]} renderOrder={2}>
      <sphereGeometry args={[2.2, 24, 18]} />
      <meshBasicMaterial color="#FFE9C8" transparent opacity={0.92} depthWrite={false} />
    </mesh>
  )
}

function MooncakePlate() {
  // Plate sits on the grass next to the bandstand at world (11.5, -4.5).
  // Offset NORTH ~2u so it doesn't collide with the bandstand stone base.
  return (
    <group position={[11.5, 0.08, -2.5]}>
      {/* Round wooden plate */}
      <mesh castShadow receiveShadow>
        <cylinderGeometry args={[0.45, 0.45, 0.04, 24]} />
        <meshStandardMaterial color="#8B6A48" roughness={0.85} />
      </mesh>
      {/* 4 mooncakes (round cylinders with top imprint) arranged in 2x2 */}
      {[
        [-0.18, -0.18],
        [0.18, -0.18],
        [-0.18, 0.18],
        [0.18, 0.18],
      ].map(([mx, mz], i) => (
        <group key={`mc${i}`} position={[mx, 0.075, mz]}>
          <mesh castShadow>
            <cylinderGeometry args={[0.14, 0.14, 0.07, 16]} />
            <meshStandardMaterial color="#C89460" roughness={0.85} />
          </mesh>
          {/* Top imprint — slightly darker disc with center bump */}
          <mesh position={[0, 0.038, 0]}>
            <cylinderGeometry args={[0.12, 0.12, 0.002, 16]} />
            <meshStandardMaterial color="#A06840" roughness={0.85} />
          </mesh>
          <mesh position={[0, 0.044, 0]}>
            <cylinderGeometry args={[0.04, 0.04, 0.006, 12]} />
            <meshStandardMaterial color="#7E4830" roughness={0.85} />
          </mesh>
        </group>
      ))}
    </group>
  )
}

// === 冬天 — snow particles falling over the island ===
function SnowfallLayer() {
  const COUNT = 240
  const ref = useRef<THREE.InstancedMesh>(null)
  const dataRef = useRef(
    Array.from({ length: COUNT }, () => ({
      x: (Math.random() - 0.5) * 50,
      y: 5 + Math.random() * 25,
      z: (Math.random() - 0.5) * 50,
      speed: 0.6 + Math.random() * 0.8,
      sway: Math.random() * Math.PI * 2,
      size: 0.04 + Math.random() * 0.06,
    })),
  )
  const dummy = useMemo(() => new THREE.Object3D(), [])
  useFrame((s, dt) => {
    const m = ref.current
    if (!m) return
    const t = s.clock.elapsedTime
    for (let i = 0; i < COUNT; i++) {
      const f = dataRef.current[i]
      f.y -= f.speed * dt
      // Wrap when below the island
      if (f.y < -2) {
        f.y = 25 + Math.random() * 5
        f.x = (Math.random() - 0.5) * 50
        f.z = (Math.random() - 0.5) * 50
      }
      const sway = Math.sin(t * 0.7 + f.sway) * 0.25
      dummy.position.set(f.x + sway, f.y, f.z + Math.cos(t * 0.5 + f.sway) * 0.2)
      dummy.scale.setScalar(f.size)
      dummy.updateMatrix()
      m.setMatrixAt(i, dummy.matrix)
    }
    m.instanceMatrix.needsUpdate = true
  })
  return (
    <instancedMesh ref={ref} args={[undefined as any, undefined as any, COUNT]} frustumCulled={false}>
      <sphereGeometry args={[1, 5, 4]} />
      <meshBasicMaterial color="#FBFCFD" transparent opacity={0.88} depthWrite={false} />
    </instancedMesh>
  )
}

// === 生日 — confetti rain (URL-only flag: ?season=birthday) ===
function ConfettiRain() {
  const COUNT = 180
  const ref = useRef<THREE.InstancedMesh>(null)
  const dataRef = useRef(
    Array.from({ length: COUNT }, () => ({
      x: (Math.random() - 0.5) * 36,
      y: 8 + Math.random() * 18,
      z: (Math.random() - 0.5) * 36,
      vy: -1.2 - Math.random() * 1.5,
      vx: (Math.random() - 0.5) * 0.4,
      vz: (Math.random() - 0.5) * 0.4,
      sway: Math.random() * Math.PI * 2,
      spin: (Math.random() - 0.5) * 4,
      hue: Math.floor(Math.random() * 6),
    })),
  )
  const dummy = useMemo(() => new THREE.Object3D(), [])
  const palette = useMemo(() => [
    new THREE.Color('#FF80A8'), new THREE.Color('#80C8FF'), new THREE.Color('#FFD060'),
    new THREE.Color('#A0F080'), new THREE.Color('#C080FF'), new THREE.Color('#FFA060'),
  ], [])
  // Set per-instance color once on mount
  useMemo(() => {
    const m = ref.current
    if (!m) return
    const scratch = new THREE.Color()
    for (let i = 0; i < COUNT; i++) {
      scratch.copy(palette[dataRef.current[i].hue])
      m.setColorAt(i, scratch)
    }
    if (m.instanceColor) m.instanceColor.needsUpdate = true
  }, [palette])
  useFrame((s, dt) => {
    const m = ref.current
    if (!m) return
    const t = s.clock.elapsedTime
    for (let i = 0; i < COUNT; i++) {
      const f = dataRef.current[i]
      f.y += f.vy * dt
      f.x += f.vx * dt + Math.sin(t * 1.3 + f.sway) * 0.04
      f.z += f.vz * dt
      if (f.y < -2) {
        f.y = 18 + Math.random() * 6
        f.x = (Math.random() - 0.5) * 36
        f.z = (Math.random() - 0.5) * 36
      }
      dummy.position.set(f.x, f.y, f.z)
      dummy.rotation.x = t * f.spin
      dummy.rotation.y = t * f.spin * 0.7
      dummy.scale.set(0.08, 0.005, 0.04)
      dummy.updateMatrix()
      m.setMatrixAt(i, dummy.matrix)
    }
    m.instanceMatrix.needsUpdate = true
    // Also re-set color the first 30 frames in case the useMemo above
    // missed (ref not assigned at memo time).
    if (t < 1 && m.instanceColor) {
      const scratch = new THREE.Color()
      for (let i = 0; i < COUNT; i++) {
        scratch.copy(palette[dataRef.current[i].hue])
        m.setColorAt(i, scratch)
      }
      m.instanceColor.needsUpdate = true
    }
  })
  return (
    <instancedMesh ref={ref} args={[undefined as any, undefined as any, COUNT]} frustumCulled={false}>
      <boxGeometry args={[1, 1, 1]} />
      <meshBasicMaterial vertexColors={false} transparent opacity={0.95} depthWrite={false} />
    </instancedMesh>
  )
}

interface Props { override?: Season }

export default function SeasonalDecor({ override }: Props = {}) {
  const detected = useSeason()
  const season = override ?? detected
  if (season === 'default') return null
  return (
    <group>
      {season === 'lny' && (
        <>
          <LunarNewYearCouplets />
          <DistantFireworks />
        </>
      )}
      {season === 'midautumn' && (
        <>
          <MidAutumnMoon />
          <MooncakePlate />
        </>
      )}
      {season === 'winter' && <SnowfallLayer />}
      {season === 'birthday' && <ConfettiRain />}
    </group>
  )
}
