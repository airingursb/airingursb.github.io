#!/usr/bin/env node
// V10.8b — Bake PUPPY + BUNNY pet sprite atlases (regional palettes mirror
// the cat baker). The kitten reuses cat sprites at runtime (PetSprite picks
// the atlas by species). Output: public/lounge/assets/sprites/{puppy,bunny}/<region>/sprite.{png,json}.
//
// All three pet species share the same 13×15 cell layout + frame names so
// the existing animation registrar in bear.ts handles them without changes.

import { createCanvas } from 'canvas'
import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..')

// ─── PUPPY ──────────────────────────────────────────────
// 13×15. Floppy ears droop down to the cheeks. Round face, big eyes, small nose.
const PUPPY_FRAME = [
  [0,0,0,0,0,0,0,0,0,0,0,0,0],
  [0,1,1,0,0,0,0,0,0,0,1,1,0],   // ear root
  [1,2,2,1,1,1,1,1,1,1,2,2,1],   // forehead — ears blend to head
  [1,2,2,2,2,2,2,2,2,2,2,2,1],
  [1,2,2,4,2,2,2,2,2,4,2,2,1],   // eyes
  [1,2,2,2,2,2,2,2,2,2,2,2,1],
  [1,2,2,2,2,4,1,4,2,2,2,2,1],   // nose
  [1,2,2,2,2,1,1,1,2,2,2,2,1],   // mouth
  [0,1,2,2,2,2,2,2,2,2,2,1,0],
  [0,0,1,1,2,2,2,2,2,1,1,0,0],
  [0,0,1,2,2,3,3,3,2,2,1,0,0],
  [0,0,1,2,3,3,3,3,3,2,1,0,0],
  [0,0,1,2,2,2,2,2,2,2,1,0,0],
  [0,0,0,1,2,1,0,1,2,1,0,0,0],
  [0,0,0,1,1,0,0,0,1,1,0,0,0]
]

// ─── BUNNY ──────────────────────────────────────────────
// 13×15. Tall ears at cols 4 + 8 reaching 3 rows up. Smaller round face below.
const BUNNY_FRAME = [
  [0,0,0,0,1,2,1,0,1,2,1,0,0],   // ear tips
  [0,0,0,0,1,2,1,0,1,2,1,0,0],   // ear mid
  [0,0,0,0,1,2,1,1,1,2,1,0,0],   // ear base
  [0,0,1,1,2,2,1,1,1,2,2,1,0],   // head top
  [0,1,2,2,2,2,2,2,2,2,2,2,1],   // forehead
  [1,2,2,4,2,2,2,2,2,4,2,2,1],   // eyes
  [1,2,2,2,2,2,2,2,2,2,2,2,1],
  [1,2,2,2,4,1,2,1,4,2,2,2,1],   // tiny pink nose
  [1,2,2,2,2,1,1,1,2,2,2,2,1],
  [0,1,2,2,2,2,2,2,2,2,2,1,0],
  [0,0,1,1,2,3,3,3,2,1,1,0,0],
  [0,0,1,2,3,3,3,3,3,2,1,0,0],
  [0,0,1,2,2,2,2,2,2,2,1,0,0],
  [0,0,0,1,2,1,0,1,2,1,0,0,0],
  [0,0,0,1,1,0,0,0,1,1,0,0,0]
]

function deriveIdleUp(frame) {
  // Hide eyes + nose row contents (looking away from camera)
  return frame.map((row, i) => {
    if (i === 5 || i === 7) return [row[0], 2,2,2,2,2,2,2,2,2,2,2, row[12]]
    return row
  })
}
function deriveIdleLeft(frame) {
  // Shift eye to col 3, nose to col 4
  return frame.map((row, i) => {
    if (i === 5) return [row[0], 2,2,4,2,2,2,2,2,2,2,2, row[12]]
    if (i === 7) return [row[0], 2,2,2,4,1,2,2,2,2,2,2, row[12]]
    return row
  })
}
function deriveIdleRight(frame) {
  return frame.map((row, i) => {
    if (i === 5) return [row[0], 2,2,2,2,2,2,2,2,4,2,2, row[12]]
    if (i === 7) return [row[0], 2,2,2,2,2,2,2,1,4,2,2, row[12]]
    return row
  })
}
function applyLegShift(frame, leftShift) {
  return frame.map((row, i) => {
    if (i === 13) return leftShift ? [0,0,0,1,2,1,0,0,1,2,1,0,0] : [0,0,1,2,1,0,0,1,2,1,0,0,0]
    if (i === 14) return leftShift ? [0,0,0,1,1,0,0,0,0,1,1,0,0] : [0,0,1,1,0,0,0,0,1,1,0,0,0]
    return row
  })
}
function deriveWave(frame) {
  return frame.map((row, i) => {
    if (i === 1) return [...row.slice(0, 10), 1, 1, 1]
    if (i === 2) return [...row.slice(0, 10), 1, 2, 1]
    return row
  })
}
function deriveSit(frame) {
  return frame.map((row, i) => {
    if (i === 13) return [0,0,0,1,1,1,1,1,1,1,0,0,0]
    if (i === 14) return [0,0,0,0,0,0,0,0,0,0,0,0,0]
    return row
  })
}

// Per-region palette mirrors the cat baker so the regional flavor reads
// across all pet species.
const REGION_PALETTE = {
  asia:    { outline: '#5a3a3a', body: '#c08858', belly: '#e8c8a0' },
  americas:{ outline: '#7a4030', body: '#e89060', belly: '#f8d0a8' },
  europe:  { outline: '#4a3a5a', body: '#a890c0', belly: '#e0d8f0' },
  oceania: { outline: '#2a4a6a', body: '#7098c8', belly: '#c0d8f0' },
  africa:  { outline: '#7a5a1a', body: '#d8b048', belly: '#f0e0a0' },
  unknown: { outline: '#3a3a3a', body: '#909090', belly: '#c0c0c0' }
}

const FRAME_W = 32, FRAME_H = 48, PIXEL = 2

function renderFrame(ctx, pixels, palette, dx, dy) {
  const offX = dx + Math.floor((FRAME_W - 13 * PIXEL) / 2)
  const offY = dy + (FRAME_H - 15 * PIXEL)
  for (let y = 0; y < 15; y++) {
    for (let x = 0; x < 13; x++) {
      const v = pixels[y][x]
      if (v === 0) continue
      ctx.fillStyle =
        v === 1 ? palette.outline :
        v === 2 ? palette.body :
        v === 3 ? palette.belly :
        v === 4 ? '#1a1a1a' :
        v === 6 ? '#FFB0B0' : '#ffffff'
      ctx.fillRect(offX + x * PIXEL, offY + y * PIXEL, PIXEL, PIXEL)
    }
  }
}

function bakeSpecies(name, base) {
  const IDLE_DOWN  = base
  const IDLE_UP    = deriveIdleUp(base)
  const IDLE_LEFT  = deriveIdleLeft(base)
  const IDLE_RIGHT = deriveIdleRight(base)
  const FRAMES = [
    ['idle_down',    IDLE_DOWN],   ['idle_up',      IDLE_UP],
    ['idle_left',    IDLE_LEFT],   ['idle_right',   IDLE_RIGHT],
    ['walk_down_0',  applyLegShift(IDLE_DOWN, true)], ['walk_down_1', applyLegShift(IDLE_DOWN, false)],
    ['walk_up_0',    applyLegShift(IDLE_UP, true)],   ['walk_up_1',   applyLegShift(IDLE_UP, false)],
    ['walk_left_0',  applyLegShift(IDLE_LEFT, true)], ['walk_left_1', applyLegShift(IDLE_LEFT, false)],
    ['walk_right_0', applyLegShift(IDLE_RIGHT, true)],['walk_right_1',applyLegShift(IDLE_RIGHT, false)],
    ['wave',         deriveWave(IDLE_DOWN)],
    ['sit',          deriveSit(IDLE_DOWN)]
  ]
  const ATLAS_W = FRAME_W * FRAMES.length
  const ATLAS_H = FRAME_H

  const frames = {}
  FRAMES.forEach(([fname], i) => {
    frames[fname] = {
      frame: { x: i * FRAME_W, y: 0, w: FRAME_W, h: FRAME_H },
      rotated: false, trimmed: false,
      spriteSourceSize: { x: 0, y: 0, w: FRAME_W, h: FRAME_H },
      sourceSize: { w: FRAME_W, h: FRAME_H }
    }
  })
  const atlasJson = {
    frames,
    meta: { app: 'lounge-v10-bake', version: '1', image: 'sprite.png', format: 'RGBA8888', size: { w: ATLAS_W, h: ATLAS_H }, scale: '1' }
  }

  const OUT_DIR = join(ROOT, 'public', 'lounge', 'assets', 'sprites', name)
  for (const [region, palette] of Object.entries(REGION_PALETTE)) {
    const canvas = createCanvas(ATLAS_W, ATLAS_H)
    const ctx = canvas.getContext('2d')
    ctx.imageSmoothingEnabled = false
    FRAMES.forEach(([_, pixels], i) => renderFrame(ctx, pixels, palette, i * FRAME_W, 0))
    const dir = join(OUT_DIR, region)
    mkdirSync(dir, { recursive: true })
    writeFileSync(join(dir, 'sprite.png'), canvas.toBuffer('image/png'))
    writeFileSync(join(dir, 'sprite.json'), JSON.stringify(atlasJson, null, 2))
    console.log(`OK ${name}/${region}`)
  }
}

bakeSpecies('puppy', PUPPY_FRAME)
bakeSpecies('bunny', BUNNY_FRAME)
console.log('\nDONE — 2 species × 6 regions = 12 atlases')
