// Winding dirt path connecting all 5 zones. Stones now sunk into the
// dirt with darker dirt shadow rings underneath — per Sub-A #10.

import * as THREE from 'three'
import { useMemo } from 'react'
import { PATH_POINTS } from './zones'

const PATH_DIRT = '#9E7B55'
const PATH_DARK = '#7E5F3F'
const PATH_RING = '#5E4530'
const STEPSTONE_LIGHT = '#B5A990'
const STEPSTONE_MID   = '#A89A82'
const STEPSTONE_DARK  = '#8E8067'

export default function ForestPath() {
  const dirtTube = useMemo(() => {
    const points = PATH_POINTS.map(([x, z]) => new THREE.Vector3(x, 0.03, z))
    const curve = new THREE.CatmullRomCurve3(points, false, 'catmullrom', 0.4)
    return new THREE.TubeGeometry(curve, 200, 0.45, 8, false)
  }, [])

  const stones = useMemo(() => {
    const points = PATH_POINTS.map(([x, z]) => new THREE.Vector3(x, 0.06, z))
    const curve = new THREE.CatmullRomCurve3(points, false, 'catmullrom', 0.4)
    const samples: Array<{ x: number; z: number; r: number; tone: number }> = []
    const N = 80
    for (let i = 0; i < N; i++) {
      const t = i / N
      const pt = curve.getPoint(t)
      const seed = Math.sin(i * 12.9898) * 43758.5453
      const offX = (seed - Math.floor(seed)) * 0.3 - 0.15
      const offZ = (Math.sin(seed) * 0.5)
      samples.push({
        x: pt.x + offX,
        z: pt.z + offZ * 0.4,
        r: 0.14 + (Math.abs(seed) % 0.08),
        tone: Math.floor(Math.abs(seed * 1000) % 3),
      })
    }
    return samples
  }, [])

  return (
    <group>
      {/* Dirt base */}
      <mesh geometry={dirtTube} receiveShadow>
        <meshStandardMaterial color={PATH_DIRT} roughness={0.97} flatShading />
      </mesh>

      {/* Darker dirt patches scattered along */}
      {Array.from({ length: 24 }).map((_, i) => {
        const t = i / 24
        const angle = i * 137.5 * Math.PI / 180
        return (
          <mesh
            key={`p${i}`}
            position={[Math.cos(angle * 3.7) * (5 + t * 5), 0.04, Math.sin(angle * 2.3) * (4 + t * 4)]}
          >
            <cylinderGeometry args={[0.22 + (i % 3) * 0.06, 0.22, 0.005, 8]} />
            <meshStandardMaterial color={PATH_DARK} roughness={0.96} transparent opacity={0.45} />
          </mesh>
        )
      })}

      {/* Stones — half-sunk into dirt with shadow rings */}
      {stones.map((s, i) => (
        <group key={`st${i}`} position={[s.x, 0, s.z]}>
          {/* Dirt shadow ring under each stone */}
          <mesh position={[0, 0.005, 0]}>
            <cylinderGeometry args={[s.r + 0.06, s.r + 0.06, 0.005, 12]} />
            <meshStandardMaterial color={PATH_RING} roughness={0.97} transparent opacity={0.7} />
          </mesh>
          {/* Half-buried stone */}
          <mesh position={[0, s.r * 0.5, 0]} castShadow receiveShadow>
            <dodecahedronGeometry args={[s.r, 0]} />
            <meshStandardMaterial
              color={s.tone === 0 ? STEPSTONE_LIGHT : s.tone === 1 ? STEPSTONE_MID : STEPSTONE_DARK}
              roughness={0.96}
              flatShading
            />
          </mesh>
        </group>
      ))}
    </group>
  )
}
