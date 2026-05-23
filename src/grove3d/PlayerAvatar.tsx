// SHU-733/736 · Player avatar — Peachlight Forest Spirit (Meshy biped pack)
//
// Loads 5 GLBs that share the same skeleton, each containing one
// AnimationClip baked in. We use the Idle file as the primary mesh +
// skeleton source, then steal clips from the other 4 and merge them into
// a single mixer so the player switches between them by animState.
//
// Clip names (input → exposed):
//   Idle_02      → idle    (looping)
//   Walking      → walk    (looping)
//   running      → run     (looping)
//   Walk_to_Sit  → sit     (one-shot, clamps to last frame)
//   Backflip     → jump    (one-shot)

import { useEffect, useMemo, useRef, type MutableRefObject } from 'react'
import { useGLTF, useAnimations } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { clone as cloneWithSkeleton } from 'three/examples/jsm/utils/SkeletonUtils.js'

type AnimState = 'idle' | 'walking' | 'running' | 'jumping' | 'sitting'

const URLS = {
  idle: '/grove3d/models/player/player_idle.glb',
  walk: '/grove3d/models/player/player_walk.glb',
  run:  '/grove3d/models/player/player_run.glb',
  sit:  '/grove3d/models/player/player_sit.glb',
  jump: '/grove3d/models/player/player_jump.glb',
}

interface Props {
  species: string  // currently ignored — peachlight spirit replaces all species
  animState?: MutableRefObject<AnimState>
}

export default function PlayerAvatar({ animState }: Props) {
  // Primary mesh + skeleton + idle clip
  const idle = useGLTF(URLS.idle)
  // Other files only for their clip; we discard their scenes
  const walk = useGLTF(URLS.walk)
  const run  = useGLTF(URLS.run)
  const sit  = useGLTF(URLS.sit)
  const jump = useGLTF(URLS.jump)

  // Clone primary scene with proper bone re-binding
  const cloned = useMemo(() => cloneWithSkeleton(idle.scene) as THREE.Object3D, [idle.scene])

  // Combine all clips, renaming for clean lookup + stripping root motion
  // from one-shot clips so the character stays anchored to the rigid body.
  const clips = useMemo(() => {
    const out: THREE.AnimationClip[] = []
    const push = (anims: THREE.AnimationClip[], name: string, stripRoot: boolean) => {
      if (!anims[0]) return
      const c = anims[0].clone()
      c.name = name
      if (stripRoot) {
        // Drop position tracks on the root bone — keeps rotation tracks so
        // the pose still animates, but the character doesn't translate within
        // clip-space. Without this, Walk_to_Sit visibly walks forward then
        // drops, leaving the mesh far from the physics body.
        c.tracks = c.tracks.filter((t) => !t.name.endsWith('Hips.position'))
      }
      out.push(c)
    }
    push(idle.animations, 'idle', false)
    push(walk.animations, 'walk', true)   // walking has hip Y bob; strip so body stays still
    push(run.animations,  'run',  true)
    push(sit.animations,  'sit',  true)   // CRITICAL: Walk_to_Sit translates forward + down
    push(jump.animations, 'jump', true)   // Backflip flips through air; rapier handles real height
    return out
  }, [idle.animations, walk.animations, run.animations, sit.animations, jump.animations])

  const groupRef = useRef<THREE.Group>(null)
  const { actions } = useAnimations(clips, groupRef)

  // Shadows
  useEffect(() => {
    cloned.traverse((o) => {
      const m = o as THREE.Mesh
      if (m.isMesh) { m.castShadow = true; m.receiveShadow = true }
    })
  }, [cloned])

  // Configure one-shot clips
  useEffect(() => {
    if (actions.sit) {
      actions.sit.setLoop(THREE.LoopOnce, 1)
      actions.sit.clampWhenFinished = true
    }
    if (actions.jump) {
      actions.jump.setLoop(THREE.LoopOnce, 1)
      actions.jump.clampWhenFinished = true
    }
  }, [actions])

  // Map animState → clip name. useFrame is more reliable than setInterval
  // (runs every render frame, can't be stalled by background tabs / GC).
  const lastState = useRef<AnimState | null>(null)
  const lastAction = useRef<THREE.AnimationAction | null>(null)

  useFrame(() => {
    const state = animState?.current ?? 'idle'
    if (state === lastState.current) return
    const name = state === 'walking' ? 'walk'
               : state === 'running' ? 'run'
               : state === 'sitting' ? 'sit'
               : state === 'jumping' ? 'jump'
               :                       'idle'
    const target = actions[name]
    if (!target) return
    if (lastAction.current && lastAction.current !== target) {
      lastAction.current.fadeOut(0.25)
    }
    target.reset().fadeIn(0.25).play()
    lastAction.current = target
    lastState.current = state
  })

  return (
    <group ref={groupRef}>
      <primitive object={cloned} />
    </group>
  )
}

// Preload all 5 GLBs so the first state-switch isn't blocked on network
useGLTF.preload(URLS.idle)
useGLTF.preload(URLS.walk)
useGLTF.preload(URLS.run)
useGLTF.preload(URLS.sit)
useGLTF.preload(URLS.jump)
