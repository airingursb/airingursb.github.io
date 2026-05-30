// SHU-733 Phase 2 · Player controller
//
// rapier RigidBody + CapsuleCollider for physics. WASD move, mouse look
// (pointer lock), Space jump. Visual mesh comes from PlayerAvatar (species-
// dependent, falls back to placeholder capsule when GLB not yet sourced).
//
// Camera is a third-person follow that lerps behind the player.

import { useRef, useEffect, useMemo } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { RigidBody, CapsuleCollider, type RapierRigidBody } from '@react-three/rapier'
import * as THREE from 'three'
import PlayerAvatar from './PlayerAvatar'
import { useGroveStore } from './store'
import { sendMove } from './ws'

const WALK_SPEED = 4
const RUN_SPEED  = 7
const JUMP_IMPULSE = 5
const MOUSE_SENS = 0.0028
// SHU-733 · third-person camera convention: camera sits BEHIND the player,
// player faces +Z (after GLB rotation fix), W moves +Z into the scene away
// from camera. Was +4.5 (in front of player), now -4.5 (behind).
const CAMERA_OFFSET = new THREE.Vector3(0, 2.2, -4.5)

interface Props {
  spawn?: [number, number, number]
}

export default function Player({ spawn = [-2, 1.2, 4] }: Props) {
  const body = useRef<RapierRigidBody>(null)
  const visual = useRef<THREE.Group>(null)
  const { camera, gl } = useThree()
  const keys = useRef<Record<string, boolean>>({})
  const yaw = useRef(0)
  const pitch = useRef(-0.15)
  const animState = useRef<'idle' | 'walking' | 'running' | 'jumping' | 'sitting'>('idle')
  const lastJumpAt = useRef(0)
  const species = useGroveStore((s) => s.species)
  const setStage = useGroveStore((s) => s.setStage)
  const stage = useGroveStore((s) => s.stage)

  // Input handlers
  useEffect(() => {
    const dom = gl.domElement
    const onKey = (e: KeyboardEvent) => {
      // Allow chat overlay to capture input when seated
      if (stage === 'seated' && (e.code === 'KeyW' || e.code === 'KeyA' || e.code === 'KeyS' || e.code === 'KeyD' || e.code === 'Space')) return
      keys.current[e.code] = e.type === 'keydown'
    }
    const onMouse = (e: MouseEvent) => {
      if (document.pointerLockElement !== dom) return
      yaw.current -= e.movementX * MOUSE_SENS
      pitch.current = Math.max(-1.2, Math.min(0.3, pitch.current - e.movementY * MOUSE_SENS))
    }
    const onClick = () => {
      if (!document.pointerLockElement && stage !== 'seated') dom.requestPointerLock?.()
    }
    window.addEventListener('keydown', onKey)
    window.addEventListener('keyup', onKey)
    window.addEventListener('mousemove', onMouse)
    dom.addEventListener('click', onClick)
    return () => {
      window.removeEventListener('keydown', onKey)
      window.removeEventListener('keyup', onKey)
      window.removeEventListener('mousemove', onMouse)
      dom.removeEventListener('click', onClick)
    }
  }, [gl, stage])

  // Movement + camera per frame
  useFrame((_, dt) => {
    if (!body.current || !visual.current) return

    // Build move vector from keys (relative to yaw)
    const forward = (keys.current.KeyW ? 1 : 0) - (keys.current.KeyS ? 1 : 0)
    // Camera sits at -Z behind player (looking +Z). In that view, world +X
    // is the camera's LEFT, so strafe sign must invert to make D = right.
    const strafe  = (keys.current.KeyA ? 1 : 0) - (keys.current.KeyD ? 1 : 0)
    const running = !!keys.current.ShiftLeft
    const moving = forward !== 0 || strafe !== 0
    const speed = running ? RUN_SPEED : WALK_SPEED

    const cosY = Math.cos(yaw.current)
    const sinY = Math.sin(yaw.current)
    const vx = (strafe * cosY + forward * sinY) * speed
    const vz = (strafe * -sinY + forward * cosY) * speed
    const cur = body.current.linvel()
    body.current.setLinvel({ x: vx, y: cur.y, z: vz }, true)

    // Jump (cooldown 300ms, very loose ground check)
    if (keys.current.Space && Date.now() - lastJumpAt.current > 300 && Math.abs(cur.y) < 0.3) {
      body.current.applyImpulse({ x: 0, y: JUMP_IMPULSE, z: 0 }, true)
      lastJumpAt.current = Date.now()
      animState.current = 'jumping'
    }

    // Rotate visual to face move direction
    if (moving) {
      const faceAngle = Math.atan2(vx, vz)
      visual.current.rotation.y = THREE.MathUtils.lerp(visual.current.rotation.y, faceAngle, 0.18)
      animState.current = running ? 'running' : 'walking'
    } else if (stage === 'seated') {
      animState.current = 'sitting'
    } else if (Math.abs(cur.y) < 0.3) {
      animState.current = 'idle'
    }

    // SHU-733/735 · multiplayer position broadcast (throttled inside sendMove)
    const _pos = body.current.translation()
    sendMove(_pos.x, _pos.y, _pos.z, visual.current.rotation.y)

    // Camera follow (orbit around player at yaw/pitch)
    const playerPos = body.current.translation()
    const camOffset = CAMERA_OFFSET.clone()
      .applyAxisAngle(new THREE.Vector3(1, 0, 0), pitch.current)
      .applyAxisAngle(new THREE.Vector3(0, 1, 0), yaw.current)
    camera.position.lerp(
      new THREE.Vector3(playerPos.x + camOffset.x, playerPos.y + camOffset.y, playerPos.z + camOffset.z),
      0.18,
    )
    camera.lookAt(playerPos.x, playerPos.y + 0.8, playerPos.z)

    // Stage advance: if user walks within 6m of Airing, advance approach→beside
    // (Airing position is hardcoded [3, 0, -1] for now; Phase 4 reads from Airing component)
    if (stage === 'intro' || stage === 'approach') {
      const dxToAiring = playerPos.x - 3
      const dzToAiring = playerPos.z - (-1)
      const distToAiring = Math.sqrt(dxToAiring * dxToAiring + dzToAiring * dzToAiring)
      if (distToAiring < 6 && stage === 'intro') setStage('approach')

      // Sitting stone is at [1.2, 0, 1.5]; sit when within 1.2m
      const dxToStone = playerPos.x - 1.2
      const dzToStone = playerPos.z - 1.5
      const distToStone = Math.sqrt(dxToStone * dxToStone + dzToStone * dzToStone)
      if (distToStone < 1.2 && stage === 'approach') {
        setStage('beside')
        // Brief delay before seated → gives time for camera to settle
        setTimeout(() => useGroveStore.getState().setStage('seated'), 800)
      }
    }
  })

  return (
    <RigidBody
      ref={body}
      position={spawn}
      colliders={false}
      enabledRotations={[false, false, false]}
      mass={1}
      linearDamping={4}
    >
      <CapsuleCollider args={[0.35, 0.35]} />
      {/* Capsule center settles at y=0.7 (radius+halfHeight). Mesh feet are
          at mesh-space y=0, so drop the visual by 0.7 to plant the feet on
          the ground. Matches Airing NPC's -0.6 offset (its body is at y=0.6). */}
      <group ref={visual} position={[0, -0.7, 0]}>
        <PlayerAvatar species={species} animState={animState} />
      </group>
    </RigidBody>
  )
}
