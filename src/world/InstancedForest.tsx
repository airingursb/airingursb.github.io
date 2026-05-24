// Phase-2 perf — convert 45 trees from ~270 individual mesh draws to
// ~30 InstancedMesh draws (5 species × ~6 parts each).
//
// Trade-offs vs prior Forest tree rendering:
//   - Per-tree organicBlob seed variation lost: all oak trees share the
//     same blob shape. Reads fine at scene scale.
//   - Per-tree WindSway lost. Forest is now static. The canopy still
//     reads as alive via overall ambient FX (pollen / falling leaves).
//     If we want wind back later, do it via a per-instance shader, not
//     per-tree React groups.
//
// Inner vs outer instance split: trees inside PERIMETER_DIST cast
// shadows (visible on ground near cabin); trees outside do not.

import * as THREE from 'three'
import { useEffect, useMemo, useRef } from 'react'
import { TREE_POSITIONS } from './zones'

const PERIMETER_DIST = 14

// === Colors (copy of Forest.tsx constants) ===
const PINE_TRUNK    = '#5A4128'
const PINE_FOL_A    = '#5A7A4C'
const PINE_FOL_B    = '#4A6B40'
const PINE_FOL_C    = '#3A5634'

const BIRCH_TRUNK   = '#E8E0D0'
const BIRCH_BANDS   = '#2A2018'
const BIRCH_FOL     = '#8FB372'

const OAK_TRUNK     = '#6D4B2E'
const OAK_FOL_A     = '#7E9A52'
const OAK_FOL_B     = '#6A8848'

const MAPLE_TRUNK   = '#6D4B2E'
const MAPLE_A       = '#D9622B'
const MAPLE_B       = '#E29A4A'
const MAPLE_C       = '#C0451E'

const CHERRY_TRUNK  = '#5C3A22'
const CHERRY_A      = '#E8D2DC'
const CHERRY_B      = '#E89AB8'
const CHERRY_C      = '#FFE2EE'

// === Helpers to build pre-translated geometries (shared across instances) ===

function organicBlob(radius: number, jitterAmt: number, seed: number) {
  const g = new THREE.IcosahedronGeometry(radius, 1)
  const pos = g.attributes.position
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i)
    const n = Math.sin(x * 12.9 + seed) * Math.cos(z * 17.3 + seed * 1.7)
    pos.setX(i, x + n * jitterAmt * 0.5)
    pos.setY(i, y + Math.sin(y * 9.1 + seed) * jitterAmt)
    pos.setZ(i, z + Math.cos(x * 7.7 + seed * 2.3) * jitterAmt * 0.5)
  }
  pos.needsUpdate = true
  g.computeVertexNormals()
  return g
}

function bakedCylinder(rt: number, rb: number, h: number, segs: number, y: number) {
  const g = new THREE.CylinderGeometry(rt, rb, h, segs)
  g.translate(0, y, 0)
  return g
}
function bakedCone(r: number, h: number, segs: number, y: number) {
  const g = new THREE.ConeGeometry(r, h, segs)
  g.translate(0, y, 0)
  return g
}
function bakedBlob(
  r: number,
  jitter: number,
  seed: number,
  pos: [number, number, number],
  scaleY = 1,
) {
  const g = organicBlob(r, jitter, seed)
  if (scaleY !== 1) g.scale(1, scaleY, 1)
  g.translate(pos[0], pos[1], pos[2])
  return g
}
function bakedTorus(r: number, tube: number, y: number) {
  const g = new THREE.TorusGeometry(r, tube, 6, 12)
  g.translate(0, y, 0)
  return g
}

interface PartDef {
  geometry: THREE.BufferGeometry
  color: string
  flatShading?: boolean
  roughness?: number
}

// === Species recipes (shared geometries, one set per species) ===

const PINE_PARTS: PartDef[] = [
  { geometry: bakedCylinder(0.18, 0.26, 2.0, 8, 1.0), color: PINE_TRUNK, flatShading: true, roughness: 0.95 },
  { geometry: bakedCone(1.2, 1.1, 9, 2.2),  color: PINE_FOL_A, flatShading: true, roughness: 0.94 },
  { geometry: bakedCone(1.0, 0.9, 9, 2.6),  color: PINE_FOL_B, flatShading: true, roughness: 0.94 },
  { geometry: bakedCone(0.85, 0.75, 9, 2.95), color: PINE_FOL_A, flatShading: true, roughness: 0.94 },
  { geometry: bakedCone(0.65, 0.6, 9, 3.3),  color: PINE_FOL_C, flatShading: true, roughness: 0.94 },
  { geometry: bakedCone(0.42, 0.45, 9, 3.65), color: PINE_FOL_B, flatShading: true, roughness: 0.94 },
]

const BIRCH_PARTS: PartDef[] = [
  { geometry: bakedCylinder(0.14, 0.16, 2.8, 10, 1.4), color: BIRCH_TRUNK, flatShading: true, roughness: 0.85 },
  { geometry: bakedTorus(0.16, 0.025, 0.4), color: BIRCH_BANDS, roughness: 0.9 },
  { geometry: bakedTorus(0.16, 0.025, 1.0), color: BIRCH_BANDS, roughness: 0.9 },
  { geometry: bakedTorus(0.16, 0.025, 1.5), color: BIRCH_BANDS, roughness: 0.9 },
  { geometry: bakedTorus(0.16, 0.025, 2.1), color: BIRCH_BANDS, roughness: 0.9 },
  { geometry: bakedTorus(0.16, 0.025, 2.5), color: BIRCH_BANDS, roughness: 0.9 },
  { geometry: bakedBlob(1.1, 0.22, 11, [0, 3.2, 0], 0.95), color: BIRCH_FOL, flatShading: true, roughness: 0.95 },
  { geometry: bakedBlob(0.65, 0.18, 12, [0.3, 3.6, 0.1]),   color: BIRCH_FOL, flatShading: true, roughness: 0.95 },
  { geometry: bakedBlob(0.55, 0.18, 13, [-0.4, 3.5, -0.2]), color: BIRCH_FOL, flatShading: true, roughness: 0.95 },
]

const OAK_PARTS: PartDef[] = [
  { geometry: bakedCylinder(0.28, 0.42, 2.2, 10, 1.1), color: OAK_TRUNK, flatShading: true, roughness: 0.95 },
  { geometry: bakedBlob(1.4, 0.28, 21, [0, 3.0, 0], 0.85), color: OAK_FOL_A, flatShading: true, roughness: 0.94 },
  { geometry: bakedBlob(0.9, 0.22, 22, [0.7, 3.3, 0.4]),    color: OAK_FOL_B, flatShading: true, roughness: 0.94 },
  { geometry: bakedBlob(0.85, 0.22, 23, [-0.8, 3.2, -0.3]), color: OAK_FOL_A, flatShading: true, roughness: 0.94 },
  { geometry: bakedBlob(0.7, 0.18, 24, [0.1, 3.7, -0.5]),   color: OAK_FOL_B, flatShading: true, roughness: 0.94 },
]

const MAPLE_PARTS: PartDef[] = [
  { geometry: bakedCylinder(0.26, 0.38, 2.2, 10, 1.1), color: MAPLE_TRUNK, flatShading: true, roughness: 0.95 },
  { geometry: bakedBlob(1.5, 0.28, 31, [0, 3.0, 0], 0.9), color: MAPLE_A, flatShading: true, roughness: 0.93 },
  { geometry: bakedBlob(0.95, 0.22, 32, [0.6, 3.3, 0.5]),  color: MAPLE_B, flatShading: true, roughness: 0.93 },
  { geometry: bakedBlob(0.9, 0.22, 33, [-0.7, 3.2, -0.4]), color: MAPLE_C, flatShading: true, roughness: 0.93 },
  { geometry: bakedBlob(0.75, 0.2, 34, [0.2, 3.8, -0.4]),  color: MAPLE_A, flatShading: true, roughness: 0.93 },
]

const CHERRY_PARTS: PartDef[] = [
  { geometry: bakedCylinder(0.22, 0.32, 2.0, 10, 1.0), color: CHERRY_TRUNK, flatShading: true, roughness: 0.95 },
  { geometry: bakedBlob(1.4, 0.25, 41, [0, 2.8, 0], 0.85), color: CHERRY_A, flatShading: true, roughness: 0.92 },
  { geometry: bakedBlob(0.95, 0.2, 42, [0.5, 3.2, 0.4]),    color: CHERRY_B, flatShading: true, roughness: 0.92 },
  { geometry: bakedBlob(0.85, 0.2, 43, [-0.5, 3.1, -0.3]),  color: CHERRY_C, flatShading: true, roughness: 0.92 },
  { geometry: bakedBlob(0.7, 0.18, 44, [0.1, 3.6, -0.4]),   color: CHERRY_A, flatShading: true, roughness: 0.92 },
]

const SPECIES_PARTS: Record<'pine' | 'birch' | 'oak' | 'maple' | 'cherry', PartDef[]> = {
  pine: PINE_PARTS,
  birch: BIRCH_PARTS,
  oak: OAK_PARTS,
  maple: MAPLE_PARTS,
  cherry: CHERRY_PARTS,
}

// === Per-instance matrix (position + scale, no rotation needed since
//     trees are radially symmetric around Y) ===

interface TreeInstance {
  x: number
  z: number
  scale: number
  yStretch: number
}

function buildInstances(
  positions: Array<[number, number, number, string]>,
): TreeInstance[] {
  return positions.map(([x, z, scale], i) => ({
    x,
    z,
    scale,
    yStretch: 0.75 + ((i * 31) % 11) * 0.08,
  }))
}

function InstancedPart({
  part,
  instances,
  castShadow,
}: {
  part: PartDef
  instances: TreeInstance[]
  castShadow: boolean
}) {
  const ref = useRef<THREE.InstancedMesh>(null)

  useEffect(() => {
    if (!ref.current) return
    const m = new THREE.Matrix4()
    const q = new THREE.Quaternion()
    instances.forEach((inst, i) => {
      m.compose(
        new THREE.Vector3(inst.x, 0, inst.z),
        q,
        new THREE.Vector3(inst.scale, inst.scale * inst.yStretch, inst.scale),
      )
      ref.current!.setMatrixAt(i, m)
    })
    ref.current.instanceMatrix.needsUpdate = true
    ref.current.computeBoundingSphere()
  }, [instances])

  return (
    <instancedMesh
      ref={ref}
      args={[part.geometry, undefined as any, instances.length]}
      castShadow={castShadow}
      receiveShadow
    >
      <meshStandardMaterial
        color={part.color}
        roughness={part.roughness ?? 0.9}
        flatShading={part.flatShading ?? false}
      />
    </instancedMesh>
  )
}

function InstancedSpecies({
  species,
  positions,
  castShadow,
}: {
  species: 'pine' | 'birch' | 'oak' | 'maple' | 'cherry'
  positions: Array<[number, number, number, string]>
  castShadow: boolean
}) {
  const instances = useMemo(() => buildInstances(positions), [positions])
  if (instances.length === 0) return null
  const parts = SPECIES_PARTS[species]
  return (
    <>
      {parts.map((part, i) => (
        <InstancedPart
          key={`${species}-${castShadow ? 'in' : 'out'}-${i}`}
          part={part}
          instances={instances}
          castShadow={castShadow}
        />
      ))}
    </>
  )
}

const SPECIES_LIST: Array<'pine' | 'birch' | 'oak' | 'maple' | 'cherry'> = ['pine', 'birch', 'oak', 'maple', 'cherry']

export default function InstancedForest() {
  const groups = useMemo(() => {
    const out: Record<string, Array<[number, number, number, string]>> = {}
    for (const species of SPECIES_LIST) {
      out[`${species}_inner`] = []
      out[`${species}_outer`] = []
    }
    TREE_POSITIONS.forEach((entry) => {
      const [x, z, , species] = entry
      const dist = Math.hypot(x, z)
      const bucket = dist <= PERIMETER_DIST ? 'inner' : 'outer'
      out[`${species}_${bucket}`].push(entry as [number, number, number, string])
    })
    return out
  }, [])

  return (
    <group>
      {SPECIES_LIST.map((species) => (
        <InstancedSpecies
          key={`${species}-in`}
          species={species}
          positions={groups[`${species}_inner`]}
          castShadow={true}
        />
      ))}
      {SPECIES_LIST.map((species) => (
        <InstancedSpecies
          key={`${species}-out`}
          species={species}
          positions={groups[`${species}_outer`]}
          castShadow={false}
        />
      ))}
    </group>
  )
}
