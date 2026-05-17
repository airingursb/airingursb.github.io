#!/usr/bin/env node
// Synthesize Listening Booth tracks (V3.2). Each ~12s mono loopable ambient
// pad, CC0 by construction (pure procedural). Output: .ogg + .mp3 in
// public/lounge/assets/audio/booth/.
//
// Run: node scripts/lounge/bake-booth.mjs

import { execSync } from 'node:child_process'
import { mkdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..')
const OUT = join(ROOT, 'public', 'lounge', 'assets', 'audio', 'booth')
mkdirSync(OUT, { recursive: true })

const DUR = 12

const TRACKS = [
  {
    id: 'dawn_drift',
    // Warm pad: two soft sines that drift slightly with tremolo
    source: `sine=frequency=220:duration=${DUR}`,
    filter: `lowpass=f=1200,tremolo=f=0.4:d=0.5,volume=-10dB,afade=t=in:st=0:d=2,afade=t=out:st=${DUR - 2}:d=2`
  },
  {
    id: 'midnight_drift',
    // Sub bass drone
    source: `sine=frequency=65:duration=${DUR}`,
    filter: `lowpass=f=200,tremolo=f=0.25:d=0.6,volume=-8dB,afade=t=in:st=0:d=2,afade=t=out:st=${DUR - 2}:d=2`
  },
  {
    id: 'static_haze',
    // Filtered noise
    source: `anoisesrc=color=pink:duration=${DUR}:amplitude=0.5`,
    filter: `highpass=f=200,lowpass=f=2400,tremolo=f=0.3:d=0.4,volume=-14dB,afade=t=in:st=0:d=2,afade=t=out:st=${DUR - 2}:d=2`
  },
  {
    id: 'warm_bath',
    // Simple major-triad pad — use a single dominant sine with vibrato to fake harmonics
    source: `sine=frequency=196:duration=${DUR}`,
    filter: `lowpass=f=1500,vibrato=f=4:d=0.2,tremolo=f=0.35:d=0.45,volume=-9dB,afade=t=in:st=0:d=2,afade=t=out:st=${DUR - 2}:d=2`
  }
]

for (const t of TRACKS) {
  const ogg = join(OUT, `${t.id}.ogg`)
  const mp3 = join(OUT, `${t.id}.mp3`)
  console.log(`baking ${t.id}…`)
  execSync(
    `ffmpeg -y -f lavfi -i "${t.source}" -af "${t.filter}" -ac 1 -ar 24000 -c:a libopus -b:a 32k "${ogg}"`,
    { stdio: ['ignore', 'ignore', 'inherit'] }
  )
  execSync(
    `ffmpeg -y -f lavfi -i "${t.source}" -af "${t.filter}" -ac 1 -ar 22050 -c:a libmp3lame -q:a 6 "${mp3}"`,
    { stdio: ['ignore', 'ignore', 'inherit'] }
  )
}

console.log('OK', TRACKS.length, 'tracks baked')
