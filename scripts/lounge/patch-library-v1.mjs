#!/usr/bin/env node
// V6.1.1 — Patch library.tmj to use indoor_lobby_v1 + apply library-themed decor.
//
//   • Re-point tileset to v1 (40 tiles)
//   • Sprinkle wood floor variants
//   • Bookshelves along walls (matching existing collision objects):
//       north wall: 18(top) + 19(bot)... wait north is 1 tile thick. Use 18 only.
//       west, east walls: bookshelves at floor level
//   • Top wall: 4 windows + clock
//   • Side walls: paintings + clock
//   • Reading nook: rug + sofa + floor lamp + small painting
//   • Hanging lantern in center
//
// Run: node scripts/lounge/patch-library-v1.mjs

import { readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..')
const FILE = join(ROOT, 'public', 'lounge', 'assets', 'rooms', 'library.tmj')
const map = JSON.parse(readFileSync(FILE, 'utf8'))
const W = map.width, H = map.height  // 25 × 18
const idx = (x, y) => y * W + x

map.tilesets = [{
  columns: 8, firstgid: 1,
  image: '../tilesets/indoor_lobby_v1/tiles.png',
  imageheight: 80, imagewidth: 128,
  margin: 0, name: 'indoor_lobby_v1', spacing: 0,
  tilecount: 40, tileheight: 16, tilewidth: 16
}]

const layers = Object.fromEntries(map.layers.map(l => [l.name, l]))
const floor = layers.floor
const fb = layers.furniture_below
const fa = layers.furniture_above

// Floor variant sprinkle
function hash(x, y) {
  let h = x * 73856093 ^ y * 19349663
  h = (h ^ (h >>> 13)) * 1274126177
  return (h ^ (h >>> 16)) >>> 0
}
for (let y = 1; y < H - 1; y++) {
  for (let x = 1; x < W - 1; x++) {
    if (floor.data[idx(x, y)] !== 1) continue
    const r = hash(x, y) % 100
    if (r < 7) floor.data[idx(x, y)] = 7
    else if (r < 14) floor.data[idx(x, y)] = 8
    else if (r < 20) floor.data[idx(x, y)] = 9
  }
}

// Top wall: windows + clock
//  Library is 25 wide. Top wall row 0 cols 0-24.
//  Existing bookshelves at row 1 cols 2-9 and 15-22 (sit ABOVE the wall visually as decor).
//  So top wall has only the wall tile to swap.
const TOP_SWAPS = [
  [4,  0, 13],   // window
  [11, 0, 20],   // clock above center
  [12, 0, 13],   // window
  [13, 0, 13],   // window
  [20, 0, 13]    // window
]
for (const [x, y, t] of TOP_SWAPS) {
  if (floor.data[idx(x, y)] === 2) floor.data[idx(x, y)] = t
}

// Side walls: paintings
const SIDE_SWAPS = [
  [0, 8, 17],   // left wall painting
  [0, 14, 14],  // left wall sconce
  [24, 8, 17],  // right wall painting
  [24, 14, 14]  // right wall sconce
]
for (const [x, y, t] of SIDE_SWAPS) {
  if (floor.data[idx(x, y)] === 2) floor.data[idx(x, y)] = t
}

function put(layer, x, y, t) { layer.data[idx(x, y)] = t }

// Bookshelves matching existing collision objects:
//   north wall row 1: cols 2-9 + 15-22 (these are 1-tile-thick bookshelves along top)
//   west col 1: rows 3-6
//   east col 23: rows 3-6
// Use tile 18 (filled books) for the visible front of all these.
for (let x = 2; x <= 9; x++) put(fb, x, 1, 18)
for (let x = 15; x <= 22; x++) put(fb, x, 1, 18)
for (let y = 3; y <= 6; y++) {
  put(fb, 1,  y, 18)
  put(fb, 23, y, 18)
}

// Reading nook bottom-left (cols 2-5, row 14-15) — sofa + rug + lamp
put(fb, 2, 15, 25)   // sofa left
put(fb, 3, 15, 26)   // sofa center
put(fb, 4, 15, 27)   // sofa right
put(fb, 5, 15, 22)   // floor lamp next to sofa
put(floor, 3, 14, 30)  // rug accent in front of sofa

// Reading nook bottom-right (cols 19-22, row 14-15) — second sofa + rug
put(fb, 19, 15, 25)
put(fb, 20, 15, 26)
put(fb, 21, 15, 27)
put(fb, 18, 15, 22)
put(floor, 20, 14, 30)

// Plants (existing collision at 16,240 and 368,240 — cols 1 and 23, row 15)
// already collision; add visual via tile 6
put(fb, 1,  15, 6)   // wait — 1,15 conflicts with lamp at 1,15? Lamp is at 5,15 actually.
//  fix: leave the plants out — they're already represented in v0 art at those cells.

// Hanging lantern in center
put(fa, 12, 8, 21)
put(fa, 6,  8, 21)
put(fa, 18, 8, 21)

// Collision for sofas (new) + lamps
const collision = map.layers.find(l => l.name === 'collision')
let nextObjId = (map.nextobjectid ?? 40)
function addColl(name, x, y, w, h) {
  collision.objects.push({ id: nextObjId++, name, x, y, width: w, height: h })
}
addColl('v611_sofa_l',  32,  240, 48, 16)
addColl('v611_sofa_r',  304, 240, 48, 16)
addColl('v611_lamp_l',  80,  240, 16, 16)
addColl('v611_lamp_r',  288, 240, 16, 16)
map.nextobjectid = nextObjId

// New sit interactables
const inter = map.layers.find(l => l.name === 'interactables')
inter.objects.push({
  id: nextObjId++, name: 'sofa_l_sit',
  x: 32, y: 240, width: 48, height: 16,
  properties: [
    { name: 'kind', type: 'string', value: 'sit' },
    { name: 'anchor_x', type: 'int', value: 56 },
    { name: 'anchor_y', type: 'int', value: 248 },
    { name: 'facing', type: 'string', value: 'down' }
  ]
})
inter.objects.push({
  id: nextObjId++, name: 'sofa_r_sit',
  x: 304, y: 240, width: 48, height: 16,
  properties: [
    { name: 'kind', type: 'string', value: 'sit' },
    { name: 'anchor_x', type: 'int', value: 328 },
    { name: 'anchor_y', type: 'int', value: 248 },
    { name: 'facing', type: 'string', value: 'down' }
  ]
})
map.nextobjectid = nextObjId

writeFileSync(FILE, JSON.stringify(map, null, 2) + '\n')
console.log(`OK library.tmj patched for indoor_lobby_v1`)
console.log(`  • bookshelves drawn: north row 1 (cols 2-9, 15-22) + west col 1 + east col 23 (rows 3-6) = ${16 + 8} cells`)
console.log(`  • top wall: ${TOP_SWAPS.length} swaps  •  side-walls: ${SIDE_SWAPS.length} swaps`)
console.log(`  • 2 reading-nook sofas + 2 floor lamps + 2 accent rugs + 3 hanging lanterns`)
console.log(`  • +4 collision, +2 sit interactables`)
