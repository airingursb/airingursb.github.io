// A1 (direction): koi-style fish in the onsen pond. 3 small fish trace
// independent slow circular paths just below the water surface, with
// gentle tail-wiggle + occasional surface "splash" (brief Y rise).
//
// Pure procedural — no asset weight. Tiny capsule body + flat triangular
// tail. Reads as koi from camera distance; up close you can see the
// geometry but the diorama camera never gets close enough.

import * as THREE from 'three'
import { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import { POND_CENTER } from './zones'

const KOI_PALETTE: Array<{ body: string; spot: string }> = [
  { body: '#F4ECE0', spot: '#D4593E' },   // classic koi: pale cream + red spots
  { body: '#FCF5E8', spot: '#3A2B22' },   // shiro utsuri-ish: cream + dark brown
  { body: '#F8A55C', spot: '#FFFCEE' },   // ogon: orange + cream
]

interface FishProps {
  // Path radius around pond center, in world units
  radius: number
  // Path period in seconds (full loop)
  period: number
  // Initial phase offset 0..1
  phase: number
  // Y baseline (pond surface ≈ 0.20)
  yBase: number
  // Body length
  size: number
  // Palette index
  paletteIdx: number
  // Direction: 1 CCW, -1 CW
  dir: 1 | -1
}

function Fish({ radius, period, phase, yBase, size, paletteIdx, dir }: FishProps) {
  const groupRef = useRef<THREE.Group>(null)
  const tailRef = useRef<THREE.Mesh>(null)
  const palette = KOI_PALETTE[paletteIdx % KOI_PALETTE.length]

  // Body geometry — slightly squashed sphere, elongated
  const bodyGeo = useMemo(() => new THREE.SphereGeometry(size * 0.5, 10, 8), [size])
  const tailGeo = useMemo(() => {
    // Flat triangle pointing back
    const g = new THREE.BufferGeometry()
    const verts = new Float32Array([
       0,       0,  0,
      -size * 0.6,  size * 0.3, 0,
      -size * 0.6, -size * 0.3, 0,
    ])
    g.setAttribute('position', new THREE.BufferAttribute(verts, 3))
    g.computeVertexNormals()
    return g
  }, [size])

  useFrame((s) => {
    if (!groupRef.current) return
    const t = s.clock.elapsedTime
    const angle = phase * Math.PI * 2 + (t / period) * Math.PI * 2 * dir
    const x = POND_CENTER[0] + Math.cos(angle) * radius
    const z = POND_CENTER[1] + Math.sin(angle) * radius
    // Occasional surface splash — brief Y rise every ~14s, randomized per-fish
    const splashCycle = (t % (14 + phase * 6)) / (14 + phase * 6)
    const splash = splashCycle < 0.04 ? Math.sin(splashCycle / 0.04 * Math.PI) * 0.18 : 0
    groupRef.current.position.set(x, yBase + splash, z)
    // Face direction of motion (tangent to circle) — rotation.y around Y axis
    // Tangent: derivative of (cos a, _, sin a) w.r.t. angle = (-sin a, _, cos a) × dir
    const tangentAngle = Math.atan2(-Math.sin(angle) * dir, Math.cos(angle) * dir)
    groupRef.current.rotation.y = tangentAngle + Math.PI / 2   // +π/2 because body's forward is +X locally
    // Tail wiggle — sine on Y axis of tail group
    if (tailRef.current) {
      tailRef.current.rotation.y = Math.sin(t * 6 + phase * 4) * 0.4
    }
  })

  return (
    <group ref={groupRef}>
      {/* Body */}
      <mesh geometry={bodyGeo} scale={[1.6, 0.7, 0.9]}>
        <meshStandardMaterial color={palette.body} roughness={0.6} metalness={0.05} />
      </mesh>
      {/* Spot on back (slight offset, smaller darker patch) */}
      <mesh position={[size * 0.1, size * 0.18, 0]} scale={[1, 0.4, 0.7]}>
        <sphereGeometry args={[size * 0.22, 8, 6]} />
        <meshStandardMaterial color={palette.spot} roughness={0.7} />
      </mesh>
      {/* Tail — wiggles in useFrame */}
      <group ref={tailRef} position={[-size * 0.45, 0, 0]}>
        <mesh geometry={tailGeo} rotation={[Math.PI / 2, 0, 0]}>
          <meshStandardMaterial color={palette.body} roughness={0.7} side={THREE.DoubleSide} />
        </mesh>
      </group>
    </group>
  )
}

export default function PondFish() {
  // 3 fish with different radii / periods / palettes. y just below pond
  // surface (≈0.20) so they're visible through translucent water.
  return (
    <group>
      <Fish radius={0.85} period={32} phase={0.00} yBase={0.18} size={0.34} paletteIdx={0} dir={1} />
      <Fish radius={1.45} period={45} phase={0.35} yBase={0.16} size={0.30} paletteIdx={1} dir={-1} />
      <Fish radius={1.10} period={38} phase={0.70} yBase={0.17} size={0.28} paletteIdx={2} dir={1} />
    </group>
  )
}
