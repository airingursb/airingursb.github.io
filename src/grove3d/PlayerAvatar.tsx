// SHU-733/736 · Player species avatar — GLB-first with procedural fallback.
//
// Tries /grove3d/models/{species}.glb. If file isn't uploaded yet (the
// common case until the user runs Meshy/Tripo/Rodin), GLBAvatar silently
// falls back to ProceduralAnimal, so the scene still renders something.

import { type MutableRefObject } from 'react'
import GLBAvatar from './GLBAvatar'

interface Props {
  species: string
  animState?: MutableRefObject<'idle' | 'walking' | 'running' | 'jumping'>
}

export default function PlayerAvatar({ species, animState }: Props) {
  return <GLBAvatar species={species} animState={animState} />
}
