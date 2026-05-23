// Drifting cloud shadow patches on the island ground. Subtle dark
// circular patches that slowly translate across the surface — sells
// the "outdoor world" feel without needing a real cloud shadow
// projection (which is expensive).

import * as THREE from 'three'
import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'

const SHADOW_COLOR = '#1A1410'

function ShadowPatch({ phase, radius, drift }: { phase: number; radius: number; drift: number }) {
  const ref = useRef<THREE.Mesh>(null)
  useFrame((s) => {
    if (!ref.current) return
    const t = s.clock.elapsedTime * drift + phase
    ref.current.position.x = Math.cos(t * 0.1) * 18 + Math.sin(t * 0.05) * 6
    ref.current.position.z = Math.sin(t * 0.1) * 18 + Math.cos(t * 0.05) * 6
  })
  return (
    <mesh ref={ref} position={[0, 0.65, 0]} rotation={[-Math.PI / 2, 0, 0]}>
      <circleGeometry args={[radius, 24]} />
      <meshBasicMaterial color={SHADOW_COLOR} transparent opacity={0.12} />
    </mesh>
  )
}

export default function CloudShadows() {
  return (
    <group>
      <ShadowPatch phase={0}      radius={4.5} drift={0.6} />
      <ShadowPatch phase={2.5}    radius={3.5} drift={0.5} />
      <ShadowPatch phase={5.0}    radius={5.0} drift={0.7} />
      <ShadowPatch phase={Math.PI} radius={3.8} drift={0.55} />
    </group>
  )
}
