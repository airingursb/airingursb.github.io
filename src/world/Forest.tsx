// Forest — five tree species + six filler types. Canopies use icosahedron
// with per-vertex jitter for organic non-spherical silhouettes (Sub-A
// iter-3 gap #1).

import * as THREE from 'three'
import { useMemo } from 'react'
import { TREE_POSITIONS, FILLER_POSITIONS } from './zones'
import WindSway from './WindSway'

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
const CHERRY_A      = '#E8D2DC'  // muted from #F4C3D8 — stop competing with mailbox red
const CHERRY_B      = '#E89AB8'
const CHERRY_C      = '#FFE2EE'

const BUSH_A        = '#5A7A4C'
const BUSH_B        = '#4A6B40'
const FERN          = '#4F7340'
const MUSHROOM_STEM = '#E8DAB0'
const MUSHROOM_CAP  = '#C13E3E'
const DAISY_STEM    = '#4F7340'
const DAISY_PETAL   = '#FFFFFF'
const DAISY_CENTER  = '#FCD757'
const ROCK_LIGHT    = '#A89C8A'
const ROCK_DARK     = '#7A6F60'

/** Make an icosahedron with subtle per-vertex randomness for organic silhouette. */
function organicBlob(radius: number, jitterAmt = 0.18, seed = 0) {
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

function Pine({ scale = 1, seed = 0 }: { scale?: number; seed?: number }) {
  return (
    <group scale={scale}>
      <mesh position={[0, 1.0, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[0.18, 0.26, 2.0, 8]} />
        <meshStandardMaterial color={PINE_TRUNK} roughness={0.95} flatShading />
      </mesh>
      {[
        [2.2, 1.2, 1.1, PINE_FOL_A],
        [2.6, 1.0, 0.9, PINE_FOL_B],
        [2.95, 0.85, 0.75, PINE_FOL_A],
        [3.3, 0.65, 0.6, PINE_FOL_C],
        [3.65, 0.42, 0.45, PINE_FOL_B],
      ].map(([y, r, h, color], i) => (
        <mesh key={i} position={[0, y as number, 0]} rotation={[0, seed * 0.3, 0]} castShadow>
          <coneGeometry args={[r as number, h as number, 9]} />
          <meshStandardMaterial color={color as string} roughness={0.94} flatShading />
        </mesh>
      ))}
    </group>
  )
}

function Birch({ scale = 1, seed = 0 }: { scale?: number; seed?: number }) {
  const g1 = useMemo(() => organicBlob(1.1, 0.22, seed), [seed])
  const g2 = useMemo(() => organicBlob(0.65, 0.18, seed + 1), [seed])
  const g3 = useMemo(() => organicBlob(0.55, 0.18, seed + 2), [seed])
  return (
    <group scale={scale}>
      <mesh position={[0, 1.4, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[0.14, 0.16, 2.8, 10]} />
        <meshStandardMaterial color={BIRCH_TRUNK} roughness={0.85} flatShading />
      </mesh>
      {[0.4, 1.0, 1.5, 2.1, 2.5].map((y, i) => (
        <mesh key={`bd${i}`} position={[0, y, 0]} castShadow>
          <torusGeometry args={[0.16, 0.025, 6, 12]} />
          <meshStandardMaterial color={BIRCH_BANDS} roughness={0.9} />
        </mesh>
      ))}
      <mesh geometry={g1} position={[0, 3.2, 0]} scale={[1, 0.95, 1]} castShadow>
        <meshStandardMaterial color={BIRCH_FOL} roughness={0.95} flatShading />
      </mesh>
      <mesh geometry={g2} position={[0.3, 3.6, 0.1]} castShadow>
        <meshStandardMaterial color={BIRCH_FOL} roughness={0.95} flatShading />
      </mesh>
      <mesh geometry={g3} position={[-0.4, 3.5, -0.2]} castShadow>
        <meshStandardMaterial color={BIRCH_FOL} roughness={0.95} flatShading />
      </mesh>
    </group>
  )
}

function Oak({ scale = 1, seed = 0 }: { scale?: number; seed?: number }) {
  const g1 = useMemo(() => organicBlob(1.4, 0.28, seed), [seed])
  const g2 = useMemo(() => organicBlob(0.9, 0.22, seed + 1), [seed])
  const g3 = useMemo(() => organicBlob(0.85, 0.22, seed + 2), [seed])
  const g4 = useMemo(() => organicBlob(0.7, 0.18, seed + 3), [seed])
  return (
    <group scale={scale}>
      <mesh position={[0, 1.1, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[0.28, 0.42, 2.2, 10]} />
        <meshStandardMaterial color={OAK_TRUNK} roughness={0.95} flatShading />
      </mesh>
      <mesh geometry={g1} position={[0, 3.0, 0]} scale={[1, 0.85, 1]} castShadow>
        <meshStandardMaterial color={OAK_FOL_A} roughness={0.94} flatShading />
      </mesh>
      <mesh geometry={g2} position={[0.7, 3.3, 0.4]} castShadow>
        <meshStandardMaterial color={OAK_FOL_B} roughness={0.94} flatShading />
      </mesh>
      <mesh geometry={g3} position={[-0.8, 3.2, -0.3]} castShadow>
        <meshStandardMaterial color={OAK_FOL_A} roughness={0.94} flatShading />
      </mesh>
      <mesh geometry={g4} position={[0.1, 3.7, -0.5]} castShadow>
        <meshStandardMaterial color={OAK_FOL_B} roughness={0.94} flatShading />
      </mesh>
    </group>
  )
}

function Maple({ scale = 1, seed = 0 }: { scale?: number; seed?: number }) {
  const g1 = useMemo(() => organicBlob(1.5, 0.28, seed), [seed])
  const g2 = useMemo(() => organicBlob(0.95, 0.22, seed + 1), [seed])
  const g3 = useMemo(() => organicBlob(0.9, 0.22, seed + 2), [seed])
  const g4 = useMemo(() => organicBlob(0.75, 0.2, seed + 3), [seed])
  return (
    <group scale={scale}>
      <mesh position={[0, 1.1, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[0.26, 0.38, 2.2, 10]} />
        <meshStandardMaterial color={MAPLE_TRUNK} roughness={0.95} flatShading />
      </mesh>
      <mesh geometry={g1} position={[0, 3.0, 0]} scale={[1, 0.9, 1]} castShadow>
        <meshStandardMaterial color={MAPLE_A} roughness={0.93} flatShading />
      </mesh>
      <mesh geometry={g2} position={[0.6, 3.3, 0.5]} castShadow>
        <meshStandardMaterial color={MAPLE_B} roughness={0.93} flatShading />
      </mesh>
      <mesh geometry={g3} position={[-0.7, 3.2, -0.4]} castShadow>
        <meshStandardMaterial color={MAPLE_C} roughness={0.93} flatShading />
      </mesh>
      <mesh geometry={g4} position={[0.2, 3.8, -0.4]} castShadow>
        <meshStandardMaterial color={MAPLE_A} roughness={0.93} flatShading />
      </mesh>
    </group>
  )
}

function Cherry({ scale = 1, seed = 0 }: { scale?: number; seed?: number }) {
  const g1 = useMemo(() => organicBlob(1.4, 0.25, seed), [seed])
  const g2 = useMemo(() => organicBlob(0.95, 0.2, seed + 1), [seed])
  const g3 = useMemo(() => organicBlob(0.85, 0.2, seed + 2), [seed])
  const g4 = useMemo(() => organicBlob(0.7, 0.18, seed + 3), [seed])
  return (
    <group scale={scale}>
      <mesh position={[0, 1.0, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[0.22, 0.32, 2.0, 10]} />
        <meshStandardMaterial color={CHERRY_TRUNK} roughness={0.95} flatShading />
      </mesh>
      <mesh geometry={g1} position={[0, 2.8, 0]} scale={[1, 0.85, 1]} castShadow>
        <meshStandardMaterial color={CHERRY_A} roughness={0.92} flatShading />
      </mesh>
      <mesh geometry={g2} position={[0.5, 3.2, 0.4]} castShadow>
        <meshStandardMaterial color={CHERRY_B} roughness={0.92} flatShading />
      </mesh>
      <mesh geometry={g3} position={[-0.5, 3.1, -0.3]} castShadow>
        <meshStandardMaterial color={CHERRY_C} roughness={0.92} flatShading />
      </mesh>
      <mesh geometry={g4} position={[0.1, 3.6, -0.4]} castShadow>
        <meshStandardMaterial color={CHERRY_A} roughness={0.92} flatShading />
      </mesh>
    </group>
  )
}

function Bush({ scale = 1, seed = 0 }: { scale?: number; seed?: number }) {
  const g1 = useMemo(() => organicBlob(0.38, 0.1, seed), [seed])
  const g2 = useMemo(() => organicBlob(0.28, 0.08, seed + 1), [seed])
  const g3 = useMemo(() => organicBlob(0.28, 0.08, seed + 2), [seed])
  const g4 = useMemo(() => organicBlob(0.22, 0.08, seed + 3), [seed])
  return (
    <group scale={scale}>
      <mesh geometry={g1} position={[0, 0.25, 0]} castShadow>
        <meshStandardMaterial color={BUSH_A} roughness={0.94} flatShading />
      </mesh>
      <mesh geometry={g2} position={[0.22, 0.22, 0.14]} castShadow>
        <meshStandardMaterial color={BUSH_B} roughness={0.94} flatShading />
      </mesh>
      <mesh geometry={g3} position={[-0.22, 0.22, 0.12]} castShadow>
        <meshStandardMaterial color={BUSH_B} roughness={0.94} flatShading />
      </mesh>
      <mesh geometry={g4} position={[0.05, 0.4, -0.18]} castShadow>
        <meshStandardMaterial color={BUSH_A} roughness={0.94} flatShading />
      </mesh>
      <mesh position={[0.15, 0.48, 0.22]}>
        <sphereGeometry args={[0.04, 6, 6]} />
        <meshStandardMaterial color="#C13E3E" roughness={0.7} />
      </mesh>
      <mesh position={[-0.12, 0.5, 0.12]}>
        <sphereGeometry args={[0.04, 6, 6]} />
        <meshStandardMaterial color="#C13E3E" roughness={0.7} />
      </mesh>
    </group>
  )
}

function Rocks({ scale = 1 }: { scale?: number }) {
  return (
    <group scale={scale}>
      <mesh position={[0, 0.2, 0]} castShadow receiveShadow>
        <dodecahedronGeometry args={[0.4, 0]} />
        <meshStandardMaterial color={ROCK_LIGHT} roughness={0.96} flatShading />
      </mesh>
      <mesh position={[0.38, 0.14, 0.12]} castShadow>
        <dodecahedronGeometry args={[0.26, 0]} />
        <meshStandardMaterial color={ROCK_DARK} roughness={0.96} flatShading />
      </mesh>
      <mesh position={[-0.32, 0.12, -0.06]} castShadow>
        <dodecahedronGeometry args={[0.22, 0]} />
        <meshStandardMaterial color={ROCK_LIGHT} roughness={0.96} flatShading />
      </mesh>
      <mesh position={[0, 0.48, 0]}>
        <sphereGeometry args={[0.22, 8, 6]} />
        <meshStandardMaterial color={PINE_FOL_A} roughness={0.96} />
      </mesh>
    </group>
  )
}

function Lavender({ scale = 1 }: { scale?: number }) {
  return (
    <group scale={scale}>
      {[
        [0, 0],
        [0.18, 0.06],
        [-0.18, 0.06],
        [0.1, -0.14],
        [-0.1, -0.14],
        [0.22, -0.05],
        [-0.22, -0.05],
        [0.04, 0.16],
      ].map(([dx, dz], i) => {
        const h = 0.55 + (i % 3) * 0.1
        return (
          <group key={i} position={[dx, 0, dz]}>
            <mesh position={[0, h / 2, 0]} castShadow>
              <cylinderGeometry args={[0.014, 0.014, h, 4]} />
              <meshStandardMaterial color="#4F7340" roughness={0.94} />
            </mesh>
            <mesh position={[0, h + 0.07, 0]} castShadow>
              <cylinderGeometry args={[0.025, 0.045, 0.14, 6]} />
              <meshStandardMaterial color="#8B6FB0" roughness={0.85} />
            </mesh>
          </group>
        )
      })}
      <mesh position={[0, 0.04, 0]}>
        <cylinderGeometry args={[0.2, 0.24, 0.05, 8]} />
        <meshStandardMaterial color={BUSH_B} roughness={0.94} flatShading />
      </mesh>
    </group>
  )
}

function Fern({ scale = 1 }: { scale?: number }) {
  return (
    <group scale={scale}>
      {Array.from({ length: 5 }).map((_, i) => {
        const a = (i / 5) * Math.PI * 2 + 0.3
        return (
          <group key={i} rotation={[0, a, 0]}>
            <mesh position={[0.18, 0.18, 0]} rotation={[0, 0, -0.7]} castShadow>
              <coneGeometry args={[0.18, 0.7, 4]} />
              <meshStandardMaterial color={FERN} roughness={0.94} flatShading />
            </mesh>
          </group>
        )
      })}
      <mesh position={[0, 0.04, 0]}>
        <sphereGeometry args={[0.1, 8, 6]} />
        <meshStandardMaterial color={FERN} roughness={0.95} />
      </mesh>
    </group>
  )
}

function Mushroom({ scale = 1 }: { scale?: number }) {
  return (
    <group scale={scale}>
      <mesh position={[0, 0.13, 0]} castShadow>
        <cylinderGeometry args={[0.07, 0.09, 0.26, 8]} />
        <meshStandardMaterial color={MUSHROOM_STEM} roughness={0.9} />
      </mesh>
      <mesh position={[0, 0.32, 0]} castShadow>
        <sphereGeometry args={[0.18, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <meshStandardMaterial color={MUSHROOM_CAP} roughness={0.85} />
      </mesh>
      <mesh position={[0.06, 0.36, 0.06]}>
        <sphereGeometry args={[0.025, 6, 6]} />
        <meshStandardMaterial color="#FFFFFF" roughness={0.8} />
      </mesh>
      <mesh position={[-0.07, 0.34, 0.04]}>
        <sphereGeometry args={[0.022, 6, 6]} />
        <meshStandardMaterial color="#FFFFFF" roughness={0.8} />
      </mesh>
      <group position={[0.22, 0, 0.18]}>
        <mesh position={[0, 0.07, 0]} castShadow>
          <cylinderGeometry args={[0.04, 0.05, 0.14, 6]} />
          <meshStandardMaterial color={MUSHROOM_STEM} roughness={0.9} />
        </mesh>
        <mesh position={[0, 0.17, 0]} castShadow>
          <sphereGeometry args={[0.1, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2]} />
          <meshStandardMaterial color={MUSHROOM_CAP} roughness={0.85} />
        </mesh>
      </group>
    </group>
  )
}

function Daisy({ scale = 1 }: { scale?: number }) {
  return (
    <group scale={scale}>
      {[
        [0, 0, 0.32],
        [0.15, 0.05, 0.36],
        [-0.15, 0.05, 0.30],
        [0.08, -0.12, 0.34],
        [-0.08, -0.12, 0.28],
      ].map(([dx, dz, h], i) => (
        <group key={i} position={[dx, 0, dz]}>
          <mesh position={[0, h / 2, 0]} castShadow>
            <cylinderGeometry args={[0.012, 0.012, h, 4]} />
            <meshStandardMaterial color={DAISY_STEM} roughness={0.94} />
          </mesh>
          {Array.from({ length: 6 }).map((_, j) => {
            const a = (j / 6) * Math.PI * 2
            return (
              <mesh key={j} position={[Math.cos(a) * 0.05, h + 0.02, Math.sin(a) * 0.05]} castShadow>
                <sphereGeometry args={[0.035, 6, 5]} />
                <meshStandardMaterial color={DAISY_PETAL} roughness={0.8} />
              </mesh>
            )
          })}
          <mesh position={[0, h + 0.02, 0]}>
            <sphereGeometry args={[0.025, 6, 5]} />
            <meshStandardMaterial color={DAISY_CENTER} roughness={0.7} />
          </mesh>
        </group>
      ))}
    </group>
  )
}

export default function Forest() {
  return (
    <group>
      {TREE_POSITIONS.map(([x, z, scale, species], i) => {
        const yStretch = 0.75 + ((i * 31) % 11) * 0.08
        return (
          <group key={`t${i}`} position={[x, 0, z]} scale={[1, yStretch, 1]}>
            {/* Wind sway around base — tree canopy gently rocks */}
            <WindSway amp={0.015 + (i % 3) * 0.005} freq={0.6 + (i % 5) * 0.08} phase={i * 0.4}>
              {species === 'pine' && <Pine scale={scale} seed={i} />}
              {species === 'birch' && <Birch scale={scale} seed={i} />}
              {species === 'oak' && <Oak scale={scale} seed={i} />}
              {species === 'maple' && <Maple scale={scale} seed={i} />}
              {species === 'cherry' && <Cherry scale={scale} seed={i} />}
            </WindSway>
          </group>
        )
      })}
      {FILLER_POSITIONS.map(([x, z, kind, scale], i) => (
        <group key={`f${i}`} position={[x, 0, z]}>
          {kind === 'bush' && <Bush scale={scale} seed={i} />}
          {kind === 'rocks' && <Rocks scale={scale} />}
          {kind === 'lavender' && <Lavender scale={scale} />}
          {kind === 'fern' && <Fern scale={scale} />}
          {kind === 'mushroom' && <Mushroom scale={scale} />}
          {kind === 'daisy' && <Daisy scale={scale} />}
        </group>
      ))}
    </group>
  )
}
