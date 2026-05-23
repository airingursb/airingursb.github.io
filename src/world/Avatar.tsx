// Player avatar — Airing panda sprite billboard with proper PBR
// integration. Receives lighting from directional sun, has contact
// shadow disc, locked vertical so doesn't pitch on camera dolly.

import { useRef } from 'react'
import { useTexture, Billboard } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

const AVATAR_URL = '/world/sprites/character/B01-idle-south.png'

export default function Avatar() {
  const tex = useTexture(AVATAR_URL)
  const aspect = 1.0
  const height = 1.6
  const width = height * aspect

  // Standing in front of cabin door (cabin pos [-2, -1])
  const baseY = 1.05
  const pos: [number, number, number] = [-2.0, baseY, 0.5]
  const meshRef = useRef<THREE.Mesh>(null)

  // Idle breathing — gentle Y oscillation
  useFrame((s) => {
    if (!meshRef.current) return
    const t = s.clock.elapsedTime
    meshRef.current.position.y = Math.sin(t * 1.4) * 0.04
  })

  return (
    <group>
      {/* Hand-baked contact shadow disc on ground */}
      <mesh position={[pos[0], 0.62, pos[2]]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[0.45, 16]} />
        <meshStandardMaterial color="#000000" transparent opacity={0.45} roughness={1} />
      </mesh>
      {/* Billboarded sprite, slight idle bob inside the billboard */}
      <Billboard position={pos} follow={true} lockY>
        <mesh ref={meshRef} castShadow>
          <planeGeometry args={[width, height]} />
          <meshStandardMaterial
            map={tex}
            transparent
            alphaTest={0.5}
            side={THREE.DoubleSide}
            emissive="#ffffff"
            emissiveMap={tex}
            emissiveIntensity={0.15}
            roughness={0.9}
          />
        </mesh>
      </Billboard>
    </group>
  )
}
