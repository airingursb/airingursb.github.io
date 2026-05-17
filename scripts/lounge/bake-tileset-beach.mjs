#!/usr/bin/env node
// Generate the outdoor_beach_v0 tileset: 6 16x16 tiles in a 6-wide PNG strip.
//
//  Tile ID (in tileset, 1-indexed in Tiled's firstgid space):
//    1 - sand floor
//    2 - cliff / dune wall
//    3 - driftwood plank (door / opening visual)
//    4 - driftwood log (horizontal, sit anchor)
//    5 - beach umbrella (decorative)
//    6 - palm tree (decorative)
//
// Run: node scripts/lounge/bake-tileset-beach.mjs

import { createCanvas } from 'canvas'
import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..')
const OUT = join(ROOT, 'public', 'lounge', 'assets', 'tilesets', 'outdoor_beach_v0')

const TILE = 16
const COUNT = 6
const W = TILE * COUNT
const H = TILE

const canvas = createCanvas(W, H)
const ctx = canvas.getContext('2d')
ctx.imageSmoothingEnabled = false

function px(x, y, color) { ctx.fillStyle = color; ctx.fillRect(x, y, 1, 1) }
function rect(x, y, w, h, color) { ctx.fillStyle = color; ctx.fillRect(x, y, w, h) }

// Tile 0 — sand floor (warm beige with tiny grain specks)
function sand(ox) {
  rect(ox, 0, TILE, TILE, '#e8d59c')
  // grain specks
  const grains = [
    [2, 3, '#c8b078'], [11, 5, '#c8b078'],
    [5, 8, '#d0b884'], [13, 11, '#c8b078'],
    [3, 13, '#d8c08c'], [7, 1, '#d0b884'],
    [9, 14, '#c8b078']
  ]
  for (const [x, y, c] of grains) px(ox + x, y, c)
}

// Tile 1 — cliff / dune wall
function cliff(ox) {
  rect(ox, 0, TILE, TILE, '#8a7a52')
  // darker top edge highlight
  rect(ox, 0, TILE, 2, '#6a5a3a')
  // weathered cracks
  ctx.fillStyle = '#5a4a2a'
  ctx.fillRect(ox + 3, 4, 1, 4)
  ctx.fillRect(ox + 9, 6, 1, 5)
  ctx.fillRect(ox + 12, 3, 1, 6)
  ctx.fillRect(ox + 5, 11, 1, 3)
  // grass tuft on top
  rect(ox + 6, 0, 4, 1, '#5aaa5a')
  px(ox + 2, 0, '#5aaa5a'); px(ox + 13, 0, '#5aaa5a')
}

// Tile 2 — driftwood plank (door visual)
function driftwoodDoor(ox) {
  rect(ox, 0, TILE, TILE, '#e8d59c')   // sand base
  // horizontal weathered plank
  rect(ox + 1, 5, TILE - 2, 6, '#a08868')
  rect(ox + 1, 6, TILE - 2, 1, '#c8a878')
  ctx.fillStyle = '#705838'
  ctx.fillRect(ox + 3, 6, 1, 4)
  ctx.fillRect(ox + 8, 7, 1, 3)
  ctx.fillRect(ox + 12, 6, 1, 4)
  // shadow under
  rect(ox + 2, 11, TILE - 4, 1, '#c8b078')
}

// Tile 3 — driftwood log (horizontal, fits sit interactable convention)
function driftwoodLog(ox) {
  rect(ox, 0, TILE, TILE, '#e8d59c')   // sand base
  // log body
  rect(ox + 1, 6, TILE - 2, 7, '#8a6a4a')
  rect(ox + 1, 7, TILE - 2, 1, '#a88858')
  // wood grain
  ctx.fillStyle = '#5a4a2a'
  ctx.fillRect(ox + 2, 9, TILE - 4, 1)
  // log ends (circle hints)
  px(ox + 1, 9, '#705838')
  px(ox + TILE - 2, 9, '#705838')
}

// Tile 4 — beach umbrella (red+white striped, simple silhouette)
function umbrella(ox) {
  rect(ox, 0, TILE, TILE, '#e8d59c')  // sand base
  // pole
  rect(ox + 7, 4, 1, 11, '#5a4a2a')
  // umbrella top (semicircle approx)
  ctx.fillStyle = '#d04040'
  for (let dy = 0; dy < 4; dy++) {
    const w = 12 - dy * 2
    ctx.fillRect(ox + 8 - w / 2, dy + 1, w, 1)
  }
  // white stripes
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(ox + 4, 2, 1, 1)
  ctx.fillRect(ox + 8, 1, 1, 1)
  ctx.fillRect(ox + 11, 2, 1, 1)
  ctx.fillRect(ox + 5, 4, 1, 1)
  ctx.fillRect(ox + 10, 4, 1, 1)
}

// Tile 5 — palm tree (trunk + few fronds)
function palm(ox) {
  rect(ox, 0, TILE, TILE, '#e8d59c')  // sand base
  // trunk
  rect(ox + 7, 6, 2, 9, '#8a5a36')
  rect(ox + 7, 6, 1, 9, '#a07850')  // highlight side
  // crown leaves
  ctx.fillStyle = '#3a8a3a'
  // 4 fronds in 4 directions
  ctx.fillRect(ox + 4, 4, 4, 2)
  ctx.fillRect(ox + 8, 4, 4, 2)
  ctx.fillRect(ox + 6, 2, 4, 2)
  ctx.fillRect(ox + 5, 5, 6, 1)
  ctx.fillStyle = '#5aaa5a'  // lighter highlights
  ctx.fillRect(ox + 5, 3, 1, 1)
  ctx.fillRect(ox + 10, 3, 1, 1)
  ctx.fillRect(ox + 7, 1, 2, 1)
  // 2 coconuts
  px(ox + 6, 6, '#5a3a1a')
  px(ox + 9, 6, '#5a3a1a')
}

sand(0)
cliff(TILE)
driftwoodDoor(TILE * 2)
driftwoodLog(TILE * 3)
umbrella(TILE * 4)
palm(TILE * 5)

mkdirSync(OUT, { recursive: true })
writeFileSync(join(OUT, 'tiles.png'), canvas.toBuffer('image/png'))

const meta = {
  schema_version: 1,
  name: 'outdoor_beach_v0',
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
console.log('OK outdoor_beach_v0 tiles.png + tiles.json')
