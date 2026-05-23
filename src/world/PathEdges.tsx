// Path edge decoration — small pebbles and grass tufts scattered along
// the perpendicular offset of the path. Removes the "decal on grass"
// feel where path meets meadow (Sub-A iter-3 gap #8).

import * as THREE from 'three'
import { useMemo } from 'react'
import { PATH_POINTS } from './zones'

const PEBBLE_LIGHT = '#A89C8A'
const PEBBLE_DARK  = '#7A6F60'
const GRASS_TUFT_A = '#7AA565'
const GRASS_TUFT_B = '#5A7A4C'

export default function PathEdges() {
  const items = useMemo(() => {
    const pts = PATH_POINTS.map(([x, z]) => new THREE.Vector3(x, 0, z))
    const curve = new THREE.CatmullRomCurve3(pts, false, 'catmullrom', 0.4)
    const out: Array<{ x: number; z: number; kind: 'pebble' | 'tuft'; offset: number; seed: number }> = []
    const N = 80
    for (let i = 0; i < N; i++) {
      const t = i / N
      const pt = curve.getPoint(t)
      const tangent = curve.getTangent(t)
      // Perpendicular vector (rotate tangent 90° in XZ)
      const perp = new THREE.Vector3(-tangent.z, 0, tangent.x).normalize()
      // Two items per sample — one on each side
      const seed = Math.abs(Math.sin(i * 12.9898) * 43758.5453)
      const seedB = Math.abs(Math.sin((i + 100) * 12.9898) * 43758.5453)
      // Left
      const lOff = 0.55 + (seed % 0.3)
      out.push({
        x: pt.x + perp.x * lOff,
        z: pt.z + perp.z * lOff,
        kind: seed % 2 < 1 ? 'pebble' : 'tuft',
        offset: lOff,
        seed: i,
      })
      // Right
      const rOff = -(0.55 + (seedB % 0.3))
      out.push({
        x: pt.x + perp.x * rOff,
        z: pt.z + perp.z * rOff,
        kind: seedB % 2 < 1 ? 'pebble' : 'tuft',
        offset: rOff,
        seed: i + 1000,
      })
    }
    return out
  }, [])

  // Tilted grass tuft — angled cone
  return (
    <group>
      {items.map((it, i) => {
        if (it.kind === 'pebble') {
          const r = 0.06 + ((it.seed * 17) % 6) * 0.012
          return (
            <mesh key={`pe${i}`} position={[it.x, r * 0.4, it.z]} castShadow receiveShadow>
              <dodecahedronGeometry args={[r, 0]} />
              <meshStandardMaterial color={it.seed % 2 ? PEBBLE_LIGHT : PEBBLE_DARK} roughness={0.96} flatShading />
            </mesh>
          )
        }
        // Tuft — 2-3 tilted blades
        return (
          <group key={`tu${i}`} position={[it.x, 0, it.z]}>
            {[0, 0.04, -0.04].map((dx, j) => (
              <mesh
                key={j}
                position={[dx, 0.08, dx * 0.5]}
                rotation={[Math.sin(it.seed + j) * 0.4, 0, Math.cos(it.seed + j) * 0.4]}
                castShadow
              >
                <coneGeometry args={[0.025, 0.16, 4]} />
                <meshStandardMaterial color={j % 2 ? GRASS_TUFT_A : GRASS_TUFT_B} flatShading />
              </mesh>
            ))}
          </group>
        )
      })}
    </group>
  )
}
