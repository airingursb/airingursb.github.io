#!/usr/bin/env node
// Bake the V1 BEAR_FRAME pixel data into per-region Phaser sprite atlases.
// Reads pixel arrays + region palette, renders each frame at 32x48 via
// node-canvas, packs all frames per region into one PNG, writes atlas JSON.
//
// Run from repo root: node scripts/lounge/bake-bear-sprites.mjs

import { createCanvas } from 'canvas'
import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..')
const OUT_DIR = join(ROOT, 'public', 'lounge', 'assets', 'sprites', 'bear')

// 13x15 pixel mascot. v=0 transparent, 1 outline, 2 body, 3 belly, 4 eye, 6 cheek.
const BEAR_FRAME = [
  [0,0,1,1,0,0,0,0,0,1,1,0,0],
  [0,1,3,2,1,0,0,0,1,2,3,1,0],
  [0,1,2,2,1,1,1,1,1,2,2,1,0],
  [1,2,2,2,2,2,2,2,2,2,2,2,1],
  [1,2,2,4,2,2,2,2,2,4,2,2,1],
  [1,2,2,2,2,2,2,2,2,2,2,2,1],
  [1,2,2,6,2,2,4,2,2,6,2,2,1],
  [1,2,2,2,2,2,2,2,2,2,2,2,1],
  [0,1,2,2,2,2,2,2,2,2,2,1,0],
  [0,0,1,1,2,2,2,2,2,1,1,0,0],
  [0,0,1,2,2,3,3,3,2,2,1,0,0],
  [0,0,1,2,3,3,3,3,3,2,1,0,0],
  [0,0,1,2,2,2,2,2,2,2,1,0,0],
  [0,0,0,1,2,1,0,1,2,1,0,0,0],
  [0,0,0,1,1,0,0,0,1,1,0,0,0]
]

// "Down" facing: same as idle (mascot is front-facing by design)
const IDLE_DOWN = BEAR_FRAME

// "Up" facing: hide eyes + cheeks (back of head)
const IDLE_UP = BEAR_FRAME.map((row, i) => {
  if (i === 4) return [1,2,2,2,2,2,2,2,2,2,2,2,1]
  if (i === 6) return [1,2,2,2,2,2,2,2,2,2,2,2,1]
  return row
})

// Side idle: face left or right by toggling one eye + cheek to body color
const IDLE_LEFT = BEAR_FRAME.map((row, i) => {
  if (i === 4) return [1,2,2,4,2,2,2,2,2,2,2,2,1]
  if (i === 6) return [1,2,2,6,2,2,4,2,2,2,2,2,1]
  return row
})
const IDLE_RIGHT = BEAR_FRAME.map((row, i) => {
  if (i === 4) return [1,2,2,2,2,2,2,2,2,4,2,2,1]
  if (i === 6) return [1,2,2,2,2,2,4,2,2,6,2,2,1]
  return row
})

// Walk frames: shift legs A/B for animation
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

const REGION_PALETTE = {
  asia:    { outline: '#6B4C30', body: '#A07850', belly: '#D4B896' },
  americas:{ outline: '#B5601A', body: '#E89B4B', belly: '#F8D9A8' },
  europe:  { outline: '#5A3E7E', body: '#9F7CC8', belly: '#DFD0F0' },
  oceania: { outline: '#2E5E8C', body: '#6FA3D9', belly: '#B8D9F0' },
  africa:  { outline: '#B58E1A', body: '#E8C24B', belly: '#F8E8A8' },
  unknown: { outline: '#3a3a3a', body: '#888888', belly: '#bbbbbb' }
}

const FRAMES = [
  ['idle_down',    IDLE_DOWN],
  ['idle_up',      IDLE_UP],
  ['idle_left',    IDLE_LEFT],
  ['idle_right',   IDLE_RIGHT],
  ['walk_down_0',  WALK_DOWN_A],
  ['walk_down_1',  WALK_DOWN_B],
  ['walk_up_0',    WALK_UP_A],
  ['walk_up_1',    WALK_UP_B],
  ['walk_left_0',  WALK_LEFT_A],
  ['walk_left_1',  WALK_LEFT_B],
  ['walk_right_0', WALK_RIGHT_A],
  ['walk_right_1', WALK_RIGHT_B]
]

const FRAME_W = 32
const FRAME_H = 48
const PIXEL = 2
const ATLAS_W = FRAME_W * FRAMES.length
const ATLAS_H = FRAME_H

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
        v === 6 ? '#FF9EAD' : '#ffffff'
      ctx.fillRect(offX + x * PIXEL, offY + y * PIXEL, PIXEL, PIXEL)
    }
  }
}

function buildAtlasJson() {
  const frames = {}
  FRAMES.forEach(([name], i) => {
    frames[name] = {
      frame: { x: i * FRAME_W, y: 0, w: FRAME_W, h: FRAME_H },
      rotated: false,
      trimmed: false,
      spriteSourceSize: { x: 0, y: 0, w: FRAME_W, h: FRAME_H },
      sourceSize: { w: FRAME_W, h: FRAME_H }
    }
  })
  return {
    frames,
    meta: {
      app: 'lounge-v2-bake',
      version: '1',
      image: 'sprite.png',
      format: 'RGBA8888',
      size: { w: ATLAS_W, h: ATLAS_H },
      scale: '1'
    }
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
  console.log(`OK ${region}: sprite.png + sprite.json`)
}

const manifest = {
  schema_version: 1,
  id: 'bear',
  anchor: [16, 48],
  regions: Object.keys(REGION_PALETTE),
  animations: {
    idle_down:  { frames: ['idle_down'],  fps: 1, loop: true },
    idle_up:    { frames: ['idle_up'],    fps: 1, loop: true },
    idle_left:  { frames: ['idle_left'],  fps: 1, loop: true },
    idle_right: { frames: ['idle_right'], fps: 1, loop: true },
    walk_down:  { frames: ['walk_down_0',  'walk_down_1'],  fps: 8, loop: true },
    walk_up:    { frames: ['walk_up_0',    'walk_up_1'],    fps: 8, loop: true },
    walk_left:  { frames: ['walk_left_0',  'walk_left_1'],  fps: 8, loop: true },
    walk_right: { frames: ['walk_right_0', 'walk_right_1'], fps: 8, loop: true }
  }
}
mkdirSync(OUT_DIR, { recursive: true })
writeFileSync(join(OUT_DIR, 'manifest.json'), JSON.stringify(manifest, null, 2))
console.log('OK manifest.json')
