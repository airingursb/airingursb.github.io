// Subtle ambient effects — InstancedMesh-based for perf. Pre-allocates
// Object3D + matrices once, only updates per-frame transforms via
// setMatrixAt instead of creating new meshes.

import * as THREE from 'three'
import { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import { getGust } from './wind'

const POLLEN_GOLD = '#FFE89A'
const WIND_STREAK = '#FFFFFF'

function InstancedPollen({ origins, perOrigin = 10 }: { origins: Array<[number, number, number]>; perOrigin?: number }) {
  const total = origins.length * perOrigin
  const meshRef = useRef<THREE.InstancedMesh>(null)
  const dummy = useMemo(() => new THREE.Object3D(), [])

  // Per-particle origin index + phase offset
  const params = useMemo(() => {
    const arr: Array<{ origin: [number, number, number]; phase: number }> = []
    for (let oi = 0; oi < origins.length; oi++) {
      for (let i = 0; i < perOrigin; i++) {
        arr.push({ origin: origins[oi], phase: (oi * 17 + i) * 0.12 })
      }
    }
    return arr
  }, [origins, perOrigin])

  useFrame((s) => {
    if (!meshRef.current) return
    const t = s.clock.elapsedTime
    for (let i = 0; i < total; i++) {
      const p = params[i]
      const phase = (t * 0.2 + p.phase) % 1
      dummy.position.set(
        p.origin[0] + Math.sin(t * 0.5 + i) * 0.6,
        p.origin[1] + phase * 2.0,
        p.origin[2] + Math.cos(t * 0.4 + i) * 0.6,
      )
      const opacity = Math.sin(phase * Math.PI) * 0.6
      dummy.scale.setScalar(opacity + 0.001)  // shrink to hide instead of opacity (cheaper)
      dummy.updateMatrix()
      meshRef.current.setMatrixAt(i, dummy.matrix)
    }
    meshRef.current.instanceMatrix.needsUpdate = true
  })

  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, total]}>
      <sphereGeometry args={[0.02, 4, 3]} />
      <meshStandardMaterial
        color={POLLEN_GOLD}
        emissive={POLLEN_GOLD}
        emissiveIntensity={0.7}
        transparent
        opacity={0.8}
      />
    </instancedMesh>
  )
}

function WindStreaks({ center, count = 4 }: { center: [number, number, number]; count?: number }) {
  const refs = useRef<(THREE.Mesh | null)[]>([])
  // V2 wave 3: wind streaks travel faster + denser visible at peak gust
  useFrame((s) => {
    const t = s.clock.elapsedTime
    const gust = getGust(t)
    const speedBoost = 1 + gust * 1.6
    const opacityBoost = 1 + gust * 2.5
    for (let i = 0; i < count; i++) {
      const m = refs.current[i]
      if (!m) continue
      const phase = (t * 0.15 * speedBoost + i * 0.25) % 1
      m.position.x = center[0] - 8 + phase * 18
      m.position.z = center[2] + Math.sin(i + t * 0.1) * 4
      m.position.y = center[1]
      const opacity = Math.sin(phase * Math.PI) * 0.18 * opacityBoost
      ;(m.material as THREE.MeshBasicMaterial).opacity = Math.min(0.6, opacity)
    }
  })
  return (
    <group>
      {Array.from({ length: count }).map((_, i) => (
        <mesh
          key={`w${i}`}
          ref={(el) => { if (el) refs.current[i] = el }}
        >
          <boxGeometry args={[1.6, 0.012, 0.012]} />
          <meshBasicMaterial color={WIND_STREAK} transparent opacity={0} />
        </mesh>
      ))}
    </group>
  )
}

export default function AmbientFX() {
  const pollenOrigins: Array<[number, number, number]> = [
    [-4.0, 0.8, 3.0],
    [5.0, 0.8, -4.0],
    [0.0, 0.8, 8.0],
  ]
  return (
    <group>
      <InstancedPollen origins={pollenOrigins} perOrigin={10} />
      <WindStreaks center={[0, 1.2, 0]} count={4} />
    </group>
  )
}
