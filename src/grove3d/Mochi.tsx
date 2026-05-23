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
        {/* High-poly bear — chubbier + larger than player species, distinct identity */}

        {/* Body capsule (32 cap × 48 radial = ~3.5k tris) */}
        <mesh position={[0, 0, 0]} castShadow receiveShadow>
          <capsuleGeometry args={[0.4, 0.7, 32, 48]} />
          <meshStandardMaterial color="#523018" roughness={0.85} />
        </mesh>

        {/* Lighter belly patch — Heap Plaza ornament density */}
        <mesh position={[0, 0, 0.36]} castShadow>
          <sphereGeometry args={[0.3, 28, 22]} />
          <meshStandardMaterial color="#7a4828" roughness={0.85} />
        </mesh>

        {/* Head (high-res 64×48 = ~6k tris) */}
        <mesh position={[0, 0.78, 0]} castShadow>
          <sphereGeometry args={[0.36, 64, 48]} />
          <meshStandardMaterial color="#523018" roughness={0.85} />
        </mesh>

        {/* Round bear ears with inner pads */}
        {[-1, 1].map((side) => (
          <group key={side} position={[side * 0.25, 1.02, 0]}>
            <mesh castShadow>
              <sphereGeometry args={[0.14, 32, 24]} />
              <meshStandardMaterial color="#3a1a08" roughness={0.85} />
            </mesh>
            <mesh position={[0, 0, 0.025]}>
              <sphereGeometry args={[0.09, 24, 18]} />
              <meshStandardMaterial color="#7a3838" roughness={0.85} />
            </mesh>
          </group>
        ))}

        {/* Snout protrusion + nose */}
        <mesh position={[0, 0.7, 0.3]} castShadow>
          <sphereGeometry args={[0.17, 24, 20]} />
          <meshStandardMaterial color="#a07050" roughness={0.85} />
        </mesh>
        <mesh position={[0, 0.74, 0.42]} castShadow>
          <sphereGeometry args={[0.045, 16, 12]} />
          <meshStandardMaterial color="#0a0606" roughness={0.3} />
        </mesh>

        {/* Eyes (two contemplative dots) */}
        {[-1, 1].map((side) => (
          <group key={side} position={[side * 0.13, 0.86, 0.31]}>
            <mesh castShadow>
              <sphereGeometry args={[0.045, 16, 12]} />
              <meshStandardMaterial color="#f8efe0" roughness={0.3} />
            </mesh>
            <mesh position={[0, 0, 0.025]}>
              <sphereGeometry args={[0.025, 12, 10]} />
              <meshStandardMaterial color="#1a0808" roughness={0.2} />
            </mesh>
          </group>
        ))}

        {/* Subtle brows give him a "thinking" look */}
        {[-1, 1].map((side) => (
          <mesh key={side} position={[side * 0.13, 0.93, 0.31]} rotation={[0, 0, side * 0.25]} castShadow>
            <boxGeometry args={[0.07, 0.012, 0.012]} />
            <meshStandardMaterial color="#3a1a08" roughness={0.85} />
          </mesh>
        ))}

        {/* 4 legs (high-res cylinders) */}
        {[
          [-0.16, -0.35,  0.16], [0.16, -0.35,  0.16],
          [-0.16, -0.35, -0.16], [0.16, -0.35, -0.16],
        ].map(([x, y, z], i) => (
          <mesh key={i} position={[x, y, z]} castShadow>
            <cylinderGeometry args={[0.13, 0.15, 0.3, 20]} />
            <meshStandardMaterial color="#3a1a08" roughness={0.85} />
          </mesh>
        ))}

        {/* Scarf — wraps neck (torus + fold flaps), narrative detail */}
        <mesh position={[0, 0.5, 0]} castShadow>
          <torusGeometry args={[0.39, 0.085, 16, 32]} />
          <meshStandardMaterial color="#7a3838" roughness={0.7} />
        </mesh>
        {/* Scarf hanging tail */}
        <mesh position={[0.18, 0.32, 0.18]} rotation={[0.2, 0.5, 0.1]} castShadow>
          <boxGeometry args={[0.08, 0.32, 0.04]} />
          <meshStandardMaterial color="#7a3838" roughness={0.7} />
        </mesh>
        <mesh position={[0.22, 0.18, 0.2]} rotation={[0.3, 0.5, 0.05]} castShadow>
          <boxGeometry args={[0.08, 0.06, 0.045]} />
          <meshStandardMaterial color="#5a2828" roughness={0.65} />
        </mesh>

        {/* Name billboard */}
        <Billboard position={[0, 1.5, 0]}>
          <Text fontSize={0.2} color="#f4ead5" outlineWidth={0.014} outlineColor="#2a1810" anchorY="bottom">
            Mochi
          </Text>
        </Billboard>
      </group>
    </RigidBody>
  )
}
