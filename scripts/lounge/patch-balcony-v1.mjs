#!/usr/bin/env node
// V6.2 — Patch balcony.tmj to use outdoor_grove_v1.
//
//   • Re-point tileset (was indoor_lobby_v0, becomes outdoor_grove_v1)
//   • Existing tile-1 wood-floor cells become tile-1 grass automatically
//   • Existing tile-2 walls now reference grove tile 2 (grass+flower) — change to tile 22 (large rock) for proper "wall" feel along perimeter
//   • Sprinkle grass variants (2, 3, 4, 5) for texture
//   • Place trees in corners (oak 25/26 stacked vertically)
//   • Replace plant-collision cells with bushes (tile 23/24)
//   • Replace bench cells with bench tile (32)
//   • Add stone path leading from each portal
//   • Add a small water pond (4 tiles)
//
// Run: node scripts/lounge/patch-balcony-v1.mjs

import { readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..')
const FILE = join(ROOT, 'public', 'lounge', 'assets', 'rooms', 'balcony.tmj')
const map = JSON.parse(readFileSync(FILE, 'utf8'))
const W = map.width, H = map.height  // 25 × 15
const idx = (x, y) => y * W + x

map.tilesets = [{
  columns: 8, firstgid: 1,
  image: '../tilesets/outdoor_grove_v1/tiles.png',
  imageheight: 64, imagewidth: 128,
  margin: 0, name: 'outdoor_grove_v1', spacing: 0,
  tilecount: 32, tileheight: 16, tilewidth: 16
}]

const layers = Object.fromEntries(map.layers.map(l => [l.name, l]))
const floor = layers.floor
const fb = layers.furniture_below
const fa = layers.furniture_above

// 1. Convert old wall tiles (was 2 in v0) — already become grass-with-flower in v1. Replace with rocks for perimeter visual.
for (let y = 0; y < H; y++) {
  for (let x = 0; x < W; x++) {
    if (floor.data[idx(x, y)] === 2) floor.data[idx(x, y)] = 22  // large rock perimeter
    if (floor.data[idx(x, y)] === 3) floor.data[idx(x, y)] = 1   // doors → grass
  }
}

// 2. Sprinkle grass variants across interior floor (was tile 1)
function hash(x, y) {
  let h = x * 73856093 ^ y * 19349663
  h = (h ^ (h >>> 13)) * 1274126177
  return (h ^ (h >>> 16)) >>> 0
}
for (let y = 1; y < H - 1; y++) {
  for (let x = 1; x < W - 1; x++) {
    if (floor.data[idx(x, y)] !== 1) continue
    const r = hash(x, y) % 100
    if (r < 8) floor.data[idx(x, y)] = 2       // flower
    else if (r < 14) floor.data[idx(x, y)] = 3 // tall grass
    else if (r < 18) floor.data[idx(x, y)] = 4 // rock
    else if (r < 21) floor.data[idx(x, y)] = 5 // mushroom
  }
}

function put(layer, x, y, t) { layer.data[idx(x, y)] = t }

// 3. Stone path from portal to lobby (right wall middle) leading to bench area (center bottom)
//    Portal at (384, 112) = col 24 rows 7-8. Bench at (160, 176) = cols 10-12 row 11.
//    Path: col 24-19 row 8, then col 18-12 row 9-10, then to bench area.
for (let x = 18; x <= 23; x++) put(floor, x, 8, 7)  // stone path east
for (let y = 9; y <= 10; y++) put(floor, 18, y, 7)
for (let x = 13; x <= 17; x++) put(floor, x, 10, 7)

// 4. Pond in bottom-left (cols 3-4 rows 11-12) — 4 tiles water + shores
put(floor, 3, 11, 17)  // shore N
put(floor, 4, 11, 17)
put(floor, 3, 12, 8)   // water
put(floor, 4, 12, 8)
// lily pad on top
put(fa, 3, 12, 21)

// 5. Bench at existing collision (160, 176 = col 10 row 11). Use tile 32 (bench).
put(fb, 10, 11, 32)
put(fb, 11, 11, 32)
put(fb, 12, 11, 32)

// 6. Trees in corners (oak: bottom + top stacked vertically)
//    cols 2 rows 12-13: oak. cols 22 rows 12-13: oak.
put(fb, 2,  13, 25)  // oak trunk
put(fa, 2,  12, 26)  // oak canopy (above-layer so bear walks behind)
put(fb, 22, 13, 25)
put(fa, 22, 12, 26)

// 7. Pine trees flanking entry
put(fb, 5, 2, 27)
put(fa, 5, 1, 28)
put(fb, 19, 2, 27)
put(fa, 19, 1, 28)

// 8. Bushes replacing existing plant collisions (80,128 = col 5 row 8; 304,128 = col 19 row 8)
put(fb, 5, 8, 23)
put(fb, 19, 8, 24)

// 9. Flower patches scattered
put(fb, 8, 5, 29)
put(fb, 15, 6, 30)
put(fb, 11, 4, 29)
put(fb, 16, 13, 30)

// 10. Wire portal to Grove on top wall (col 12 row 0). Also clear the rock tile to grass.
put(floor, 12, 0, 1)
// Add grove portal + spawn point
const portals = map.layers.find(l => l.name === 'portals')
let nextObjId = map.nextobjectid ?? 60
// Avoid duplicate if re-run
if (!portals.objects.some(o => o.name === 'to_grove')) {
  portals.objects.push({
    id: nextObjId++, name: 'to_grove',
    x: 192, y: 0, width: 16, height: 16,
    properties: [
      { name: 'target_room',  type: 'string', value: 'room_grove' },
      { name: 'target_spawn', type: 'string', value: 'from_balcony' }
    ]
  })
}
const spawns = map.layers.find(l => l.name === 'spawn_points')
if (!spawns.objects.some(o => o.name === 'from_grove')) {
  spawns.objects.push({
    id: nextObjId++, name: 'from_grove',
    x: 200, y: 32, width: 0, height: 0
  })
}
map.nextobjectid = nextObjId

writeFileSync(FILE, JSON.stringify(map, null, 2) + '\n')
console.log('OK balcony.tmj patched for outdoor_grove_v1 (grass + path + trees + pond + bench + grove portal)')
