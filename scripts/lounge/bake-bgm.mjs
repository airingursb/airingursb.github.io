#!/usr/bin/env node
// V11.3 — Bake ambient BGM loops for every room via ffmpeg lavfi.
//
// Approach: layer 2-3 sine waves at slow rates, gentle tremolo, lowpass for
// warmth, and a long crossfade-friendly loop length so abrupt restart is
// imperceptible. Each track is ~30s, mono, low bitrate (lounge ambient is
// background, not foreground music).
//
// Output: public/lounge/assets/audio/bgm/<id>.ogg + .mp3 (same dual-format
// pattern as bake-jam).
//
// Run: node scripts/lounge/bake-bgm.mjs

import { execSync } from 'node:child_process'
import { mkdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..')
const BGM_DIR = join(ROOT, 'public', 'lounge', 'assets', 'audio', 'bgm')
const AMB_DIR = join(ROOT, 'public', 'lounge', 'assets', 'audio', 'ambient')
mkdirSync(BGM_DIR, { recursive: true })
mkdirSync(AMB_DIR, { recursive: true })

const LOOP_SECONDS = 32

// Each room gets a 2-3 voice "chord" + tremolo + lowpass. Voice freqs
// chosen for a calm key (C / D minor / F major). Sine = pure tone, no
// percussive transients → loops cleanly.
const BGM = [
  // Existing manifest entries (overwrite the placeholders with real audio):
  { id: 'lobby_day',         freqs: [220, 277.18, 329.63], tempo: 0.20, lp: 1200, vol: -18 },  // A minor
  { id: 'dj_floor_party',    freqs: [110, 138.59, 220],    tempo: 0.95, lp: 1800, vol: -16 },  // A minor pulse
  { id: 'balcony_outside',   freqs: [196, 246.94],         tempo: 0.10, lp: 1000, vol: -22 },  // G + B (soft open chord)
  { id: 'library_quiet',     freqs: [174.61, 220, 261.63], tempo: 0.10, lp: 900,  vol: -22 },  // F + A + C
  // V11.3 new entries:
  { id: 'kitchen_warm',      freqs: [261.63, 329.63, 392], tempo: 0.30, lp: 1400, vol: -18 },  // C major triad
  { id: 'workshop_tinker',   freqs: [220, 261.63],         tempo: 0.50, lp: 1500, vol: -20 },  // open 5th
  { id: 'rooftop_dusk',      freqs: [196, 246.94, 329.63], tempo: 0.12, lp: 1100, vol: -20 },  // soft Em-ish
  { id: 'grove_breeze',      freqs: [174.61, 220, 277.18], tempo: 0.18, lp: 1000, vol: -22 },  // F-A-C# (lydian-ish)
  { id: 'home_lullaby',      freqs: [220, 277.18],         tempo: 0.10, lp: 850,  vol: -20 },  // very still
  { id: 'bedroom_night',     freqs: [196, 261.63],         tempo: 0.10, lp: 800,  vol: -24 },  // bedroom shared
  { id: 'beach_sun',         freqs: [261.63, 392, 523.25], tempo: 0.22, lp: 1500, vol: -22 },  // bright C major
  { id: 'workshop_mech',     freqs: [110, 220],            tempo: 0.40, lp: 1200, vol: -20 }   // alt mechanic feel
]

function buildFilter(freqs, tempo, lp) {
  // Build a layered chord via multiple sine sources + amix. Tremolo at
  // `tempo` Hz adds subtle motion. Lowpass at `lp` Hz darkens. Long fades
  // at edges so the loop seam is inaudible.
  const sources = freqs.map(f => `sine=frequency=${f}:duration=${LOOP_SECONDS}`).join(';')
  const inputs = freqs.map((_, i) => `[${i}:a]`).join('')
  const mixCount = freqs.length
  return {
    sourceArgs: freqs.flatMap(f => ['-f', 'lavfi', '-i', `sine=frequency=${f}:duration=${LOOP_SECONDS}`]),
    filter: `${inputs}amix=inputs=${mixCount}:duration=longest:normalize=0,tremolo=f=${tempo}:d=0.25,lowpass=f=${lp},afade=t=in:st=0:d=2,afade=t=out:st=${LOOP_SECONDS - 2}:d=2`
  }
}

for (const t of BGM) {
  const ogg = join(BGM_DIR, `${t.id}.ogg`)
  const mp3 = join(BGM_DIR, `${t.id}.mp3`)
  const { sourceArgs, filter } = buildFilter(t.freqs, t.tempo, t.lp)
  console.log(`baking BGM ${t.id} (${t.freqs.length} voices, lp ${t.lp}Hz)…`)
  const oggArgs = ['-y', ...sourceArgs, '-filter_complex', `${filter},volume=${t.vol}dB`, '-ac', '1', '-ar', '24000', '-c:a', 'libopus', '-b:a', '32k', ogg]
  const mp3Args = ['-y', ...sourceArgs, '-filter_complex', `${filter},volume=${t.vol}dB`, '-ac', '1', '-ar', '22050', '-c:a', 'libmp3lame', '-q:a', '6', mp3]
  execSync(`ffmpeg ${oggArgs.map(a => `'${a.replace(/'/g, "'\\''")}'`).join(' ')}`, { stdio: ['ignore', 'ignore', 'inherit'] })
  execSync(`ffmpeg ${mp3Args.map(a => `'${a.replace(/'/g, "'\\''")}'`).join(' ')}`, { stdio: ['ignore', 'ignore', 'inherit'] })
}

// ─── Ambient layers (room SFX beds) ───────────────────────────────
// These overlay BGM. Use shorter loops + brown noise + filter for textures.
const AMB = [
  { id: 'cafe_chatter',  recipe: 'anoisesrc=color=pink:duration=24,lowpass=f=600,volume=-30dB' },
  { id: 'beat_thump',    recipe: `sine=frequency=60:duration=24,tremolo=f=2.2:d=0.6,lowpass=f=200,volume=-22dB` },
  { id: 'wind',          recipe: 'anoisesrc=color=pink:duration=24,lowpass=f=400,volume=-28dB' },
  { id: 'pages_turning', recipe: 'anoisesrc=color=white:duration=24,bandpass=f=2400:w=600,volume=-34dB' },
  { id: 'rain',          recipe: 'anoisesrc=color=white:duration=24,lowpass=f=1800,volume=-26dB' }
]

for (const a of AMB) {
  const ogg = join(AMB_DIR, `${a.id}.ogg`)
  const mp3 = join(AMB_DIR, `${a.id}.mp3`)
  console.log(`baking ambient ${a.id}…`)
  execSync(`ffmpeg -y -f lavfi -i "${a.recipe}" -ac 1 -ar 24000 -c:a libopus -b:a 24k "${ogg}"`, { stdio: ['ignore', 'ignore', 'inherit'] })
  execSync(`ffmpeg -y -f lavfi -i "${a.recipe}" -ac 1 -ar 22050 -c:a libmp3lame -q:a 8 "${mp3}"`, { stdio: ['ignore', 'ignore', 'inherit'] })
}

console.log(`\nDONE — ${BGM.length} BGM tracks + ${AMB.length} ambients baked.`)
