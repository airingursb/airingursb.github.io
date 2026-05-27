// C1 — pond stone-throw interactivity.
//
// Click anywhere on the pond surface → tossed stone arcs in, splashes,
// ring ripples expand from impact point, koi nearby scatter outward
// then ease back to their path.
//
// Shared `pondImpacts` module state is consumed by PondFish for the
// koi-scatter reaction. Splash + ripple + arc-stone are owned here.

import { useRef, useMemo, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { POND_CENTER, POND_RADIUS } from './zones'

// Shared registry — PondFish imports this to compute scatter forces.
export interface PondImpact { at: number; x: number; z: number }
export const pondImpacts: PondImpact[] = []
const IMPACT_FADE = 2.5   // seconds — fish reaction window

// Public: PondFish calls this each frame to compute scatter offset for
// a given fish position. Returns (dx, dz) push to add to its base path.
export function getKoiScatter(now: number, fx: number, fz: number): [number, number] {
  // GC old impacts inline (cheap — array typically 0-2 entries)
  while (pondImpacts.length && now - pondImpacts[0].at > IMPACT_FADE) {
    pondImpacts.shift()
  }
  let dx = 0
  let dz = 0
  for (const imp of pondImpacts) {
    const age = now - imp.at
    const decay = 1 - age / IMPACT_FADE
    const vx = fx - imp.x
    const vz = fz - imp.z
    const distSq = vx * vx + vz * vz
    if (distSq > 1.5 * 1.5) continue   // outside influence radius
    const dist = Math.sqrt(distSq) || 0.001
    // Strength: 0.6 at impact center, 0 at 1.5u. Cubic decay over time.
    const strength = (1 - dist / 1.5) * decay * decay * decay * 0.6
    dx += (vx / dist) * strength
    dz += (vz / dist) * strength
  }
  return [dx, dz]
}

// Single arced stone — appears, arcs to splash point, vanishes.
// NOTE: all timers in this file use performance.now()/1000 — NOT
// s.clock.elapsedTime — because onClick captures performance.now()
// (no access to three's clock at event time) and the two clocks
// have different epochs.
function ArcStone({ x, z, startedAt }: { x: number; z: number; startedAt: number }) {
  const meshRef = useRef<THREE.Mesh>(null)
  useFrame(() => {
    if (!meshRef.current) return
    const now = performance.now() / 1000
    const t = now - startedAt
    if (t < 0 || t > 0.5) {
      meshRef.current.visible = false
      return
    }
    meshRef.current.visible = true
    // Stone arcs from offset start to (x, 0.20, z) over 0.5s
    const p = t / 0.5
    const startX = x + 3
    const startY = 5
    const startZ = z + 2
    const targetY = 0.20
    // Quadratic up-down through midpoint at higher y
    const midY = 3.5
    const u = p
    const yArc = (1 - u) * (1 - u) * startY + 2 * (1 - u) * u * midY + u * u * targetY
    meshRef.current.position.set(
      startX + (x - startX) * p,
      yArc,
      startZ + (z - startZ) * p,
    )
    meshRef.current.rotation.x = p * 6
    meshRef.current.rotation.y = p * 4
  })
  return (
    <mesh ref={meshRef}>
      <dodecahedronGeometry args={[0.08, 0]} />
      <meshStandardMaterial color="#7E7368" roughness={0.95} flatShading />
    </mesh>
  )
}

// Splash: small water droplets shooting up + falling back
function Splash({ x, z, startedAt }: { x: number; z: number; startedAt: number }) {
  const COUNT = 10
  const refs = useMemo(
    () => Array.from({ length: COUNT }, () => ({ current: null as THREE.Mesh | null })),
    [],
  )
  const dirs = useMemo(() => {
    const arr: Array<[number, number, number]> = []
    for (let i = 0; i < COUNT; i++) {
      const angle = (i / COUNT) * Math.PI * 2 + Math.random() * 0.3
      const r = 0.5 + Math.random() * 0.6
      arr.push([Math.cos(angle) * r, 2.5 + Math.random() * 1.2, Math.sin(angle) * r])
    }
    return arr
  }, [])
  useFrame(() => {
    const now = performance.now() / 1000
    const t = now - startedAt
    refs.forEach((r, i) => {
      const m = r.current
      if (!m) return
      const [vx, vy, vz] = dirs[i]
      const px = vx * t
      const py = vy * t - 5 * t * t
      const pz = vz * t
      if (t > 0 && py >= -0.05) {
        m.visible = true
        m.position.set(px, py, pz)
        const mat = m.material as THREE.MeshBasicMaterial
        mat.opacity = Math.max(0, 1 - t / 0.9)
        m.scale.setScalar(0.05 + Math.max(0, 1 - t * 0.7) * 0.05)
      } else {
        m.visible = false
      }
    })
  })
  return (
    <group position={[x, 0.22, z]}>
      {dirs.map((_, i) => (
        <mesh key={i} ref={(el) => { refs[i].current = el }} visible={false}>
          <sphereGeometry args={[1, 6, 5]} />
          <meshBasicMaterial color="#D5EAF2" transparent opacity={0.9} depthWrite={false} />
        </mesh>
      ))}
    </group>
  )
}

// Ripple: 2 concentric rings expanding from impact, fading
function Ripple({ x, z, startedAt }: { x: number; z: number; startedAt: number }) {
  const ringRefs = [useRef<THREE.Mesh>(null), useRef<THREE.Mesh>(null)]
  useFrame(() => {
    const now = performance.now() / 1000
    const t = now - startedAt
    ringRefs.forEach((r, i) => {
      const m = r.current
      if (!m) return
      const stagger = i * 0.18
      const local = t - stagger
      if (local < 0 || local > 2.0) {
        m.visible = false
        return
      }
      m.visible = true
      const p = local / 2.0
      const radius = 0.15 + p * 1.4
      m.scale.set(radius, radius, 1)
      const mat = m.material as THREE.MeshBasicMaterial
      mat.opacity = (1 - p) * 0.6
    })
  })
  return (
    <group position={[x, 0.21, z]} rotation={[-Math.PI / 2, 0, 0]}>
      {ringRefs.map((r, i) => (
        <mesh key={i} ref={r} visible={false}>
          <ringGeometry args={[0.93, 1.0, 32]} />
          <meshBasicMaterial color="#FFFFFF" transparent opacity={0.6} depthWrite={false} side={THREE.DoubleSide} />
        </mesh>
      ))}
    </group>
  )
}

interface ActiveImpact { id: number; at: number; x: number; z: number }

export default function PondInteraction() {
  const [active, setActive] = useState<ActiveImpact[]>([])
  // Stone-tossed counter for unique ids
  const idRef = useRef(0)
  // GC old impacts. Perf fix: only setState when the filtered list
  // actually changed length — naive `setActive(arr.filter(...))` ran
  // every frame and triggered React re-renders even when nothing
  // expired, defeating the purpose of the state machine.
  useFrame(() => {
    if (active.length === 0) return
    const now = performance.now() / 1000
    const fresh = active.filter((a) => now - a.at < 2.5)
    if (fresh.length !== active.length) {
      setActive(fresh)
    }
  })
  return (
    <group>
      {/* Invisible click target — disc covering the pond surface,
          slightly above so click registers before pond water material */}
      <mesh
        position={[POND_CENTER[0], 0.215, POND_CENTER[1]]}
        rotation={[-Math.PI / 2, 0, 0]}
        onClick={(e) => {
          e.stopPropagation()
          const [hitX, _hitY, hitZ] = [e.point.x, e.point.y, e.point.z]
          const now = performance.now() / 1000
          // Push to shared scatter registry (consumed by PondFish)
          pondImpacts.push({ at: now, x: hitX, z: hitZ })
          setActive((arr) => [...arr, { id: ++idRef.current, at: now, x: hitX, z: hitZ }])
          // Splash sound — fires ~400ms after click to sync with the
          // arc-stone hitting water (stone flight time is 500ms).
          import('./AmbientAudio').then(m => {
            setTimeout(() => m.playSplash(), 420)
          }).catch(() => {})
        }}
        onPointerOver={(e) => { e.stopPropagation(); document.body.style.cursor = 'pointer' }}
        onPointerOut={(e) => { e.stopPropagation(); document.body.style.cursor = '' }}
      >
        <circleGeometry args={[POND_RADIUS * 1.05, 32]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
      </mesh>
      {active.map((a) => (
        <group key={a.id}>
          <ArcStone x={a.x} z={a.z} startedAt={a.at} />
          <Splash x={a.x} z={a.z} startedAt={a.at} />
          <Ripple x={a.x} z={a.z} startedAt={a.at} />
        </group>
      ))}
    </group>
  )
}
