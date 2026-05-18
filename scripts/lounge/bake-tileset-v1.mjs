#!/usr/bin/env node
// V6.1 / V6.1.1 / E5-P2a — indoor_lobby_v1: 48 tiles, 8 cols × 6 rows.
// Tile IDs 1-6 stay layout-compatible with v0 (legacy lobby data still works),
// art is upgraded. IDs 7-32 are new — floor variants, walls with depth, props.
//
// Tile map (1-indexed in Tiled's firstgid space):
//   Row 0 (legacy + floor variants):
//     1 wood floor A          2 brick wall plain      3 door wood
//     4 table top              5 chair (4-leg)        6 potted plant
//     7 wood floor B           8 wood floor C (knot)
//   Row 1 (floor variety + walls):
//     9 wood floor D          10 carpet edge          11 carpet center
//    12 carpet corner NW      13 wall+window         14 wall+sconce
//    15 wall corner shadow L  16 wall corner shadow R
//   Row 2 (decor):
//    17 painting on wall      18 bookshelf top       19 bookshelf bottom
//    20 wall clock            21 lantern hanging     22 floor lamp
//    23 fireplace logs        24 fireplace mantle
//   Row 3 (furniture):
//    25 sofa left             26 sofa center         27 sofa right
//    28 chair side-left       29 chair side-right    30 large rug center
//    31 flower vase           32 ceiling beam (above-layer ornament)
//   Row 4 (DJ Floor decor — added V6.1.1):
//    33 speaker stack         34 turntable/mixer     35 dance-floor neon A (cyan)
//    36 dance-floor neon B (magenta)                 37 disco ball (above-layer)
//    38 strobe panel (wall)   39 neon "DJ" sign      40 subwoofer (wide)
//
// Run: node scripts/lounge/bake-tileset-v1.mjs

import { createCanvas } from 'canvas'
import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..')
const OUT = join(ROOT, 'public', 'lounge', 'assets', 'tilesets', 'indoor_lobby_v1')

const TILE = 16
const COLS = 8
const ROWS = 6
const W = TILE * COLS
const H = TILE * ROWS

const canvas = createCanvas(W, H)
const ctx = canvas.getContext('2d')
ctx.imageSmoothingEnabled = false

// Helpers
function px(x, y, c) { ctx.fillStyle = c; ctx.fillRect(x, y, 1, 1) }
function rect(x, y, w, h, c) { ctx.fillStyle = c; ctx.fillRect(x, y, w, h) }
function line(x1, y1, x2, y2, c) {
  ctx.fillStyle = c
  if (y1 === y2) ctx.fillRect(Math.min(x1, x2), y1, Math.abs(x2 - x1) + 1, 1)
  else if (x1 === x2) ctx.fillRect(x1, Math.min(y1, y2), 1, Math.abs(y2 - y1) + 1)
}
function tileXY(idx0) { return [(idx0 % COLS) * TILE, Math.floor(idx0 / COLS) * TILE] }

// Palette (warm pixel-art interior)
const C = {
  wood_main: '#a07850', wood_dark: '#8a6438', wood_grain: '#7a5a2e', wood_hl: '#b08860',
  wall_main: '#6b4226', wall_dark: '#3a2412', wall_hl: '#7c5132', wall_seam: '#503020',
  carpet_main: '#b04030', carpet_dark: '#702018', carpet_hl: '#d05848', carpet_gold: '#e0a040',
  brass: '#e8c24b', brass_dim: '#a08020',
  glass_day: '#7ec8e0', glass_hl: '#cfe8f0', glass_frame: '#3a2412',
  green_a: '#3a7a3a', green_b: '#4a9a4a', green_c: '#5aaa5a',
  red_flame: '#e84020', orange_flame: '#f0a020', yellow_flame: '#ffe080',
  black: '#202020', white: '#e0d8c0', cream: '#d8c898',
  stone_main: '#7a7268', stone_dark: '#5a5048', stone_hl: '#9a9288'
}

// Floor backgrounds (slight variants)
function floorBase(ox, oy, base = C.wood_main, dark = C.wood_dark) {
  rect(ox, oy, TILE, TILE, base)
  for (let y = 0; y < TILE; y += 4) { ctx.fillStyle = dark; ctx.fillRect(ox, oy + y, TILE, 1) }
}
// 1: wood floor A
function tile1_floorA(ox, oy) {
  floorBase(ox, oy)
  px(ox + 3, oy + 2, C.wood_grain); px(ox + 11, oy + 5, C.wood_grain)
  px(ox + 5, oy + 9, C.wood_grain); px(ox + 13, oy + 12, C.wood_grain)
}
// 7: wood floor B (different knot pattern, slight highlight)
function tile7_floorB(ox, oy) {
  floorBase(ox, oy)
  px(ox + 7, oy + 1, C.wood_hl); px(ox + 2, oy + 6, C.wood_grain)
  px(ox + 10, oy + 7, C.wood_grain); px(ox + 14, oy + 13, C.wood_grain)
  px(ox + 6, oy + 14, C.wood_grain)
}
// 8: wood floor C (with subtle knot — round 2×2)
function tile8_floorC(ox, oy) {
  floorBase(ox, oy)
  rect(ox + 6, oy + 6, 3, 3, C.wood_grain)
  px(ox + 7, oy + 7, C.wood_dark); px(ox + 7, oy + 6, C.wood_hl)
}
// 9: wood floor D (cleaner, plain — gives "swept" feel)
function tile9_floorD(ox, oy) {
  rect(ox, oy, TILE, TILE, C.wood_hl)
  for (let y = 0; y < TILE; y += 4) { ctx.fillStyle = C.wood_main; ctx.fillRect(ox, oy + y, TILE, 1) }
  px(ox + 4, oy + 11, C.wood_grain); px(ox + 13, oy + 3, C.wood_grain)
}

// 2: brick wall (legacy improved)
function tile2_wall(ox, oy) {
  rect(ox, oy, TILE, TILE, C.wall_main)
  // brick rows (offset every other row)
  for (let r = 0; r < 4; r++) {
    const y = oy + r * 4
    ctx.fillStyle = C.wall_dark; ctx.fillRect(ox, y, TILE, 1)
    const offset = (r % 2 === 0) ? 0 : 8
    ctx.fillStyle = C.wall_dark
    ctx.fillRect(ox + (offset === 0 ? 7 : 3), y, 1, 4)
    if (offset === 0) ctx.fillRect(ox + 15, y, 1, 4)
  }
  // top highlight (light source from above)
  ctx.fillStyle = C.wall_hl; ctx.fillRect(ox, oy, TILE, 1)
}

// 3: door (improved with frame + handle + arch)
function tile3_door(ox, oy) {
  // frame
  rect(ox, oy, TILE, TILE, C.wall_dark)
  // door body
  rect(ox + 2, oy + 1, TILE - 4, TILE - 1, '#5a3216')
  // planks
  ctx.fillStyle = C.wall_seam
  ctx.fillRect(ox + 7, oy + 1, 1, TILE - 1)
  // arch top
  rect(ox + 3, oy + 1, TILE - 6, 2, '#6b4226')
  // handle
  px(ox + 11, oy + 8, C.brass); px(ox + 11, oy + 9, C.brass_dim); px(ox + 12, oy + 8, C.brass)
  // hinges
  px(ox + 2, oy + 4, C.brass_dim); px(ox + 2, oy + 11, C.brass_dim)
}

// 4: table top (improved — wood with grain + edge shadow)
function tile4_table(ox, oy) {
  rect(ox, oy, TILE, TILE, C.wood_dark)
  rect(ox + 1, oy + 1, TILE - 2, TILE - 2, C.wood_main)
  rect(ox + 2, oy + 2, TILE - 4, 2, C.wood_hl)
  // grain
  for (let y = oy + 5; y < oy + TILE - 2; y += 3) {
    ctx.fillStyle = C.wood_grain
    ctx.fillRect(ox + 2, y, TILE - 4, 1)
  }
}

// 5: chair (improved — visible cushion + back)
function tile5_chair(ox, oy) {
  // back
  rect(ox + 3, oy + 2, 10, 3, C.wall_main)
  rect(ox + 4, oy + 3, 8, 1, C.wall_hl)
  // seat
  rect(ox + 3, oy + 5, 10, 8, C.wood_main)
  rect(ox + 4, oy + 6, 8, 6, C.cream)
  // legs
  px(ox + 3, oy + 13, C.wall_dark); px(ox + 3, oy + 14, C.wall_dark)
  px(ox + 12, oy + 13, C.wall_dark); px(ox + 12, oy + 14, C.wall_dark)
}

// 6: potted plant (improved — fuller foliage)
function tile6_plant(ox, oy) {
  // pot
  rect(ox + 4, oy + 11, 8, 5, '#8a3220')
  rect(ox + 5, oy + 12, 6, 3, '#a04230')
  px(ox + 4, oy + 11, '#6a2210'); px(ox + 11, oy + 11, '#6a2210')
  // foliage
  rect(ox + 6, oy + 5, 4, 6, C.green_a)
  rect(ox + 5, oy + 6, 6, 4, C.green_b)
  rect(ox + 4, oy + 7, 8, 2, C.green_c)
  px(ox + 7, oy + 4, C.green_b); px(ox + 8, oy + 4, C.green_c)
  px(ox + 3, oy + 8, C.green_a); px(ox + 12, oy + 8, C.green_a)
}

// 10: carpet edge (top edge of a rug — fringe)
function tile10_carpetEdge(ox, oy) {
  floorBase(ox, oy)
  rect(ox, oy + 4, TILE, TILE - 4, C.carpet_main)
  // fringe
  for (let x = 0; x < TILE; x += 2) {
    ctx.fillStyle = C.carpet_gold; ctx.fillRect(ox + x, oy + 2, 1, 2)
  }
  // top edge gold band
  rect(ox, oy + 4, TILE, 1, C.carpet_gold)
  rect(ox, oy + 5, TILE, 1, C.carpet_dark)
}

// 11: carpet center (rug pattern)
function tile11_carpetCenter(ox, oy) {
  rect(ox, oy, TILE, TILE, C.carpet_main)
  // diamond pattern
  ctx.fillStyle = C.carpet_dark
  ctx.fillRect(ox + 7, oy + 3, 2, 1); ctx.fillRect(ox + 6, oy + 4, 4, 1)
  ctx.fillRect(ox + 5, oy + 5, 6, 1); ctx.fillRect(ox + 4, oy + 6, 8, 1)
  ctx.fillRect(ox + 5, oy + 10, 6, 1); ctx.fillRect(ox + 6, oy + 11, 4, 1)
  ctx.fillRect(ox + 7, oy + 12, 2, 1); ctx.fillRect(ox + 4, oy + 9, 8, 1)
  // highlight cross
  ctx.fillStyle = C.carpet_hl
  ctx.fillRect(ox + 7, oy + 7, 2, 2)
}

// 12: carpet corner NW (top-left of rug)
function tile12_carpetCornerNW(ox, oy) {
  floorBase(ox, oy)
  rect(ox + 4, oy + 4, TILE - 4, TILE - 4, C.carpet_main)
  // fringe top
  for (let x = 4; x < TILE; x += 2) {
    ctx.fillStyle = C.carpet_gold; ctx.fillRect(ox + x, oy + 2, 1, 2)
  }
  // fringe left
  for (let y = 4; y < TILE; y += 2) {
    ctx.fillStyle = C.carpet_gold; ctx.fillRect(ox + 2, oy + y, 2, 1)
  }
  rect(ox + 4, oy + 4, TILE - 4, 1, C.carpet_gold)
  rect(ox + 4, oy + 4, 1, TILE - 4, C.carpet_gold)
}

// 13: wall with window
function tile13_wallWindow(ox, oy) {
  tile2_wall(ox, oy)
  // window frame
  rect(ox + 2, oy + 2, 12, 11, C.glass_frame)
  // window glass (day blue)
  rect(ox + 3, oy + 3, 10, 9, C.glass_day)
  // mullions (cross)
  ctx.fillStyle = C.glass_frame
  ctx.fillRect(ox + 8, oy + 3, 1, 9); ctx.fillRect(ox + 3, oy + 7, 10, 1)
  // glass highlight
  ctx.fillStyle = C.glass_hl
  ctx.fillRect(ox + 4, oy + 4, 3, 1); ctx.fillRect(ox + 4, oy + 5, 1, 2)
  ctx.fillRect(ox + 10, oy + 8, 2, 1); ctx.fillRect(ox + 10, oy + 9, 1, 2)
  // sill
  rect(ox + 1, oy + 13, 14, 1, C.wood_dark)
}

// 14: wall with sconce (small wall lantern)
function tile14_wallSconce(ox, oy) {
  tile2_wall(ox, oy)
  // wall mount
  rect(ox + 7, oy + 5, 2, 2, C.brass_dim)
  // lantern body
  rect(ox + 5, oy + 7, 6, 5, C.brass_dim)
  rect(ox + 6, oy + 8, 4, 3, C.yellow_flame)
  px(ox + 7, oy + 9, C.orange_flame); px(ox + 8, oy + 9, C.orange_flame)
  // glow
  px(ox + 4, oy + 9, '#a07020'); px(ox + 11, oy + 9, '#a07020')
}

// 15: wall corner shadow left (gradient — for inner room corners)
function tile15_wallShadowL(ox, oy) {
  tile2_wall(ox, oy)
  // left side shadow
  ctx.fillStyle = 'rgba(0,0,0,0.35)'
  ctx.fillRect(ox, oy, 3, TILE)
}
// 16: wall corner shadow right
function tile16_wallShadowR(ox, oy) {
  tile2_wall(ox, oy)
  ctx.fillStyle = 'rgba(0,0,0,0.35)'
  ctx.fillRect(ox + TILE - 3, oy, 3, TILE)
}

// 17: painting on wall
function tile17_painting(ox, oy) {
  tile2_wall(ox, oy)
  // frame
  rect(ox + 3, oy + 3, 10, 8, C.brass_dim)
  rect(ox + 4, oy + 4, 8, 6, C.brass)
  // canvas: simple landscape — sky + hills + sun
  rect(ox + 5, oy + 5, 6, 4, C.glass_day)
  rect(ox + 5, oy + 7, 6, 2, '#5a8848')
  px(ox + 9, oy + 5, C.yellow_flame); px(ox + 9, oy + 6, C.orange_flame)
}

// 18: bookshelf top (books on shelf)
function tile18_bookshelfTop(ox, oy) {
  // back panel
  rect(ox, oy, TILE, TILE, C.wood_dark)
  rect(ox + 1, oy + 1, TILE - 2, TILE - 2, '#5a3216')
  // shelves (horizontal lines)
  rect(ox, oy + 7, TILE, 1, C.wood_main)
  rect(ox, oy + 15, TILE, 1, C.wood_main)
  // book colors: 6 books per shelf
  const books = ['#c04040', '#4080c0', '#40a060', '#c08040', '#8060c0', '#d0a040']
  for (let s = 0; s < 2; s++) {
    const yShelf = oy + 1 + s * 7
    for (let b = 0; b < 6; b++) {
      const xBook = ox + 1 + b * 2.4
      const h = 5 + ((b * 3 + s * 7) % 2)
      rect(Math.round(xBook), yShelf, 2, h, books[(b + s) % books.length])
    }
  }
}
// 19: bookshelf bottom (legs + cabinet)
function tile19_bookshelfBot(ox, oy) {
  rect(ox, oy, TILE, TILE, C.wood_dark)
  rect(ox + 1, oy + 1, TILE - 2, TILE - 4, '#5a3216')
  // cabinet doors
  rect(ox + 2, oy + 2, 5, 9, '#6b4226')
  rect(ox + 9, oy + 2, 5, 9, '#6b4226')
  // door handles
  px(ox + 5, oy + 6, C.brass); px(ox + 10, oy + 6, C.brass)
  // legs
  rect(ox, oy + 13, 2, 3, C.wood_dark); rect(ox + 14, oy + 13, 2, 3, C.wood_dark)
}

// 20: wall clock
function tile20_clock(ox, oy) {
  tile2_wall(ox, oy)
  // round clock
  const cx = ox + 8, cy = oy + 8
  // body
  ctx.fillStyle = C.wood_dark; ctx.beginPath(); ctx.arc(cx, cy, 5, 0, Math.PI * 2); ctx.fill()
  ctx.fillStyle = C.cream; ctx.beginPath(); ctx.arc(cx, cy, 4, 0, Math.PI * 2); ctx.fill()
  // hands
  px(cx, cy, C.black); px(cx, cy - 2, C.black); px(cx, cy - 1, C.black)
  px(cx + 1, cy, C.black); px(cx + 2, cy, C.black)
  // 12/3/6/9 markers
  px(cx, cy - 3, C.black); px(cx, cy + 3, C.black)
  px(cx - 3, cy, C.black); px(cx + 3, cy, C.black)
}

// 21: lantern hanging (above-layer)
function tile21_lantern(ox, oy) {
  // chain
  rect(ox + 7, oy, 2, 4, C.wall_dark)
  // top cap
  rect(ox + 5, oy + 3, 6, 2, C.wood_dark)
  // body
  rect(ox + 4, oy + 5, 8, 7, C.brass_dim)
  // glass
  rect(ox + 5, oy + 6, 6, 5, C.yellow_flame)
  px(ox + 7, oy + 8, C.orange_flame); px(ox + 8, oy + 8, C.orange_flame)
  // bottom
  rect(ox + 5, oy + 12, 6, 1, C.brass_dim)
  // glow
  px(ox + 3, oy + 8, '#806010'); px(ox + 12, oy + 8, '#806010')
}

// 22: floor lamp (tall, stands on ground)
function tile22_floorLamp(ox, oy) {
  // base
  rect(ox + 5, oy + 14, 6, 2, C.wood_dark)
  rect(ox + 6, oy + 15, 4, 1, C.black)
  // pole
  rect(ox + 7, oy + 5, 2, 9, C.wood_dark)
  // shade
  rect(ox + 3, oy + 2, 10, 4, C.cream)
  rect(ox + 4, oy + 1, 8, 1, C.cream)
  rect(ox + 3, oy + 6, 10, 1, C.wood_dark)
  // glow
  rect(ox + 4, oy + 3, 8, 2, C.yellow_flame)
}

// 23: fireplace logs (bottom)
function tile23_fireplaceLogs(ox, oy) {
  // hearth frame
  rect(ox, oy, TILE, TILE, C.stone_dark)
  rect(ox + 1, oy + 1, TILE - 2, TILE - 2, C.stone_main)
  // opening
  rect(ox + 3, oy + 4, 10, 11, C.black)
  // logs
  rect(ox + 4, oy + 10, 8, 2, C.wood_dark)
  rect(ox + 5, oy + 9, 6, 1, C.wood_main)
  // fire
  rect(ox + 6, oy + 6, 4, 4, C.red_flame)
  rect(ox + 7, oy + 5, 2, 4, C.orange_flame)
  px(ox + 7, oy + 4, C.yellow_flame); px(ox + 8, oy + 4, C.yellow_flame)
  px(ox + 8, oy + 7, C.yellow_flame)
}

// 24: fireplace mantle (top)
function tile24_fireplaceMantle(ox, oy) {
  rect(ox, oy, TILE, TILE, C.stone_dark)
  rect(ox + 1, oy + 1, TILE - 2, TILE - 2, C.stone_main)
  // mantle shelf
  rect(ox, oy + 13, TILE, 3, C.wood_dark)
  rect(ox, oy + 13, TILE, 1, C.wood_hl)
  // chimney stones
  ctx.fillStyle = C.stone_hl
  ctx.fillRect(ox + 3, oy + 2, 2, 1); ctx.fillRect(ox + 8, oy + 5, 2, 1)
  ctx.fillRect(ox + 4, oy + 9, 2, 1)
  // small ornaments on mantle
  px(ox + 4, oy + 12, C.brass); px(ox + 11, oy + 12, C.green_b)
}

// 25: sofa left
function tile25_sofaLeft(ox, oy) {
  // arm
  rect(ox + 1, oy + 4, 5, 11, '#5a4060')
  rect(ox + 2, oy + 5, 3, 8, '#7a6080')
  // back
  rect(ox + 5, oy + 3, TILE - 5, 7, '#5a4060')
  // cushion
  rect(ox + 5, oy + 9, TILE - 5, 5, '#a080c0')
  rect(ox + 6, oy + 10, TILE - 6, 3, '#c0a0e0')
  // base
  rect(ox + 1, oy + 14, TILE - 1, 2, C.wood_dark)
}
// 26: sofa center
function tile26_sofaCenter(ox, oy) {
  rect(ox, oy + 3, TILE, 7, '#5a4060')
  rect(ox + 1, oy + 4, TILE - 2, 5, '#7a6080')
  rect(ox, oy + 9, TILE, 5, '#a080c0')
  rect(ox + 1, oy + 10, TILE - 2, 3, '#c0a0e0')
  // seam between cushions
  ctx.fillStyle = '#5a4060'; ctx.fillRect(ox + 7, oy + 9, 2, 5)
  rect(ox, oy + 14, TILE, 2, C.wood_dark)
}
// 27: sofa right
function tile27_sofaRight(ox, oy) {
  rect(ox + 10, oy + 4, 5, 11, '#5a4060')
  rect(ox + 11, oy + 5, 3, 8, '#7a6080')
  rect(ox, oy + 3, 11, 7, '#5a4060')
  rect(ox, oy + 9, 11, 5, '#a080c0')
  rect(ox + 1, oy + 10, 9, 3, '#c0a0e0')
  rect(ox, oy + 14, TILE - 1, 2, C.wood_dark)
}

// 28: chair side-left (facing left)
function tile28_chairSideL(ox, oy) {
  // back (on right)
  rect(ox + 10, oy + 2, 3, 11, C.wall_main)
  rect(ox + 11, oy + 3, 1, 9, C.wall_hl)
  // seat
  rect(ox + 3, oy + 7, 8, 5, C.wood_main)
  rect(ox + 4, oy + 8, 6, 3, C.cream)
  // legs
  px(ox + 4, oy + 13, C.wall_dark); px(ox + 4, oy + 14, C.wall_dark)
  px(ox + 10, oy + 13, C.wall_dark); px(ox + 10, oy + 14, C.wall_dark)
}
// 29: chair side-right
function tile29_chairSideR(ox, oy) {
  rect(ox + 3, oy + 2, 3, 11, C.wall_main)
  rect(ox + 4, oy + 3, 1, 9, C.wall_hl)
  rect(ox + 5, oy + 7, 8, 5, C.wood_main)
  rect(ox + 6, oy + 8, 6, 3, C.cream)
  px(ox + 5, oy + 13, C.wall_dark); px(ox + 5, oy + 14, C.wall_dark)
  px(ox + 11, oy + 13, C.wall_dark); px(ox + 11, oy + 14, C.wall_dark)
}

// 30: large rug center (cream + gold motif)
function tile30_rugCenter(ox, oy) {
  rect(ox, oy, TILE, TILE, '#c89060')
  rect(ox + 2, oy + 2, TILE - 4, TILE - 4, '#a07040')
  // gold motif star
  ctx.fillStyle = C.carpet_gold
  ctx.fillRect(ox + 7, oy + 3, 2, 10); ctx.fillRect(ox + 3, oy + 7, 10, 2)
  px(ox + 5, oy + 5, C.carpet_gold); px(ox + 10, oy + 5, C.carpet_gold)
  px(ox + 5, oy + 10, C.carpet_gold); px(ox + 10, oy + 10, C.carpet_gold)
}

// 31: flower vase
function tile31_vase(ox, oy) {
  // vase
  rect(ox + 5, oy + 9, 6, 6, C.glass_day)
  rect(ox + 6, oy + 10, 4, 4, C.glass_hl)
  px(ox + 4, oy + 9, C.wall_dark); px(ox + 11, oy + 9, C.wall_dark)
  rect(ox + 6, oy + 14, 4, 1, C.wall_dark)
  // stems
  ctx.fillStyle = C.green_a
  ctx.fillRect(ox + 7, oy + 4, 1, 6); ctx.fillRect(ox + 9, oy + 5, 1, 5)
  // flowers
  px(ox + 7, oy + 3, '#e84080'); px(ox + 9, oy + 4, '#f0a040'); px(ox + 8, oy + 4, '#ffe080')
}

// 32: ceiling beam (dark wood horizontal — above-layer)
function tile32_beam(ox, oy) {
  rect(ox, oy, TILE, 4, C.wood_dark)
  rect(ox, oy + 1, TILE, 1, '#502810')
  rect(ox, oy + 3, TILE, 1, C.wall_dark)
  for (let x = 0; x < TILE; x += 3) px(ox + x, oy + 2, '#3a2010')
}

// ─── Row 4: DJ Floor tiles ───────────────────────────────────────────────
// 33: speaker stack (tall black cabinet with cone)
function tile33_speaker(ox, oy) {
  // back panel (wall)
  rect(ox, oy, TILE, TILE, C.wall_main)
  // cabinet
  rect(ox + 2, oy + 1, 12, 15, '#1a1a1a')
  rect(ox + 3, oy + 2, 10, 13, '#2a2a2a')
  // tweeter (top small cone)
  ctx.fillStyle = '#404040'; ctx.beginPath(); ctx.arc(ox + 8, oy + 5, 2, 0, Math.PI * 2); ctx.fill()
  ctx.fillStyle = '#0a0a0a'; ctx.beginPath(); ctx.arc(ox + 8, oy + 5, 1, 0, Math.PI * 2); ctx.fill()
  // woofer (bottom large cone)
  ctx.fillStyle = '#404040'; ctx.beginPath(); ctx.arc(ox + 8, oy + 11, 4, 0, Math.PI * 2); ctx.fill()
  ctx.fillStyle = '#202020'; ctx.beginPath(); ctx.arc(ox + 8, oy + 11, 3, 0, Math.PI * 2); ctx.fill()
  ctx.fillStyle = '#0a0a0a'; ctx.beginPath(); ctx.arc(ox + 8, oy + 11, 1.5, 0, Math.PI * 2); ctx.fill()
  // LED
  px(ox + 4, oy + 3, '#00ff80')
}

// 34: turntable / mixer (DJ booth deck)
function tile34_turntable(ox, oy) {
  // base
  rect(ox, oy, TILE, TILE, C.wood_dark)
  rect(ox + 1, oy + 1, TILE - 2, TILE - 2, '#1a1a1a')
  // platter (circular)
  ctx.fillStyle = '#303030'; ctx.beginPath(); ctx.arc(ox + 8, oy + 8, 6, 0, Math.PI * 2); ctx.fill()
  ctx.fillStyle = '#1a1a1a'; ctx.beginPath(); ctx.arc(ox + 8, oy + 8, 5, 0, Math.PI * 2); ctx.fill()
  // center spindle + label
  ctx.fillStyle = '#c04080'; ctx.beginPath(); ctx.arc(ox + 8, oy + 8, 2, 0, Math.PI * 2); ctx.fill()
  px(ox + 8, oy + 8, '#ffffff')
  // tone arm
  ctx.fillStyle = '#a0a0a0'
  ctx.fillRect(ox + 11, oy + 4, 1, 4); ctx.fillRect(ox + 10, oy + 7, 2, 1)
  // pitch slider
  rect(ox + 2, oy + 13, 5, 2, '#303030')
  px(ox + 5, oy + 13, '#ff4080')
  // LEDs on side
  px(ox + 14, oy + 3, '#00ff80'); px(ox + 14, oy + 5, '#ff4080')
}

// 35: dance-floor neon A (cyan-lit square)
function tile35_floorA(ox, oy) {
  rect(ox, oy, TILE, TILE, '#080820')
  // inner glow
  rect(ox + 2, oy + 2, TILE - 4, TILE - 4, '#103060')
  rect(ox + 3, oy + 3, TILE - 6, TILE - 6, '#2080c0')
  rect(ox + 5, oy + 5, TILE - 10, TILE - 10, '#40e0ff')
  // bright corners
  px(ox + 1, oy + 1, '#80f0ff'); px(ox + 14, oy + 1, '#80f0ff')
  px(ox + 1, oy + 14, '#80f0ff'); px(ox + 14, oy + 14, '#80f0ff')
}

// 36: dance-floor neon B (magenta-lit square)
function tile36_floorB(ox, oy) {
  rect(ox, oy, TILE, TILE, '#100018')
  rect(ox + 2, oy + 2, TILE - 4, TILE - 4, '#601060')
  rect(ox + 3, oy + 3, TILE - 6, TILE - 6, '#c020a0')
  rect(ox + 5, oy + 5, TILE - 10, TILE - 10, '#ff60e0')
  px(ox + 1, oy + 1, '#ffa0f0'); px(ox + 14, oy + 1, '#ffa0f0')
  px(ox + 1, oy + 14, '#ffa0f0'); px(ox + 14, oy + 14, '#ffa0f0')
}

// 37: disco ball (above-layer; hangs from ceiling)
function tile37_discoball(ox, oy) {
  // chain
  rect(ox + 7, oy, 2, 3, '#808080')
  // ball (round, faceted)
  const cx = ox + 8, cy = oy + 8
  ctx.fillStyle = '#a0a0a0'; ctx.beginPath(); ctx.arc(cx, cy, 5, 0, Math.PI * 2); ctx.fill()
  ctx.fillStyle = '#d0d0d0'; ctx.beginPath(); ctx.arc(cx - 1, cy - 1, 3, 0, Math.PI * 2); ctx.fill()
  // facet highlights
  px(cx - 2, cy - 2, '#ffffff'); px(cx + 2, cy + 1, '#ffffff')
  px(cx, cy + 2, '#ffffff'); px(cx + 1, cy - 2, '#ffffff')
  // facet grid
  ctx.fillStyle = 'rgba(0,0,0,0.3)'
  ctx.fillRect(cx - 4, cy, 9, 1); ctx.fillRect(cx, cy - 4, 1, 9)
  // sparkle beams (2 small dots near ball)
  px(ox + 2, oy + 14, '#ffffff'); px(ox + 13, oy + 13, '#ffffff')
}

// 38: strobe panel (wall light bars)
function tile38_strobe(ox, oy) {
  tile2_wall(ox, oy)
  // panel
  rect(ox + 2, oy + 4, 12, 8, '#202020')
  // light bars
  rect(ox + 3, oy + 5, 10, 1, '#ff4080')
  rect(ox + 3, oy + 7, 10, 1, '#40e0ff')
  rect(ox + 3, oy + 9, 10, 1, '#ffff60')
  rect(ox + 3, oy + 11, 10, 1, '#80ff80')
  // highlights (animated illusion)
  px(ox + 12, oy + 5, '#ffe0f0'); px(ox + 4, oy + 7, '#a0f0ff')
  px(ox + 12, oy + 9, '#ffffa0'); px(ox + 4, oy + 11, '#c0ffc0')
}

// 39: neon "DJ" sign
function tile39_neonDJ(ox, oy) {
  tile2_wall(ox, oy)
  // glow halo
  rect(ox + 1, oy + 3, 14, 10, 'rgba(255,64,128,0.15)')
  // D
  ctx.fillStyle = '#ff60c0'
  ctx.fillRect(ox + 3, oy + 5, 1, 6); ctx.fillRect(ox + 4, oy + 5, 2, 1); ctx.fillRect(ox + 6, oy + 6, 1, 4); ctx.fillRect(ox + 4, oy + 10, 2, 1)
  // J
  ctx.fillRect(ox + 11, oy + 5, 1, 6); ctx.fillRect(ox + 10, oy + 10, 1, 1); ctx.fillRect(ox + 9, oy + 9, 1, 1)
  ctx.fillRect(ox + 9, oy + 5, 3, 1)
  // bright cores
  ctx.fillStyle = '#ffc0ff'
  px(ox + 3, oy + 7, '#ffc0ff'); px(ox + 11, oy + 8, '#ffc0ff')
}

// 40: subwoofer (wide horizontal speaker)
function tile40_subwoofer(ox, oy) {
  rect(ox, oy, TILE, TILE, C.wall_main)
  rect(ox + 1, oy + 4, TILE - 2, 11, '#1a1a1a')
  rect(ox + 2, oy + 5, TILE - 4, 9, '#2a2a2a')
  // big cone
  ctx.fillStyle = '#404040'; ctx.beginPath(); ctx.arc(ox + 8, oy + 10, 5, 0, Math.PI * 2); ctx.fill()
  ctx.fillStyle = '#202020'; ctx.beginPath(); ctx.arc(ox + 8, oy + 10, 4, 0, Math.PI * 2); ctx.fill()
  ctx.fillStyle = '#0a0a0a'; ctx.beginPath(); ctx.arc(ox + 8, oy + 10, 2, 0, Math.PI * 2); ctx.fill()
  // LEDs
  px(ox + 3, oy + 6, '#00ff80'); px(ox + 12, oy + 6, '#ff4080')
}

// ─── Row 5: E5-P2a extras ─────────────────────────────────────────────
// 41: flower patch (white/blue) — 3rd flower color
function tile41_flowerW(ox, oy) {
  floorBase(ox, oy)
  const spots = [[4, 5], [10, 4], [6, 10], [12, 11], [3, 12]]
  for (const [x, y] of spots) {
    px(ox + x, oy + y, '#a0c8ff')
    px(ox + x + 1, oy + y, '#ffffff')
    px(ox + x, oy + y + 1, '#80b0e8')
    px(ox + x + 1, oy + y + 1, '#a0c0ff')
  }
}

// 42: carpet edge S (rug bottom — fringe on bottom)
function tile42_carpetS(ox, oy) {
  rect(ox, oy, TILE, TILE - 4, C.carpet_main)
  floorBase(ox, oy)
  rect(ox, oy, TILE, TILE - 4, C.carpet_main)
  for (let x = 0; x < TILE; x += 2) {
    ctx.fillStyle = C.carpet_gold; ctx.fillRect(ox + x, oy + TILE - 2, 1, 2)
  }
  rect(ox, oy + TILE - 4, TILE, 1, C.carpet_dark)
  rect(ox, oy + TILE - 5, TILE, 1, C.carpet_gold)
}

// 43: carpet edge W (rug left — fringe on left)
function tile43_carpetW(ox, oy) {
  floorBase(ox, oy)
  rect(ox + 4, oy, TILE - 4, TILE, C.carpet_main)
  for (let y = 0; y < TILE; y += 2) {
    ctx.fillStyle = C.carpet_gold; ctx.fillRect(ox + 2, oy + y, 2, 1)
  }
  rect(ox + 4, oy, 1, TILE, C.carpet_gold)
  rect(ox + 5, oy, 1, TILE, C.carpet_dark)
}

// 44: carpet edge E (rug right — fringe on right)
function tile44_carpetE(ox, oy) {
  floorBase(ox, oy)
  rect(ox, oy, TILE - 4, TILE, C.carpet_main)
  for (let y = 0; y < TILE; y += 2) {
    ctx.fillStyle = C.carpet_gold; ctx.fillRect(ox + TILE - 4, oy + y, 2, 1)
  }
  rect(ox + TILE - 5, oy, 1, TILE, C.carpet_gold)
  rect(ox + TILE - 6, oy, 1, TILE, C.carpet_dark)
}

// 45: wall mirror — frame + reflective glass with hint of room
function tile45_mirror(ox, oy) {
  tile2_wall(ox, oy)
  // frame
  rect(ox + 3, oy + 2, 10, 12, C.brass_dim)
  rect(ox + 4, oy + 3, 8, 10, C.brass)
  // glass
  rect(ox + 5, oy + 4, 6, 8, '#a0c0e0')
  // hint of a room in reflection (white blob + dark line)
  px(ox + 6, oy + 5, '#ffffff'); px(ox + 9, oy + 7, '#ffffff')
  rect(ox + 6, oy + 10, 4, 1, '#80a0c0')
}

// 46: chair facing up (back faces viewer)
function tile46_chairUp(ox, oy) {
  // back (closer to viewer = bottom)
  rect(ox + 3, oy + 9, 10, 4, C.wall_main)
  rect(ox + 4, oy + 10, 8, 2, C.wall_hl)
  // seat
  rect(ox + 3, oy + 3, 10, 7, C.wood_main)
  rect(ox + 4, oy + 4, 8, 5, C.cream)
  // legs (just the front 2 visible)
  px(ox + 3, oy + 13, C.wall_dark); px(ox + 3, oy + 14, C.wall_dark)
  px(ox + 12, oy + 13, C.wall_dark); px(ox + 12, oy + 14, C.wall_dark)
}

// 47: small armchair (cushy, single seat)
function tile47_armchair(ox, oy) {
  // arms (left + right)
  rect(ox + 1, oy + 5, 3, 10, '#7a4060')
  rect(ox + 12, oy + 5, 3, 10, '#7a4060')
  // back
  rect(ox + 3, oy + 3, 10, 6, '#8a5070')
  // seat cushion
  rect(ox + 3, oy + 9, 10, 5, '#a07088')
  rect(ox + 4, oy + 10, 8, 3, '#c090a8')
  // base
  rect(ox + 1, oy + 14, 14, 2, C.wood_dark)
}

// 48: small round table (1×1)
function tile48_smallTable(ox, oy) {
  // table top (round)
  ctx.fillStyle = C.wood_dark; ctx.beginPath(); ctx.arc(ox + 8, oy + 6, 6, 0, Math.PI * 2); ctx.fill()
  ctx.fillStyle = C.wood_main; ctx.beginPath(); ctx.arc(ox + 8, oy + 6, 5, 0, Math.PI * 2); ctx.fill()
  // pedestal
  rect(ox + 7, oy + 10, 2, 4, C.wood_dark)
  rect(ox + 5, oy + 14, 6, 1, C.wood_dark)
}

// Render — in tile order
const renderers = [
  tile1_floorA, tile2_wall, tile3_door, tile4_table, tile5_chair, tile6_plant,
  tile7_floorB, tile8_floorC,
  tile9_floorD, tile10_carpetEdge, tile11_carpetCenter, tile12_carpetCornerNW,
  tile13_wallWindow, tile14_wallSconce, tile15_wallShadowL, tile16_wallShadowR,
  tile17_painting, tile18_bookshelfTop, tile19_bookshelfBot, tile20_clock,
  tile21_lantern, tile22_floorLamp, tile23_fireplaceLogs, tile24_fireplaceMantle,
  tile25_sofaLeft, tile26_sofaCenter, tile27_sofaRight, tile28_chairSideL,
  tile29_chairSideR, tile30_rugCenter, tile31_vase, tile32_beam,
  tile33_speaker, tile34_turntable, tile35_floorA, tile36_floorB,
  tile37_discoball, tile38_strobe, tile39_neonDJ, tile40_subwoofer,
  tile41_flowerW, tile42_carpetS, tile43_carpetW, tile44_carpetE,
  tile45_mirror, tile46_chairUp, tile47_armchair, tile48_smallTable
]
for (let i = 0; i < renderers.length; i++) {
  const [ox, oy] = tileXY(i)
  renderers[i](ox, oy)
}

mkdirSync(OUT, { recursive: true })
writeFileSync(join(OUT, 'tiles.png'), canvas.toBuffer('image/png'))

const meta = {
  schema_version: 1,
  name: 'indoor_lobby_v1',
  tile_width: TILE, tile_height: TILE,
  tile_count: 48, columns: COLS,
  image: 'tiles.png', image_width: W, image_height: H,
  tiles: [
    { id: 0, kind: 'floor' },
    { id: 1, kind: 'wall', collision: true },
    { id: 2, kind: 'door' },
    { id: 3, kind: 'furniture', collision: true },
    { id: 4, kind: 'furniture', collision: true },
    { id: 5, kind: 'furniture', collision: true },
    { id: 6, kind: 'floor' }, { id: 7, kind: 'floor' },
    { id: 8, kind: 'floor' }, { id: 9, kind: 'floor' },
    { id: 10, kind: 'floor' }, { id: 11, kind: 'floor' },
    { id: 12, kind: 'wall', collision: true },
    { id: 13, kind: 'wall', collision: true },
    { id: 14, kind: 'wall', collision: true },
    { id: 15, kind: 'wall', collision: true },
    { id: 16, kind: 'decor' }, { id: 17, kind: 'furniture', collision: true },
    { id: 18, kind: 'furniture', collision: true }, { id: 19, kind: 'decor' },
    { id: 20, kind: 'decor' }, { id: 21, kind: 'furniture', collision: true },
    { id: 22, kind: 'furniture', collision: true }, { id: 23, kind: 'furniture', collision: true },
    { id: 24, kind: 'furniture', collision: true }, { id: 25, kind: 'furniture', collision: true },
    { id: 26, kind: 'furniture', collision: true }, { id: 27, kind: 'furniture', collision: true },
    { id: 28, kind: 'furniture', collision: true }, { id: 29, kind: 'decor' },
    { id: 30, kind: 'furniture', collision: true }, { id: 31, kind: 'decor' },
    { id: 32, kind: 'furniture', collision: true }, { id: 33, kind: 'furniture', collision: true },
    { id: 34, kind: 'floor' }, { id: 35, kind: 'floor' },
    { id: 36, kind: 'decor' }, { id: 37, kind: 'wall', collision: true },
    { id: 38, kind: 'wall', collision: true }, { id: 39, kind: 'furniture', collision: true },
    // E5-P2a — additions: 3rd flower, full carpet edges, mirror, more furniture
    { id: 40, kind: 'floor' }, { id: 41, kind: 'floor' },
    { id: 42, kind: 'floor' }, { id: 43, kind: 'floor' },
    { id: 44, kind: 'decor' }, { id: 45, kind: 'furniture', collision: true },
    { id: 46, kind: 'furniture', collision: true }, { id: 47, kind: 'furniture', collision: true }
  ]
}
writeFileSync(join(OUT, 'tiles.json'), JSON.stringify(meta, null, 2))
console.log(`OK indoor_lobby_v1 — ${renderers.length} tiles → ${W}×${H}px`)
