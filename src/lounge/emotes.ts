import type { EmoteVerb } from './ui'
import type { SfxKey } from './config'

export type EmoteDef = {
  verb: EmoteVerb
  sfx: SfxKey
  durationMs: number   // how long the state holds; 0 = until toggled (sit)
}

export const EMOTES: Record<EmoteVerb, EmoteDef> = {
  wave:  { verb: 'wave',  sfx: 'wave',  durationMs: 1500 },
  sit:   { verb: 'sit',   sfx: 'sit',   durationMs: 0 },
  dance: { verb: 'dance', sfx: 'dance', durationMs: 3000 },
  say:   { verb: 'say',   sfx: 'say',   durationMs: 3000 }
}

export function getEmote(verb: string): EmoteDef | null {
  return (EMOTES as Record<string, EmoteDef | undefined>)[verb] ?? null
}
