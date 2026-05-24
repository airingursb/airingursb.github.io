// Living creatures — white cat on doormat, 2 ducks drifting in pond,
// deer silhouette at far tree line, sparkle birds orbiting gazebo.
// Per Sub-A gap #8: "someone lives here" requires creatures.

import * as THREE from 'three'
import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Sparkles } from '@react-three/drei'
import { POND_CENTER, POND_RADIUS } from './zones'

const CAT_WHITE = '#F4ECDC'
const CAT_PINK  = '#E2A8B0'
const DUCK_BODY = '#F4ECCC'
const DUCK_BEAK = '#E29A4A'
const DUCK_NECK = '#3F5C42'
const DEER_BODY = '#8B6F47'
const DEER_BELLY= '#D4B895'

// V2 (scene polish D1): cat now has a 5-state FSM. Default is curl
// (breathing). Every 18-40s it picks a random non-curl action — stretch,
// lick paw, look around, sleep — animates over 2.5-6s with sine-in-out
// easing (never linear), then returns to curl. This is the single most-
// noticed living thing on the island; users will wait for the next move.
type CatState = 'curl' | 'stretch' | 'lick' | 'look' | 'sleep'
const NON_CURL: ReadonlyArray<CatState> = ['stretch', 'lick', 'look', 'sleep']
const STATE_DUR: Record<CatState, number> = {
  curl: 0, stretch: 2.5, lick: 2.5, look: 3.0, sleep: 6.0,
}

function CatOnMat({ position }: { position: [number, number, number] }) {
  const ref     = useRef<THREE.Group>(null)
  const headRef = useRef<THREE.Group>(null)

  const stateRef       = useRef<CatState>('curl')
  const stateStartRef  = useRef(0)
  const nextActionAt   = useRef(10 + Math.random() * 20)   // first action 10-30s after mount

  useFrame((s) => {
    if (!ref.current || !headRef.current) return
    const t = s.clock.elapsedTime

    // Maybe transition into a new action (only from curl).
    if (stateRef.current === 'curl' && t >= nextActionAt.current) {
      stateRef.current     = NON_CURL[Math.floor(Math.random() * NON_CURL.length)]
      stateStartRef.current = t
    }

    const state = stateRef.current
    const phase = t - stateStartRef.current

    // Defaults (curl + breathing).
    let scaleX = 1, scaleY = 1
    let headRotY = 0, headRotX = 0, headPosY = 0
    let breathAmp = 0.02
    let breathRate = 0.8

    if (state !== 'curl') {
      // Sine in-out 0→1→0 over the state's duration
      const dur = STATE_DUR[state]
      const u = Math.max(0, Math.min(1, phase / dur))
      const e = Math.sin(u * Math.PI)   // 0 at edges, 1 at midpoint

      if (state === 'stretch') {
        scaleY    = 1 + e * 0.18      // arch up
        scaleX    = 1 - e * 0.05      // narrow slightly
        headRotX  = e * -0.30         // tilt head up
      } else if (state === 'lick') {
        headRotX  = e * 0.50          // head bowed to paw
        headPosY  = e * -0.04
      } else if (state === 'look') {
        // Sweep left, then right, then center
        const seg = phase
        if (seg < 1)        headRotY = -seg * 0.55
        else if (seg < 2)   headRotY = -0.55 + (seg - 1) * 1.10
        else if (seg < 3)   headRotY =  0.55 - (seg - 2) * 0.55
      } else if (state === 'sleep') {
        const sleepE = Math.min(1, phase / 2)   // ease in over 2s
        scaleY    = 1 - sleepE * 0.10
        headPosY  = -sleepE * 0.02
        breathAmp = 0.012 * (1 - sleepE * 0.4)  // slower, smaller
        breathRate = 0.4
      }

      // Return to curl when done
      if (phase >= dur) {
        stateRef.current   = 'curl'
        nextActionAt.current = t + 18 + Math.random() * 22
      }
    }

    const breath = Math.sin(t * breathRate) * breathAmp
    ref.current.scale.set(scaleX + breath, scaleY + breath, scaleX + breath)
    headRef.current.position.y = headPosY
    headRef.current.rotation.y = headRotY
    headRef.current.rotation.x = headRotX
  })

  return (
    <group ref={ref} position={position} rotation={[0, Math.PI / 4, 0]}>
      {/* Body — curled loaf */}
      <mesh position={[0, 0.12, 0]} castShadow>
        <sphereGeometry args={[0.16, 12, 10]} />
        <meshStandardMaterial color={CAT_WHITE} roughness={0.9} flatShading />
      </mesh>
      {/* Hunched back */}
      <mesh position={[0.06, 0.18, -0.04]} castShadow>
        <sphereGeometry args={[0.13, 12, 10]} />
        <meshStandardMaterial color={CAT_WHITE} roughness={0.9} flatShading />
      </mesh>
      {/* Head + ears grouped so FSM can rotate them independently */}
      <group ref={headRef} position={[0.16, 0.18, 0.08]}>
        <mesh castShadow>
          <sphereGeometry args={[0.1, 12, 10]} />
          <meshStandardMaterial color={CAT_WHITE} roughness={0.9} flatShading />
        </mesh>
        <mesh position={[-0.02, 0.09, -0.03]} rotation={[0, 0, 0.3]} castShadow>
          <coneGeometry args={[0.035, 0.07, 4]} />
          <meshStandardMaterial color={CAT_WHITE} flatShading />
        </mesh>
        <mesh position={[0.04, 0.09, 0.03]} rotation={[0, 0, 0.3]} castShadow>
          <coneGeometry args={[0.035, 0.07, 4]} />
          <meshStandardMaterial color={CAT_WHITE} flatShading />
        </mesh>
        {/* Pink ear interiors */}
        <mesh position={[-0.02, 0.09, -0.028]} rotation={[0, 0, 0.3]}>
          <coneGeometry args={[0.02, 0.05, 4]} />
          <meshStandardMaterial color={CAT_PINK} flatShading />
        </mesh>
        <mesh position={[0.04, 0.09, 0.032]} rotation={[0, 0, 0.3]}>
          <coneGeometry args={[0.02, 0.05, 4]} />
          <meshStandardMaterial color={CAT_PINK} flatShading />
        </mesh>
      </group>
      {/* Tail curling around body */}
      <mesh position={[-0.12, 0.13, -0.08]} rotation={[Math.PI / 2, 0, 0]} castShadow>
        <torusGeometry args={[0.1, 0.028, 6, 12, Math.PI]} />
        <meshStandardMaterial color={CAT_WHITE} flatShading />
      </mesh>
    </group>
  )
}

function Duck({ angle, radius, speed, size = 1, seed = 0 }: { angle: number; radius: number; speed: number; size?: number; seed?: number }) {
  const ref = useRef<THREE.Group>(null)
  const wake1Ref = useRef<THREE.Mesh>(null)
  const wake2Ref = useRef<THREE.Mesh>(null)
  useFrame((s) => {
    if (!ref.current) return
    const t = s.clock.elapsedTime * speed + angle
    const dx = Math.cos(t) * radius + POND_CENTER[0]
    const dz = Math.sin(t) * radius + POND_CENTER[1]
    ref.current.position.x = dx
    ref.current.position.z = dz
    ref.current.position.y = 0.25 + Math.sin(t * 3 + seed) * 0.02
    ref.current.rotation.y = -t + Math.PI / 2  // face direction of travel

    // V2 D2: water-wake rings behind the duck. The rings are CHILDREN
    // of the duck group, so position is local — they're already behind
    // the duck because they sit at local -X (parent group is rotated
    // to face travel direction along +X). Two rings with 1s phase
    // offset so the wake looks continuous, not pulsing in sync.
    const baseTime = s.clock.elapsedTime
    ;[wake1Ref, wake2Ref].forEach((wr, i) => {
      const m = wr.current
      if (!m) return
      const phase = ((baseTime + i * 1.0) * 0.5) % 1   // 0..1 over 2s
      m.position.set(-0.22 - phase * 0.2, -0.045, 0)
      const ringScale = 0.5 + phase * 0.8
      m.scale.set(ringScale, 1, ringScale)
      const mat = m.material as THREE.MeshBasicMaterial
      mat.opacity = Math.max(0, 0.38 - phase * 0.38)
    })
  })
  return (
    <group ref={ref} scale={size}>
      {/* Body */}
      <mesh position={[0, 0, 0]} castShadow>
        <sphereGeometry args={[0.13, 12, 10]} />
        <meshStandardMaterial color={DUCK_BODY} roughness={0.9} flatShading />
      </mesh>
      {/* Tail nub */}
      <mesh position={[-0.13, 0.04, 0]} castShadow>
        <coneGeometry args={[0.05, 0.1, 6]} />
        <meshStandardMaterial color={DUCK_BODY} flatShading />
      </mesh>
      {/* Neck */}
      <mesh position={[0.1, 0.1, 0]} rotation={[0, 0, -Math.PI * 0.3]} castShadow>
        <cylinderGeometry args={[0.03, 0.04, 0.16, 8]} />
        <meshStandardMaterial color={DUCK_NECK} roughness={0.85} />
      </mesh>
      {/* Head */}
      <mesh position={[0.16, 0.16, 0]} castShadow>
        <sphereGeometry args={[0.07, 10, 8]} />
        <meshStandardMaterial color={DUCK_NECK} roughness={0.85} />
      </mesh>
      {/* Beak */}
      <mesh position={[0.23, 0.14, 0]} rotation={[0, 0, -Math.PI / 2]} castShadow>
        <coneGeometry args={[0.03, 0.06, 8]} />
        <meshStandardMaterial color={DUCK_BEAK} roughness={0.7} />
      </mesh>
      {/* Tiny black eye */}
      <mesh position={[0.18, 0.18, 0.05]}>
        <sphereGeometry args={[0.012, 6, 5]} />
        <meshStandardMaterial color="#1a1a1a" />
      </mesh>
      {/* V2 D2: wake rings trailing behind duck on water surface */}
      <mesh ref={wake1Ref} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.07, 0.10, 16]} />
        <meshBasicMaterial color="#E8F2F5" transparent opacity={0} side={THREE.DoubleSide} depthWrite={false} />
      </mesh>
      <mesh ref={wake2Ref} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.07, 0.10, 16]} />
        <meshBasicMaterial color="#E8F2F5" transparent opacity={0} side={THREE.DoubleSide} depthWrite={false} />
      </mesh>
    </group>
  )
}

function DeerSilhouette({ position }: { position: [number, number, number] }) {
  const ref = useRef<THREE.Group>(null)
  useFrame((s) => {
    if (!ref.current) return
    // Slow gentle bob (grazing)
    const t = s.clock.elapsedTime
    ref.current.rotation.x = Math.sin(t * 0.4) * 0.15 - 0.1
  })
  return (
    <group position={position}>
      {/* Body */}
      <mesh position={[0, 0.7, 0]} castShadow>
        <capsuleGeometry args={[0.18, 0.5, 6, 12]} />
        <meshStandardMaterial color={DEER_BODY} roughness={0.95} flatShading />
      </mesh>
      {/* Belly */}
      <mesh position={[0, 0.55, 0]} castShadow>
        <capsuleGeometry args={[0.12, 0.4, 6, 12]} />
        <meshStandardMaterial color={DEER_BELLY} roughness={0.95} flatShading />
      </mesh>
      {/* Legs — 4 thin cylinders */}
      {[
        [-0.12, 0.35,  0.15],
        [ 0.12, 0.35,  0.15],
        [-0.12, 0.35, -0.15],
        [ 0.12, 0.35, -0.15],
      ].map((p, i) => (
        <mesh key={`l${i}`} position={p as [number, number, number]} castShadow>
          <cylinderGeometry args={[0.025, 0.025, 0.7, 6]} />
          <meshStandardMaterial color={DEER_BODY} roughness={0.95} />
        </mesh>
      ))}
      {/* Neck */}
      <group ref={ref} position={[0.3, 0.95, 0]}>
        <mesh position={[0, -0.15, 0]} rotation={[0, 0, -Math.PI * 0.25]} castShadow>
          <cylinderGeometry args={[0.06, 0.08, 0.35, 8]} />
          <meshStandardMaterial color={DEER_BODY} roughness={0.95} />
        </mesh>
        {/* Head */}
        <mesh position={[0.15, -0.3, 0]} rotation={[0, 0, -Math.PI * 0.5]} castShadow>
          <coneGeometry args={[0.08, 0.18, 8]} />
          <meshStandardMaterial color={DEER_BODY} roughness={0.95} />
        </mesh>
        {/* Antlers — simple branching */}
        <mesh position={[0.04, -0.05, 0]} rotation={[0, 0, -Math.PI * 0.1]} castShadow>
          <cylinderGeometry args={[0.012, 0.012, 0.3, 4]} />
          <meshStandardMaterial color="#3A2516" />
        </mesh>
        <mesh position={[0.1, 0.0, 0]} rotation={[0, 0, -Math.PI * 0.3]}>
          <cylinderGeometry args={[0.01, 0.01, 0.18, 4]} />
          <meshStandardMaterial color="#3A2516" />
        </mesh>
      </group>
    </group>
  )
}

function Birds({ center, radius = 3, count = 5 }: { center: [number, number, number]; radius?: number; count?: number }) {
  return (
    <Sparkles
      count={count}
      scale={[radius * 2, 2, radius * 2]}
      position={center}
      size={4}
      speed={0.6}
      color="#FFFFFF"
      opacity={0.6}
    />
  )
}

export default function Critters({ theme = 'day' }: { theme?: 'day' | 'dusk' }) {
  return (
    <group>
      {/* White cat curled on cabin doormat. Sub-A fix: was at world
          [0.3, 0.35, 2.1] which is ~3.7 units away from the actual
          doormat. Cabin chat zone is at (-2.0, -1.0); porch extends
          to local z = CABIN_D/2 + 0.6 = 2.1, so doormat is at world
          (-2.0, 0.34, +1.1). Cat now slightly offset so it doesn't
          block the door silhouette. */}
      <CatOnMat position={[-1.45, 0.35, 1.1]} />

      {/* 2 ducks drifting in pond — circular paths */}
      <Duck angle={0} radius={POND_RADIUS * 0.5} speed={0.15} size={1.0} seed={0} />
      <Duck angle={Math.PI} radius={POND_RADIUS * 0.4} speed={0.18} size={0.9} seed={1} />

      {/* Deer grazing at far north tree line */}
      <DeerSilhouette position={[-3.0, 0, -16.0]} />

      {/* Sparkle birds orbiting gazebo */}
      <Birds center={[13.5, 4, -2.5]} radius={3} count={5} />

      {/* Butterflies near easel */}
      <Sparkles
        count={3}
        scale={[1.2, 1, 1.2]}
        position={[-13.0, 1.3, 3.0]}
        size={6}
        speed={0.3}
        color="#F2A8C8"
        opacity={0.8}
      />

      {/* Bees buzzing around lavender patches */}
      <Sparkles
        count={4}
        scale={[1.5, 1, 1.5]}
        position={[-2.4, 0.6, 0.6]}
        size={3}
        speed={1.2}
        color="#FCD757"
        opacity={0.7}
      />
      <Sparkles
        count={3}
        scale={[1.2, 1, 1.2]}
        position={[2.4, 0.6, 0.6]}
        size={3}
        speed={1.2}
        color="#FCD757"
        opacity={0.7}
      />
      <Sparkles
        count={3}
        scale={[1.2, 1, 1.2]}
        position={[8, 0.6, 4]}
        size={3}
        speed={1.2}
        color="#FCD757"
        opacity={0.7}
      />

      {/* V2 D3: fireflies intensify at dusk (3× count + brighter +
          warmer) and one solo firefly drifts toward the cabin window. */}
      <DuskFireflies theme={theme} />
      <CabinFirefly theme={theme} />
    </group>
  )
}

type Theme = 'day' | 'dusk'

function DuskFireflies({ theme }: { theme: Theme }) {
  const isDusk = theme === 'dusk'
  return (
    <Sparkles
      count={isDusk ? 24 : 8}
      scale={[4, 2.4, 4]}
      position={[-4.0, 1.5, -12.0]}
      size={isDusk ? 7 : 5}
      speed={isDusk ? 0.45 : 0.3}
      color={isDusk ? '#FFD060' : '#FFE89A'}
      opacity={isDusk ? 0.92 : 0.6}
    />
  )
}

// One solo firefly that traces a slow sine path from the hammock area
// toward the cabin window (-2, 1.05, 0) — only at dusk. The scripted
// path against the otherwise-random firefly cloud reads as intentional,
// like the firefly is curious about the lit cabin.
function CabinFirefly({ theme }: { theme: Theme }) {
  const ref = useRef<THREE.Mesh>(null)
  const lightRef = useRef<THREE.PointLight>(null)
  const matRef = useRef<THREE.MeshBasicMaterial>(null)
  // Start near hammock, drift toward cabin shoji over ~14s, hover, return.
  const startX = -4.0, startZ = -12.0, startY = 1.2
  const targetX = -2.0, targetZ = 0.6, targetY = 1.10
  useFrame((s) => {
    const t = s.clock.elapsedTime
    const enabled = theme === 'dusk'
    // Fade target — invisible at day, full at dusk
    const targetOpacity = enabled ? 1 : 0
    const m = matRef.current
    if (m) {
      const dt = s.clock.getDelta ? 0 : 0  // (unused — just structural)
      m.opacity = m.opacity + (targetOpacity - m.opacity) * 0.04
    }
    if (!enabled) return
    if (!ref.current) return
    // 28s round trip: 0..0.5 drift out, 0.5..0.6 hover, 0.6..1 drift back
    const phase = (t % 28) / 28
    let u: number   // 0..1 progress toward cabin
    if (phase < 0.45)       u = phase / 0.45
    else if (phase < 0.55)  u = 1
    else                    u = 1 - (phase - 0.55) / 0.45
    // Sine in-out ease
    const e = 0.5 - Math.cos(u * Math.PI) * 0.5
    const x = startX + (targetX - startX) * e + Math.sin(t * 1.3) * 0.15
    const y = startY + (targetY - startY) * e + Math.sin(t * 0.7) * 0.05
    const z = startZ + (targetZ - startZ) * e + Math.cos(t * 1.1) * 0.15
    ref.current.position.set(x, y, z)
    if (lightRef.current) {
      lightRef.current.position.set(x, y, z)
      // Pulse the firefly light
      lightRef.current.intensity = 0.35 + Math.sin(t * 4) * 0.15
    }
  })
  return (
    <>
      <mesh ref={ref} position={[startX, startY, startZ]}>
        <sphereGeometry args={[0.04, 8, 6]} />
        <meshBasicMaterial ref={matRef} color="#FFEE99" transparent opacity={0} depthWrite={false} />
      </mesh>
      <pointLight ref={lightRef} color="#FFE890" intensity={0} distance={1.2} decay={2} />
    </>
  )
}
