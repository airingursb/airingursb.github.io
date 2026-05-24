// V2 wave 3 micro-detail: 2 yellow eye dots in a distant tree at dusk.
// Hint at a watching owl without modeling a bird — pure suggestion.
// Day: invisible. Dusk: faint emissive blink every ~6s + ~1s lid close.
//
// Tucked far enough that it reads as "something out there" rather
// than as a literal animal. The blink is what sells it.

import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

type Theme = 'day' | 'dusk'

// Far back near the deer/north tree line — distant + creepy/curious
const POS: [number, number, number] = [-9, 7.8, -17]

export default function DistantOwl({ theme }: { theme?: Theme }) {
  const leftRef = useRef<THREE.MeshBasicMaterial>(null)
  const rightRef = useRef<THREE.MeshBasicMaterial>(null)

  useFrame((s, dt) => {
    const t = s.clock.elapsedTime
    const enabled = theme === 'dusk'
    // Base opacity target — fade in/out with theme
    const baseTarget = enabled ? 0.85 : 0
    // Blink: brief lid-close every ~6 seconds, 0.18s closed
    const cyclePhase = t % 6
    const blinking = cyclePhase < 0.18
    const blinkMul = blinking ? 0.05 : 1
    const target = baseTarget * blinkMul
    const k = 1 - Math.exp(-dt * (blinking ? 25 : 1.6))
    if (leftRef.current) {
      leftRef.current.opacity = leftRef.current.opacity + (target - leftRef.current.opacity) * k
    }
    if (rightRef.current) {
      rightRef.current.opacity = rightRef.current.opacity + (target - rightRef.current.opacity) * k
    }
  })

  return (
    <group position={POS}>
      <mesh position={[-0.10, 0, 0]}>
        <sphereGeometry args={[0.05, 6, 5]} />
        <meshBasicMaterial
          ref={leftRef}
          color="#FFD060"
          transparent
          opacity={0}
          depthWrite={false}
        />
      </mesh>
      <mesh position={[ 0.10, 0, 0]}>
        <sphereGeometry args={[0.05, 6, 5]} />
        <meshBasicMaterial
          ref={rightRef}
          color="#FFD060"
          transparent
          opacity={0}
          depthWrite={false}
        />
      </mesh>
    </group>
  )
}
