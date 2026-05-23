// Wind sway wrapper — applies subtle continuous rotation/oscillation to
// child geometry. Used on tree canopies, hammock, clothesline, chime,
// wreath — anything that should "live" in the breeze.

import * as THREE from 'three'
import { useRef, type ReactNode } from 'react'
import { useFrame } from '@react-three/fiber'

interface Props {
  children: ReactNode
  /** Max rotation amplitude in radians on each axis */
  amp?: number
  /** Frequency multiplier */
  freq?: number
  /** Phase offset so multiple instances aren't in sync */
  phase?: number
  /** Pivot height — sway pivots around this Y so trees swing from base */
  pivotY?: number
}

export default function WindSway({ children, amp = 0.02, freq = 1.0, phase = 0, pivotY = 0 }: Props) {
  const ref = useRef<THREE.Group>(null)
  useFrame((s) => {
    if (!ref.current) return
    const t = s.clock.elapsedTime * freq + phase
    ref.current.rotation.x = Math.sin(t) * amp
    ref.current.rotation.z = Math.cos(t * 1.3 + phase * 0.5) * amp * 0.7
    if (pivotY !== 0) {
      // Compensate translation so the sway pivots around base, not center
      ref.current.position.y = pivotY - Math.cos(Math.sin(t) * amp) * pivotY
    }
  })
  return <group ref={ref}>{children}</group>
}
