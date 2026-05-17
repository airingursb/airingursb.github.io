#!/usr/bin/env node
// V6.5 — Bake the CAT species sprite atlas (one per region).
//
// Reuses the bear's animation transforms (idle_*, walk_*_A/B, wave, sit) but with
// a different 13×15 pixel template: pointy triangular ears + vertical-slit eyes +
// thinner muzzle. Outputs to public/lounge/assets/sprites/cat/<region>/sprite.{png,json}.

import { createCanvas } from 'canvas'
import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..')
const OUT_DIR = join(ROOT, 'public', 'lounge', 'assets', 'sprites', 'cat')

// 13×15 cat. 0 transparent, 1 outline, 2 body, 3 belly, 4 eye, 6 cheek/nose.
const CAT_FRAME = [
  [0,1,0,0,0,0,0,0,0,0,0,1,0],   // ear tips
  [0,1,1,0,0,0,0,0,0,0,1,1,0],   // ear base
  [1,2,2,1,0,0,0,0,0,1,2,2,1],   // head top
  [1,2,2,2,1,1,1,1,1,2,2,2,1],   // forehead
  [1,2,2,4,2,2,2,2,2,4,2,2,1],   // eye row (slim slits at cols 3, 9)
  [1,2,2,2,2,2,2,2,2,2,2,2,1],
  [1,2,2,2,6,4,2,4,6,2,2,2,1],   // cheeks + tiny nose
  [1,2,2,2,2,2,1,2,2,2,2,2,1],   // mouth line
  [0,1,2,2,2,2,2,2,2,2,2,1,0],
  [0,0,1,1,2,2,2,2,2,1,1,0,0],
  [0,0,1,2,2,3,3,3,2,2,1,0,0],
  [0,0,1,2,3,3,3,3,3,2,1,0,0],
  [0,0,1,2,2,2,2,2,2,2,1,0,0],
  [0,0,0,1,2,1,0,1,2,1,0,0,0],
  [0,0,0,1,1,0,0,0,1,1,0,0,0]
]

const IDLE_DOWN = CAT_FRAME
const IDLE_UP = CAT_FRAME.map((row, i) => {
  if (i === 4) return [1,2,2,2,2,2,2,2,2,2,2,2,1]
  if (i === 6) return [1,2,2,2,2,2,2,2,2,2,2,2,1]
  if (i === 7) return [1,2,2,2,2,2,2,2,2,2,2,2,1]
  return row
})
const IDLE_LEFT = CAT_FRAME.map((row, i) => {
  if (i === 4) return [1,2,2,4,2,2,2,2,2,2,2,2,1]
  if (i === 6) return [1,2,2,2,6,4,2,2,2,2,2,2,1]
  return row
})
const IDLE_RIGHT = CAT_FRAME.map((row, i) => {
  if (i === 4) return [1,2,2,2,2,2,2,2,2,4,2,2,1]
  if (i === 6) return [1,2,2,2,2,2,2,4,6,2,2,2,1]
  return row
})

function applyLegShift(frame, leftShift) {
  return frame.map((row, i) => {
    if (i === 13) return leftShift ? [0,0,0,1,2,1,0,0,1,2,1,0,0] : [0,0,1,2,1,0,0,1,2,1,0,0,0]
    if (i === 14) return leftShift ? [0,0,0,1,1,0,0,0,0,1,1,0,0] : [0,0,1,1,0,0,0,0,1,1,0,0,0]
    return row
  })
}
const WALK_DOWN_A = applyLegShift(IDLE_DOWN, true)
const WALK_DOWN_B = applyLegShift(IDLE_DOWN, false)
const WALK_UP_A = applyLegShift(IDLE_UP, true)
const WALK_UP_B = applyLegShift(IDLE_UP, false)
const WALK_LEFT_A = applyLegShift(IDLE_LEFT, true)
const WALK_LEFT_B = applyLegShift(IDLE_LEFT, false)
const WALK_RIGHT_A = applyLegShift(IDLE_RIGHT, true)
const WALK_RIGHT_B = applyLegShift(IDLE_RIGHT, false)

const WAVE_DOWN = CAT_FRAME.map((row, i) => {
  if (i === 0) return [0,1,0,0,0,0,0,0,0,0,0,1,1]
  if (i === 1) return [0,1,1,0,0,0,0,0,0,0,1,1,1]
  if (i === 2) return [1,2,2,1,0,0,0,0,0,1,2,2,1]
  return row
})

const SIT_DOWN = CAT_FRAME.map((row, i) => {
  if (i === 13) return [0,0,0,1,1,1,1,1,1,1,0,0,0]
  if (i === 14) return [0,0,0,0,0,0,0,0,0,0,0,0,0]
  return row
})

// Slightly different palette per region (more cool tones for cats)
const REGION_PALETTE = {
  asia:    { outline: '#5a3a3a', body: '#c08858', belly: '#e8c8a0' },
  americas:{ outline: '#7a4030', body: '#e89060', belly: '#f8d0a8' },
  europe:  { outline: '#4a3a5a', body: '#a890c0', belly: '#e0d8f0' },
  oceania: { outline: '#2a4a6a', body: '#7098c8', belly: '#c0d8f0' },
  africa:  { outline: '#7a5a1a', body: '#d8b048', belly: '#f0e0a0' },
  unknown: { outline: '#3a3a3a', body: '#909090', belly: '#c0c0c0' }
}

const FRAMES = [
  ['idle_down',    IDLE_DOWN],   ['idle_up',      IDLE_UP],
  ['idle_left',    IDLE_LEFT],   ['idle_right',   IDLE_RIGHT],
  ['walk_down_0',  WALK_DOWN_A], ['walk_down_1',  WALK_DOWN_B],
  ['walk_up_0',    WALK_UP_A],   ['walk_up_1',    WALK_UP_B],
  ['walk_left_0',  WALK_LEFT_A], ['walk_left_1',  WALK_LEFT_B],
  ['walk_right_0', WALK_RIGHT_A],['walk_right_1', WALK_RIGHT_B],
  ['wave',         WAVE_DOWN],   ['sit',          SIT_DOWN]
]

const FRAME_W = 32, FRAME_H = 48, PIXEL = 2
const ATLAS_W = FRAME_W * FRAMES.length, ATLAS_H = FRAME_H

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

function buildAtlasJson() {
  const frames = {}
  FRAMES.forEach(([name], i) => {
    frames[name] = {
      frame: { x: i * FRAME_W, y: 0, w: FRAME_W, h: FRAME_H },
      rotated: false, trimmed: false,
      spriteSourceSize: { x: 0, y: 0, w: FRAME_W, h: FRAME_H },
      sourceSize: { w: FRAME_W, h: FRAME_H }
    }
  })
  return {
    frames,
    meta: { app: 'lounge-v2-bake', version: '1', image: 'sprite.png', format: 'RGBA8888', size: { w: ATLAS_W, h: ATLAS_H }, scale: '1' }
  }
}

for (const [region, palette] of Object.entries(REGION_PALETTE)) {
  const canvas = createCanvas(ATLAS_W, ATLAS_H)
  const ctx = canvas.getContext('2d')
  ctx.imageSmoothingEnabled = false
  FRAMES.forEach(([_, pixels], i) => renderFrame(ctx, pixels, palette, i * FRAME_W, 0))
  const dir = join(OUT_DIR, region)
  mkdirSync(dir, { recursive: true })
  writeFileSync(join(dir, 'sprite.png'), canvas.toBuffer('image/png'))
  writeFileSync(join(dir, 'sprite.json'), JSON.stringify(buildAtlasJson(), null, 2))
  console.log(`OK cat/${region}: sprite.png + sprite.json`)
}
console.log('OK all 6 cat region atlases')
