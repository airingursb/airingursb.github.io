// Player avatar — Airing panda sprite billboard with proper PBR
// integration. Receives lighting from directional sun, has contact
// shadow disc, locked vertical so doesn't pitch on camera dolly.
//
// G-deeper: on zone click, the avatar gives a small acknowledgment
// hop — easing 0 → +0.18 Y over 180ms, settling back over 400ms.
// Mochi turns toward the zone; avatar bounces. Two NPCs, two
// reactions, one moment.

import { useRef, useEffect } from 'react'
import { useTexture, Billboard } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { on } from './events'

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
  const bounceRef = useRef<{ start: number; active: boolean }>({ start: 0, active: false })

  // Subscribe to zone clicks — trigger a small hop acknowledgment
  useEffect(() => on('world-zone-click', () => {
    bounceRef.current = { start: performance.now() / 1000, active: true }
  }), [])

  // Idle breathing + zone-click bounce
  useFrame((s) => {
    if (!meshRef.current) return
    const t = s.clock.elapsedTime
    let hop = 0
    if (bounceRef.current.active) {
      const elapsed = t - bounceRef.current.start
      if (elapsed < 0.58) {
        // 0-180ms: ease up to peak 0.18; 180-580ms: settle back
        if (elapsed < 0.18) {
          const u = elapsed / 0.18
          hop = 0.18 * (0.5 - Math.cos(u * Math.PI) * 0.5)
        } else {
          const u = (elapsed - 0.18) / 0.40
          // Underdamped spring-back — overshoots slightly negative then settles
          hop = 0.18 * Math.exp(-u * 4) * Math.cos(u * 6)
        }
      } else {
        bounceRef.current.active = false
      }
    }
    meshRef.current.position.y = Math.sin(t * 1.4) * 0.04 + hop
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
