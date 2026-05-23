// SHU-733/736 Phase 4 · Mochi NPC with simple path AI
//
// State machine:
//   - waits at spawn (head tracks player)
//   - if player within 8m → walks toward player (kinematic body, lerp)
//   - if player sits on stone (stage=seated) → walks to opposite side of stone, sits
//   - looks at player at all times via head/torso rotation
//
// Visual: GLBAvatar loads /grove3d/models/mochi.glb when present, else
// falls back to procedural bear (with the historic hand-modeled scarf etc.
// living inside ProceduralAnimal for the species='bear' config).

import { useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { RigidBody, CapsuleCollider, type RapierRigidBody } from '@react-three/rapier'
import { Billboard, Text } from '@react-three/drei'
import * as THREE from 'three'
import { useGroveStore } from './store'
import GLBAvatar from './GLBAvatar'

const PLAYER_DETECT_RADIUS = 8
const STOP_DISTANCE = 1.8
const WALK_SPEED = 1.5
const SITTING_STONE = new THREE.Vector3(1.2, 0, 1.5)
const SPAWN = new THREE.Vector3(3, 0, -1)

export default function Mochi() {
  const body = useRef<RapierRigidBody>(null)
  const visual = useRef<THREE.Group>(null)
  const playerPosCache = useRef(new THREE.Vector3(0, 0, 0))
  const animState = useRef<'idle' | 'walking' | 'running' | 'jumping' | 'sitting'>('idle')
  const stage = useGroveStore((s) => s.stage)
  const { scene } = useThree()

  // Sample player position once per frame (avoids subscribing to a store-derived value)
  useFrame((_, dt) => {
    if (!body.current || !visual.current) return

    // Find player rigid body via scene traverse (cheap, single match per frame)
    let playerPos: THREE.Vector3 | null = null
    scene.traverse((o) => {
      if (playerPos) return
      const ud = (o as THREE.Object3D).userData
      if (ud?.isPlayer) {
        playerPos = (o as THREE.Object3D).position
      }
    })
    // Fallback: keep last known
    if (playerPos) playerPosCache.current.copy(playerPos as unknown as THREE.Vector3)

    const myPos = body.current.translation()
    // Stone cylinder radius is ~0.95 (SittingStone.tsx), so sit at least 1.3m
    // from center to avoid clipping into the stone.
    const target = stage === 'seated' || stage === 'beside'
      ? new THREE.Vector3(SITTING_STONE.x - 1.3, 0, SITTING_STONE.z + 1.0)
      : (() => {
          const dx = playerPosCache.current.x - myPos.x
          const dz = playerPosCache.current.z - myPos.z
          const dist = Math.sqrt(dx * dx + dz * dz)
          if (dist > PLAYER_DETECT_RADIUS) return SPAWN  // stay put
          if (dist < STOP_DISTANCE) return new THREE.Vector3(myPos.x, 0, myPos.z) // stand still
          // Walk toward player but stop STOP_DISTANCE short
          const dir = new THREE.Vector3(dx, 0, dz).normalize()
          return new THREE.Vector3(
            playerPosCache.current.x - dir.x * STOP_DISTANCE,
            0,
            playerPosCache.current.z - dir.z * STOP_DISTANCE,
          )
        })()

    // Move kinematic body toward target
    const dx = target.x - myPos.x
    const dz = target.z - myPos.z
    const dist = Math.sqrt(dx * dx + dz * dz)
    if (dist > 0.05) {
      const step = Math.min(dist, WALK_SPEED * dt)
      const nx = myPos.x + (dx / dist) * step
      const nz = myPos.z + (dz / dist) * step
      body.current.setNextKinematicTranslation({ x: nx, y: 0.6, z: nz })

      // Face direction of travel
      const faceAngle = Math.atan2(dx, dz)
      visual.current.rotation.y = THREE.MathUtils.lerp(visual.current.rotation.y, faceAngle, 0.12)
      animState.current = 'walking'
    } else {
      // Stationary — face the player; sit if player has sat down
      const dxp = playerPosCache.current.x - myPos.x
      const dzp = playerPosCache.current.z - myPos.z
      const faceAngle = Math.atan2(dxp, dzp)
      visual.current.rotation.y = THREE.MathUtils.lerp(visual.current.rotation.y, faceAngle, 0.06)
      animState.current = stage === 'seated' || stage === 'beside' ? 'sitting' : 'idle'
    }
  })

  return (
    <RigidBody
      ref={body}
      type="kinematicPosition"
      position={[SPAWN.x, 0.6, SPAWN.z]}
      colliders={false}
    >
      <CapsuleCollider args={[0.4, 0.4]} />
      <group ref={visual} position={[0, -0.6, 0]}>
        {/* GLBAvatar loads /grove3d/models/mochi.glb when present; otherwise
            the procedural bear (species='bear') stands in. */}
        <GLBAvatar species="bear" modelKey="mochi" animState={animState} />
        <Billboard position={[0, 2.1, 0]}>
          <Text fontSize={0.2} color="#f4ead5" outlineWidth={0.014} outlineColor="#2a1810" anchorY="bottom">
            Mochi
          </Text>
        </Billboard>
      </group>
    </RigidBody>
  )
}
