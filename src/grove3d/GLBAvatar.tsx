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
import ProceduralAnimal from './ProceduralAnimal'

interface Props {
  species: string
  /** Override the GLB filename when it differs from species (e.g. NPC Mochi
   *  uses 'mochi.glb' but its procedural fallback is the bear species). */
  modelKey?: string
  animState?: MutableRefObject<'idle' | 'walking' | 'running' | 'jumping'>
}

export default function GLBAvatar({ species, modelKey, animState }: Props) {
  const url = `/grove3d/models/${modelKey ?? species}.glb`
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

function GLBMesh({ url, animState }: { url: string; animState?: MutableRefObject<'idle' | 'walking' | 'running' | 'jumping'> }) {
  const { scene, animations } = useGLTF(url)
  const group = useRef<THREE.Group>(null)
  // Clone once so multiple instances (peers + player) don't share material refs
  const cloned = useMemo(() => scene.clone(true), [scene])
  const { actions, mixer } = useAnimations(animations, group)

  // Enable shadows on every mesh in the imported scene
  useEffect(() => {
    cloned.traverse((o) => {
      const m = o as THREE.Mesh
      if (m.isMesh) {
        m.castShadow = true
        m.receiveShadow = true
      }
    })
  }, [cloned])

  // Crossfade between named clips driven by animState
  const lastState = useRef<string | null>(null)
  useFrame(() => {
    const state = animState?.current ?? 'idle'
    if (state === lastState.current) return
    lastState.current = state
    const target = clipFor(state, actions)
    if (!target) return
    // fade out everything else
    for (const name in actions) {
      const a = actions[name]
      if (!a) continue
      if (a === target) continue
      a.fadeOut(0.2)
    }
    target.reset().fadeIn(0.2).play()
  })

  return (
    <group ref={group}>
      <primitive object={cloned} />
    </group>
  )
}

/** Best-effort match: AI-generated rigs name clips inconsistently. */
function clipFor(state: string, actions: Record<string, THREE.AnimationAction | null>): THREE.AnimationAction | null {
  const want =
    state === 'running' ? ['Run', 'Running', 'run'] :
    state === 'walking' ? ['Walk', 'Walking', 'walk'] :
    state === 'jumping' ? ['Jump', 'jump', 'Idle', 'idle'] :
                          ['Idle', 'idle', 'Stand', 'TPose', 'T-Pose']
  for (const name of want) {
    const a = actions[name]
    if (a) return a
    // Loose match — many exporters mangle names
    for (const k of Object.keys(actions)) {
      if (k.toLowerCase().includes(name.toLowerCase()) && actions[k]) return actions[k]!
    }
  }
  // First available clip as last resort (rather than nothing)
  for (const k of Object.keys(actions)) {
    if (actions[k]) return actions[k]
  }
  return null
}
