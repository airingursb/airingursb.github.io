// V2 wave 3 micro-detail: 2 yellow eye dots in a distant tree at dusk.
// Hint at a watching owl without modeling a bird — pure suggestion.
// Day: invisible. Dusk: faint emissive blink every ~6s + ~1s lid close.
//
// Tucked far enough that it reads as "something out there" rather
// than as a literal animal. The blink is what sells it.

import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { useTimeOfDay } from './time-of-day'

type Theme = 'day' | 'dusk'

// Far back near the deer/north tree line — distant + creepy/curious
const POS: [number, number, number] = [-9, 7.8, -17]

export default function DistantOwl({ theme: _theme }: { theme?: Theme } = {}) {
  const leftRef = useRef<THREE.MeshBasicMaterial>(null)
  const rightRef = useRef<THREE.MeshBasicMaterial>(null)
  const tod = useTimeOfDay()
  // F-deep: owls are nocturnal. Active at dusk AND night, brighter at
  // night (more presence when fully dark). Dusk lerps in via blend.
  const baseTarget =
    tod.phase === 'night' ? 1.0 :
    tod.phase === 'dusk'  ? 0.6 + 0.25 * tod.blend :
    tod.phase === 'dawn'  ? 0.85 * (1 - tod.blend) :
    0

  useFrame((s, dt) => {
    // Perf: when owl is invisible (day) AND opacity has settled to 0,
    // skip the blink+lerp math entirely. SunsetBirds pattern.
    if (baseTarget < 0.01 && (leftRef.current?.opacity ?? 0) < 0.01) return
    const t = s.clock.elapsedTime
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
