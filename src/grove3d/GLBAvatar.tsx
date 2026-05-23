// SHU-733/736 · GLB-loading avatar with procedural fallback.
//
// Resolution order:
//   1. HEAD /grove3d/models/{species}.glb — if 200, load with useGLTF
//   2. If 404 or load fails → render ProceduralAnimal({species})
//
// Why the explicit HEAD probe: drei's `useGLTF` throws to the nearest
// ErrorBoundary on 404, which is noisy in dev and racy on first paint.
// A 1-line HEAD short-circuits the load entirely when the file isn't
// there yet — which is the common case until the user uploads GLBs.
//
// Animation plumbing:
//   - If the GLB has clips matching anim names ('Walk' / 'Run' / 'Idle' /
//     'Jump'), we drive them via useAnimations + the animState ref.
//   - If no clips, GLB renders as a static mesh — still a huge upgrade
//     visually over procedural primitives.

import { Suspense, useEffect, useMemo, useRef, useState, type MutableRefObject } from 'react'
import { useGLTF, useAnimations } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
// SkeletonUtils.clone properly re-binds bones for SkinnedMesh — scene.clone()
// alone leaves the cloned mesh referencing the ORIGINAL skeleton, breaking
// per-instance pose (and sometimes making the mesh render at 0 size).
import { clone as cloneWithSkeleton } from 'three/examples/jsm/utils/SkeletonUtils.js'
import ProceduralAnimal from './ProceduralAnimal'

/** SHU-736 debug mode — force every avatar (player + Mochi NPC) to use the
 *  bear GLB while we lock down the visual style. Set to null once each
 *  species has its own GLB shipped in public/grove3d/models/. */
const DEBUG_FORCE_MODEL: string | null = 'bear'

interface Props {
  species: string
  /** Override the GLB filename when it differs from species (e.g. NPC Mochi
   *  uses 'mochi.glb' but its procedural fallback is the bear species). */
  modelKey?: string
  animState?: MutableRefObject<AnimState>
}

export default function GLBAvatar({ species, modelKey, animState }: Props) {
  const effectiveKey = DEBUG_FORCE_MODEL ?? modelKey ?? species
  const url = `/grove3d/models/${effectiveKey}.glb`
  const [status, setStatus] = useState<'checking' | 'present' | 'missing'>('checking')

  useEffect(() => {
    let cancelled = false
    fetch(url, { method: 'HEAD' })
      .then((r) => { if (!cancelled) setStatus(r.ok ? 'present' : 'missing') })
      .catch(() => { if (!cancelled) setStatus('missing') })
    return () => { cancelled = true }
  }, [url])

  if (status === 'missing') {
    return <ProceduralAnimal species={species} animState={animState} />
  }
  if (status === 'checking') {
    // Render procedural during the HEAD check so the player isn't briefly
    // invisible — once the GLB resolves, the swap is one frame.
    return <ProceduralAnimal species={species} animState={animState} />
  }
  return (
    <Suspense fallback={<ProceduralAnimal species={species} animState={animState} />}>
      <GLBMesh url={url} animState={animState} />
    </Suspense>
  )
}

function GLBMesh({ url, animState }: { url: string; animState?: MutableRefObject<AnimState> }) {
  const { scene, animations } = useGLTF(url)
  const group = useRef<THREE.Group>(null)
  const innerGroup = useRef<THREE.Group>(null)
  // Each instance must have its own bone hierarchy — scene.clone() reuses
  // skeleton references and renders nothing for SkinnedMesh. Use SkeletonUtils.
  const cloned = useMemo(() => cloneWithSkeleton(scene) as THREE.Object3D, [scene])
  const { actions } = useAnimations(animations, group)
  const hasClips = Object.keys(actions).length > 0

  // Enable shadows + grab references to the bones we manipulate for sit pose.
  // Bear rig uses Mixamo-ish names — Hips, LeftUpLeg, RightUpLeg, etc.
  const bones = useMemo(() => ({
    hips: null as THREE.Bone | null,
    luL: null as THREE.Bone | null,  // LeftUpLeg
    ruL: null as THREE.Bone | null,  // RightUpLeg
    lL:  null as THREE.Bone | null,  // LeftLeg
    rL:  null as THREE.Bone | null,  // RightLeg
    spine: null as THREE.Bone | null,
    // Snapshot of rest pose so we can restore after exiting sit
    restHips: new THREE.Euler(),
    restLuL: new THREE.Euler(),
    restRuL: new THREE.Euler(),
    restLL: new THREE.Euler(),
    restRL: new THREE.Euler(),
    restSpine: new THREE.Euler(),
    restHipsY: 0,
  }), [cloned])

  useEffect(() => {
    cloned.traverse((o) => {
      const m = o as THREE.Mesh
      if (m.isMesh) { m.castShadow = true; m.receiveShadow = true }
      const b = o as THREE.Bone
      if (b.isBone) {
        if (b.name === 'Hips')        { bones.hips = b;  bones.restHips.copy(b.rotation); bones.restHipsY = b.position.y }
        else if (b.name === 'LeftUpLeg')  { bones.luL = b; bones.restLuL.copy(b.rotation) }
        else if (b.name === 'RightUpLeg') { bones.ruL = b; bones.restRuL.copy(b.rotation) }
        else if (b.name === 'LeftLeg')    { bones.lL = b;  bones.restLL.copy(b.rotation)  }
        else if (b.name === 'RightLeg')   { bones.rL = b;  bones.restRL.copy(b.rotation)  }
        else if (b.name === 'Spine')      { bones.spine = b; bones.restSpine.copy(b.rotation) }
      }
    })
  }, [cloned, bones])

  // Each-frame driver: clip crossfade + per-state special handling
  const lastState = useRef<AnimState | null>(null)
  useFrame(() => {
    const stateNow = animState?.current ?? 'idle'

    if (hasClips) {
      // Sit overrides clips entirely — we hand-pose bones instead
      if (stateNow === 'sitting') {
        for (const name in actions) actions[name]?.stop()
        applySitPose(bones)
        return
      }
      // Restore rest pose if we just exited sit
      if (lastState.current === 'sitting') restoreRestPose(bones)

      if (stateNow === lastState.current) return
      lastState.current = stateNow
      const target = clipFor(stateNow, actions)
      if (!target) return
      for (const name in actions) {
        const a = actions[name]
        if (!a || a === target) continue
        a.fadeOut(0.2)
      }
      target.reset().fadeIn(0.2).play()
      // Walking clip slowed way down reads as a gentle idle sway —
      // bear doesn't ship with a real Idle clip from Meshy rigging.
      target.timeScale = stateNow === 'idle' ? 0.2 : 1.0
    }
  })

  // bear.glb faces +Z natively; no orientation correction needed here.
  // Per-model overrides (if a different GLB faces -Z) can go here later.
  return (
    <group ref={group}>
      <group ref={innerGroup}>
        <primitive object={cloned} />
      </group>
    </group>
  )
}

type AnimState = 'idle' | 'walking' | 'running' | 'jumping' | 'sitting'

/** Best-effort clip match. Meshy rigging names clips like
 *  `Armature|walking_man|baselayer` and `Armature|running|baselayer`. */
function clipFor(state: AnimState, actions: Record<string, THREE.AnimationAction | null>): THREE.AnimationAction | null {
  const want =
    state === 'running' ? ['running', 'run'] :
    state === 'walking' ? ['walking', 'walk'] :
    state === 'jumping' ? ['jump', 'walking'] :
    state === 'idle'    ? ['walking', 'idle'] :  // slow-walk = idle sway
                          ['walking', 'idle']
  for (const tok of want) {
    for (const k of Object.keys(actions)) {
      if (k.toLowerCase().includes(tok) && actions[k]) return actions[k]!
    }
  }
  for (const k of Object.keys(actions)) if (actions[k]) return actions[k]
  return null
}

interface BoneRefs {
  hips: THREE.Bone | null
  luL: THREE.Bone | null; ruL: THREE.Bone | null
  lL: THREE.Bone | null;  rL: THREE.Bone | null
  spine: THREE.Bone | null
  restHips: THREE.Euler; restLuL: THREE.Euler; restRuL: THREE.Euler
  restLL: THREE.Euler;   restRL: THREE.Euler;  restSpine: THREE.Euler
  restHipsY: number
}

/** Sit pose: knees folded forward, hips dropped, slight forward lean. */
function applySitPose(b: BoneRefs) {
  if (b.hips) {
    b.hips.position.y = b.restHipsY - 0.45
    b.hips.rotation.set(0.25, 0, 0)
  }
  if (b.luL) b.luL.rotation.set(-Math.PI / 2, 0, 0)
  if (b.ruL) b.ruL.rotation.set(-Math.PI / 2, 0, 0)
  if (b.lL)  b.lL.rotation.set(Math.PI / 2 + 0.1, 0, 0)
  if (b.rL)  b.rL.rotation.set(Math.PI / 2 + 0.1, 0, 0)
  if (b.spine) b.spine.rotation.set(-0.08, 0, 0)  // small back-lean to balance
}

function restoreRestPose(b: BoneRefs) {
  if (b.hips) { b.hips.position.y = b.restHipsY; b.hips.rotation.copy(b.restHips) }
  if (b.luL) b.luL.rotation.copy(b.restLuL)
  if (b.ruL) b.ruL.rotation.copy(b.restRuL)
  if (b.lL)  b.lL.rotation.copy(b.restLL)
  if (b.rL)  b.rL.rotation.copy(b.restRL)
  if (b.spine) b.spine.rotation.copy(b.restSpine)
}
