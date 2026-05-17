#!/usr/bin/env node
// Synthesize beach ambient: ocean waves via filtered pink noise + slow
// tremolo to mimic swell. Loopable ~12s.
//
// Run: node scripts/lounge/bake-beach-ambient.mjs

import { execSync } from 'node:child_process'
import { mkdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..')
const OUT = join(ROOT, 'public', 'lounge', 'assets', 'audio', 'ambient')
mkdirSync(OUT, { recursive: true })

const DUR = 12

const source = `anoisesrc=color=pink:duration=${DUR}:amplitude=0.6`
const filter = `lowpass=f=900,highpass=f=120,tremolo=f=0.18:d=0.7,volume=-10dB,afade=t=in:st=0:d=2,afade=t=out:st=${DUR - 2}:d=2`

const ogg = join(OUT, 'waves.ogg')
const mp3 = join(OUT, 'waves.mp3')
console.log('baking waves.ogg + waves.mp3 (~12s)…')
execSync(
  `ffmpeg -y -f lavfi -i "${source}" -af "${filter}" -ac 1 -ar 24000 -c:a libopus -b:a 32k "${ogg}"`,
  { stdio: ['ignore', 'ignore', 'inherit'] }
)
execSync(
  `ffmpeg -y -f lavfi -i "${source}" -af "${filter}" -ac 1 -ar 22050 -c:a libmp3lame -q:a 6 "${mp3}"`,
  { stdio: ['ignore', 'ignore', 'inherit'] }
)
console.log('OK waves')
