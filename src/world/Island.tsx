// Floating island — DAYTIME, ~4× the size of v1.
//
// Bright grass top with subtle color variation (light/dark patches),
// terrain bump displacement, varied stone cliff layers, chunky rocky
// underside. Designed to read as a Captain-Toad-style brightly-lit
// floating island under afternoon sun.

import * as THREE from 'three'
import { useMemo } from 'react'
import { ISLAND_RIM, TERRAIN_BUMPS } from './zones'

const GRASS_LIGHT = '#9EC785'  // brighter daytime grass
const GRASS_MID   = '#7FB36A'
const GRASS_DARK  = '#6AA055'
const SOIL_COLOR  = '#8A5F40'
const STONE_TOP   = '#A89A82'
const STONE_MID   = '#8E7E66'
const STONE_DEEP  = '#5E4E3E'
const STONE_TIP   = '#3A3024'
const MOSS_GREEN  = '#6A9252'

export default function Island() {
  // Build organic rim Shape from polar control points
  const shape = useMemo(() => {
    const s = new THREE.Shape()
    ISLAND_RIM.forEach(([angle, r], i) => {
      const x = Math.cos(angle) * r
      const z = Math.sin(angle) * r
      if (i === 0) s.moveTo(x, z)
      else s.lineTo(x, z)
    })
    s.closePath()
    return s
  }, [])

  // Grass top — extruded with terrain displacement
  const grassGeo = useMemo(() => {
    const g = new THREE.ExtrudeGeometry(shape, {
      depth: 0.6,
      bevelEnabled: true,
      bevelSize: 0.2,
      bevelThickness: 0.15,
      bevelSegments: 3,
      curveSegments: 16,
    })
    g.rotateX(-Math.PI / 2)
    const pos = g.attributes.position
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i), z = pos.getZ(i), y = pos.getY(i)
      if (y < 0.4) continue
      let lift = 0
      for (const [bx, bz, br, bh] of TERRAIN_BUMPS) {
        const d = Math.hypot(x - bx, z - bz)
        if (d < br) {
          const t = 1 - d / br
          lift += bh * (t * t * (3 - 2 * t))
        }
      }
      pos.setY(i, y + lift)
    }
    pos.needsUpdate = true
    g.computeVertexNormals()
    return g
  }, [shape])

  const soilGeo = useMemo(() => {
    const g = new THREE.ExtrudeGeometry(shape, {
      depth: 1.6,
      bevelEnabled: false,
      curveSegments: 16,
    })
    g.rotateX(-Math.PI / 2)
    return g
  }, [shape])

  // Random-ish scatter of grass color patches across the surface
  const grassPatches = useMemo(() => {
    const arr: Array<[number, number, number, string]> = []
    for (let i = 0; i < 40; i++) {
      const angle = i * 137.5 * Math.PI / 180 // golden angle
      const r = Math.sqrt(i / 40) * 16
      const x = Math.cos(angle) * r
      const z = Math.sin(angle) * r
      const size = 0.6 + ((i * 17) % 10) * 0.08
      const color = i % 3 === 0 ? GRASS_DARK : (i % 3 === 1 ? GRASS_MID : GRASS_LIGHT)
      arr.push([x, z, size, color])
    }
    return arr
  }, [])

  // Cliff stone chunks — irregular layered pieces
  return (
    <group>
      {/* Grass top */}
      <mesh geometry={grassGeo} position={[0, 0, 0]} receiveShadow castShadow>
        <meshStandardMaterial color={GRASS_LIGHT} roughness={0.95} flatShading />
      </mesh>

      {/* Grass color patches scattered for variation */}
      {grassPatches.map(([x, z, size, color], i) => (
        <mesh key={`gp${i}`} position={[x, 0.65, z]} receiveShadow>
          <cylinderGeometry args={[size, size, 0.04, 8]} />
          <meshStandardMaterial color={color} roughness={0.96} />
        </mesh>
      ))}

      {/* Soil rim — visible as a brown band at the cliff top */}
      <mesh geometry={soilGeo} position={[0, -1.0, 0]} castShadow>
        <meshStandardMaterial color={SOIL_COLOR} roughness={0.97} />
      </mesh>

      {/* Top stone band */}
      <mesh position={[0, -2.4, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[20.5, 18.0, 2.0, 36, 1]} />
        <meshStandardMaterial color={STONE_TOP} roughness={0.96} flatShading />
      </mesh>

      {/* Mid stone band */}
      <mesh position={[0.4, -4.4, -0.4]} castShadow>
        <cylinderGeometry args={[17.0, 13.0, 2.4, 30, 1]} />
        <meshStandardMaterial color={STONE_MID} roughness={0.97} flatShading />
      </mesh>

      {/* Lower stone band */}
      <mesh position={[-0.3, -6.8, 0.5]} castShadow>
        <cylinderGeometry args={[12.5, 8.0, 2.6, 24, 1]} />
        <meshStandardMaterial color={STONE_DEEP} roughness={0.97} flatShading />
      </mesh>

      {/* Bottom taper cone */}
      <mesh position={[0, -10.0, 0]} castShadow>
        <coneGeometry args={[7.5, 4.0, 18, 1, true]} />
        <meshStandardMaterial color={STONE_DEEP} roughness={0.97} side={THREE.DoubleSide} flatShading />
      </mesh>

      {/* Chunky bottom mass — irregular pebble cluster */}
      <mesh position={[0, -13.0, 0]} castShadow>
        <dodecahedronGeometry args={[2.0, 0]} />
        <meshStandardMaterial color={STONE_TIP} roughness={0.96} flatShading />
      </mesh>
      <mesh position={[1.6, -13.6, 1.0]} castShadow>
        <dodecahedronGeometry args={[1.2, 0]} />
        <meshStandardMaterial color={STONE_TIP} roughness={0.96} flatShading />
      </mesh>
      <mesh position={[-1.2, -13.2, -0.8]} castShadow>
        <dodecahedronGeometry args={[1.0, 0]} />
        <meshStandardMaterial color={STONE_TIP} roughness={0.96} flatShading />
      </mesh>
      <mesh position={[0.4, -14.5, -0.6]} castShadow>
        <dodecahedronGeometry args={[0.9, 0]} />
        <meshStandardMaterial color={STONE_TIP} roughness={0.96} flatShading />
      </mesh>

      {/* Moss tufts clinging to cliffside */}
      {[
        [8.0, -3.0, -6.0, 0.8],
        [-7.0, -3.5, 4.0, 0.7],
        [3.0, -5.0, 8.5, 0.6],
        [-10.0, -5.5, -2.5, 0.9],
        [7.0, -6.0, 4.5, 0.7],
        [-3.0, -7.0, -7.0, 0.6],
        [-5.5, -4.0, 7.5, 0.55],
        [6.0, -7.5, -3.0, 0.6],
        [11.0, -3.5, 1.0, 0.5],
        [-12.0, -4.0, 0.5, 0.55],
      ].map(([x, y, z, r], i) => (
        <mesh key={`m${i}`} position={[x, y, z]} castShadow>
          <sphereGeometry args={[r, 10, 8]} />
          <meshStandardMaterial color={MOSS_GREEN} roughness={0.96} />
        </mesh>
      ))}

      {/* Hanging vines — small drooping cylinders off cliff */}
      {[
        [6.0, -1.0, -7.5],
        [-8.0, -1.0, 3.0],
        [3.0, -1.0, 9.5],
        [-4.0, -1.0, -8.0],
      ].map(([x, y, z], i) => (
        <mesh key={`v${i}`} position={[x, y - 1.5, z]} castShadow>
          <cylinderGeometry args={[0.05, 0.05, 3.0, 6]} />
          <meshStandardMaterial color={MOSS_GREEN} roughness={0.95} />
        </mesh>
      ))}

      {/* A small flat ledge mid-cliff with a tiny tree — Captain Toad easter-egg style */}
      <group position={[14.0, -2.5, 2.0]}>
        <mesh position={[0, 0, 0]} castShadow receiveShadow>
          <cylinderGeometry args={[1.2, 1.5, 0.4, 10]} />
          <meshStandardMaterial color={GRASS_MID} roughness={0.96} flatShading />
        </mesh>
        <mesh position={[0, 0.7, 0]} castShadow>
          <cylinderGeometry args={[0.08, 0.12, 0.8, 6]} />
          <meshStandardMaterial color="#4A361F" roughness={0.95} />
        </mesh>
        <mesh position={[0, 1.5, 0]} castShadow>
          <coneGeometry args={[0.5, 0.7, 8]} />
          <meshStandardMaterial color={MOSS_GREEN} roughness={0.94} flatShading />
        </mesh>
      </group>
    </group>
  )
}
