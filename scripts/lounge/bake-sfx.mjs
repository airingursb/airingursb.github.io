#!/usr/bin/env node
// Synthesize lounge SFX via ffmpeg. All sounds are short (<200ms) procedural
// blips/chimes — pure CC0 (no source material). Output: both .ogg and .mp3
// in public/lounge/assets/audio/sfx/.
//
// Run: node scripts/lounge/bake-sfx.mjs

import { execSync } from 'node:child_process'
import { mkdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..')
const OUT = join(ROOT, 'public', 'lounge', 'assets', 'audio', 'sfx')
mkdirSync(OUT, { recursive: true })

const SFX = [
  ['click',      'sine=frequency=880:duration=0.04',                          'afade=t=out:st=0.03:d=0.01'],
  ['footstep_a', 'anoisesrc=color=brown:duration=0.06:amplitude=0.4',         'lowpass=f=300,afade=t=out:st=0.04:d=0.02'],
  ['footstep_b', 'anoisesrc=color=brown:duration=0.06:amplitude=0.35:seed=42','lowpass=f=320,afade=t=out:st=0.04:d=0.02'],
  ['wave',       'sine=frequency=1200:duration=0.18',                         'afade=t=in:st=0:d=0.01,afade=t=out:st=0.12:d=0.06,vibrato=f=8:d=0.5'],
  ['sit',        'anoisesrc=color=pink:duration=0.12:amplitude=0.5',          'lowpass=f=200,afade=t=out:st=0.08:d=0.04'],
  ['dance',      'sine=frequency=1568:duration=0.16',                         'afade=t=in:st=0:d=0.01,afade=t=out:st=0.10:d=0.06,vibrato=f=12:d=0.7'],
  ['say',        'sine=frequency=660:duration=0.08',                          'afade=t=in:st=0:d=0.005,afade=t=out:st=0.05:d=0.03'],
  ['menu_open',  'sine=frequency=540:duration=0.06',                          'afade=t=out:st=0.04:d=0.02'],
  ['menu_close', 'sine=frequency=440:duration=0.06',                          'afade=t=out:st=0.04:d=0.02']
]

const VOL = '-6dB'

for (const [key, source, filter] of SFX) {
  const fullFilter = `${filter},volume=${VOL}`
  const ogg = join(OUT, `${key}.ogg`)
  const mp3 = join(OUT, `${key}.mp3`)
  execSync(
    `ffmpeg -y -f lavfi -i "${source}" -af "${fullFilter}" -c:a libopus -b:a 64k "${ogg}"`,
    { stdio: ['ignore', 'ignore', 'inherit'] }
  )
  execSync(
    `ffmpeg -y -f lavfi -i "${source}" -af "${fullFilter}" -c:a libmp3lame -q:a 4 "${mp3}"`,
    { stdio: ['ignore', 'ignore', 'inherit'] }
  )
  console.log(`OK ${key}.{ogg,mp3}`)
}
