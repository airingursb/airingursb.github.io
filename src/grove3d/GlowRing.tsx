// SHU-733 Phase 6 · Pulsing emissive ring on interactables (sitting stone)
// Heap Plaza pattern: sin(t) modulated opacity + scale.

import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

interface Props {
  position: [number, number, number]
  radius?: number
  color?: string
}

export default function GlowRing({ position, radius = 0.95, color = '#ffd060' }: Props) {
  const matRef = useRef<THREE.MeshBasicMaterial>(null)
  const meshRef = useRef<THREE.Mesh>(null)

  useFrame((state) => {
    const t = state.clock.elapsedTime
    const pulse = (Math.sin(t * 2.2) + 1) * 0.5  // 0..1
    if (matRef.current) matRef.current.opacity = 0.25 + pulse * 0.55
    if (meshRef.current) meshRef.current.scale.setScalar(0.95 + pulse * 0.1)
  })

  return (
    <mesh ref={meshRef} position={position} rotation={[-Math.PI / 2, 0, 0]}>
      <ringGeometry args={[radius * 0.7, radius, 32]} />
      <meshBasicMaterial ref={matRef} color={color} transparent opacity={0.6} side={THREE.DoubleSide} />
    </mesh>
  )
}
