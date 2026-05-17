#!/usr/bin/env node
// V6.1.1 — Patch dj_floor.tmj to use indoor_lobby_v1 + apply DJ-themed decor.
//
//   • Re-point tileset to v1 (40 tiles)
//   • Sprinkle wood floor variants
//   • Center dance floor: alternating cyan (35) / magenta (36) 10×3 checkered area
//   • Speaker stacks (33) in 4 corners
//   • Subwoofers (40) flanking couches at bottom
//   • Strobe panels (38) + neon DJ sign (39) on top wall
//   • Turntables (34) on the booth
//   • Disco ball (37) hanging above dance floor (furniture_above)
//   • Wall sconces (14) for ambient
//
// Run: node scripts/lounge/patch-dj-floor-v1.mjs

import { readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..')
const FILE = join(ROOT, 'public', 'lounge', 'assets', 'rooms', 'dj_floor.tmj')
const map = JSON.parse(readFileSync(FILE, 'utf8'))
const W = map.width, H = map.height
const idx = (x, y) => y * W + x

// 1. Re-point tileset to v1
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

// 2. Sprinkle wood-floor variants
function hash(x, y) {
  let h = x * 73856093 ^ y * 19349663
  h = (h ^ (h >>> 13)) * 1274126177
  return (h ^ (h >>> 16)) >>> 0
}
for (let y = 1; y < H - 1; y++) {
  for (let x = 1; x < W - 1; x++) {
    if (floor.data[idx(x, y)] !== 1) continue
    const r = hash(x, y) % 100
    if (r < 6) floor.data[idx(x, y)] = 7
    else if (r < 12) floor.data[idx(x, y)] = 8
    else if (r < 18) floor.data[idx(x, y)] = 9
  }
}

// 3. Dance floor: alternating 35/36 in a 10×3 area (cols 10-19, rows 13-15)
for (let y = 13; y <= 15; y++) {
  for (let x = 10; x <= 19; x++) {
    if (floor.data[idx(x, y)] === 1 || floor.data[idx(x, y)] >= 7) {
      floor.data[idx(x, y)] = ((x + y) % 2 === 0) ? 35 : 36
    }
  }
}

// 4. Top wall swaps: strobe panels + neon DJ sign + sconces
const TOP_SWAPS = [
  [3,  0, 14],  // sconce
  [6,  0, 38],  // strobe
  [10, 0, 38],  // strobe
  [14, 0, 39],  // NEON DJ sign (center)
  [19, 0, 38],  // strobe
  [23, 0, 38],  // strobe
  [26, 0, 14]   // sconce
]
for (const [x, y, t] of TOP_SWAPS) {
  if (floor.data[idx(x, y)] === 2) floor.data[idx(x, y)] = t
}

// 5. Speaker stacks in 4 corners (furniture_below, just inside walls)
function put(layer, x, y, t) { layer.data[idx(x, y)] = t }
put(fb, 1,  1, 33)
put(fb, 28, 1, 33)
put(fb, 1,  17, 33)
put(fb, 28, 17, 33)

// 6. Subwoofers flanking couches at bottom (couches are at y=240 = row 15, cols 4-7 & 22-25)
//    Place subwoofer just to the side of each couch
put(fb, 2,  15, 40)
put(fb, 27, 15, 40)

// 7. Turntables on the booth (booth at row 3, cols 11-19)
put(fb, 13, 3, 34)
put(fb, 16, 3, 34)

// 8. Disco ball hanging in center of dance floor (furniture_above so player walks under it)
put(fa, 14, 8, 37)

// 9. Add collision rects for speakers + subwoofers
const collision = map.layers.find(l => l.name === 'collision')
let nextObjId = (map.nextobjectid ?? 30)
function addColl(name, x, y, w, h) {
  collision.objects.push({ id: nextObjId++, name, x, y, width: w, height: h })
}
addColl('v611_spk_tl', 16,  16,  16, 16)
addColl('v611_spk_tr', 448, 16,  16, 16)
addColl('v611_spk_bl', 16,  272, 16, 16)
addColl('v611_spk_br', 448, 272, 16, 16)
addColl('v611_sub_l',  32,  240, 16, 16)
addColl('v611_sub_r',  432, 240, 16, 16)
map.nextobjectid = nextObjId

writeFileSync(FILE, JSON.stringify(map, null, 2) + '\n')
console.log(`OK dj_floor.tmj patched for indoor_lobby_v1`)
console.log(`  • dance floor: 10×3 checkered cyan/magenta`)
console.log(`  • top wall: ${TOP_SWAPS.length} swaps (strobes + neon DJ + sconces)`)
console.log(`  • 4 speaker stacks + 2 subwoofers + 2 turntables + 1 disco ball`)
console.log(`  • +6 collision objects`)
