// Subtle floating "click me" indicators over each zone — only visible
// for ~12 seconds after page load, then fade out. Pulse animation.

import * as THREE from 'three'
import { useRef, useState, useEffect } from 'react'
import { useFrame } from '@react-three/fiber'
import { Billboard } from '@react-three/drei'
import { ZONES } from './zones'
import { on } from './events'

const HINT_COLOR = '#FFD9A8'

// LocalStorage key so returning visitors don't see the hints again
const SEEN_KEY = 'world-hints-seen-v1'

export default function ZoneHints() {
  const [show, setShow] = useState(() => {
    if (typeof window === 'undefined') return false
    try { return localStorage.getItem(SEEN_KEY) !== '1' } catch { return true }
  })

  useEffect(() => {
    if (!show) return
    const id = setTimeout(() => {
      setShow(false)
      try { localStorage.setItem(SEEN_KEY, '1') } catch {}
    }, 12000)
    // Also hide once any zone is clicked
    const unsub = on('world-zone-click', () => {
      setShow(false)
      try { localStorage.setItem(SEEN_KEY, '1') } catch {}
    })
    return () => { clearTimeout(id); unsub() }
  }, [show])

  return (
    <group>
      {ZONES.map((z) => (
        <PulsingHint key={z.kind} pos={[z.pos[0], 3.0, z.pos[1]]} visible={show} />
      ))}
    </group>
  )
}

function PulsingHint({ pos, visible }: { pos: [number, number, number]; visible: boolean }) {
  const meshRef = useRef<THREE.Mesh>(null)
  const ringRef = useRef<THREE.Mesh>(null)
  useFrame((s) => {
    const t = s.clock.elapsedTime
    if (meshRef.current) {
      const bob = Math.sin(t * 2) * 0.15
      meshRef.current.position.y = bob
    }
    if (ringRef.current) {
      const scale = 1 + Math.sin(t * 2.5) * 0.18
      ringRef.current.scale.setScalar(scale)
      const mat = ringRef.current.material as THREE.MeshBasicMaterial
      mat.opacity = (0.6 - Math.abs(Math.sin(t * 2.5)) * 0.3) * (visible ? 1 : 0)
    }
  })
  if (!visible) return null
  return (
    <Billboard position={pos} follow lockY>
      {/* Small downward arrow */}
      <mesh ref={meshRef} position={[0, 0, 0]}>
        <coneGeometry args={[0.18, 0.36, 4]} />
        <meshBasicMaterial color={HINT_COLOR} transparent opacity={0.85} />
      </mesh>
      {/* Pulsing ring around it */}
      <mesh ref={ringRef} position={[0, -0.1, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.25, 0.32, 24]} />
        <meshBasicMaterial color={HINT_COLOR} transparent opacity={0.6} side={THREE.DoubleSide} />
      </mesh>
    </Billboard>
  )
}
