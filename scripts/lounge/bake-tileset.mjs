#!/usr/bin/env node
// Generate the indoor_lobby_v0 tileset: 6 16x16 tiles in a 6-wide PNG strip.
//
//  Tile ID (in tileset, 1-indexed in Tiled's firstgid space):
//    1 - wood floor
//    2 - brick wall
//    3 - door (visual only)
//    4 - table top (decorative)
//    5 - chair (decorative)
//    6 - small potted plant (decorative)
//
// Run: node scripts/lounge/bake-tileset.mjs

import { createCanvas } from 'canvas'
import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..')
const OUT = join(ROOT, 'public', 'lounge', 'assets', 'tilesets', 'indoor_lobby_v0')

const TILE = 16
const COUNT = 6
const W = TILE * COUNT
const H = TILE

const canvas = createCanvas(W, H)
const ctx = canvas.getContext('2d')
ctx.imageSmoothingEnabled = false

function px(x, y, color) { ctx.fillStyle = color; ctx.fillRect(x, y, 1, 1) }
function rect(x, y, w, h, color) { ctx.fillStyle = color; ctx.fillRect(x, y, w, h) }

// Tile 0 (offset 0): wood floor
function floor(ox) {
  rect(ox, 0, TILE, TILE, '#a07850')
  for (let y = 0; y < TILE; y += 4) { ctx.fillStyle = '#8a6438'; ctx.fillRect(ox, y, TILE, 1) }
  px(ox + 3, 2, '#7a5a2e'); px(ox + 11, 5, '#7a5a2e')
  px(ox + 5, 9, '#7a5a2e'); px(ox + 13, 12, '#7a5a2e')
}

// Tile 1 (offset 16): brick wall
function wall(ox) {
  rect(ox, 0, TILE, TILE, '#6b4226')
  for (let y = 0; y < TILE; y += 4) { ctx.fillStyle = '#3a2412'; ctx.fillRect(ox, y, TILE, 1) }
  ctx.fillStyle = '#3a2412'
  ctx.fillRect(ox + 7, 0, 1, 4)
  ctx.fillRect(ox + 3, 4, 1, 4)
  ctx.fillRect(ox + 11, 4, 1, 4)
  ctx.fillRect(ox + 7, 8, 1, 4)
  ctx.fillRect(ox + 3, 12, 1, 4)
  ctx.fillRect(ox + 11, 12, 1, 4)
}

// Tile 2 (offset 32): door
function door(ox) {
  rect(ox, 0, TILE, TILE, '#4a2812')
  rect(ox + 2, 2, TILE - 4, TILE - 4, '#6b4226')
  px(ox + 12, 8, '#e8c24b'); px(ox + 12, 9, '#e8c24b')
  ctx.fillStyle = '#3a2412'
  ctx.fillRect(ox + 4, 4, 1, 8); ctx.fillRect(ox + 11, 4, 1, 8)
  ctx.fillRect(ox + 4, 8, 8, 1)
}

// Tile 3 (offset 48): table top
function table(ox) {
  rect(ox, 0, TILE, TILE, '#a07850')
  rect(ox + 1, 1, TILE - 2, TILE - 2, '#c39966')
  ctx.strokeStyle = '#6b4226'
  ctx.strokeRect(ox + 1, 1, TILE - 2, TILE - 2)
}

// Tile 4 (offset 64): chair
function chair(ox) {
  rect(ox + 3, 4, 10, 10, '#a07850')
  rect(ox + 4, 5, 8, 8, '#c39966')
  rect(ox + 3, 2, 10, 3, '#6b4226')
  px(ox + 3, 14, '#6b4226'); px(ox + 12, 14, '#6b4226')
}

// Tile 5 (offset 80): potted plant
function plant(ox) {
  rect(ox + 4, 11, 8, 5, '#6b4226')
  rect(ox + 5, 12, 6, 3, '#8a5a36')
  rect(ox + 6, 5, 4, 6, '#3a7a3a')
  rect(ox + 4, 7, 8, 3, '#4a9a4a')
  rect(ox + 3, 8, 10, 1, '#5aaa5a')
}

floor(0)
wall(TILE)
door(TILE * 2)
table(TILE * 3)
chair(TILE * 4)
plant(TILE * 5)

mkdirSync(OUT, { recursive: true })
writeFileSync(join(OUT, 'tiles.png'), canvas.toBuffer('image/png'))

const meta = {
  schema_version: 1,
  name: 'indoor_lobby_v0',
  tile_width: 16, tile_height: 16,
  tile_count: COUNT, columns: COUNT,
  image: 'tiles.png', image_width: W, image_height: H,
  tiles: [
    { id: 0, kind: 'floor' },
    { id: 1, kind: 'wall', collision: true },
    { id: 2, kind: 'door' },
    { id: 3, kind: 'furniture', collision: true },
    { id: 4, kind: 'furniture', collision: true },
    { id: 5, kind: 'furniture', collision: true }
  ]
}
writeFileSync(join(OUT, 'tiles.json'), JSON.stringify(meta, null, 2))
console.log('OK tiles.png + tiles.json')
