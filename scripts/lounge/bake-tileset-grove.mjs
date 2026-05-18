#!/usr/bin/env node
// V6.2 + E5-P0a — outdoor_grove_v1: 40 tiles, 8 cols × 5 rows (128×80).
// (Original 32 grove tiles + 8 sand/shore tiles added to enable Beach migration.)
//
// Tile map (1-indexed in Tiled's firstgid space):
//   Row 0 (ground variants + base materials):
//     1 grass plain          2 grass + small flower 3 tall grass
//     4 grass + small rock   5 grass + mushroom     6 dirt path
//     7 stone path           8 water still
//   Row 1 (dirt-path edges — for grass→dirt transitions):
//     9  dirt edge N (grass above + dirt below)
//    10  dirt edge S
//    11  dirt edge E
//    12  dirt edge W
//    13  dirt corner NE (inner)
//    14  dirt corner NW
//    15  dirt corner SE
//    16  dirt corner SW
//   Row 2 (water + decor):
//    17  water shore N       18 water shore S       19 water shore E
//    20  water shore W       21 lily pad            22 large rock
//    23  bush small          24 bush large
//   Row 3 (trees + flowers — above-layer):
//    25 oak tree bottom (trunk) 26 oak tree top (canopy)
//    27 pine tree bottom        28 pine tree top
//    29 flower patch (yellow)   30 flower patch (pink)
//    31 mushroom cluster        32 bench (wooden, sit anchor)
//   Row 4 (E5-P0a — sand / shore / beach decor):
//    33 sand plain              34 sand + tiny shells
//    35 sand-grass edge N (grass above, sand below)
//    36 sand-shore S (sand above, shore-water below)
//    37 driftwood log           38 beach umbrella (red+white)
//    39 palm tree bottom        40 palm tree top
//
// Run: node scripts/lounge/bake-tileset-grove.mjs

import { createCanvas } from 'canvas'
import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..')
const OUT = join(ROOT, 'public', 'lounge', 'assets', 'tilesets', 'outdoor_grove_v1')

const TILE = 16
const COLS = 8
const ROWS = 6
const W = TILE * COLS
const H = TILE * ROWS

const canvas = createCanvas(W, H)
const ctx = canvas.getContext('2d')
ctx.imageSmoothingEnabled = false

function px(x, y, c) { ctx.fillStyle = c; ctx.fillRect(x, y, 1, 1) }
function rect(x, y, w, h, c) { ctx.fillStyle = c; ctx.fillRect(x, y, w, h) }
function tileXY(idx0) { return [(idx0 % COLS) * TILE, Math.floor(idx0 / COLS) * TILE] }

const C = {
  grass_a: '#4a8a3a', grass_b: '#3a7a2a', grass_c: '#5aaa4a', grass_hl: '#6aba5a',
  dirt: '#8a6432', dirt_dark: '#6a4622', dirt_hl: '#9a7442',
  stone: '#7a7268', stone_dark: '#5a5048', stone_hl: '#9a9288',
  water_a: '#3088c8', water_b: '#4098d8', water_hl: '#80c0e8',
  trunk: '#5a3a1a', trunk_dark: '#3a2010', leaf_a: '#2a5a2a', leaf_b: '#3a7a3a', leaf_c: '#4a9a4a',
  pine_a: '#1a4a2a', pine_b: '#2a5a3a', pine_c: '#3a6a4a',
  flower_y: '#ffe040', flower_p: '#f060a0', flower_w: '#ffffff',
  mushroom_cap: '#e04030', mushroom_stem: '#f0e0c0', spot: '#ffffff',
  wood_a: '#a07850', wood_b: '#8a6438', wood_dark: '#6a4222'
}

// ─── Helpers ──────────────────────────────────────────────────────────
function grassBase(ox, oy) {
  rect(ox, oy, TILE, TILE, C.grass_a)
  // sparse vertical blade dabs for texture
  for (let i = 0; i < 12; i++) {
    const x = (i * 13 + oy * 7) % TILE
    const y = (i * 11 + ox * 5) % TILE
    px(ox + x, oy + y, (i % 3 === 0) ? C.grass_c : C.grass_b)
  }
}

function dirtBase(ox, oy) {
  rect(ox, oy, TILE, TILE, C.dirt)
  for (let i = 0; i < 8; i++) {
    const x = (i * 11 + oy * 5) % TILE
    const y = (i * 13 + ox * 7) % TILE
    px(ox + x, oy + y, (i % 2 === 0) ? C.dirt_dark : C.dirt_hl)
  }
}

function waterBase(ox, oy) {
  rect(ox, oy, TILE, TILE, C.water_a)
  // ripple horizontal bands
  for (let y = 0; y < TILE; y += 4) {
    ctx.fillStyle = C.water_b; ctx.fillRect(ox, oy + y, TILE, 1)
  }
  // sparkle highlights
  px(ox + 3, oy + 2, C.water_hl); px(ox + 11, oy + 7, C.water_hl)
  px(ox + 6, oy + 12, C.water_hl); px(ox + 13, oy + 3, C.water_hl)
}

// ─── Row 0 ────────────────────────────────────────────────────────────
// 1 grass plain
function tile1(ox, oy) { grassBase(ox, oy) }
// 2 grass + small flower (white)
function tile2(ox, oy) {
  grassBase(ox, oy)
  px(ox + 7, oy + 6, C.flower_w); px(ox + 8, oy + 6, C.flower_y)
  px(ox + 7, oy + 7, C.flower_w); px(ox + 8, oy + 7, C.flower_w)
}
// 3 tall grass
function tile3(ox, oy) {
  grassBase(ox, oy)
  // upward strokes
  ctx.fillStyle = C.grass_c
  ctx.fillRect(ox + 4, oy + 4, 1, 8); ctx.fillRect(ox + 8, oy + 3, 1, 9)
  ctx.fillRect(ox + 12, oy + 5, 1, 7)
  ctx.fillStyle = C.grass_hl
  px(ox + 4, oy + 4, C.grass_hl); px(ox + 8, oy + 3, C.grass_hl); px(ox + 12, oy + 5, C.grass_hl)
}
// 4 grass + small rock
function tile4(ox, oy) {
  grassBase(ox, oy)
  rect(ox + 6, oy + 9, 5, 4, C.stone)
  rect(ox + 6, oy + 9, 5, 1, C.stone_hl)
  rect(ox + 6, oy + 12, 5, 1, C.stone_dark)
}
// 5 grass + mushroom
function tile5(ox, oy) {
  grassBase(ox, oy)
  rect(ox + 7, oy + 11, 2, 3, C.mushroom_stem)
  // cap
  rect(ox + 5, oy + 8, 6, 3, C.mushroom_cap)
  rect(ox + 6, oy + 7, 4, 1, C.mushroom_cap)
  // spots
  px(ox + 6, oy + 9, C.spot); px(ox + 9, oy + 10, C.spot)
}
// 6 dirt path
function tile6(ox, oy) { dirtBase(ox, oy) }
// 7 stone path
function tile7(ox, oy) {
  rect(ox, oy, TILE, TILE, C.stone)
  // 4 stone slabs with mortar gaps
  ctx.fillStyle = C.stone_dark
  ctx.fillRect(ox, oy + 7, TILE, 2)
  ctx.fillRect(ox + 7, oy, 2, 7); ctx.fillRect(ox + 7, oy + 9, 2, 7)
  // highlights
  px(ox + 2, oy + 2, C.stone_hl); px(ox + 11, oy + 3, C.stone_hl)
  px(ox + 3, oy + 11, C.stone_hl); px(ox + 12, oy + 12, C.stone_hl)
}
// 8 water still
function tile8(ox, oy) { waterBase(ox, oy) }

// ─── Row 1: dirt-path edges + corners ─────────────────────────────────
// 9 dirt N (grass above)
function tile9(ox, oy) {
  grassBase(ox, oy)
  rect(ox, oy + 5, TILE, 11, C.dirt)
  // jagged edge
  for (let x = 0; x < TILE; x += 2) px(ox + x, oy + 4, C.dirt)
  // scattered dirt grains
  for (let i = 0; i < 5; i++) {
    px(ox + ((i * 11) % TILE), oy + 8 + (i % 4), (i % 2 === 0) ? C.dirt_dark : C.dirt_hl)
  }
}
// 10 dirt S (grass below)
function tile10(ox, oy) {
  rect(ox, oy, TILE, 11, C.dirt)
  rect(ox, oy + 11, TILE, 5, C.grass_a)
  for (let x = 0; x < TILE; x += 2) px(ox + x, oy + 12, C.dirt)
  for (let i = 0; i < 5; i++) {
    px(ox + ((i * 11) % TILE), oy + 2 + (i % 4), (i % 2 === 0) ? C.dirt_dark : C.dirt_hl)
  }
}
// 11 dirt E (grass right)
function tile11(ox, oy) {
  rect(ox, oy, 11, TILE, C.dirt)
  rect(ox + 11, oy, 5, TILE, C.grass_a)
  for (let y = 0; y < TILE; y += 2) px(ox + 12, oy + y, C.dirt)
  for (let i = 0; i < 5; i++) px(ox + 2 + (i % 5), oy + ((i * 13) % TILE), C.dirt_hl)
}
// 12 dirt W (grass left)
function tile12(ox, oy) {
  rect(ox, oy, 5, TILE, C.grass_a)
  rect(ox + 5, oy, 11, TILE, C.dirt)
  for (let y = 0; y < TILE; y += 2) px(ox + 4, oy + y, C.dirt)
  for (let i = 0; i < 5; i++) px(ox + 10 - (i % 5), oy + ((i * 13) % TILE), C.dirt_hl)
}
// 13 dirt corner NE (grass in NE quadrant)
function tile13(ox, oy) {
  rect(ox, oy, TILE, TILE, C.dirt)
  // grass blob top-right
  rect(ox + 8, oy, 8, 8, C.grass_a)
  // jagged transition
  px(ox + 8, oy + 7, C.dirt); px(ox + 9, oy + 6, C.dirt)
  px(ox + 10, oy + 7, C.dirt); px(ox + 7, oy + 6, C.grass_a)
}
// 14 dirt corner NW (grass in NW quadrant)
function tile14(ox, oy) {
  rect(ox, oy, TILE, TILE, C.dirt)
  rect(ox, oy, 8, 8, C.grass_a)
  px(ox + 7, oy + 7, C.dirt); px(ox + 6, oy + 6, C.dirt)
  px(ox + 5, oy + 7, C.dirt); px(ox + 8, oy + 6, C.grass_a)
}
// 15 dirt corner SE
function tile15(ox, oy) {
  rect(ox, oy, TILE, TILE, C.dirt)
  rect(ox + 8, oy + 8, 8, 8, C.grass_a)
  px(ox + 8, oy + 8, C.dirt); px(ox + 9, oy + 9, C.dirt)
  px(ox + 7, oy + 9, C.grass_a)
}
// 16 dirt corner SW
function tile16(ox, oy) {
  rect(ox, oy, TILE, TILE, C.dirt)
  rect(ox, oy + 8, 8, 8, C.grass_a)
  px(ox + 7, oy + 8, C.dirt); px(ox + 6, oy + 9, C.dirt)
  px(ox + 8, oy + 9, C.grass_a)
}

// ─── Row 2: water shores + decor ─────────────────────────────────────
// 17 water shore N (grass above, water below)
function tile17(ox, oy) {
  grassBase(ox, oy)
  rect(ox, oy + 6, TILE, 10, C.water_a)
  for (let y = 6; y < TILE; y += 4) {
    ctx.fillStyle = C.water_b; ctx.fillRect(ox, oy + y, TILE, 1)
  }
  // wet sand edge
  for (let x = 0; x < TILE; x += 2) px(ox + x, oy + 5, C.dirt_dark)
}
// 18 water shore S
function tile18(ox, oy) {
  waterBase(ox, oy)
  rect(ox, oy + 11, TILE, 5, C.grass_a)
  for (let x = 0; x < TILE; x += 2) px(ox + x, oy + 11, C.dirt_dark)
}
// 19 water shore E
function tile19(ox, oy) {
  waterBase(ox, oy)
  rect(ox + 11, oy, 5, TILE, C.grass_a)
  for (let y = 0; y < TILE; y += 2) px(ox + 11, oy + y, C.dirt_dark)
}
// 20 water shore W
function tile20(ox, oy) {
  rect(ox, oy, 5, TILE, C.grass_a)
  rect(ox + 5, oy, 11, TILE, C.water_a)
  for (let y = 0; y < TILE; y += 4) {
    ctx.fillStyle = C.water_b; ctx.fillRect(ox + 5, oy + y, 11, 1)
  }
  for (let y = 0; y < TILE; y += 2) px(ox + 4, oy + y, C.dirt_dark)
}
// 21 lily pad
function tile21(ox, oy) {
  waterBase(ox, oy)
  // pad (round flat leaf)
  ctx.fillStyle = '#3a7a3a'; ctx.beginPath(); ctx.arc(ox + 8, oy + 8, 5, 0, Math.PI * 2); ctx.fill()
  ctx.fillStyle = '#4a9a4a'; ctx.beginPath(); ctx.arc(ox + 8, oy + 8, 4, 0, Math.PI * 2); ctx.fill()
  // gap (slice cut)
  ctx.fillStyle = C.water_a; ctx.fillRect(ox + 8, oy + 4, 1, 4)
  // tiny flower
  px(ox + 7, oy + 6, C.flower_w); px(ox + 8, oy + 6, C.flower_p)
}
// 22 large rock
function tile22(ox, oy) {
  grassBase(ox, oy)
  // rock body
  rect(ox + 3, oy + 4, 10, 10, C.stone)
  rect(ox + 4, oy + 5, 8, 1, C.stone_hl)
  rect(ox + 4, oy + 13, 8, 1, C.stone_dark)
  rect(ox + 3, oy + 14, 10, 1, C.stone_dark)
  // crack
  ctx.fillStyle = C.stone_dark; ctx.fillRect(ox + 8, oy + 7, 1, 4)
}
// 23 bush small
function tile23(ox, oy) {
  grassBase(ox, oy)
  ctx.fillStyle = C.leaf_a; ctx.beginPath(); ctx.arc(ox + 8, oy + 11, 4, 0, Math.PI * 2); ctx.fill()
  ctx.fillStyle = C.leaf_b; ctx.beginPath(); ctx.arc(ox + 7, oy + 10, 3, 0, Math.PI * 2); ctx.fill()
  px(ox + 6, oy + 9, C.leaf_c); px(ox + 9, oy + 11, C.leaf_c)
  // small berries
  px(ox + 5, oy + 12, C.flower_p); px(ox + 10, oy + 13, C.flower_p)
}
// 24 bush large
function tile24(ox, oy) {
  grassBase(ox, oy)
  ctx.fillStyle = C.leaf_a
  ctx.beginPath(); ctx.arc(ox + 5, oy + 11, 4, 0, Math.PI * 2); ctx.fill()
  ctx.beginPath(); ctx.arc(ox + 11, oy + 11, 4, 0, Math.PI * 2); ctx.fill()
  ctx.beginPath(); ctx.arc(ox + 8, oy + 9, 4, 0, Math.PI * 2); ctx.fill()
  ctx.fillStyle = C.leaf_b
  ctx.beginPath(); ctx.arc(ox + 6, oy + 10, 2, 0, Math.PI * 2); ctx.fill()
  ctx.beginPath(); ctx.arc(ox + 10, oy + 10, 2, 0, Math.PI * 2); ctx.fill()
  // highlights
  px(ox + 5, oy + 9, C.leaf_c); px(ox + 11, oy + 9, C.leaf_c); px(ox + 8, oy + 8, C.leaf_c)
}

// ─── Row 3: trees + flowers + bench ─────────────────────────────────
// 25 oak tree bottom (trunk)
function tile25(ox, oy) {
  grassBase(ox, oy)
  // trunk
  rect(ox + 6, oy + 4, 4, 12, C.trunk)
  rect(ox + 6, oy + 4, 1, 12, C.wood_a)  // highlight left side
  rect(ox + 9, oy + 4, 1, 12, C.trunk_dark)
  // root flare
  rect(ox + 5, oy + 14, 6, 2, C.trunk)
  px(ox + 4, oy + 15, C.trunk_dark); px(ox + 11, oy + 15, C.trunk_dark)
  // bark texture
  ctx.fillStyle = C.trunk_dark
  ctx.fillRect(ox + 7, oy + 7, 1, 2); ctx.fillRect(ox + 8, oy + 11, 1, 2)
}
// 26 oak tree top (canopy)
function tile26(ox, oy) {
  // transparent edges, canopy fills
  ctx.fillStyle = C.leaf_a
  ctx.beginPath(); ctx.arc(ox + 8, oy + 12, 8, 0, Math.PI * 2); ctx.fill()
  ctx.fillStyle = C.leaf_b
  ctx.beginPath(); ctx.arc(ox + 7, oy + 11, 6, 0, Math.PI * 2); ctx.fill()
  ctx.fillStyle = C.leaf_c
  ctx.beginPath(); ctx.arc(ox + 6, oy + 10, 3, 0, Math.PI * 2); ctx.fill()
  // sparkle highlights
  px(ox + 5, oy + 9, '#80d080'); px(ox + 10, oy + 10, C.leaf_c)
  px(ox + 12, oy + 12, C.leaf_c); px(ox + 8, oy + 14, C.leaf_c)
}
// 27 pine tree bottom
function tile27(ox, oy) {
  grassBase(ox, oy)
  rect(ox + 7, oy + 6, 2, 10, C.trunk)
  rect(ox + 7, oy + 6, 1, 10, C.wood_a)
  // base bushy
  ctx.fillStyle = C.pine_a
  ctx.beginPath(); ctx.moveTo(ox + 4, oy + 14); ctx.lineTo(ox + 12, oy + 14); ctx.lineTo(ox + 8, oy + 4); ctx.closePath(); ctx.fill()
}
// 28 pine tree top
function tile28(ox, oy) {
  // triangular cone
  ctx.fillStyle = C.pine_a
  ctx.beginPath(); ctx.moveTo(ox + 2, oy + 14); ctx.lineTo(ox + 14, oy + 14); ctx.lineTo(ox + 8, oy + 0); ctx.closePath(); ctx.fill()
  ctx.fillStyle = C.pine_b
  ctx.beginPath(); ctx.moveTo(ox + 4, oy + 12); ctx.lineTo(ox + 12, oy + 12); ctx.lineTo(ox + 8, oy + 2); ctx.closePath(); ctx.fill()
  ctx.fillStyle = C.pine_c
  ctx.beginPath(); ctx.moveTo(ox + 6, oy + 8); ctx.lineTo(ox + 10, oy + 8); ctx.lineTo(ox + 8, oy + 4); ctx.closePath(); ctx.fill()
  // tip highlight
  px(ox + 8, oy + 3, '#80d080')
}
// 29 flower patch yellow
function tile29(ox, oy) {
  grassBase(ox, oy)
  // 4-5 yellow flowers
  const spots = [[3, 5], [10, 4], [6, 9], [12, 11], [4, 12]]
  for (const [x, y] of spots) {
    px(ox + x, oy + y, C.flower_y)
    px(ox + x + 1, oy + y, C.flower_y)
    px(ox + x, oy + y + 1, C.flower_y)
    px(ox + x + 1, oy + y + 1, C.flower_w)  // bright center
  }
}
// 30 flower patch pink
function tile30(ox, oy) {
  grassBase(ox, oy)
  const spots = [[4, 3], [11, 6], [7, 10], [3, 12], [12, 12]]
  for (const [x, y] of spots) {
    px(ox + x, oy + y, C.flower_p)
    px(ox + x + 1, oy + y, C.flower_p)
    px(ox + x, oy + y + 1, C.flower_p)
    px(ox + x + 1, oy + y + 1, C.flower_w)
  }
}
// 31 mushroom cluster
function tile31(ox, oy) {
  grassBase(ox, oy)
  // 3 mushrooms
  function shroom(cx, cy) {
    rect(ox + cx, oy + cy + 2, 2, 2, C.mushroom_stem)
    rect(ox + cx - 1, oy + cy, 4, 2, C.mushroom_cap)
    px(ox + cx, oy + cy + 1, C.spot)
  }
  shroom(4, 7); shroom(10, 6); shroom(7, 11)
}
// 32 bench (wooden, horizontal)
function tile32(ox, oy) {
  grassBase(ox, oy)
  // bench seat
  rect(ox + 1, oy + 7, TILE - 2, 4, C.wood_b)
  rect(ox + 1, oy + 7, TILE - 2, 1, C.wood_a)
  rect(ox + 1, oy + 10, TILE - 2, 1, C.wood_dark)
  // legs
  rect(ox + 2, oy + 11, 2, 4, C.wood_dark)
  rect(ox + 12, oy + 11, 2, 4, C.wood_dark)
  // back
  rect(ox + 1, oy + 3, TILE - 2, 2, C.wood_b)
  rect(ox + 2, oy + 5, 1, 3, C.wood_dark)
  rect(ox + 13, oy + 5, 1, 3, C.wood_dark)
}

// ─── Row 4: E5-P0a sand / shore / beach decor ─────────────────────
const SAND = {
  main: '#e8d59c', dark: '#c8b078', hl: '#f0dcaa', grain: '#a8907a'
}

function sandBase(ox, oy) {
  rect(ox, oy, TILE, TILE, SAND.main)
  for (let i = 0; i < 10; i++) {
    const x = (i * 11 + oy * 5) % TILE
    const y = (i * 13 + ox * 7) % TILE
    px(ox + x, oy + y, (i % 3 === 0) ? SAND.dark : SAND.hl)
  }
}

// 33 sand plain
function tile33(ox, oy) { sandBase(ox, oy) }

// 34 sand + tiny shells
function tile34(ox, oy) {
  sandBase(ox, oy)
  // small shell shapes
  rect(ox + 4, oy + 5, 3, 2, '#f0d8b8')
  px(ox + 4, oy + 6, '#a08868')
  px(ox + 11, oy + 10, '#a08868')
  rect(ox + 10, oy + 10, 3, 2, '#f0d8b8')
}

// 35 sand-grass edge N (grass above, sand below)
function tile35(ox, oy) {
  rect(ox, oy, TILE, 6, C.grass_a)
  rect(ox, oy + 6, TILE, 10, SAND.main)
  // jagged boundary
  for (let x = 0; x < TILE; x += 2) px(ox + x, oy + 5, SAND.dark)
  // grass blades drooping
  ctx.fillStyle = C.grass_c
  ctx.fillRect(ox + 3, oy + 2, 1, 3); ctx.fillRect(ox + 9, oy + 1, 1, 4)
}

// 36 sand-shore S (sand above, shore-water below; for the southern beach edge)
function tile36(ox, oy) {
  rect(ox, oy, TILE, 10, SAND.main)
  rect(ox, oy + 10, TILE, 6, C.water_a)
  for (let y = 10; y < TILE; y += 4) {
    ctx.fillStyle = C.water_b; ctx.fillRect(ox, oy + y, TILE, 1)
  }
  // wet sand band
  rect(ox, oy + 9, TILE, 1, '#bca680')
  // foam dots
  px(ox + 2, oy + 11, C.water_hl); px(ox + 9, oy + 12, C.water_hl); px(ox + 13, oy + 11, C.water_hl)
}

// 37 driftwood log (horizontal, sand base)
function tile37(ox, oy) {
  sandBase(ox, oy)
  rect(ox + 1, oy + 6, TILE - 2, 7, '#8a6a4a')
  rect(ox + 1, oy + 7, TILE - 2, 1, '#a88858')
  ctx.fillStyle = '#5a4a2a'
  ctx.fillRect(ox + 2, oy + 9, TILE - 4, 1)
  px(ox + 1, oy + 9, '#705838'); px(ox + TILE - 2, oy + 9, '#705838')
}

// 38 beach umbrella (red+white striped)
function tile38(ox, oy) {
  sandBase(ox, oy)
  // pole
  rect(ox + 7, oy + 4, 1, 11, '#5a4a2a')
  // umbrella top — semicircle of red/white stripes
  ctx.fillStyle = '#d04040'
  for (let dy = 0; dy < 4; dy++) {
    const w = 12 - dy * 2
    ctx.fillRect(ox + Math.floor(8 - w / 2), oy + dy + 1, w, 1)
  }
  ctx.fillStyle = '#ffffff'
  px(ox + 4, oy + 2); px(ox + 8, oy + 1); px(ox + 11, oy + 2)
  px(ox + 5, oy + 4); px(ox + 10, oy + 4)
}

// 39 palm tree bottom (trunk on sand)
function tile39(ox, oy) {
  sandBase(ox, oy)
  rect(ox + 7, oy + 4, 2, 12, '#8a5a36')
  rect(ox + 7, oy + 4, 1, 12, '#a07850')
  // base flare
  rect(ox + 6, oy + 14, 4, 2, '#5a3a1a')
}

// 40 palm tree top (canopy + coconuts) — above-layer
function tile40(ox, oy) {
  // fronds
  ctx.fillStyle = '#3a8a3a'
  ctx.fillRect(ox + 4, oy + 6, 4, 2)
  ctx.fillRect(ox + 8, oy + 6, 4, 2)
  ctx.fillRect(ox + 6, oy + 4, 4, 2)
  ctx.fillRect(ox + 5, oy + 7, 6, 1)
  ctx.fillRect(ox + 3, oy + 8, 3, 1)
  ctx.fillRect(ox + 10, oy + 8, 3, 1)
  // lighter highlights
  ctx.fillStyle = '#5aaa5a'
  ctx.fillRect(ox + 5, oy + 5, 1, 1); ctx.fillRect(ox + 10, oy + 5, 1, 1)
  ctx.fillRect(ox + 7, oy + 3, 2, 1)
  // coconuts
  px(ox + 6, oy + 8, '#5a3a1a'); px(ox + 9, oy + 8, '#5a3a1a')
}

// ─── Row 5: E5-P1b animated tile frames ────────────────────────────────
// 41 water flowing frame B — ripples shifted right by 4px
function tile41(ox, oy) {
  rect(ox, oy, TILE, TILE, C.water_a)
  for (let y = 2; y < TILE; y += 4) {
    ctx.fillStyle = C.water_b; ctx.fillRect(ox, oy + y, TILE, 1)
  }
  px(ox + 7, oy + 4, C.water_hl); px(ox + 13, oy + 9, C.water_hl)
  px(ox + 2, oy + 14, C.water_hl); px(ox + 9, oy + 1, C.water_hl)
}

// 42 oak canopy frame B — lighter highlights shifted
function tile42(ox, oy) {
  ctx.fillStyle = C.leaf_a
  ctx.beginPath(); ctx.arc(ox + 8, oy + 12, 8, 0, Math.PI * 2); ctx.fill()
  ctx.fillStyle = C.leaf_b
  ctx.beginPath(); ctx.arc(ox + 9, oy + 11, 6, 0, Math.PI * 2); ctx.fill()
  ctx.fillStyle = C.leaf_c
  ctx.beginPath(); ctx.arc(ox + 10, oy + 10, 3, 0, Math.PI * 2); ctx.fill()
  // sparkle highlights in different spots
  px(ox + 11, oy + 9, '#80d080'); px(ox + 4, oy + 10, C.leaf_c)
  px(ox + 12, oy + 13, C.leaf_c); px(ox + 6, oy + 14, C.leaf_c)
}

// 43 pine canopy frame B — slight tip wobble
function tile43(ox, oy) {
  ctx.fillStyle = C.pine_a
  ctx.beginPath(); ctx.moveTo(ox + 2, oy + 14); ctx.lineTo(ox + 14, oy + 14); ctx.lineTo(ox + 9, oy + 0); ctx.closePath(); ctx.fill()
  ctx.fillStyle = C.pine_b
  ctx.beginPath(); ctx.moveTo(ox + 4, oy + 12); ctx.lineTo(ox + 12, oy + 12); ctx.lineTo(ox + 9, oy + 2); ctx.closePath(); ctx.fill()
  ctx.fillStyle = C.pine_c
  ctx.beginPath(); ctx.moveTo(ox + 6, oy + 8); ctx.lineTo(ox + 10, oy + 8); ctx.lineTo(ox + 9, oy + 4); ctx.closePath(); ctx.fill()
  px(ox + 9, oy + 3, '#80d080')
}

// 44 palm canopy frame B — fronds shifted slightly
function tile44(ox, oy) {
  ctx.fillStyle = '#3a8a3a'
  ctx.fillRect(ox + 3, oy + 7, 4, 2)
  ctx.fillRect(ox + 9, oy + 7, 4, 2)
  ctx.fillRect(ox + 6, oy + 5, 4, 2)
  ctx.fillRect(ox + 4, oy + 8, 6, 1)
  ctx.fillRect(ox + 2, oy + 9, 3, 1)
  ctx.fillRect(ox + 11, oy + 9, 3, 1)
  ctx.fillStyle = '#5aaa5a'
  ctx.fillRect(ox + 4, oy + 6, 1, 1); ctx.fillRect(ox + 11, oy + 6, 1, 1)
  ctx.fillRect(ox + 7, oy + 4, 2, 1)
  px(ox + 6, oy + 9, '#5a3a1a'); px(ox + 9, oy + 9, '#5a3a1a')
}

// 45 water flowing frame C — ripples shifted left
function tile45(ox, oy) {
  rect(ox, oy, TILE, TILE, C.water_a)
  for (let y = 1; y < TILE; y += 4) {
    ctx.fillStyle = C.water_b; ctx.fillRect(ox, oy + y, TILE, 1)
  }
  px(ox + 11, oy + 3, C.water_hl); px(ox + 4, oy + 8, C.water_hl)
  px(ox + 14, oy + 12, C.water_hl); px(ox + 6, oy + 14, C.water_hl)
}

// 46 reserve
function tile46(ox, oy) { rect(ox, oy, TILE, TILE, '#22232a') }
// 47 reserve
function tile47(ox, oy) { rect(ox, oy, TILE, TILE, '#22232a') }
// 48 reserve
function tile48(ox, oy) { rect(ox, oy, TILE, TILE, '#22232a') }

const renderers = [
  tile1, tile2, tile3, tile4, tile5, tile6, tile7, tile8,
  tile9, tile10, tile11, tile12, tile13, tile14, tile15, tile16,
  tile17, tile18, tile19, tile20, tile21, tile22, tile23, tile24,
  tile25, tile26, tile27, tile28, tile29, tile30, tile31, tile32,
  tile33, tile34, tile35, tile36, tile37, tile38, tile39, tile40,
  tile41, tile42, tile43, tile44, tile45, tile46, tile47, tile48
]
for (let i = 0; i < renderers.length; i++) {
  const [ox, oy] = tileXY(i)
  renderers[i](ox, oy)
}

mkdirSync(OUT, { recursive: true })
writeFileSync(join(OUT, 'tiles.png'), canvas.toBuffer('image/png'))

const meta = {
  schema_version: 1,
  name: 'outdoor_grove_v1',
  tile_width: TILE, tile_height: TILE,
  tile_count: 48, columns: COLS,
  image: 'tiles.png', image_width: W, image_height: H,
  tiles: [
    { id: 0, kind: 'floor' }, { id: 1, kind: 'floor' }, { id: 2, kind: 'floor' },
    { id: 3, kind: 'decor' }, { id: 4, kind: 'decor' },
    { id: 5, kind: 'floor' }, { id: 6, kind: 'floor' },
    { id: 7, kind: 'wall', collision: true },  // water = impassable
    { id: 8, kind: 'floor' }, { id: 9, kind: 'floor' }, { id: 10, kind: 'floor' },
    { id: 11, kind: 'floor' }, { id: 12, kind: 'floor' }, { id: 13, kind: 'floor' },
    { id: 14, kind: 'floor' }, { id: 15, kind: 'floor' },
    { id: 16, kind: 'wall', collision: true }, { id: 17, kind: 'wall', collision: true },
    { id: 18, kind: 'wall', collision: true }, { id: 19, kind: 'wall', collision: true },
    { id: 20, kind: 'decor' }, { id: 21, kind: 'furniture', collision: true },
    { id: 22, kind: 'furniture', collision: true }, { id: 23, kind: 'furniture', collision: true },
    { id: 24, kind: 'furniture', collision: true }, { id: 25, kind: 'decor' },
    { id: 26, kind: 'furniture', collision: true }, { id: 27, kind: 'decor' },
    { id: 28, kind: 'decor' }, { id: 29, kind: 'decor' },
    { id: 30, kind: 'decor' }, { id: 31, kind: 'furniture', collision: true },
    { id: 32, kind: 'floor' }, { id: 33, kind: 'floor' },
    { id: 34, kind: 'floor' }, { id: 35, kind: 'floor' },
    { id: 36, kind: 'furniture', collision: true }, { id: 37, kind: 'furniture', collision: true },
    { id: 38, kind: 'furniture', collision: true }, { id: 39, kind: 'decor' },
    // E5-P1b animated frames (referenced by tileset.animation array — never placed directly)
    { id: 40, kind: 'floor' }, { id: 41, kind: 'decor' },
    { id: 42, kind: 'decor' }, { id: 43, kind: 'decor' },
    { id: 44, kind: 'floor' }, { id: 45, kind: 'reserve' },
    { id: 46, kind: 'reserve' }, { id: 47, kind: 'reserve' }
  ]
}
writeFileSync(join(OUT, 'tiles.json'), JSON.stringify(meta, null, 2))
console.log(`OK outdoor_grove_v1 — ${renderers.length} tiles → ${W}×${H}px`)
