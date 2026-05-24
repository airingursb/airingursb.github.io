// Ground fog that hugs the pond + waterfall area at dusk.
// Hidden during day (opacity lerps to 0). At dusk it rolls in over
// ~1.5s, slowly rotating, adding depth layers to the NE quadrant
// and softening the seam between island and void.

import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

type Theme = 'day' | 'dusk'

const FOG_TINT = '#E6DCE4'   // pale lavender-cream, dusk-appropriate

// 6 stretched flat puffs scattered across pond + waterfall band.
// Each rotates at its own slow rate; together they read as drifting
// volumetric mist without the cost of real volumetrics.
// Sub-A fix: puff at (8.0, 6.0) was at pond center → alpha-sorted
// oddly against the transparent pond surface (y≈0.19). Pulled to
// y=0.55 so all puffs sit above the foam ring + lily pads.
const PUFFS: Array<{ x: number; z: number; y: number; r: number; rot: number; spin: number; opacity: number }> = [
  { x:  8.0, z:  6.0, y: 0.55, r: 2.8, rot: 0.0, spin:  0.040, opacity: 0.26 },
  { x: 10.5, z:  5.0, y: 0.40, r: 2.4, rot: 0.7, spin: -0.030, opacity: 0.24 },
  { x: 13.5, z:  4.5, y: 0.45, r: 3.0, rot: 1.4, spin:  0.025, opacity: 0.22 },
  { x: 15.0, z:  6.0, y: 0.35, r: 2.6, rot: 2.0, spin: -0.045, opacity: 0.26 },
  { x:  6.5, z:  7.5, y: 0.36, r: 2.2, rot: 0.4, spin:  0.035, opacity: 0.20 },
  { x: 11.0, z:  8.0, y: 0.32, r: 2.5, rot: 1.1, spin: -0.038, opacity: 0.22 },
]

function FogPuff({
  x, z, y, r, rot, spin, opacity, theme,
}: typeof PUFFS[number] & { theme: Theme }) {
  const meshRef = useRef<THREE.Mesh>(null)
  useFrame((s, dt) => {
    const m = meshRef.current
    if (!m) return
    // Opacity lerp toward theme target
    const target = theme === 'dusk' ? opacity : 0
    const mat = m.material as THREE.MeshBasicMaterial
    const k = 1 - Math.exp(-dt * 1.2)   // ~1.5s settle
    mat.opacity = mat.opacity + (target - mat.opacity) * k
    // V2 final polish: skip spin when fog is essentially invisible
    // (day-theme, faded out). Rotating an alpha-0 mesh is pure
    // wasted CPU. Each puff bails independently so they each settle
    // at their own pace before going idle.
    if (theme === 'day' && mat.opacity < 0.01) return
    // Slow Y-axis spin
    m.rotation.z += dt * spin
  })
  return (
    <mesh
      ref={meshRef}
      position={[x, y, z]}
      rotation={[-Math.PI / 2, 0, rot]}
    >
      {/* Soft disc — radial gradient via vertexColors would be ideal
          but a simple circle with low alpha + multi-puff overlap reads
          as cloud-like at the camera distances we care about. */}
      <circleGeometry args={[r, 24]} />
      <meshBasicMaterial
        color={FOG_TINT}
        transparent
        opacity={0}
        depthWrite={false}
      />
    </mesh>
  )
}

export default function DuskFog({ theme }: { theme: Theme }) {
  return (
    <group>
      {PUFFS.map((p, i) => (
        <FogPuff key={i} {...p} theme={theme} />
      ))}
    </group>
  )
}
