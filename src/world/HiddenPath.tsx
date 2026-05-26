// B3 (direction): a hidden stone path through the forest, only visible
// at dusk/night via faint emissive glow. Leads from the main path's
// south-west bend to a tiny lookout point at the island edge.
//
// Discoverable only by orbiting + looking — no zone hitbox, no panel.
// Pure environmental storytelling: "there's a place to sit and watch."

import * as THREE from 'three'
import { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import { useTimeOfDay } from './time-of-day'

// 8 stepping stones from main path edge (-3, -3.5) curving NW to
// a tiny lookout at (-10, -8). Each stone is a flat lozenge.
const STONES: Array<[number, number]> = [
  [-3.2, -3.6],
  [-4.0, -4.2],
  [-5.0, -4.8],
  [-6.2, -5.4],
  [-7.4, -6.0],
  [-8.4, -6.7],
  [-9.2, -7.4],
  [-10.0, -8.0],
]

const STONE_COLOR = '#5C5448'
const GLOW_COLOR = '#FFE0A8'

export default function HiddenPath() {
  const matRefs = useRef<Array<THREE.MeshStandardMaterial | null>>([])
  const tod = useTimeOfDay()
  // Glow intensity: 0 day, 0.3 dawn-fading-out, 0.6 dusk-fading-in, 1.0 night
  let baseGlow = 0
  if (tod.phase === 'night') baseGlow = 1
  else if (tod.phase === 'dusk') baseGlow = 0.3 + 0.5 * tod.blend
  else if (tod.phase === 'dawn') baseGlow = 0.3 * (1 - tod.blend)

  useFrame((s) => {
    if (baseGlow < 0.05) return
    const t = s.clock.elapsedTime
    // Stones pulse one-after-another like a slow trail invitation
    matRefs.current.forEach((mat, i) => {
      if (!mat) return
      const phase = (t * 0.6 + i * 0.18) % 2.5
      const wave = phase < 1.2 ? Math.sin((phase / 1.2) * Math.PI) : 0
      mat.emissiveIntensity = baseGlow * (0.5 + wave * 0.7)
    })
  })

  return (
    <group>
      {STONES.map(([x, z], i) => (
        <mesh key={i} position={[x, 0.05, z]} rotation={[-Math.PI / 2, 0, i * 0.4]}>
          <cylinderGeometry args={[0.32, 0.36, 0.06, 6]} />
          <meshStandardMaterial
            ref={(el) => { if (el) matRefs.current[i] = el }}
            color={STONE_COLOR}
            emissive={GLOW_COLOR}
            emissiveIntensity={0}
            roughness={0.95}
            flatShading
          />
        </mesh>
      ))}
      {/* Lookout marker — a small flat stone bench / "sitting spot"
          at the end of the trail. Subtle but rewards finding the path. */}
      <group position={[-10.0, 0, -8.0]}>
        {/* Bench seat — low flat stone */}
        <mesh position={[0, 0.18, 0]} castShadow>
          <boxGeometry args={[0.9, 0.18, 0.36]} />
          <meshStandardMaterial color="#4D4438" roughness={0.95} flatShading />
        </mesh>
        {/* Small lantern post next to bench — glows at night too */}
        <mesh position={[0.6, 0.5, 0]} castShadow>
          <cylinderGeometry args={[0.04, 0.05, 0.8, 6]} />
          <meshStandardMaterial color="#3A2818" roughness={0.92} />
        </mesh>
        <mesh position={[0.6, 0.95, 0]}>
          <boxGeometry args={[0.12, 0.14, 0.12]} />
          <meshStandardMaterial
            color="#FFD58F"
            emissive="#FFD58F"
            emissiveIntensity={baseGlow * 1.6}
            roughness={0.7}
          />
        </mesh>
      </group>
    </group>
  )
}
