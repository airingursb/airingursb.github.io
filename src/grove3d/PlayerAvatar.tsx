// SHU-733 · Player species avatar — high-poly procedural via ProceduralAnimal
//
// Originally tried GLB auto-load + placeholder capsule fallback, but per
// 2026-05-23 design call we ship procedural meshes directly (~10-15k tris
// per species) so each species reads as a distinct, detailed character
// without needing to source 11 CC0 GLBs.
//
// Animation: useFrame-driven mesh group transforms (walk = sin-wave limb
// rotation, idle = breath + head bob + tail sway, jump = compress legs).
// No skeletal bone rig.

import { type MutableRefObject } from 'react'
import ProceduralAnimal from './ProceduralAnimal'

interface Props {
  species: string
  animState?: MutableRefObject<'idle' | 'walking' | 'running' | 'jumping'>
}

export default function PlayerAvatar({ species, animState }: Props) {
  return <ProceduralAnimal species={species} animState={animState} />
}
