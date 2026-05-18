import type { EmoteVerb } from './ui'
import type { SfxKey } from './config'

export type EmoteDef = {
  verb: EmoteVerb
  sfx: SfxKey
  durationMs: number   // how long the state holds; 0 = until toggled (sit)
}

// V17.3 — bubble-style emotes (think/laugh/cheer/point) share durations
// with the existing trio. SFX reuses 'wave' where appropriate; the
// renderer just pops a bubble glyph + briefly mirrors the wave animation.
export const EMOTES: Record<EmoteVerb, EmoteDef> = {
  wave:   { verb: 'wave',   sfx: 'wave', durationMs: 1500 },
  sit:    { verb: 'sit',    sfx: 'sit',  durationMs: 0 },
  dance:  { verb: 'dance',  sfx: 'dance', durationMs: 3000 },
  say:    { verb: 'say',    sfx: 'say',  durationMs: 3000 },
  letter: { verb: 'letter', sfx: 'say',  durationMs: 0 },  // letter modal is its own thing
  think:  { verb: 'think',  sfx: 'wave', durationMs: 2200 },
  laugh:  { verb: 'laugh',  sfx: 'wave', durationMs: 2200 },
  cheer:  { verb: 'cheer',  sfx: 'wave', durationMs: 1800 },
  point:  { verb: 'point',  sfx: 'wave', durationMs: 1800 }
}

export function getEmote(verb: string): EmoteDef | null {
  return (EMOTES as Record<string, EmoteDef | undefined>)[verb] ?? null
}
