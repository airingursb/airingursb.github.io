// Animated campfire flame at the hammock spot — flickering color +
// orange point light + small ember sparkles.

import * as THREE from 'three'
import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Sparkles } from '@react-three/drei'
import { getGust } from './wind'

const FLAME_OUTER = '#E29A4A'
const FLAME_INNER = '#FFCE6A'
const FLAME_CORE  = '#FFE89A'

export default function Campfire() {
  const flameOut = useRef<THREE.Mesh>(null)
  const flameMid = useRef<THREE.Mesh>(null)
  const flameInn = useRef<THREE.Mesh>(null)
  const lightRef = useRef<THREE.PointLight>(null)

  useFrame((s) => {
    const t = s.clock.elapsedTime
    const gust = getGust(t)
    // V2 wave 3: flames lean on gust — bowed by wind, sparkier light
    const lean = gust * 0.30  // up to ~17° lean at peak
    const sparkBoost = 1 + gust * 0.6
    if (flameOut.current) {
      const sx = 1 + Math.sin(t * 6) * 0.08
      const sy = 1 + Math.cos(t * 4.5) * 0.12
      flameOut.current.scale.set(sx, sy, sx)
      flameOut.current.rotation.z = lean
    }
    if (flameMid.current) {
      const sx = 1 + Math.cos(t * 7 + 1) * 0.1
      const sy = 1 + Math.sin(t * 5 + 1) * 0.1
      flameMid.current.scale.set(sx, sy, sx)
      flameMid.current.rotation.z = lean * 1.1
    }
    if (flameInn.current) {
      const sx = 1 + Math.sin(t * 9 + 2) * 0.12
      const sy = 1 + Math.cos(t * 6 + 2) * 0.14
      flameInn.current.scale.set(sx, sy, sx)
      flameInn.current.rotation.z = lean * 1.2
    }
    // Flicker light intensity — also slightly brighter on gust (the
    // fire breathes when wind kicks up)
    if (lightRef.current) {
      lightRef.current.intensity = (1.6 + Math.sin(t * 8) * 0.4) * sparkBoost
    }
  })

  // Campfire is placed at the hammock spot (-4, 0, -12) + offset to match
  // the existing campfire ring position [1.5, 0, -1.4] inside HammockSpot
  return (
    <group position={[-4 + 1.5, 0, -12 - 1.4]}>
      {/* Outer flame */}
      <mesh ref={flameOut} position={[0, 0.25, 0]}>
        <coneGeometry args={[0.22, 0.6, 8]} />
        <meshStandardMaterial
          color={FLAME_OUTER}
          emissive={FLAME_OUTER}
          emissiveIntensity={1.6}
          transparent
          opacity={0.85}
        />
      </mesh>
      {/* Middle flame */}
      <mesh ref={flameMid} position={[0, 0.32, 0]}>
        <coneGeometry args={[0.16, 0.5, 6]} />
        <meshStandardMaterial
          color={FLAME_INNER}
          emissive={FLAME_INNER}
          emissiveIntensity={1.8}
          transparent
          opacity={0.9}
        />
      </mesh>
      {/* Inner flame core */}
      <mesh ref={flameInn} position={[0, 0.4, 0]}>
        <coneGeometry args={[0.1, 0.35, 5]} />
        <meshStandardMaterial
          color={FLAME_CORE}
          emissive={FLAME_CORE}
          emissiveIntensity={2.0}
          transparent
          opacity={0.95}
        />
      </mesh>
      {/* Warm point light from fire */}
      <pointLight ref={lightRef} position={[0, 0.4, 0]} color="#FFA040" intensity={1.6} distance={4.5} decay={2} />
      {/* Ember sparkles rising */}
      <Sparkles
        count={14}
        scale={[0.4, 1.4, 0.4]}
        position={[0, 0.7, 0]}
        size={3}
        speed={0.8}
        color="#FFCE6A"
        opacity={0.85}
      />
    </group>
  )
}
