// Atmospheric particles — drifting maple leaves, cherry petals,
// V-formation birds, gentle dust motes. Adds living sky + falling
// foliage feel.

import * as THREE from 'three'
import { useRef, useMemo, useEffect } from 'react'
import { useFrame } from '@react-three/fiber'
import { getGust } from './wind'
import { useTimeOfDay } from './time-of-day'

const MAPLE_LEAF = '#D9622B'
const CHERRY_PETAL = '#E8D2DC'
const BIRD = '#3F3A36'

interface ParticleSpec {
  start: [number, number, number]
  drift: [number, number, number]
  color: string
  size: number
  spin: number
  cycle: number
}

function makeFallingParticles(center: [number, number, number], count: number, color: string, sizeRange: [number, number]): ParticleSpec[] {
  const arr: ParticleSpec[] = []
  for (let i = 0; i < count; i++) {
    const a = (i / count) * Math.PI * 2
    const r = 1 + (i % 3) * 0.5
    arr.push({
      start: [
        center[0] + Math.cos(a) * r,
        center[1] + Math.random() * 3,
        center[2] + Math.sin(a) * r,
      ],
      drift: [
        (Math.sin(i * 7.3) * 0.6),
        -(0.3 + Math.random() * 0.3),
        (Math.cos(i * 5.1) * 0.6),
      ],
      color,
      size: sizeRange[0] + Math.random() * (sizeRange[1] - sizeRange[0]),
      spin: 0.5 + Math.random() * 1.5,
      cycle: 4 + Math.random() * 3,
    })
  }
  return arr
}

// V2 wave 3 perf (Sub-A P1 from first audit, finally addressed):
// FallingLeaves was 36+ individual meshes — same anti-pattern that
// AmbientFX::InstancedPollen had already fixed. Now ONE InstancedMesh
// with per-instance position + rotation + scale (fade via scale, since
// per-instance opacity needs custom shader). Per-leaf color via
// instanceColor attribute.
function FallingLeaves({ particles }: { particles: ParticleSpec[] }) {
  const meshRef = useRef<THREE.InstancedMesh>(null)
  const dummy = useMemo(() => new THREE.Object3D(), [])
  const scratchColor = useMemo(() => new THREE.Color(), [])
  const geo = useMemo(() => new THREE.PlaneGeometry(1, 1), [])
  const mat = useMemo(() => new THREE.MeshStandardMaterial({
    color: '#ffffff',
    transparent: true,
    opacity: 0.85,
    side: THREE.DoubleSide,
    flatShading: true,
  }), [])
  // Set per-instance color once + disable frustum culling.
  // V2 final polish (Sub-A): leaves animate across wide horizontal
  // and vertical ranges; the InstancedMesh bounding sphere is
  // computed once at construction and won't grow with the instance
  // matrices. Without disabling cull, leaves can pop in/out at the
  // viewport edge during camera orbits — disable so they stay
  // continuously visible.
  useEffect(() => {
    const m = meshRef.current
    if (!m) return
    m.frustumCulled = false
    particles.forEach((p, i) => {
      scratchColor.set(p.color)
      m.setColorAt(i, scratchColor)
    })
    if (m.instanceColor) m.instanceColor.needsUpdate = true
  }, [particles, scratchColor])
  // Dispose on unmount
  useEffect(() => () => { geo.dispose(); mat.dispose() }, [geo, mat])
  // V2 wave 3: leaves drift wider on gust (the periodic wind event).
  useFrame((s) => {
    const m = meshRef.current
    if (!m) return
    const t = s.clock.elapsedTime
    const gust = getGust(t)
    const driftAmp = 0.18 + gust * 0.32
    particles.forEach((p, i) => {
      const phase = (t / p.cycle + i * 0.1) % 1
      const yDrop = phase * 4.5
      dummy.position.set(
        p.start[0] + p.drift[0] * phase + Math.sin(t * 1.4 + i) * driftAmp,
        p.start[1] - yDrop,
        p.start[2] + p.drift[2] * phase + Math.cos(t * 1.1 + i) * driftAmp,
      )
      dummy.rotation.set(
        t * p.spin * (1 + gust * 0.8),
        0,
        t * p.spin * 0.8 * (1 + gust * 0.8),
      )
      // Fade in/out via scale (per-instance opacity in InstancedMesh
      // requires custom shader; scale ~0 at edges → invisible)
      const fadeScale = phase < 0.1 ? phase * 10 : phase > 0.85 ? (1 - phase) * 6.67 : 1
      dummy.scale.setScalar(Math.max(0, Math.min(1, fadeScale)) * p.size)
      dummy.updateMatrix()
      m.setMatrixAt(i, dummy.matrix)
    })
    m.instanceMatrix.needsUpdate = true
  })
  return (
    <instancedMesh ref={meshRef} args={[geo, mat, particles.length]} />
  )
}

function BirdFlock({ count = 7, startX = -50, height = 28, speed = 1.2 }: { count?: number; startX?: number; height?: number; speed?: number }) {
  // V-formation birds gliding across sky on a circular path. Aim toward
  // travel direction with banking — per Sub-A iter-7 gap #1.
  const groupRef = useRef<THREE.Group>(null)
  const lastPos = useRef(new THREE.Vector3())
  useFrame((s) => {
    if (!groupRef.current) return
    const t = (s.clock.elapsedTime * speed * 0.06) % (Math.PI * 2)
    const radius = 38
    const nx = Math.cos(t) * radius
    const nz = Math.sin(t) * radius
    const ny = height + Math.sin(t * 3) * 2
    // Velocity direction for yaw + bank
    const dx = nx - lastPos.current.x
    const dz = nz - lastPos.current.z
    groupRef.current.position.set(nx, ny, nz)
    if (dx !== 0 || dz !== 0) {
      groupRef.current.rotation.y = Math.atan2(dx, dz) + Math.PI
      groupRef.current.rotation.z = Math.sin(t * 4) * 0.08  // gentle bank
    }
    lastPos.current.set(nx, ny, nz)
  })
  return (
    <group ref={groupRef}>
      {Array.from({ length: count }).map((_, i) => {
        const half = (count - 1) / 2
        const offset = i - half
        const xOff = -Math.abs(offset) * 0.8
        const zOff = offset * 0.6
        const yOff = Math.abs(offset) * 0.2
        return (
          <group key={`bf${i}`} position={[xOff, yOff, zOff]}>
            <Bird />
          </group>
        )
      })}
    </group>
  )
}

function Bird() {
  // Proper bird: extruded triangle wings that flap on X-axis dihedral
  // (not the Z spin trick). Tail trails behind with a tiny lag.
  const leftWing = useRef<THREE.Mesh>(null)
  const rightWing = useRef<THREE.Mesh>(null)
  const tail = useRef<THREE.Mesh>(null)
  useFrame((s) => {
    const t = s.clock.elapsedTime * 6
    const flap = Math.sin(t) * 0.5
    if (leftWing.current)  leftWing.current.rotation.z =  flap
    if (rightWing.current) rightWing.current.rotation.z = -flap
    if (tail.current)      tail.current.rotation.x = Math.sin(t - 0.6) * 0.15
  })
  return (
    <group>
      {/* Body — small elongated capsule */}
      <mesh rotation={[0, 0, Math.PI / 2]}>
        <capsuleGeometry args={[0.1, 0.25, 4, 8]} />
        <meshStandardMaterial color={BIRD} roughness={0.85} flatShading />
      </mesh>
      {/* Head */}
      <mesh position={[0.22, 0.06, 0]}>
        <sphereGeometry args={[0.09, 8, 6]} />
        <meshStandardMaterial color={BIRD} flatShading />
      </mesh>
      {/* Tiny beak */}
      <mesh position={[0.32, 0.05, 0]} rotation={[0, 0, -Math.PI / 2]}>
        <coneGeometry args={[0.025, 0.06, 6]} />
        <meshStandardMaterial color="#E29A4A" flatShading />
      </mesh>
      {/* Left wing — flat triangle paddle */}
      <mesh ref={leftWing} position={[0, 0.04, -0.05]} rotation={[0, 0, 0]}>
        <boxGeometry args={[0.5, 0.02, 0.18]} />
        <meshStandardMaterial color={BIRD} flatShading />
      </mesh>
      {/* Right wing */}
      <mesh ref={rightWing} position={[0, 0.04, 0.05]} rotation={[0, 0, 0]}>
        <boxGeometry args={[0.5, 0.02, 0.18]} />
        <meshStandardMaterial color={BIRD} flatShading />
      </mesh>
      {/* Tail */}
      <mesh ref={tail} position={[-0.22, 0.04, 0]}>
        <boxGeometry args={[0.16, 0.02, 0.12]} />
        <meshStandardMaterial color={BIRD} flatShading />
      </mesh>
    </group>
  )
}

function DustMotes() {
  // Floating dust particles in shafts of sunlight near gazebo
  const refs = useRef<(THREE.Mesh | null)[]>([])
  const N = 24
  useFrame((s) => {
    const t = s.clock.elapsedTime
    for (let i = 0; i < N; i++) {
      const m = refs.current[i]
      if (!m) continue
      const phase = (t * 0.15 + i * 0.04) % 1
      m.position.set(
        13 + Math.sin(t * 0.3 + i) * 1.6,
        0.5 + phase * 3.5,
        -2.5 + Math.cos(t * 0.25 + i) * 1.6,
      )
      ;(m.material as THREE.MeshStandardMaterial).opacity = Math.sin(phase * Math.PI) * 0.5
    }
  })
  return (
    <group>
      {Array.from({ length: N }).map((_, i) => (
        <mesh
          key={`dm${i}`}
          ref={(el) => { if (el) refs.current[i] = el }}
        >
          <sphereGeometry args={[0.025, 4, 3]} />
          <meshStandardMaterial color="#FFE89A" transparent opacity={0.3} emissive="#FFE89A" emissiveIntensity={0.5} />
        </mesh>
      ))}
    </group>
  )
}

export default function Atmospherics() {
  // F-sync: birds only fly when daylight; counts reduce at night.
  const tod = useTimeOfDay()
  const birdsActive = tod.phase === 'day' || (tod.phase === 'dawn' && tod.blend > 0.4)
  const isNight = tod.phase === 'night'
  // Cherry petals falling at the south cherry tree position [6.0, 19.0]
  const petalCount = isNight ? 4 : 14   // 30% at night — barely visible against dark sky
  const leafCount = isNight ? 4 : 12
  const leafCount2 = isNight ? 3 : 10
  const petals = useMemo(() => makeFallingParticles([6.0, 4.0, 19.0], petalCount, CHERRY_PETAL, [0.07, 0.12]), [petalCount])
  const leaves = useMemo(() => makeFallingParticles([-14.0, 4.0, -13.0], leafCount, MAPLE_LEAF, [0.09, 0.14]), [leafCount])
  const leaves2 = useMemo(() => makeFallingParticles([13.0, 4.0, -10.0], leafCount2, MAPLE_LEAF, [0.08, 0.12]), [leafCount2])

  return (
    <group>
      <FallingLeaves particles={petals} />
      <FallingLeaves particles={leaves} />
      <FallingLeaves particles={leaves2} />
      {birdsActive && <BirdFlock count={7} startX={-50} height={28} speed={0.5} />}
      <DustMotes />
    </group>
  )
}
