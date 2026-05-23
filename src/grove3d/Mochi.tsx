// SHU-733 Phase 4 · Mochi NPC with simple path AI
//
// State machine:
//   - waits at spawn (head tracks player)
//   - if player within 8m → walks toward player (kinematic body, lerp)
//   - if player sits on stone (stage=seated) → walks to opposite side of stone, sits
//   - looks at player at all times via head/torso rotation
//
// Visual: distinct stylized bear (larger, darker than player-species-bear, with scarf).
// Future Phase 4: swap placeholder for real bear GLB.

import { useRef, useEffect } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { RigidBody, CapsuleCollider, type RapierRigidBody } from '@react-three/rapier'
import { Billboard, Text } from '@react-three/drei'
import * as THREE from 'three'
import { useGroveStore } from './store'

const PLAYER_DETECT_RADIUS = 8
const STOP_DISTANCE = 1.8
const WALK_SPEED = 1.5
const SITTING_STONE = new THREE.Vector3(1.2, 0, 1.5)
const SPAWN = new THREE.Vector3(3, 0, -1)

export default function Mochi() {
  const body = useRef<RapierRigidBody>(null)
  const visual = useRef<THREE.Group>(null)
  const playerPosCache = useRef(new THREE.Vector3(0, 0, 0))
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
    const target = stage === 'seated' || stage === 'beside'
      ? new THREE.Vector3(SITTING_STONE.x - 0.4, 0, SITTING_STONE.z + 0.4) // sit opposite player
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
    } else {
      // Stationary — face the player
      const dxp = playerPosCache.current.x - myPos.x
      const dzp = playerPosCache.current.z - myPos.z
      const faceAngle = Math.atan2(dxp, dzp)
      visual.current.rotation.y = THREE.MathUtils.lerp(visual.current.rotation.y, faceAngle, 0.06)
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
      <group ref={visual}>
        {/* Body — chubbier, taller than player */}
        <mesh position={[0, 0, 0]} castShadow>
          <capsuleGeometry args={[0.4, 0.7, 8, 16]} />
          <meshStandardMaterial color="#523018" roughness={0.85} />
        </mesh>
        {/* Head */}
        <mesh position={[0, 0.78, 0]} castShadow>
          <sphereGeometry args={[0.34, 16, 12]} />
          <meshStandardMaterial color="#523018" roughness={0.85} />
        </mesh>
        {/* Round bear ears */}
        <mesh position={[-0.22, 1.0, 0]} castShadow>
          <sphereGeometry args={[0.13, 12, 8]} />
          <meshStandardMaterial color="#3a1a08" roughness={0.85} />
        </mesh>
        <mesh position={[0.22, 1.0, 0]} castShadow>
          <sphereGeometry args={[0.13, 12, 8]} />
          <meshStandardMaterial color="#3a1a08" roughness={0.85} />
        </mesh>
        {/* Snout (lighter patch) */}
        <mesh position={[0, 0.72, 0.28]} castShadow>
          <sphereGeometry args={[0.16, 12, 8]} />
          <meshStandardMaterial color="#a07050" roughness={0.85} />
        </mesh>
        {/* Scarf — small narrative detail */}
        <mesh position={[0, 0.45, 0]} castShadow>
          <torusGeometry args={[0.38, 0.1, 8, 16]} />
          <meshStandardMaterial color="#7a3838" roughness={0.7} />
        </mesh>

        {/* Name billboard */}
        <Billboard position={[0, 1.6, 0]}>
          <Text fontSize={0.2} color="#f4ead5" outlineWidth={0.014} outlineColor="#2a1810" anchorY="bottom">
            Mochi
          </Text>
        </Billboard>
      </group>
    </RigidBody>
  )
}
