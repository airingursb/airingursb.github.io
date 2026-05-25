// Web-Audio-driven ambient noise + small chime.
// Zero asset weight — everything is procedurally generated at runtime.
// AudioContext is lazy-initialized on first user gesture (browsers
// require this to allow audio).

export type NoiseColor = 'off' | 'brown' | 'pink' | 'white' | 'wind' | 'water' | 'forest'

let ctx: AudioContext | null = null
let source: AudioBufferSourceNode | null = null
let gain: GainNode | null = null
let filter: BiquadFilterNode | null = null
let lfo: OscillatorNode | null = null
let lfoGain: GainNode | null = null
let birdTimer: number | null = null
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
  wind: 0.28,    // filtered brown + LFO — feels louder so add gain
  water: 0.20,   // filtered pink, narrower band
  forest: 0.16,  // pink + bird chirps overlay
}

// Underlying noise color for the procedural soundscapes
const SOUNDSCAPE_BASE: Record<'wind' | 'water' | 'forest', 'brown' | 'pink' | 'white'> = {
  wind: 'brown',
  water: 'pink',
  forest: 'pink',
}

// Cleanly tear down all active audio nodes — used before switching to
// a new soundscape or turning off. Birds need their setInterval cleared.
function teardown(): void {
  if (source) { try { source.stop() } catch {} try { source.disconnect() } catch {} source = null }
  if (gain)   { try { gain.disconnect() } catch {} gain = null }
  if (filter) { try { filter.disconnect() } catch {} filter = null }
  if (lfo)    { try { lfo.stop() } catch {} try { lfo.disconnect() } catch {} lfo = null }
  if (lfoGain){ try { lfoGain.disconnect() } catch {} lfoGain = null }
  if (birdTimer !== null) { window.clearTimeout(birdTimer); birdTimer = null }
}

export function setNoise(color: NoiseColor): void {
  if (typeof window === 'undefined') return
  currentColor = color
  teardown()
  if (color === 'off') return

  const c = getCtx()
  if (c.state === 'suspended') c.resume().catch(() => {})

  // Determine the underlying noise color for procedural soundscapes
  const baseColor = (color === 'wind' || color === 'water' || color === 'forest')
    ? SOUNDSCAPE_BASE[color]
    : color
  const buffer = makeNoiseBuffer(c, baseColor)
  source = c.createBufferSource()
  source.buffer = buffer
  source.loop = true
  gain = c.createGain()
  gain.gain.value = 0

  // Insert filter chain for procedural soundscapes
  if (color === 'wind') {
    // Wind = TWO bands of brown noise — low rumble (300Hz bandpass) +
    // high leaf-rustle (2500Hz highpass). Single-band 380Hz alone read
    // as HVAC; the dual-band has the character of real wind through
    // branches. LFO modulates both filter frequencies in unison for
    // unified gust cadence.
    filter = c.createBiquadFilter()
    filter.type = 'bandpass'
    filter.frequency.value = 300
    filter.Q.value = 0.6
    const filter2 = c.createBiquadFilter()
    filter2.type = 'highpass'
    filter2.frequency.value = 2500
    filter2.Q.value = 0.4
    const rustleGain = c.createGain()
    rustleGain.gain.value = 0.5   // sibilant top is quieter than rumble
    lfo = c.createOscillator()
    lfo.type = 'sine'
    lfo.frequency.value = 0.16    // 6s period — slow natural gust
    lfoGain = c.createGain()
    lfoGain.gain.value = 220
    lfo.connect(lfoGain)
    lfoGain.connect(filter.frequency)
    // Also modulate the rustle highpass freq for organic top-end variation
    const lfoGain2 = c.createGain()
    lfoGain2.gain.value = 400
    lfo.connect(lfoGain2)
    lfoGain2.connect(filter2.frequency)
    lfo.start()
    source.connect(filter)
    source.connect(filter2)
    filter.connect(gain)
    filter2.connect(rustleGain)
    rustleGain.connect(gain)
  } else if (color === 'water') {
    // Water = pink noise → narrow bandpass around 1200 (trickle range)
    filter = c.createBiquadFilter()
    filter.type = 'bandpass'
    filter.frequency.value = 1200
    filter.Q.value = 1.4
    lfo = c.createOscillator()
    lfo.type = 'sine'
    lfo.frequency.value = 0.6     // faster ripple cadence
    lfoGain = c.createGain()
    lfoGain.gain.value = 280
    lfo.connect(lfoGain)
    lfoGain.connect(filter.frequency)
    lfo.start()
    source.connect(filter)
    filter.connect(gain)
  } else if (color === 'forest') {
    // Forest = pink → lowpass (muffled distance) + sparse bird chirps
    filter = c.createBiquadFilter()
    filter.type = 'lowpass'
    filter.frequency.value = 1800
    filter.Q.value = 0.5
    source.connect(filter)
    filter.connect(gain)
    // Bird chirp scheduler — self-rescheduling setTimeout for TRULY
    // random 4-12s intervals. setInterval(6000) was fixed-cadence
    // (read like a metronome). Reschedule clears teardown automatically.
    function scheduleBird() {
      if (currentColor !== 'forest') return
      const next = 4000 + Math.random() * 8000  // 4-12s
      birdTimer = window.setTimeout(() => {
        if (currentColor !== 'forest') return
        playBirdChirp()
        scheduleBird()
      }, next) as unknown as number
    }
    // First chirp early so user knows the soundscape changed
    birdTimer = window.setTimeout(() => {
      if (currentColor === 'forest') {
        playBirdChirp()
        scheduleBird()
      }
    }, 1200) as unknown as number
  } else {
    source.connect(gain)
  }

  gain.connect(c.destination)
  source.start()
  gain.gain.linearRampToValueAtTime(VOL[color], c.currentTime + 0.6)
}

// Procedural bird chirp — 2-3 quick sine bursts at slightly varying
// pitches. Cheap (~3 oscillators per chirp, ~250ms each).
function playBirdChirp(): void {
  if (!ctx) return
  const c = ctx
  const now = c.currentTime
  const notes = 2 + Math.floor(Math.random() * 2)
  const baseFreq = 1800 + Math.random() * 1200
  for (let i = 0; i < notes; i++) {
    const osc = c.createOscillator()
    osc.type = 'sine'
    osc.frequency.value = baseFreq * (0.9 + Math.random() * 0.4)
    const g = c.createGain()
    const start = now + i * 0.11
    g.gain.setValueAtTime(0, start)
    g.gain.linearRampToValueAtTime(0.06, start + 0.02)
    g.gain.exponentialRampToValueAtTime(0.0001, start + 0.18)
    osc.connect(g)
    g.connect(c.destination)
    osc.start(start)
    osc.stop(start + 0.2)
  }
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
