// Atmospheric particles — drifting maple leaves, cherry petals,
// V-formation birds, gentle dust motes. Adds living sky + falling
// foliage feel.

import * as THREE from 'three'
import { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'

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

function FallingLeaves({ particles }: { particles: ParticleSpec[] }) {
  const refs = useRef<(THREE.Mesh | null)[]>([])
  useFrame((s) => {
    const t = s.clock.elapsedTime
    particles.forEach((p, i) => {
      const m = refs.current[i]
      if (!m) return
      const phase = (t / p.cycle + i * 0.1) % 1
      const yDrop = phase * 4.5
      m.position.set(
        p.start[0] + p.drift[0] * phase + Math.sin(t * 1.4 + i) * 0.18,
        p.start[1] - yDrop,
        p.start[2] + p.drift[2] * phase + Math.cos(t * 1.1 + i) * 0.18,
      )
      m.rotation.x = t * p.spin
      m.rotation.z = t * p.spin * 0.8
      // Fade in/out across cycle
      const opacity = phase < 0.1 ? phase * 10 : phase > 0.85 ? (1 - phase) * 6.67 : 1
      ;(m.material as THREE.MeshStandardMaterial).opacity = Math.min(0.85, opacity * 0.85)
    })
  })
  return (
    <group>
      {particles.map((p, i) => (
        <mesh
          key={i}
          ref={(el) => { if (el) refs.current[i] = el }}
        >
          <planeGeometry args={[p.size, p.size]} />
          <meshStandardMaterial color={p.color} transparent opacity={0.8} side={THREE.DoubleSide} flatShading />
        </mesh>
      ))}
    </group>
  )
}

function BirdFlock({ count = 7, startX = -50, height = 28, speed = 1.2 }: { count?: number; startX?: number; height?: number; speed?: number }) {
  // V-formation birds gliding across the sky in a slow loop
  const groupRef = useRef<THREE.Group>(null)
  useFrame((s) => {
    if (groupRef.current) {
      const t = (s.clock.elapsedTime * speed) % 100
      groupRef.current.position.x = startX + t * 1.2
      groupRef.current.position.z = -25 + Math.sin(t * 0.05) * 8
      groupRef.current.position.y = height + Math.sin(t * 0.08) * 1.5
    }
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
  const wingsRef = useRef<THREE.Group>(null)
  useFrame((s) => {
    if (wingsRef.current) {
      const flap = Math.sin(s.clock.elapsedTime * 6) * 0.6
      wingsRef.current.rotation.z = flap
    }
  })
  return (
    <group>
      {/* Body */}
      <mesh>
        <sphereGeometry args={[0.18, 6, 5]} />
        <meshStandardMaterial color={BIRD} flatShading />
      </mesh>
      {/* Wings as a flat V */}
      <group ref={wingsRef}>
        <mesh position={[0, 0, 0]} rotation={[0, 0, 0.2]}>
          <coneGeometry args={[0.15, 0.7, 3]} />
          <meshStandardMaterial color={BIRD} flatShading />
        </mesh>
        <mesh position={[0, 0, 0]} rotation={[Math.PI, 0, 0.2]}>
          <coneGeometry args={[0.15, 0.7, 3]} />
          <meshStandardMaterial color={BIRD} flatShading />
        </mesh>
      </group>
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
  // Cherry petals falling at the south cherry tree position [6.0, 19.0]
  const petals = useMemo(() => makeFallingParticles([6.0, 4.0, 19.0], 14, CHERRY_PETAL, [0.07, 0.12]), [])
  // Maple leaves falling at the NW maple position [-14.0, -13.0]
  const leaves = useMemo(() => makeFallingParticles([-14.0, 4.0, -13.0], 12, MAPLE_LEAF, [0.09, 0.14]), [])
  // Another maple position [13.0, -10.0]
  const leaves2 = useMemo(() => makeFallingParticles([13.0, 4.0, -10.0], 10, MAPLE_LEAF, [0.08, 0.12]), [])

  return (
    <group>
      <FallingLeaves particles={petals} />
      <FallingLeaves particles={leaves} />
      <FallingLeaves particles={leaves2} />
      <BirdFlock count={7} startX={-50} height={28} speed={0.5} />
      <DustMotes />
    </group>
  )
}
