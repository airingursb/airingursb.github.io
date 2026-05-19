// V23.4 — Sparse ambient micro-SFX.
//
// Per-room background sounds that play every 30-120s with low volume,
// layered on top of the existing BGM + ambient track. Examples:
//   - Library: soft bell chime
//   - Grove: distant bird chirp
//   - Beach: gull cry
//   - Lobby: faint door-creak / coin clink
//
// We don't ship audio files for these — they're synthesised via Web
// Audio API. Each is a tiny envelope on an oscillator (or filtered
// noise), no more than ~600ms. Total ambient SFX volume is gated by
// the player's SFX volume control.

import { getVolume } from './volume'

type SoundFn = (ctx: AudioContext, destination: AudioNode) => void

let sharedCtx: AudioContext | null = null
function getCtx(): AudioContext | null {
  if (sharedCtx) return sharedCtx
  try {
    const Ctor = (window as any).AudioContext || (window as any).webkitAudioContext
    if (!Ctor) return null
    sharedCtx = new Ctor()
  } catch { return null }
  return sharedCtx
}

// ─── Sound synthesis ────────────────────────────────────────────────────

const bellChime: SoundFn = (ctx, dest) => {
  // Soft sine bell, fundamental + overtone, quick attack / long decay
  const t = ctx.currentTime
  for (const [freq, peak] of [[660, 0.18], [1320, 0.06]]) {
    const osc = ctx.createOscillator()
    const env = ctx.createGain()
    osc.type = 'sine'; osc.frequency.value = freq
    env.gain.setValueAtTime(0, t)
    env.gain.linearRampToValueAtTime(peak, t + 0.02)
    env.gain.exponentialRampToValueAtTime(0.001, t + 1.6)
    osc.connect(env); env.connect(dest)
    osc.start(t); osc.stop(t + 1.7)
  }
}

const birdChirp: SoundFn = (ctx, dest) => {
  // Two quick rising chirps
  const t = ctx.currentTime
  for (let i = 0; i < 2; i++) {
    const start = t + i * 0.18
    const osc = ctx.createOscillator()
    const env = ctx.createGain()
    osc.type = 'sine'
    osc.frequency.setValueAtTime(2800, start)
    osc.frequency.exponentialRampToValueAtTime(3800, start + 0.08)
    env.gain.setValueAtTime(0, start)
    env.gain.linearRampToValueAtTime(0.12, start + 0.01)
    env.gain.exponentialRampToValueAtTime(0.001, start + 0.13)
    osc.connect(env); env.connect(dest)
    osc.start(start); osc.stop(start + 0.16)
  }
}

const gullCry: SoundFn = (ctx, dest) => {
  // Long, slightly bent square-wave tone
  const t = ctx.currentTime
  const osc = ctx.createOscillator()
  const env = ctx.createGain()
  osc.type = 'square'
  osc.frequency.setValueAtTime(900, t)
  osc.frequency.linearRampToValueAtTime(700, t + 0.35)
  env.gain.setValueAtTime(0, t)
  env.gain.linearRampToValueAtTime(0.06, t + 0.03)
  env.gain.exponentialRampToValueAtTime(0.001, t + 0.5)
  osc.connect(env); env.connect(dest)
  osc.start(t); osc.stop(t + 0.55)
}

const coinClink: SoundFn = (ctx, dest) => {
  // High-frequency tap + short ring
  const t = ctx.currentTime
  const osc = ctx.createOscillator()
  const env = ctx.createGain()
  osc.type = 'triangle'
  osc.frequency.value = 2400
  env.gain.setValueAtTime(0, t)
  env.gain.linearRampToValueAtTime(0.08, t + 0.005)
  env.gain.exponentialRampToValueAtTime(0.001, t + 0.25)
  osc.connect(env); env.connect(dest)
  osc.start(t); osc.stop(t + 0.3)
}

const cricketChirp: SoundFn = (ctx, dest) => {
  // 4-5 rapid high pulses simulating a cricket
  const t = ctx.currentTime
  for (let i = 0; i < 4; i++) {
    const start = t + i * 0.08
    const osc = ctx.createOscillator()
    const env = ctx.createGain()
    osc.type = 'square'
    osc.frequency.value = 5400
    env.gain.setValueAtTime(0, start)
    env.gain.linearRampToValueAtTime(0.04, start + 0.005)
    env.gain.exponentialRampToValueAtTime(0.001, start + 0.06)
    osc.connect(env); env.connect(dest)
    osc.start(start); osc.stop(start + 0.07)
  }
}

const pageFlutter: SoundFn = (ctx, dest) => {
  // Short filtered noise burst
  const t = ctx.currentTime
  const dur = 0.25
  const bufferSize = Math.floor(ctx.sampleRate * dur)
  const buf = ctx.createBuffer(1, bufferSize, ctx.sampleRate)
  const data = buf.getChannelData(0)
  for (let i = 0; i < bufferSize; i++) data[i] = (Math.random() * 2 - 1) * 0.5
  const src = ctx.createBufferSource(); src.buffer = buf
  const filter = ctx.createBiquadFilter(); filter.type = 'bandpass'; filter.frequency.value = 2000; filter.Q.value = 1
  const env = ctx.createGain()
  env.gain.setValueAtTime(0, t)
  env.gain.linearRampToValueAtTime(0.1, t + 0.02)
  env.gain.exponentialRampToValueAtTime(0.001, t + dur)
  src.connect(filter); filter.connect(env); env.connect(dest)
  src.start(t); src.stop(t + dur)
}

// ─── Per-room sound bank ────────────────────────────────────────────────

type RoomSoundConfig = {
  /** Each entry is one possible micro-SFX for the room. Picker rolls
   *  one per tick uniformly. */
  sounds: SoundFn[]
  /** Min / max ms between ticks (jittered each round). */
  intervalMs: [number, number]
}

const ROOM_SFX: Record<string, RoomSoundConfig> = {
  room_library:  { sounds: [bellChime, pageFlutter],    intervalMs: [45_000, 90_000] },
  room_grove:    { sounds: [birdChirp, cricketChirp],   intervalMs: [30_000, 75_000] },
  room_beach:    { sounds: [gullCry],                   intervalMs: [40_000, 90_000] },
  room_lobby:    { sounds: [coinClink, bellChime],      intervalMs: [60_000, 120_000] },
  room_balcony:  { sounds: [birdChirp],                 intervalMs: [60_000, 120_000] },
  room_rooftop:  { sounds: [cricketChirp],              intervalMs: [60_000, 120_000] },
  // Indoor crafting / kitchen rooms intentionally omitted — their BGM is
  // already busy enough; adding more layer would clutter.
}

export type AmbientSfxDispose = () => void

/** Start ticking ambient micro-SFX for this room. Returns cleanup. */
export function startAmbientSfx(roomId: string): AmbientSfxDispose {
  const cfg = ROOM_SFX[roomId]
  if (!cfg) return () => {}
  let timer: number | null = null
  const fire = () => {
    const ctx = getCtx()
    if (ctx) {
      // Try to resume in case the user hasn't interacted yet (Chrome
      // autoplay policy). resume() returns a promise; ignore failures.
      if (ctx.state === 'suspended') { try { void ctx.resume() } catch {} }
      // Player's SFX gain (default 1.0). Multiply by 0.35 to stay soft.
      const volume = (getVolume('sfx') ?? 1) * 0.35
      if (volume > 0.005) {
        const master = ctx.createGain()
        master.gain.value = volume
        master.connect(ctx.destination)
        const sound = cfg.sounds[Math.floor(Math.random() * cfg.sounds.length)]
        try { sound(ctx, master) } catch {}
        // Auto-disconnect after a generous window so the GC reclaims nodes.
        setTimeout(() => { try { master.disconnect() } catch {} }, 3000)
      }
    }
    schedule()
  }
  const schedule = () => {
    const [lo, hi] = cfg.intervalMs
    const delay = lo + Math.random() * (hi - lo)
    timer = window.setTimeout(fire, delay)
  }
  // First tick comes earlier than steady-state so the room "introduces" itself.
  timer = window.setTimeout(fire, 8_000 + Math.random() * 12_000)
  return () => {
    if (timer !== null) { clearTimeout(timer); timer = null }
  }
}
