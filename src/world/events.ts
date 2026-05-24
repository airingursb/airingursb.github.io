// Typed custom-event bus for the world scene. Avoids scattered
// `e as CustomEvent` casts and gives one source of truth for the
// event contract that crosses Canvas / HTML island boundaries.

import type { Interaction } from './zones'

type ThemeKind = 'day' | 'dusk'

interface WorldEventMap {
  'world-zone-click': { kind: Interaction }
  'world-theme': ThemeKind
  'world-reset-camera': undefined
  'world-whisper-toggle': undefined
  'world-whisper-fire': { text: string }
}

type WorldEventName = keyof WorldEventMap

export function emit<K extends WorldEventName>(name: K, detail: WorldEventMap[K]): void {
  window.dispatchEvent(new CustomEvent(name, { detail }))
}

export function on<K extends WorldEventName>(
  name: K,
  handler: (detail: WorldEventMap[K]) => void,
): () => void {
  function adapter(e: Event) {
    handler((e as CustomEvent<WorldEventMap[K]>).detail)
  }
  window.addEventListener(name, adapter)
  return () => window.removeEventListener(name, adapter)
}
