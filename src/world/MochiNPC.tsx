// Mochi NPC — small brown bear standing next to the cabin door.
// Procedural geometry (no sprite) so he reads as a distinct 3D inhabitant
// vs the panda billboard avatar.
//
// G (direction): zone-aware — when the user clicks any zone, Mochi
// briefly turns to look toward that zone for ~5s, then resumes default
// wobble. Reads as 'Mochi noticed you went there'.

import * as THREE from 'three'
import { useRef, useEffect } from 'react'
import { useFrame } from '@react-three/fiber'
import { on } from './events'
import { getZone, type Interaction } from './zones'

const BEAR_BODY    = '#7A4E2A'
const BEAR_BELLY   = '#A87A52'
const BEAR_NOSE    = '#2A1A12'
const BEAR_EYE     = '#1a0e08'
const SCARF        = '#A03030'
const SCARF_DARK   = '#7E2424'

export default function MochiNPC() {
  // Position: just east of cabin door (cabin at [-2, -1], door faces +Z south)
  // Slightly forward so he's a visible companion to the avatar.
  // y=0.65 chosen to clear porch step without colliding with awning at any
  // orbit polar angle.
  const homePos: [number, number, number] = [-0.6, 0.65, 1.6]
  const headRef = useRef<THREE.Group>(null)
  const bodyRef = useRef<THREE.Group>(null)
  const rootRef = useRef<THREE.Group>(null)
  // A2 (direction): Mochi occasionally walks. Every 90-150s he chooses
  // a target (cabin porch area / hammock direction / 'curious peek')
  // and walks there over 12s, hovers 8s, then returns. He's usually
  // home; the rare walk reads as 'thinking, maybe peeking out'.
  const wanderRef = useRef<{
    state: 'home' | 'out' | 'hover' | 'back'
    target: [number, number, number]
    started: number
    nextWander: number
  }>({
    state: 'home',
    target: homePos,
    started: 0,
    nextWander: 90 + Math.random() * 60,   // first wander at 90-150s
  })

  // V2 wave 3: layered head behavior. Default gentle wobble + every
  // 22-30s a dramatic "look around" sweep (left, right, up, center)
  // over 5s. Makes Mochi feel curious/alive rather than mechanical.
  const lookAtRef = useRef({ next: 22 + Math.random() * 8, started: 0, active: false })
  // G: zone-aware look — when a zone is clicked, store target yaw to
  // face it. Lasts 5s then clears. mochi's world pos is [-0.6, 0.65, 1.6].
  const zoneLookRef = useRef<{ until: number; targetYaw: number } | null>(null)
  useEffect(() => on('world-zone-click', ({ kind }: { kind: Interaction }) => {
    const zone = getZone(kind)
    if (!zone) return
    const [zx, zz] = zone.pos
    // Mochi's world pos. Yaw needed to face (zx, zz) from (-0.6, 1.6).
    const dx = zx - (-0.6)
    const dz = zz - 1.6
    // Three.js Y-rotation convention: at yaw=0, snout faces +Z. Positive
    // yaw is counter-clockwise viewed from +Y. To point snout AT a world
    // vector (dx, dz): yaw = atan2(dx, dz). Earlier negation made him
    // turn the wrong way (faced -dx for east targets).
    const targetYaw = Math.atan2(dx, dz)
    zoneLookRef.current = { until: performance.now() / 1000 + 5, targetYaw }
  }), [])
  useFrame((s) => {
    const t = s.clock.elapsedTime
    if (bodyRef.current) {
      bodyRef.current.scale.y = 1 + Math.sin(t * 1.2) * 0.02
    }
    if (!headRef.current) return

    // G zone-look: highest priority — overrides default + scheduled
    // look-arounds. Eases TO target, then holds with subtle micro-
    // wobble (not dead-still — 3s frozen reads as 'broken'). Body
    // partially rotates so the bear doesn't stare 90° through his
    // own shoulder. Eases BACK to neutral over last 1.2s.
    const zl = zoneLookRef.current
    if (zl && t < zl.until) {
      const total = 5
      const elapsed = total - (zl.until - t)
      const remaining = zl.until - t
      const easeIn = Math.min(1, elapsed / 0.7)
      const fadeBack = remaining < 1.2 ? (1 - remaining / 1.2) : 0
      const blend = Math.max(0, easeIn - fadeBack)
      // Micro-wobble during hold (~40% of default amplitude — default
      // is 0.3+0.04=0.34 peak yaw, this is ~0.14 peak). Mochi breathes
      // around the target instead of freezing.
      const microYaw = Math.sin(t * 0.6) * 0.12 + Math.sin(t * 1.7 + 0.4) * 0.04
      const microPitch = Math.sin(t * 0.37) * 0.06
      headRef.current.rotation.y = zl.targetYaw * blend +
        microYaw * (0.4 + 0.6 * (1 - blend)) +
        Math.sin(t * 0.5) * 0.3 * (1 - blend)
      headRef.current.rotation.x = microPitch
      // Body follows ~30% of the head turn so shoulder doesn't twist
      if (bodyRef.current) {
        bodyRef.current.rotation.y = zl.targetYaw * blend * 0.3
      }
      return
    }
    if (zl && t >= zl.until) {
      zoneLookRef.current = null
      if (bodyRef.current) bodyRef.current.rotation.y = 0
    }

    // A2 wander state machine
    const w = wanderRef.current
    if (rootRef.current) {
      if (w.state === 'home' && t >= w.nextWander) {
        // Pick a random nearby target — small radius so he stays near cabin
        const candidates: Array<[number, number, number]> = [
          [-1.4, 0.65, 2.6],   // toward path
          [ 0.4, 0.65, 1.8],   // east of porch
          [-1.2, 0.65, 0.8],   // toward door
        ]
        w.target = candidates[Math.floor(Math.random() * candidates.length)]
        w.state = 'out'
        w.started = t
      }
      const segmentDuration = w.state === 'out' || w.state === 'back' ? 12 : 8
      const elapsed = t - w.started
      const progress = Math.min(1, elapsed / segmentDuration)
      const eased = 0.5 - Math.cos(progress * Math.PI) * 0.5   // ease-in-out
      if (w.state === 'out') {
        const x = homePos[0] + (w.target[0] - homePos[0]) * eased
        const z = homePos[2] + (w.target[2] - homePos[2]) * eased
        rootRef.current.position.x = x
        rootRef.current.position.z = z
        // Bob slightly while walking
        rootRef.current.position.y = homePos[1] + Math.abs(Math.sin(t * 5)) * 0.04 * (progress < 1 ? 1 : 0)
        if (progress >= 1) { w.state = 'hover'; w.started = t }
      } else if (w.state === 'hover') {
        rootRef.current.position.x = w.target[0]
        rootRef.current.position.z = w.target[2]
        rootRef.current.position.y = homePos[1]
        if (progress >= 1) { w.state = 'back'; w.started = t }
      } else if (w.state === 'back') {
        const x = w.target[0] + (homePos[0] - w.target[0]) * eased
        const z = w.target[2] + (homePos[2] - w.target[2]) * eased
        rootRef.current.position.x = x
        rootRef.current.position.z = z
        rootRef.current.position.y = homePos[1] + Math.abs(Math.sin(t * 5)) * 0.04 * (progress < 1 ? 1 : 0)
        if (progress >= 1) {
          w.state = 'home'
          w.nextWander = t + 90 + Math.random() * 60
        }
      }
    }

    // Decide whether to start an active "look around" episode
    const la = lookAtRef.current
    if (!la.active && t >= la.next) {
      la.active = true
      la.started = t
    }

    if (la.active) {
      const phase = t - la.started   // 0..5s
      // Sub-A fix: sine-eased 4-beat sweep instead of piecewise linear.
      // Beats: left(0-1.25) → center(1.25-2.5) → right(2.5-3.75) →
      //        up+center(3.75-5). All easings sine in-out so no snap.
      let yaw = 0
      let pitch = 0
      const sineSeg = (p: number, p0: number, p1: number, from: number, to: number) => {
        if (p < p0 || p > p1) return null
        const u = (p - p0) / (p1 - p0)
        return from + (to - from) * (0.5 - Math.cos(u * Math.PI) * 0.5)
      }
      yaw =
        sineSeg(phase, 0,    1.25, 0,    -0.7) ??
        sineSeg(phase, 1.25, 2.5,  -0.7,  0)   ??
        sineSeg(phase, 2.5,  3.75, 0,     0.7) ??
        sineSeg(phase, 3.75, 5.0,  0.7,   0)   ?? 0
      // Pitch only rises during the last beat (3.75-4.4) then returns
      pitch =
        sineSeg(phase, 3.75, 4.40, 0,    -0.35) ??
        sineSeg(phase, 4.40, 5.00, -0.35, 0)    ?? 0
      headRef.current.rotation.y = yaw
      headRef.current.rotation.x = pitch
      if (phase >= 5) {
        la.active = false
        la.next = t + 22 + Math.random() * 8
      }
    } else {
      // Default gentle wobble — dual-frequency yaw + tiny pitch breath
      // so the head doesn't feel metronomic. Primary yaw is the slow
      // sweep; secondary +sin(t*1.7)*0.04 adds a small higher-frequency
      // micro-jitter that reads as "looking-thinking". Pitch oscillates
      // ±0.04 on a 2.7s cycle (subtle up/down "considering" lift).
      headRef.current.rotation.y =
        Math.sin(t * 0.5) * 0.3 + Math.sin(t * 1.7 + 1.3) * 0.04
      headRef.current.rotation.x = Math.sin(t * 0.37) * 0.04
    }
  })

  return (
    <group ref={rootRef} position={homePos}>
      {/* Contact shadow */}
      <mesh position={[0, -0.58, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[0.4, 16]} />
        <meshStandardMaterial color="#000000" transparent opacity={0.4} />
      </mesh>

      <group ref={bodyRef}>
        {/* Body — chubby capsule */}
        <mesh position={[0, 0, 0]} castShadow receiveShadow>
          <capsuleGeometry args={[0.28, 0.4, 8, 12]} />
          <meshStandardMaterial color={BEAR_BODY} roughness={0.92} />
        </mesh>
        {/* Belly */}
        <mesh position={[0, -0.05, 0.18]} castShadow>
          <sphereGeometry args={[0.2, 12, 10]} />
          <meshStandardMaterial color={BEAR_BELLY} roughness={0.94} />
        </mesh>
        {/* Scarf — wrapped around neck (red, matching cabin door) */}
        <mesh position={[0, 0.3, 0]} castShadow>
          <torusGeometry args={[0.24, 0.06, 8, 16]} />
          <meshStandardMaterial color={SCARF} roughness={0.85} />
        </mesh>
        {/* Scarf hanging end */}
        <mesh position={[0.1, 0.16, 0.18]} rotation={[0.2, 0.3, 0.1]} castShadow>
          <boxGeometry args={[0.08, 0.22, 0.04]} />
          <meshStandardMaterial color={SCARF_DARK} roughness={0.85} />
        </mesh>
      </group>

      {/* Head */}
      <group ref={headRef} position={[0, 0.55, 0]}>
        {/* Head sphere */}
        <mesh castShadow>
          <sphereGeometry args={[0.26, 16, 14]} />
          <meshStandardMaterial color={BEAR_BODY} roughness={0.92} />
        </mesh>
        {/* Snout */}
        <mesh position={[0, -0.05, 0.2]} castShadow>
          <sphereGeometry args={[0.12, 10, 8]} />
          <meshStandardMaterial color={BEAR_BELLY} roughness={0.92} />
        </mesh>
        {/* Nose */}
        <mesh position={[0, -0.04, 0.31]}>
          <sphereGeometry args={[0.04, 8, 6]} />
          <meshStandardMaterial color={BEAR_NOSE} roughness={0.5} />
        </mesh>
        {/* Round ears */}
        <mesh position={[-0.18, 0.18, 0]} castShadow>
          <sphereGeometry args={[0.1, 10, 8]} />
          <meshStandardMaterial color={BEAR_BODY} roughness={0.92} />
        </mesh>
        <mesh position={[0.18, 0.18, 0]} castShadow>
          <sphereGeometry args={[0.1, 10, 8]} />
          <meshStandardMaterial color={BEAR_BODY} roughness={0.92} />
        </mesh>
        {/* Inner ears */}
        <mesh position={[-0.18, 0.18, 0.04]}>
          <sphereGeometry args={[0.06, 8, 6]} />
          <meshStandardMaterial color={SCARF_DARK} roughness={0.85} />
        </mesh>
        <mesh position={[0.18, 0.18, 0.04]}>
          <sphereGeometry args={[0.06, 8, 6]} />
          <meshStandardMaterial color={SCARF_DARK} roughness={0.85} />
        </mesh>
        {/* Eyes */}
        <mesh position={[-0.08, 0.04, 0.24]}>
          <sphereGeometry args={[0.025, 8, 6]} />
          <meshStandardMaterial color={BEAR_EYE} />
        </mesh>
        <mesh position={[0.08, 0.04, 0.24]}>
          <sphereGeometry args={[0.025, 8, 6]} />
          <meshStandardMaterial color={BEAR_EYE} />
        </mesh>
        {/* Eye highlights */}
        <mesh position={[-0.075, 0.05, 0.255]}>
          <sphereGeometry args={[0.008, 6, 5]} />
          <meshStandardMaterial color="#FFFFFF" />
        </mesh>
        <mesh position={[0.085, 0.05, 0.255]}>
          <sphereGeometry args={[0.008, 6, 5]} />
          <meshStandardMaterial color="#FFFFFF" />
        </mesh>
      </group>

      {/* Stubby legs */}
      <mesh position={[-0.15, -0.4, 0]} castShadow>
        <sphereGeometry args={[0.12, 10, 8]} />
        <meshStandardMaterial color={BEAR_BODY} roughness={0.92} />
      </mesh>
      <mesh position={[0.15, -0.4, 0]} castShadow>
        <sphereGeometry args={[0.12, 10, 8]} />
        <meshStandardMaterial color={BEAR_BODY} roughness={0.92} />
      </mesh>

      {/* Arms */}
      <mesh position={[-0.3, 0.05, 0.05]} rotation={[0, 0, 0.3]} castShadow>
        <capsuleGeometry args={[0.08, 0.16, 6, 8]} />
        <meshStandardMaterial color={BEAR_BODY} roughness={0.92} />
      </mesh>
      <mesh position={[0.3, 0.05, 0.05]} rotation={[0, 0, -0.3]} castShadow>
        <capsuleGeometry args={[0.08, 0.16, 6, 8]} />
        <meshStandardMaterial color={BEAR_BODY} roughness={0.92} />
      </mesh>
    </group>
  )
}
