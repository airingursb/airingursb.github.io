// C3 — Cabin bell. Small brass bell hanging beside the cabin's red
// door. Click → bell jingles + 'cabin-bell-ring' event fires (MochiNPC
// hears it and waves). Subtle hover glow for discoverability.
//
// Lives at the cabin's east-side porch column. Cabin is at world
// (-2, 0, -1); bell sits at east side of front porch.

import { useRef, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import { Html } from '@react-three/drei'
import * as THREE from 'three'
import { emit } from './events'

// World position — east of cabin front door. Cabin chat zone at (-2,-1),
// CABIN_W=3.6 CABIN_D=3.0, door at world (-2, _, 0.5) — bell hangs from
// the east-side eaves overhang, just outside the front wall.
const POS: [number, number, number] = [-1.0, 2.0, 0.62]

export default function CabinBell() {
  const bellRef = useRef<THREE.Group>(null)
  const ringStartedRef = useRef<number>(0)
  const [hovered, setHovered] = useState(false)
  useFrame(() => {
    if (!bellRef.current) return
    const now = performance.now() / 1000
    const sinceRing = now - ringStartedRef.current
    if (sinceRing >= 0 && sinceRing < 1.6) {
      // Damped sine: peak amplitude ±0.45 rad, decay over 1.6s
      const amp = 0.45 * Math.pow(1 - sinceRing / 1.6, 2)
      bellRef.current.rotation.z = Math.sin(sinceRing * 12) * amp
    } else {
      // Idle micro-sway
      const t = now
      bellRef.current.rotation.z = Math.sin(t * 0.7) * 0.03
    }
  })
  return (
    <group
      position={POS}
      onClick={(e) => {
        e.stopPropagation()
        ringStartedRef.current = performance.now() / 1000
        emit('cabin-bell-ring', undefined)
      }}
      onPointerOver={(e) => { e.stopPropagation(); setHovered(true); document.body.style.cursor = 'pointer' }}
      onPointerOut={(e) => { e.stopPropagation(); setHovered(false); document.body.style.cursor = '' }}
    >
      {/* Iron support hook — small curved arm from cabin wall */}
      <mesh position={[0, 0.08, 0]} castShadow>
        <torusGeometry args={[0.08, 0.012, 4, 10, Math.PI]} />
        <meshStandardMaterial color="#3A2A20" metalness={0.6} roughness={0.45} />
      </mesh>
      {/* Bell body — hangs below pivot. Whole group rotates around z. */}
      <group ref={bellRef} position={[0, 0, 0]}>
        {/* Crown chain — short bar from hook to bell top */}
        <mesh position={[0, -0.05, 0]}>
          <cylinderGeometry args={[0.006, 0.006, 0.08, 4]} />
          <meshStandardMaterial color="#3A2A20" metalness={0.5} roughness={0.5} />
        </mesh>
        {/* Bell body — open hemisphere flared at bottom */}
        <mesh position={[0, -0.18, 0]} castShadow>
          <coneGeometry args={[0.10, 0.18, 12, 1, true]} />
          <meshStandardMaterial color="#C99850" metalness={0.7} roughness={0.35} side={THREE.DoubleSide} />
        </mesh>
        {/* Bell rim — slightly wider torus at the open bottom */}
        <mesh position={[0, -0.27, 0]} rotation={[Math.PI / 2, 0, 0]} castShadow>
          <torusGeometry args={[0.105, 0.012, 6, 16]} />
          <meshStandardMaterial color="#A07840" metalness={0.75} roughness={0.30} />
        </mesh>
        {/* Top cap */}
        <mesh position={[0, -0.10, 0]}>
          <sphereGeometry args={[0.035, 10, 8]} />
          <meshStandardMaterial color="#A07840" metalness={0.75} roughness={0.30} />
        </mesh>
        {/* Clapper — small dark sphere inside the bell */}
        <mesh position={[0, -0.22, 0]}>
          <sphereGeometry args={[0.012, 6, 5]} />
          <meshStandardMaterial color="#1A1612" roughness={0.6} />
        </mesh>
        {/* Hover ring */}
        {hovered && (
          <mesh position={[0, -0.18, 0]} rotation={[0, 0, 0]}>
            <torusGeometry args={[0.14, 0.005, 6, 18]} />
            <meshBasicMaterial color="#FFD08A" />
          </mesh>
        )}
      </group>
      {hovered && (
        <Html
          position={[0, 0.35, 0]}
          center
          distanceFactor={10}
          style={{ pointerEvents: 'none' }}
        >
          <div className="zone-hover-label">门铃 · 点击叫 Mochi</div>
        </Html>
      )}
    </group>
  )
}
