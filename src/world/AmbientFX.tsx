// Subtle ambient effects bundle — pollen drifting up from grass, faint
// wind streaks across the meadow. Adds depth-of-life without adding
// any focused visual landmark.

import * as THREE from 'three'
import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'

const POLLEN_GOLD = '#FFE89A'
const WIND_STREAK = '#FFFFFF'

function Pollen({ origin, count = 12 }: { origin: [number, number, number]; count?: number }) {
  const refs = useRef<(THREE.Mesh | null)[]>([])
  useFrame((s) => {
    const t = s.clock.elapsedTime
    for (let i = 0; i < count; i++) {
      const m = refs.current[i]
      if (!m) continue
      const phase = (t * 0.2 + i * 0.12) % 1
      m.position.x = origin[0] + Math.sin(t * 0.5 + i) * 0.6
      m.position.y = origin[1] + phase * 2.0
      m.position.z = origin[2] + Math.cos(t * 0.4 + i) * 0.6
      const opacity = Math.sin(phase * Math.PI) * 0.6
      ;(m.material as THREE.MeshStandardMaterial).opacity = opacity
    }
  })
  return (
    <group>
      {Array.from({ length: count }).map((_, i) => (
        <mesh
          key={`p${i}`}
          ref={(el) => { if (el) refs.current[i] = el }}
        >
          <sphereGeometry args={[0.02, 4, 3]} />
          <meshStandardMaterial
            color={POLLEN_GOLD}
            emissive={POLLEN_GOLD}
            emissiveIntensity={0.7}
            transparent
            opacity={0}
          />
        </mesh>
      ))}
    </group>
  )
}

function WindStreaks({ center, count = 4 }: { center: [number, number, number]; count?: number }) {
  const refs = useRef<(THREE.Mesh | null)[]>([])
  useFrame((s) => {
    const t = s.clock.elapsedTime
    for (let i = 0; i < count; i++) {
      const m = refs.current[i]
      if (!m) continue
      const phase = (t * 0.15 + i * 0.25) % 1
      m.position.x = center[0] - 8 + phase * 18
      m.position.z = center[2] + Math.sin(i + t * 0.1) * 4
      m.position.y = center[1]
      const opacity = Math.sin(phase * Math.PI) * 0.18
      ;(m.material as THREE.MeshBasicMaterial).opacity = opacity
    }
  })
  return (
    <group>
      {Array.from({ length: count }).map((_, i) => (
        <mesh
          key={`w${i}`}
          ref={(el) => { if (el) refs.current[i] = el }}
          rotation={[0, 0, 0]}
        >
          <boxGeometry args={[1.6, 0.012, 0.012]} />
          <meshBasicMaterial color={WIND_STREAK} transparent opacity={0} />
        </mesh>
      ))}
    </group>
  )
}

export default function AmbientFX() {
  return (
    <group>
      {/* Pollen rising from 3 patches across the island */}
      <Pollen origin={[-4.0, 0.8, 3.0]} count={10} />
      <Pollen origin={[5.0, 0.8, -4.0]} count={10} />
      <Pollen origin={[0.0, 0.8, 8.0]} count={8} />

      {/* Wind streaks drifting across the meadow */}
      <WindStreaks center={[0, 1.2, 0]} count={4} />
    </group>
  )
}
