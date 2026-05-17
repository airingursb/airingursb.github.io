#!/usr/bin/env node
// V6.1 — Patch lobby.tmj to use indoor_lobby_v1 tileset and add the new decor:
//
//   • Re-point tileset to v1 (32 tiles, 128×64)
//   • Sprinkle floor variants (tiles 7,8,9) randomly across wood floor for visual texture
//   • Place 4 windows + 2 sconces on the top wall (replace plain wall tiles)
//   • Place painting + clock on left & right walls
//   • Add fireplace (top-left), 2 bookshelves (right wall), floor lamp, vase, new sofa
//   • Hang 2 ceiling lanterns (above-layer) for ambient glow
//   • Add a small accent rug center-left
//   • Add collision rects for new physical items
//
// Backwards-compatible: existing collision/spawn/portal/interactable objects untouched.
//
// Run: node scripts/lounge/patch-lobby-v1.mjs

import { readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..')
const FILE = join(ROOT, 'public', 'lounge', 'assets', 'rooms', 'lobby.tmj')
const map = JSON.parse(readFileSync(FILE, 'utf8'))

const W = map.width   // 30
const H = map.height  // 20

// 1. Re-point tileset to v1
map.tilesets = [{
  columns: 8, firstgid: 1,
  image: '../tilesets/indoor_lobby_v1/tiles.png',
  imageheight: 64, imagewidth: 128,
  margin: 0, name: 'indoor_lobby_v1', spacing: 0,
  tilecount: 32, tileheight: 16, tilewidth: 16
}]

// 2. Get layers by name
const layers = Object.fromEntries(map.layers.map(l => [l.name, l]))
const idx = (x, y) => y * W + x

// 3. Sprinkle floor variants (deterministic — seed by position so result is stable)
//    Wood floor tile = 1. Variants = 7, 8, 9. ~18% rate.
function hash(x, y) {
  let h = x * 73856093 ^ y * 19349663
  h = (h ^ (h >>> 13)) * 1274126177
  return (h ^ (h >>> 16)) >>> 0
}
const floor = layers.floor
for (let y = 1; y < H - 1; y++) {
  for (let x = 1; x < W - 1; x++) {
    if (floor.data[idx(x, y)] !== 1) continue
    const r = hash(x, y) % 100
    if (r < 6) floor.data[idx(x, y)] = 7
    else if (r < 12) floor.data[idx(x, y)] = 8
    else if (r < 18) floor.data[idx(x, y)] = 9
  }
}

// 4. Top wall: 4 windows + 2 sconces (positions must be plain wall tile 2, not door tile 3)
const TOP_SWAPS = [
  [3,  0, 14],  // sconce
  [5,  0, 13],  // window
  [10, 0, 13],  // window
  [13, 0, 13],  // window (between left section and library door at col 15)
  [17, 0, 13],  // window
  [20, 0, 13],  // window
  [25, 0, 13],  // window
  [27, 0, 14]   // sconce
]
for (const [x, y, t] of TOP_SWAPS) {
  if (floor.data[idx(x, y)] === 2) floor.data[idx(x, y)] = t
}

// 5. Side walls: painting + clock (replace plain wall tiles only)
const SIDE_SWAPS = [
  [0,  5, 17], [0,  14, 20],   // left wall: painting + clock
  [29, 5, 20], [29, 14, 17]    // right wall: clock + painting
]
for (const [x, y, t] of SIDE_SWAPS) {
  if (floor.data[idx(x, y)] === 2) floor.data[idx(x, y)] = t
}

// 6. Accent rug — single tile 30 at col 4, row 13 (open floor area)
if (floor.data[idx(4, 13)] === 1 || floor.data[idx(4, 13)] >= 7) {
  floor.data[idx(4, 13)] = 30
}

// 7. furniture_below: add fireplace, bookshelves, floor lamp, vase, new sofa
const fb = layers.furniture_below
function put(layer, x, y, t) { layer.data[idx(x, y)] = t }

// Fireplace at (col 2, rows 1-2)
put(fb, 2, 1, 24)  // mantle
put(fb, 2, 2, 23)  // logs+fire

// Bookshelves on right side (col 27, rows 3-4 and rows 14-15)
put(fb, 27, 3, 18); put(fb, 27, 4, 19)
put(fb, 27, 14, 18); put(fb, 27, 15, 19)

// Floor lamp at col 4, row 3
put(fb, 4, 3, 22)

// Vase at col 25, row 3
put(fb, 25, 3, 31)

// New sofa (3 tiles wide) at row 16, cols 6-8 (facing down, against nothing — accent)
put(fb, 6, 16, 25); put(fb, 7, 16, 26); put(fb, 8, 16, 27)

// Two side chairs at table (in addition to existing): cols 11 and 18, row 9 — side-view
put(fb, 11, 9, 28)  // chair facing right (toward table center which is at col 13-16)
put(fb, 18, 9, 29)  // chair facing left (toward table)

// 8. furniture_above: hanging lanterns (under the ceiling)
const fa = layers.furniture_above
put(fa, 7,  1, 21)
put(fa, 14, 1, 21)
put(fa, 22, 1, 21)

// 9. Add collision rects for new physical items
const collision = map.layers.find(l => l.name === 'collision')
let nextObjId = (map.nextobjectid ?? 60)
function addColl(name, x, y, w, h) {
  collision.objects.push({
    id: nextObjId++,
    name,
    x, y, width: w, height: h
  })
}
addColl('v61_fireplace',  32,  16, 16, 32)   // (col 2, rows 1-2)
addColl('v61_bookshelf1', 432, 48, 16, 32)   // (col 27, rows 3-4)
addColl('v61_bookshelf2', 432, 224, 16, 32)  // (col 27, rows 14-15)
addColl('v61_lamp',       64,  48, 16, 16)   // (col 4, row 3)
addColl('v61_vase',       400, 48, 16, 16)   // (col 25, row 3)
addColl('v61_sofa_new',   96,  256, 48, 16)  // (col 6-8, row 16)
map.nextobjectid = nextObjId

// 10. Add the new sofa as a sit-interactable
const inter = map.layers.find(l => l.name === 'interactables')
inter.objects.push({
  id: nextObjId++,
  name: 'sofa_new_sit',
  x: 96, y: 256, width: 48, height: 16,
  properties: [
    { name: 'kind',     type: 'string', value: 'sit' },
    { name: 'anchor_x', type: 'int',    value: 120 },
    { name: 'anchor_y', type: 'int',    value: 264 },
    { name: 'facing',   type: 'string', value: 'down' }
  ]
})
map.nextobjectid = nextObjId

writeFileSync(FILE, JSON.stringify(map, null, 2) + '\n')
console.log(`OK lobby.tmj patched for indoor_lobby_v1`)
console.log(`  • floor variants sprinkled across ${Object.values(layers.floor.data).filter(v => v >= 7 && v <= 9).length} tiles`)
console.log(`  • top-wall: ${TOP_SWAPS.length} swaps  •  side-walls: ${SIDE_SWAPS.length} swaps`)
console.log(`  • furniture_below: fireplace + 2 bookshelves + lamp + vase + sofa + 2 chairs`)
console.log(`  • furniture_above: 3 hanging lanterns`)
console.log(`  • +${6} collision objects, +1 sit interactable`)
