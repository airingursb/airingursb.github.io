// Web-Audio-driven ambient noise + small chime.
// Zero asset weight — everything is procedurally generated at runtime.
// AudioContext is lazy-initialized on first user gesture (browsers
// require this to allow audio).

export type NoiseColor = 'off' | 'brown' | 'pink' | 'white'

let ctx: AudioContext | null = null
let source: AudioBufferSourceNode | null = null
let gain: GainNode | null = null
let currentColor: NoiseColor = 'off'

function getCtx(): AudioContext {
  if (!ctx) {
    const AC = (window.AudioContext || (window as any).webkitAudioContext)
    ctx = new AC()
  }
  return ctx
}

function makeNoiseBuffer(c: AudioContext, color: 'brown' | 'pink' | 'white', durationSec = 4): AudioBuffer {
  const sampleRate = c.sampleRate
  const buffer = c.createBuffer(1, Math.floor(sampleRate * durationSec), sampleRate)
  const data = buffer.getChannelData(0)

  if (color === 'white') {
    for (let i = 0; i < data.length; i++) {
      data[i] = Math.random() * 2 - 1
    }
  } else if (color === 'brown') {
    // Brown / red noise — integrated white. Low rumble.
    let last = 0
    for (let i = 0; i < data.length; i++) {
      const w = Math.random() * 2 - 1
      last = (last + 0.02 * w) / 1.02
      data[i] = last * 3.5
    }
  } else {
    // Voss-McCartney pink noise (very close approximation, cheap)
    let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0
    for (let i = 0; i < data.length; i++) {
      const w = Math.random() * 2 - 1
      b0 = 0.99886 * b0 + w * 0.0555179
      b1 = 0.99332 * b1 + w * 0.0750759
      b2 = 0.96900 * b2 + w * 0.1538520
      b3 = 0.86650 * b3 + w * 0.3104856
      b4 = 0.55000 * b4 + w * 0.5329522
      b5 = -0.7616 * b5 - w * 0.0168980
      data[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + w * 0.5362) * 0.11
      b6 = w * 0.115926
    }
  }
  return buffer
}

const VOL: Record<Exclude<NoiseColor, 'off'>, number> = {
  brown: 0.22,
  pink: 0.18,
  white: 0.12,
}

export function setNoise(color: NoiseColor): void {
  if (typeof window === 'undefined') return
  currentColor = color

  // Stop any current source
  if (source) {
    try { source.stop() } catch {}
    try { source.disconnect() } catch {}
    source = null
  }
  if (gain) {
    try { gain.disconnect() } catch {}
    gain = null
  }

  if (color === 'off') return

  const c = getCtx()
  // Must be resumed within a user gesture handler the first time
  if (c.state === 'suspended') {
    c.resume().catch(() => {})
  }

  const buffer = makeNoiseBuffer(c, color)
  source = c.createBufferSource()
  source.buffer = buffer
  source.loop = true
  gain = c.createGain()
  gain.gain.value = 0
  source.connect(gain)
  gain.connect(c.destination)
  source.start()
  // Gentle fade-in
  gain.gain.linearRampToValueAtTime(VOL[color], c.currentTime + 0.6)
}

export function getCurrentNoise(): NoiseColor {
  return currentColor
}

/** Soft sine chime — used by Pomodoro phase change. */
export function playChime(freq = 660, durationSec = 1.4): void {
  if (typeof window === 'undefined') return
  const c = getCtx()
  if (c.state === 'suspended') c.resume().catch(() => {})

  const now = c.currentTime
  const osc = c.createOscillator()
  osc.type = 'sine'
  osc.frequency.value = freq

  const g = c.createGain()
  g.gain.setValueAtTime(0, now)
  g.gain.linearRampToValueAtTime(0.28, now + 0.06)
  g.gain.exponentialRampToValueAtTime(0.001, now + durationSec)

  osc.connect(g)
  g.connect(c.destination)
  osc.start(now)
  osc.stop(now + durationSec)

  // Small second harmonic 0.3s later for "ding-dong" feel
  const osc2 = c.createOscillator()
  osc2.type = 'sine'
  osc2.frequency.value = freq * 0.75
  const g2 = c.createGain()
  g2.gain.setValueAtTime(0, now + 0.3)
  g2.gain.linearRampToValueAtTime(0.2, now + 0.36)
  g2.gain.exponentialRampToValueAtTime(0.001, now + 0.3 + durationSec)
  osc2.connect(g2)
  g2.connect(c.destination)
  osc2.start(now + 0.3)
  osc2.stop(now + 0.3 + durationSec)
}
