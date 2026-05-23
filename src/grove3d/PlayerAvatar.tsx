// SHU-733 Phase 3 · Species avatar with GLB auto-load + placeholder fallback.
//
// Strategy:
//   1. Try fetch HEAD `/3d/animals/{species}.glb`
//   2. If 200 → render <RealGLBAvatar species/> via drei useGLTF
//   3. If 404 → render <PlaceholderCapsule species/> (colored capsule + emoji)
//
// As asset sourcing lands files into public/3d/animals/, avatars upgrade
// automatically — no code change required.

import { Suspense, useEffect, useMemo, useState, type MutableRefObject } from 'react'
import { Billboard, Text, useGLTF, useAnimations } from '@react-three/drei'
import * as THREE from 'three'
import { SkeletonUtils } from 'three-stdlib'

const SPECIES_COLOR: Record<string, string> = {
  bear:     '#6a3c1f',
  cat:      '#d8b890',
  fox:      '#c46a2a',
  capybara: '#7a5a3a',
  bird:     '#5878b8',
  bunny:    '#e8d8c8',
  puppy:    '#a87858',
  panda:    '#202020',
  hamster:  '#d8a878',
  penguin:  '#181820',
  frog:     '#3a8848',
}

const SPECIES_ACCENT: Record<string, string> = {
  bear:     '#5a2c10',
  cat:      '#b89870',
  fox:      '#fff0e0',
  capybara: '#5a3a20',
  bird:     '#ffa030',
  bunny:    '#f8e8d8',
  puppy:    '#705438',
  panda:    '#f8f8f8',
  hamster:  '#fff0d8',
  penguin:  '#f8f8f8',
  frog:     '#2a6828',
}

const SPECIES_EMOJI: Record<string, string> = {
  bear: '🐻', cat: '🐱', fox: '🦊', capybara: '🐹', bird: '🐦',
  bunny: '🐰', puppy: '🐶', panda: '🐼', hamster: '🐹',
  penguin: '🐧', frog: '🐸',
}

interface Props {
  species: string
  animState?: MutableRefObject<'idle' | 'walking' | 'running' | 'jumping'>
}

// Module-level cache so we don't re-probe the same URL on every avatar mount
const _assetExistsCache = new Map<string, boolean>()

export default function PlayerAvatar({ species, animState }: Props) {
  const [hasGLB, setHasGLB] = useState<boolean | null>(() => _assetExistsCache.get(species) ?? null)

  useEffect(() => {
    if (hasGLB !== null) return
    const url = `/3d/animals/${species}.glb`
    fetch(url, { method: 'HEAD' })
      .then((r) => {
        const exists = r.ok
        _assetExistsCache.set(species, exists)
        setHasGLB(exists)
      })
      .catch(() => {
        _assetExistsCache.set(species, false)
        setHasGLB(false)
      })
  }, [species, hasGLB])

  if (hasGLB === true) {
    return (
      <Suspense fallback={<PlaceholderCapsule species={species} />}>
        <RealGLBAvatar species={species} animState={animState} />
      </Suspense>
    )
  }
  return <PlaceholderCapsule species={species} />
}

function RealGLBAvatar({ species, animState }: Props) {
  const url = `/3d/animals/${species}.glb`
  const { scene, animations } = useGLTF(url)
  // Clone so multiple instances (peers!) don't share a skeleton
  const cloned = useMemo(() => {
    const c = SkeletonUtils.clone(scene)
    c.traverse((o) => {
      if ((o as THREE.Mesh).isMesh) {
        ;(o as THREE.Mesh).castShadow = true
        ;(o as THREE.Mesh).receiveShadow = true
      }
    })
    return c
  }, [scene])

  const groupRef = useMemo(() => ({ current: null as THREE.Group | null }), [])
  const { actions } = useAnimations(animations, groupRef)

  useEffect(() => {
    if (!animState) {
      actions['Idle']?.reset().fadeIn(0.3).play()
      return
    }
    // Pick action by current anim state; map to common GLB animation names
    const want =
      animState.current === 'walking'  ? 'Walking' :
      animState.current === 'running'  ? 'Running' :
      animState.current === 'jumping'  ? 'Jump'    :
                                         'Idle'
    const action = actions[want] ?? actions['Idle']
    action?.reset().fadeIn(0.2).play()
    return () => { action?.fadeOut(0.2) }
  }, [actions, animState?.current])

  return (
    <group ref={(g) => { groupRef.current = g }} position={[0, -0.7, 0]}>
      <primitive object={cloned} />
    </group>
  )
}

function PlaceholderCapsule({ species }: { species: string }) {
  const color = SPECIES_COLOR[species] ?? '#888'
  const accent = SPECIES_ACCENT[species] ?? '#666'
  const emoji = SPECIES_EMOJI[species] ?? '🐾'

  return (
    <group position={[0, -0.7, 0]}>
      <mesh position={[0, 0.6, 0]} castShadow>
        <capsuleGeometry args={[0.3, 0.55, 8, 16]} />
        <meshStandardMaterial color={color} roughness={0.85} />
      </mesh>
      <mesh position={[0, 1.25, 0]} castShadow>
        <sphereGeometry args={[0.27, 16, 12]} />
        <meshStandardMaterial color={color} roughness={0.85} />
      </mesh>
      <mesh position={[-0.16, 1.42, 0]} castShadow>
        <sphereGeometry args={[0.08, 12, 8]} />
        <meshStandardMaterial color={accent} roughness={0.85} />
      </mesh>
      <mesh position={[0.16, 1.42, 0]} castShadow>
        <sphereGeometry args={[0.08, 12, 8]} />
        <meshStandardMaterial color={accent} roughness={0.85} />
      </mesh>
      <mesh position={[0, 0.6, -0.32]} castShadow>
        <sphereGeometry args={[0.12, 10, 8]} />
        <meshStandardMaterial color={accent} roughness={0.85} />
      </mesh>
      <Billboard position={[0, 1.95, 0]}>
        <Text fontSize={0.22} anchorY="bottom">{emoji}</Text>
      </Billboard>
    </group>
  )
}
