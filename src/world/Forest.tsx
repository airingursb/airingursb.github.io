// Forest — six filler types (bushes/rocks/lavender/fern/mushroom/daisy).
// Trees now live in InstancedForest.tsx (Phase 2 perf: ~270 draws → ~30).
// This file keeps the fillers because they're too few + structurally
// varied to be worth instancing yet.

import * as THREE from 'three'
import { useEffect, useMemo, useRef } from 'react'
import { FILLER_POSITIONS } from './zones'

// Moss-green color shared by rocks' top moss
const MOSS_GREEN    = '#5A7A4C'

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
        <meshStandardMaterial color={MOSS_GREEN} roughness={0.96} />
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
  // All fillers skip shadow pass (too small to read shadows + ~140 draws each
  // would be expensive). One traverse on mount turns them off.
  const noShadowRef = useRef<THREE.Group>(null)
  useEffect(() => {
    noShadowRef.current?.traverse((obj) => {
      const m = obj as THREE.Mesh
      if (m.isMesh) m.castShadow = false
    })
  }, [])

  return (
    <group ref={noShadowRef}>
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
