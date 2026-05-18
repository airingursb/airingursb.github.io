#!/usr/bin/env node
// E5-P0a — Migrate beach.tmj from outdoor_beach_v0 (6 tiles) to outdoor_grove_v1
// (40 tiles). Tile-id remapping:
//   v0 1 sand      → v1 33 sand plain
//   v0 2 cliff     → v1 22 large rock (also impassable)
//   v0 3 driftwood → v1 33 sand (drop the door visual; portal stays)
//   v0 4 log       → v1 37 driftwood log
//   v0 5 umbrella  → v1 38 beach umbrella
//   v0 6 palm      → v1 39 palm trunk (canopy 40 added on above-layer)
//
// Then: sprinkle sand variants, add shore-edge water along bottom rows,
// place a small "wet sand → water" strip giving the beach a real coastline.

import { readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..')
const FILE = join(ROOT, 'public', 'lounge', 'assets', 'rooms', 'beach.tmj')
const map = JSON.parse(readFileSync(FILE, 'utf8'))
const W = map.width, H = map.height
const idx = (x, y) => y * W + x

// 1. Re-point tileset to v1
map.tilesets = [{
  columns: 8, firstgid: 1,
  image: '../tilesets/outdoor_grove_v1/tiles.png',
  imageheight: 80, imagewidth: 128,
  margin: 0, name: 'outdoor_grove_v1', spacing: 0,
  tilecount: 40, tileheight: 16, tilewidth: 16
}]

const layers = Object.fromEntries(map.layers.map(l => [l.name, l]))
const floor = layers.floor
const fb = layers.furniture_below
const fa = layers.furniture_above

// 2. Re-map every tile id (v0 → v1)
const REMAP = { 1: 33, 2: 22, 3: 33, 4: 37, 5: 38, 6: 39 }
function remapData(arr) {
  for (let i = 0; i < arr.length; i++) {
    const t = arr[i]
    if (REMAP[t] !== undefined) arr[i] = REMAP[t]
  }
}
remapData(floor.data)
remapData(fb.data)
remapData(fa.data)

// 3. Sprinkle sand variants — tile 34 (sand+shells) ~12% of sand tiles
function hash(x, y) {
  let h = x * 73856093 ^ y * 19349663
  h = (h ^ (h >>> 13)) * 1274126177
  return (h ^ (h >>> 16)) >>> 0
}
for (let y = 1; y < H - 1; y++) {
  for (let x = 1; x < W - 1; x++) {
    if (floor.data[idx(x, y)] !== 33) continue
    if (hash(x, y) % 100 < 12) floor.data[idx(x, y)] = 34
  }
}

// 4. Add a real coastline along the bottom 2 rows.
//    Row 17 = sand-shore tile (sand on top, water below).
//    Row 18 = open water. Row 19 = open water (boundary collision handles it).
//    Keep tile 22 (rock perimeter) intact at col 0 and col 29.
for (let x = 1; x < W - 1; x++) {
  if (floor.data[idx(x, 17)] === 33 || floor.data[idx(x, 17)] === 34) floor.data[idx(x, 17)] = 36
  if (floor.data[idx(x, 18)] === 33 || floor.data[idx(x, 18)] === 34) floor.data[idx(x, 18)] = 8
}

// 5. Drop palm canopies on the above-layer wherever a palm trunk (39) sits.
//    P0a review fix C2: v0 placed palms on fa (above-layer), not fb. After
//    remap the trunks live in fa, so we have to scan both layers.
for (let y = 1; y < H; y++) {
  for (let x = 0; x < W; x++) {
    const isTrunk = fb.data[idx(x, y)] === 39 || fa.data[idx(x, y)] === 39
    if (isTrunk && y > 0 && fa.data[idx(x, y - 1)] === 0) {
      fa.data[idx(x, y - 1)] = 40
    }
  }
}

// 6. P0a review fix I8: place a driftwood log (37) at the portal cell so the
//    affordance survives the migration. Beach portal is at (32, 0, 16, 16)
//    according to original collision; the spawn point from balcony is at
//    (32, 32). Drop a log at col 1 row 2 for visual cue.
if (fb.data[idx(1, 2)] === 0) fb.data[idx(1, 2)] = 37

writeFileSync(FILE, JSON.stringify(map, null, 2) + '\n')
console.log('OK beach.tmj migrated → outdoor_grove_v1 (sand + shore + palm canopies)')
