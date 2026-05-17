#!/usr/bin/env node
// Synthesize jam pad notes (V4.3). 4 short tones (C4 / E4 / G4 / B4),
// ~300ms each, plucky-ish via fast amplitude decay. CC0 by construction.
//
// Run: node scripts/lounge/bake-jam.mjs

import { execSync } from 'node:child_process'
import { mkdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..')
const OUT = join(ROOT, 'public', 'lounge', 'assets', 'audio', 'jam')
mkdirSync(OUT, { recursive: true })

// Equal-temperament frequencies (Hz) for C4-E4-G4-B4 (C major triad + leading tone)
const NOTES = [
  { id: 'pad1', freq: 261.63 },  // C4
  { id: 'pad2', freq: 329.63 },  // E4
  { id: 'pad3', freq: 392.00 },  // G4
  { id: 'pad4', freq: 493.88 }   // B4
]

const DUR = 0.35

for (const n of NOTES) {
  const ogg = join(OUT, `${n.id}.ogg`)
  const mp3 = join(OUT, `${n.id}.mp3`)
  const source = `sine=frequency=${n.freq}:duration=${DUR}`
  const filter = `afade=t=in:st=0:d=0.01,afade=t=out:st=0.08:d=${DUR - 0.08},volume=-8dB`
  console.log(`baking ${n.id} (${n.freq.toFixed(2)}Hz)…`)
  execSync(
    `ffmpeg -y -f lavfi -i "${source}" -af "${filter}" -ac 1 -ar 24000 -c:a libopus -b:a 32k "${ogg}"`,
    { stdio: ['ignore', 'ignore', 'inherit'] }
  )
  execSync(
    `ffmpeg -y -f lavfi -i "${source}" -af "${filter}" -ac 1 -ar 22050 -c:a libmp3lame -q:a 6 "${mp3}"`,
    { stdio: ['ignore', 'ignore', 'inherit'] }
  )
}
console.log('OK', NOTES.length, 'jam pads')
