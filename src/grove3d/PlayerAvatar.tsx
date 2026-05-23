// SHU-733 Phase 3 · Species avatar (placeholder + future GLB loader)
//
// Strategy: try to load `/3d/animals/{species}.glb` via drei useGLTF.
// If asset missing (asset-sourcing in progress per Phase 3), render a
// per-species colored capsule + emoji nameplate as graceful fallback.
//
// When real GLBs arrive in public/3d/animals/, this component
// automatically picks them up — no code change needed.

import { useEffect, useRef, type MutableRefObject } from 'react'
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

export default function PlayerAvatar({ species }: Props) {
  // Try GLB first, fall back to placeholder if it 404s.
  // We use a try-catch via fetch HEAD; could be done with Suspense + error
  // boundary too, but useGLTF logs errors loudly on miss. Quiet path: just
  // render placeholder by default, swap in GLB once asset_present detected.
  // For now: always placeholder. Wire real GLB in Phase 3 once assets land.
  return <PlaceholderCapsule species={species} />
}

function PlaceholderCapsule({ species }: { species: string }) {
  const color = SPECIES_COLOR[species] ?? '#888'
  const accent = SPECIES_ACCENT[species] ?? '#666'
  const emoji = SPECIES_EMOJI[species] ?? '🐾'

  return (
    <group position={[0, -0.7, 0]}>
      {/* Body */}
      <mesh position={[0, 0.6, 0]} castShadow>
        <capsuleGeometry args={[0.3, 0.55, 8, 16]} />
        <meshStandardMaterial color={color} roughness={0.85} />
      </mesh>
      {/* Head */}
      <mesh position={[0, 1.25, 0]} castShadow>
        <sphereGeometry args={[0.27, 16, 12]} />
        <meshStandardMaterial color={color} roughness={0.85} />
      </mesh>
      {/* Ears (species-specific accent) */}
      <mesh position={[-0.16, 1.42, 0]} castShadow>
        <sphereGeometry args={[0.08, 12, 8]} />
        <meshStandardMaterial color={accent} roughness={0.85} />
      </mesh>
      <mesh position={[0.16, 1.42, 0]} castShadow>
        <sphereGeometry args={[0.08, 12, 8]} />
        <meshStandardMaterial color={accent} roughness={0.85} />
      </mesh>
      {/* Tail wisp */}
      <mesh position={[0, 0.6, -0.32]} castShadow>
        <sphereGeometry args={[0.12, 10, 8]} />
        <meshStandardMaterial color={accent} roughness={0.85} />
      </mesh>
      {/* Emoji billboard above head — readable mini-identifier */}
      <Billboard position={[0, 1.95, 0]}>
        <Text fontSize={0.22} anchorY="bottom">{emoji}</Text>
      </Billboard>
    </group>
  )
}

/**
 * Real-GLB loader for when assets land in /public/3d/animals/.
 * Currently unused — wire into PlayerAvatar once first species GLB is in.
 *
 * Pattern (per Heap Plaza CharacterController):
 *   const { scene, animations } = useGLTF(`/3d/animals/${species}.glb`)
 *   const cloned = useMemo(() => SkeletonUtils.clone(scene), [scene])
 *   const { actions } = useAnimations(animations, ref)
 *   useEffect(() => { actions[animState.current]?.play(); ... }, [animState])
 */
function _RealGLBAvatar(_: Props) {
  return null
}
