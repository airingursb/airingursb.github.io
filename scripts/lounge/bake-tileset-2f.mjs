#!/usr/bin/env node
// V13.0 — Bake `indoor_2f_v0`: 16 tiles for the V13 2nd-floor rooms
// (bath house / arcade / greenhouse). 4×4 grid, 16px tiles, output to
// public/lounge/assets/tilesets/indoor_2f_v0/.
//
// Tile IDs (1-indexed in Tiled's firstgid space):
//   Row 0 — Bath house (warm tile floor, tub, water, towel)
//     1 stone floor (warm pink-gray)   2 stone wall                3 tub edge
//     4 tub water (animated visual)
//   Row 1 — Bath fixtures
//     5 towel rack                     6 tile drain                7 steam wisp
//     8 wood deck (transition floor)
//   Row 2 — Arcade
//     9 arcade cabinet bottom         10 arcade cabinet top       11 joystick
//    12 neon panel wall
//   Row 3 — Greenhouse
//    13 glass floor (light teal)      14 planter (terracotta)     15 rare flower
//    16 vine wall

import { createCanvas } from 'canvas'
import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..')
const OUT = join(ROOT, 'public', 'lounge', 'assets', 'tilesets', 'indoor_2f_v0')

const TILE = 16
const COLS = 4
const ROWS = 4
const W = TILE * COLS
const H = TILE * ROWS

const canvas = createCanvas(W, H)
const ctx = canvas.getContext('2d')
ctx.imageSmoothingEnabled = false

function rect(x, y, w, h, c) { ctx.fillStyle = c; ctx.fillRect(x, y, w, h) }
function px(x, y, c) { ctx.fillStyle = c; ctx.fillRect(x, y, 1, 1) }
function line(x1, y1, x2, y2, c) {
  ctx.fillStyle = c
  if (y1 === y2) ctx.fillRect(Math.min(x1, x2), y1, Math.abs(x2 - x1) + 1, 1)
  else            ctx.fillRect(x1, Math.min(y1, y2), 1, Math.abs(y2 - y1) + 1)
}

// Each helper draws into an offset (x0, y0) cell.
function bathFloor(x, y) {
  // warm pink-gray tile with subtle 2×2 grout grid
  rect(x, y, TILE, TILE, '#d0a890')
  line(x + 8, y, x + 8, y + 15, '#a07868')
  line(x, y + 8, x + 15, y + 8, '#a07868')
  // little speckles
  px(x + 3, y + 2, '#b09080'); px(x + 11, y + 12, '#b09080')
}
function stoneWall(x, y) {
  rect(x, y, TILE, TILE, '#8a7060')
  // brick offset
  line(x, y + 4, x + 15, y + 4, '#6a5040')
  line(x, y + 11, x + 15, y + 11, '#6a5040')
  line(x + 5, y, x + 5, y + 3, '#6a5040')
  line(x + 10, y + 5, x + 10, y + 10, '#6a5040')
  line(x + 3, y + 12, x + 3, y + 15, '#6a5040')
}
function tubEdge(x, y) {
  // ceramic tub edge (white with shadow)
  rect(x, y, TILE, TILE, '#e8e0d8')
  rect(x, y + 12, TILE, 4, '#a08878')
  line(x, y + 11, x + 15, y + 11, '#6a5040')
  line(x, y, x, y + 15, '#c0b0a0')
  line(x + 15, y, x + 15, y + 15, '#c0b0a0')
}
function tubWater(x, y) {
  // warm bath water with ripples
  rect(x, y, TILE, TILE, '#7898b8')
  rect(x, y, TILE, 2, '#a0c0d8')
  // ripple lines
  line(x + 2, y + 6, x + 7, y + 6, '#a0c0d8')
  line(x + 9, y + 10, x + 13, y + 10, '#a0c0d8')
  // steam dot
  px(x + 4, y + 1, '#e0e8f0')
}
function towelRack(x, y) {
  rect(x, y, TILE, TILE, '#8a7060')  // wall behind
  line(x + 2, y + 3, x + 13, y + 3, '#503020')  // rack
  rect(x + 3, y + 4, 4, 8, '#f0e0e0')  // towel 1
  rect(x + 9, y + 4, 4, 8, '#f0d8d0')  // towel 2
}
function drain(x, y) {
  rect(x, y, TILE, TILE, '#a08878')
  line(x + 6, y + 6, x + 9, y + 6, '#404040')
  line(x + 6, y + 7, x + 9, y + 7, '#202020')
  line(x + 6, y + 8, x + 9, y + 8, '#202020')
  line(x + 6, y + 9, x + 9, y + 9, '#404040')
}
function steamWisp(x, y) {
  // transparent-ish white wisps (visual above-layer)
  rect(x, y, TILE, TILE, 'rgba(255,255,255,0)')
  for (const [px1, py1] of [[3, 6], [8, 4], [11, 9], [5, 12]]) {
    ctx.fillStyle = 'rgba(255,255,255,0.5)'
    ctx.fillRect(x + px1, y + py1, 2, 2)
  }
}
function woodDeck(x, y) {
  rect(x, y, TILE, TILE, '#a08060')
  for (let yy = 0; yy < 16; yy += 4) line(x, y + yy, x + 15, y + yy, '#704020')
}
function arcadeBottom(x, y) {
  rect(x, y, TILE, TILE, '#202030')  // dark cabinet body
  rect(x + 2, y + 2, 12, 8, '#400020')  // screen bezel
  rect(x + 3, y + 3, 10, 6, '#208080')  // screen glow
  // coin slot
  line(x + 6, y + 13, x + 9, y + 13, '#604020')
}
function arcadeTop(x, y) {
  rect(x, y, TILE, TILE, '#202030')
  // marquee neon
  rect(x + 1, y + 4, 14, 4, '#ff4080')
  rect(x + 1, y + 8, 14, 2, '#802040')
  // top trim
  line(x, y, x + 15, y, '#404060')
}
function joystick(x, y) {
  rect(x, y, TILE, TILE, '#202030')
  // joystick base
  rect(x + 6, y + 9, 4, 4, '#604040')
  rect(x + 7, y + 5, 2, 5, '#202020')  // shaft
  rect(x + 6, y + 4, 4, 2, '#a02040')  // ball
  // 2 buttons
  rect(x + 1, y + 11, 3, 3, '#ffff40')
  rect(x + 12, y + 11, 3, 3, '#40ffff')
}
function neonPanelWall(x, y) {
  rect(x, y, TILE, TILE, '#101020')
  // grid of glowing dots
  for (let yy = 2; yy < 16; yy += 4) for (let xx = 2; xx < 16; xx += 4) {
    px(x + xx, y + yy, '#80ff80')
    px(x + xx + 1, y + yy, '#80ff80')
  }
}
function glassFloor(x, y) {
  rect(x, y, TILE, TILE, '#c8e0e0')
  line(x, y, x + 15, y + 15, '#a0c8c8')
  line(x + 15, y, x, y + 15, '#a0c8c8')
  px(x + 4, y + 4, '#ffffff'); px(x + 11, y + 11, '#ffffff')
}
function planter(x, y) {
  rect(x, y, TILE, TILE, '#c8e0e0')  // floor
  rect(x + 2, y + 7, 12, 8, '#a04030')  // terracotta pot
  line(x + 2, y + 8, x + 13, y + 8, '#702010')
  // soil
  rect(x + 3, y + 9, 10, 2, '#3a2820')
  // small leaf
  rect(x + 7, y + 4, 2, 5, '#40a040')
  rect(x + 9, y + 6, 1, 3, '#40a040')
}
function rareFlower(x, y) {
  rect(x, y, TILE, TILE, '#c8e0e0')  // floor
  // pot
  rect(x + 4, y + 11, 8, 4, '#a04030')
  // stem
  rect(x + 7, y + 6, 2, 6, '#206020')
  // bloom (rare = blue/violet)
  rect(x + 5, y + 4, 6, 3, '#8060c0')
  px(x + 4, y + 5, '#a080d0'); px(x + 11, y + 5, '#a080d0')
  // pollen sparkle
  px(x + 7, y + 4, '#ffd060')
}
function vineWall(x, y) {
  rect(x, y, TILE, TILE, '#7a5040')  // wood backing
  // ivy
  rect(x + 1, y + 2, 4, 14, '#40802040')
  rect(x + 2, y + 2, 2, 14, '#206020')
  rect(x + 10, y, 3, 12, '#206020')
  rect(x + 11, y, 1, 12, '#40a040')
  // leaf shapes
  px(x + 5, y + 4, '#60c060'); px(x + 5, y + 9, '#60c060')
  px(x + 14, y + 3, '#60c060'); px(x + 14, y + 8, '#60c060')
}

const TILES = [
  bathFloor, stoneWall, tubEdge, tubWater,
  towelRack, drain, steamWisp, woodDeck,
  arcadeBottom, arcadeTop, joystick, neonPanelWall,
  glassFloor, planter, rareFlower, vineWall
]

const META = [
  { id: 0,  kind: 'floor' },
  { id: 1,  kind: 'wall', collision: true },
  { id: 2,  kind: 'furniture', collision: true },
  { id: 3,  kind: 'water' },                       // tub water — visual only
  { id: 4,  kind: 'furniture', collision: true },  // towel rack on wall
  { id: 5,  kind: 'decoration' },                  // drain
  { id: 6,  kind: 'decoration' },                  // steam wisp (above-layer)
  { id: 7,  kind: 'floor' },                       // wood deck transition
  { id: 8,  kind: 'furniture', collision: true },  // arcade bottom
  { id: 9,  kind: 'decoration' },                  // arcade top (above-layer)
  { id: 10, kind: 'decoration' },                  // joystick (above-layer)
  { id: 11, kind: 'wall', collision: true },       // neon panel wall
  { id: 12, kind: 'floor' },                       // glass floor
  { id: 13, kind: 'furniture', collision: true },  // planter
  { id: 14, kind: 'gather_spot' },                 // rare flower (V13.3 will read this)
  { id: 15, kind: 'wall', collision: true }        // vine wall
]

mkdirSync(OUT, { recursive: true })
TILES.forEach((draw, i) => {
  const cx = (i % COLS) * TILE
  const cy = Math.floor(i / COLS) * TILE
  draw(cx, cy)
})
writeFileSync(join(OUT, 'tiles.png'), canvas.toBuffer('image/png'))
writeFileSync(join(OUT, 'tiles.json'), JSON.stringify({
  schema_version: 1,
  name: 'indoor_2f_v0',
  tile_width: TILE,
  tile_height: TILE,
  tile_count: TILES.length,
  columns: COLS,
  image: 'tiles.png',
  image_width: W,
  image_height: H,
  tiles: META
}, null, 2) + '\n')
console.log(`OK indoor_2f_v0: ${TILES.length} tiles, ${W}×${H}px`)
