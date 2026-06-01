// Office SFX — Web Audio synthesis, no asset files. Tasteful, event-driven:
// a chime when an agent finishes, a buzz on failure, a soft pour on coffee runs,
// faint keyboard clacks while agents code, a sparkle when you pet the cat.
//
// Respects the lounge's mute + master/sfx/ambient volume. The AudioContext is
// created lazily and resumed on the first user gesture (browser autoplay policy),
// so it stays silent until the user interacts — exactly what we want.

import { isMuted } from './audio'
import { effectiveSfxVolume } from './volume'

let ctx: AudioContext | null = null
let master: GainNode | null = null

function ac(): AudioContext | null {
  if (typeof window === 'undefined') return null
  if (!ctx) {
    try {
      const AC = (window.AudioContext || (window as any).webkitAudioContext) as typeof AudioContext
      ctx = new AC()
      master = ctx.createGain()
      master.gain.value = 0.9
      master.connect(ctx.destination)
    } catch { return null }
  }
  return ctx
}

/** Resume the context after a user gesture (autoplay policy). Safe to call often. */
export function resumeOfficeAudio() { try { ac()?.resume?.() } catch {} }

const sfxGain = () => (isMuted() ? 0 : effectiveSfxVolume())

// one short oscillator note
function blip(freq: number, dur: number, type: OscillatorType, vol: number, when = 0) {
  const c = ac(); if (!c || !master) return
  const g0 = sfxGain(); if (g0 <= 0) return
  const t = c.currentTime + when
  const o = c.createOscillator(); const g = c.createGain()
  o.type = type; o.frequency.value = freq
  g.gain.setValueAtTime(0.0001, t)
  g.gain.linearRampToValueAtTime(vol * g0, t + 0.008)
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur)
  o.connect(g); g.connect(master)
  o.start(t); o.stop(t + dur + 0.02)
}

// a filtered noise burst (pour / soft texture)
function noise(dur: number, vol: number, cutoff: number, gainFn: () => number = sfxGain) {
  const c = ac(); if (!c || !master) return
  const g0 = gainFn(); if (g0 <= 0) return
  const t = c.currentTime
  const buf = c.createBuffer(1, Math.max(1, Math.floor(c.sampleRate * dur)), c.sampleRate)
  const d = buf.getChannelData(0)
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1
  const src = c.createBufferSource(); src.buffer = buf
  const filt = c.createBiquadFilter(); filt.type = 'lowpass'; filt.frequency.value = cutoff
  const g = c.createGain()
  g.gain.setValueAtTime(vol * g0, t)
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur)
  src.connect(filt); filt.connect(g); g.connect(master)
  src.start(t); src.stop(t + dur)
}

export function sfxDone() { blip(660, 0.13, 'sine', 0.22); blip(990, 0.20, 'sine', 0.20, 0.10) }   // two-note chime ✓
export function sfxFail() { blip(190, 0.22, 'square', 0.14); blip(120, 0.28, 'square', 0.12, 0.05) } // low buzz ✗
export function sfxPour() { noise(0.55, 0.10, 1400) }                                                 // coffee pour
export function sfxHeart() { blip(880, 0.09, 'triangle', 0.11); blip(1320, 0.13, 'triangle', 0.10, 0.06) } // ❤️ sparkle
export function sfxSpawn() { blip(520, 0.10, 'sine', 0.10); blip(780, 0.12, 'sine', 0.09, 0.05) }     // soft arrival
/** Faint keyboard tick — kept very quiet so a busy room clatters softly under the SFX. */
export function sfxClack() { noise(0.02, 0.04, 4200) }
