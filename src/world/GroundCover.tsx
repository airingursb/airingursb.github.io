// Dense ground cover — grass blade tufts + wildflower spots scattered
// across the entire island surface. Uses InstancedMesh for performance
// (1000+ instances run as 1 draw call instead of 1000).
//
// This is Sub-A recommendation #8: the layer that turns "carpet" into
// "meadow".

import * as THREE from 'three'
import { useMemo, useEffect } from 'react'

const GRASS_A = '#8FB97A'
const GRASS_B = '#7AA565'
const GRASS_C = '#9BC58A'
const FLOWER_W = '#FFFFFF'
const FLOWER_Y = '#FFE89A'
const FLOWER_P = '#F2A8C8'

const ISLAND_R = 21
const PATCH_COUNT = 600

function isOnIsland(x: number, z: number) {
  // Rough check — within the island rim radius
  const r = Math.hypot(x, z)
  return r < ISLAND_R - 0.5
}

function nearPath(x: number, z: number) {
  // Avoid grass directly on path
  const checkPoints: [number, number][] = [
    [0, 0], [-2, -4], [-3, -8], [-4, -12], [3, 1], [6, -1], [10, -2], [13, -2.5],
    [5, 4], [5, 10], [5, 12], [-5, 2], [-9, 2.5], [-13, 3],
  ]
  return checkPoints.some(([px, pz]) => Math.hypot(x - px, z - pz) < 1.2)
}

function GrassBlades() {
  const tufts = useMemo(() => {
    const out: Array<{ x: number; z: number; scale: number; rot: number; color: number }> = []
    let attempts = 0
    while (out.length < PATCH_COUNT && attempts < PATCH_COUNT * 4) {
      attempts++
      const angle = Math.random() * Math.PI * 2
      const dist = Math.sqrt(Math.random()) * ISLAND_R
      const x = Math.cos(angle) * dist
      const z = Math.sin(angle) * dist
      if (!isOnIsland(x, z)) continue
      if (nearPath(x, z)) continue
      // Skip near cabin / gazebo / deck / easel / hammock
      if (Math.hypot(x - 0, z - 0) < 2.5) continue
      if (Math.hypot(x - 13.5, z + 2.5) < 1.8) continue
      if (Math.hypot(x - 5, z - 12.5) < 2) continue
      if (Math.hypot(x + 13, z - 3) < 1.5) continue
      if (Math.hypot(x + 4, z + 12) < 2.5) continue
      // Skip near pond
      if (Math.hypot(x - 8, z - 6) < 2.8) continue
      out.push({
        x,
        z,
        scale: 0.6 + Math.random() * 0.8,
        rot: Math.random() * Math.PI * 2,
        color: Math.floor(Math.random() * 3),
      })
    }
    return out
  }, [])

  const refA = useMemo(() => new THREE.Object3D(), [])
  const meshARef = useMemo(() => {
    const geo = new THREE.ConeGeometry(0.03, 0.18, 4)
    const mat = new THREE.MeshStandardMaterial({ color: GRASS_A, roughness: 0.95, flatShading: true })
    const m = new THREE.InstancedMesh(geo, mat, PATCH_COUNT)
    m.castShadow = false
    m.receiveShadow = true
    return m
  }, [])
  const meshBRef = useMemo(() => {
    const geo = new THREE.ConeGeometry(0.03, 0.16, 4)
    const mat = new THREE.MeshStandardMaterial({ color: GRASS_B, roughness: 0.95, flatShading: true })
    const m = new THREE.InstancedMesh(geo, mat, PATCH_COUNT)
    m.castShadow = false
    m.receiveShadow = true
    return m
  }, [])
  const meshCRef = useMemo(() => {
    const geo = new THREE.ConeGeometry(0.03, 0.2, 4)
    const mat = new THREE.MeshStandardMaterial({ color: GRASS_C, roughness: 0.95, flatShading: true })
    const m = new THREE.InstancedMesh(geo, mat, PATCH_COUNT)
    m.castShadow = false
    m.receiveShadow = true
    return m
  }, [])

  useMemo(() => {
    let cA = 0, cB = 0, cC = 0
    tufts.forEach((t) => {
      refA.position.set(t.x, 0.08, t.z)
      refA.rotation.set(0, t.rot, 0)
      refA.scale.set(t.scale, t.scale, t.scale)
      refA.updateMatrix()
      if (t.color === 0 && cA < PATCH_COUNT) { meshARef.setMatrixAt(cA++, refA.matrix) }
      else if (t.color === 1 && cB < PATCH_COUNT) { meshBRef.setMatrixAt(cB++, refA.matrix) }
      else if (cC < PATCH_COUNT) { meshCRef.setMatrixAt(cC++, refA.matrix) }
    })
    meshARef.count = cA
    meshBRef.count = cB
    meshCRef.count = cC
    meshARef.instanceMatrix.needsUpdate = true
    meshBRef.instanceMatrix.needsUpdate = true
    meshCRef.instanceMatrix.needsUpdate = true
  }, [tufts, refA, meshARef, meshBRef, meshCRef])

  // Sub-A leak fix: dispose InstancedMesh geometry + material on
  // unmount (HMR, route nav). Previously leaked GPU buffers + material.
  useEffect(() => () => {
    ;[meshARef, meshBRef, meshCRef].forEach((m) => {
      m.geometry.dispose()
      ;(m.material as THREE.Material).dispose()
    })
  }, [meshARef, meshBRef, meshCRef])

  return (
    <group>
      <primitive object={meshARef} />
      <primitive object={meshBRef} />
      <primitive object={meshCRef} />
    </group>
  )
}

function Wildflowers() {
  const flowers = useMemo(() => {
    const out: Array<{ x: number; z: number; color: string }> = []
    const colors = [FLOWER_W, FLOWER_Y, FLOWER_P]
    for (let i = 0; i < 120; i++) {
      const angle = Math.random() * Math.PI * 2
      const dist = Math.sqrt(Math.random()) * ISLAND_R
      const x = Math.cos(angle) * dist
      const z = Math.sin(angle) * dist
      if (!isOnIsland(x, z)) continue
      if (nearPath(x, z)) continue
      if (Math.hypot(x, z) < 2.5) continue
      if (Math.hypot(x - 8, z - 6) < 2.8) continue
      out.push({ x, z, color: colors[Math.floor(Math.random() * colors.length)] })
    }
    return out
  }, [])

  return (
    <group>
      {flowers.map((f, i) => (
        <group key={`fl${i}`} position={[f.x, 0.1, f.z]}>
          {/* Tiny stem */}
          <mesh position={[0, 0.06, 0]}>
            <cylinderGeometry args={[0.008, 0.008, 0.12, 4]} />
            <meshStandardMaterial color="#5A7A4C" />
          </mesh>
          {/* Flower bloom */}
          <mesh position={[0, 0.14, 0]}>
            <sphereGeometry args={[0.04, 6, 5]} />
            <meshStandardMaterial color={f.color} roughness={0.7} />
          </mesh>
        </group>
      ))}
    </group>
  )
}

export default function GroundCover() {
  return (
    <group>
      <GrassBlades />
      <Wildflowers />
    </group>
  )
}
