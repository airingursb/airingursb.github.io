import {
  VOLUME_CHANNELS,
  VOLUME_DEFAULTS,
  VOLUME_STORAGE_KEY,
  type VolumeChannel
} from './config'

type State = Record<VolumeChannel, number>
const state: State = { ...VOLUME_DEFAULTS }
let loaded = false
const listeners: Array<(ch: VolumeChannel, v: number) => void> = []

function load(): State {
  if (loaded) return state
  try {
    const raw = localStorage.getItem(VOLUME_STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<State>
      for (const ch of VOLUME_CHANNELS) {
        const v = parsed[ch]
        if (typeof v === 'number' && v >= 0 && v <= 1) state[ch] = v
      }
    }
  } catch {}
  loaded = true
  return state
}

function persist() {
  try { localStorage.setItem(VOLUME_STORAGE_KEY, JSON.stringify(state)) } catch {}
}

export function getVolume(ch: VolumeChannel): number {
  load()
  return state[ch]
}

export function setVolume(ch: VolumeChannel, v: number) {
  load()
  const clamped = Math.max(0, Math.min(1, v))
  state[ch] = clamped
  persist()
  for (const l of listeners) l(ch, clamped)
}

export function effectiveSfxVolume(): number {
  load()
  return state.master * state.sfx
}

export function effectiveBgmVolume(): number {
  load()
  return state.master * state.bgm
}

export function effectiveAmbientVolume(): number {
  load()
  return state.master * state.ambient
}

export function onVolumeChange(cb: (ch: VolumeChannel, v: number) => void) {
  listeners.push(cb)
}

export { VOLUME_CHANNELS, type VolumeChannel } from './config'
