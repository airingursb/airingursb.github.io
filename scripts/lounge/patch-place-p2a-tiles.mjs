#!/usr/bin/env node
// N3 — Place the E5-P2a-added indoor_lobby_v1 tiles in rooms that already use it.
//
//   41 wildflower → grove patch (white/blue flowers scattered)
//   42 carpet S, 43 carpet W, 44 carpet E → lobby (complete the rug area
//      already started with tiles 10/11/12)
//   45 mirror → 4 bedrooms (one wall each)
//   46 chair facing up → library reading nook (add 4-direction chair set)
//   47 armchair → library + lobby
//   48 small round table → kitchen + library + lobby
//
// Idempotent: skips if the target cell already has the intended tile.

import { readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..')

function patch(file, ops) {
  const path = join(ROOT, 'public', 'lounge', 'assets', 'rooms', file)
  const map = JSON.parse(readFileSync(path, 'utf8'))
  const W = map.width
  const idx = (x, y) => y * W + x
  const layers = Object.fromEntries(map.layers.filter(l => l.type === 'tilelayer').map(l => [l.name, l]))
  let count = 0
  for (const [layerName, x, y, t] of ops) {
    const layer = layers[layerName]
    if (!layer) continue
    if (layer.data[idx(x, y)] === t) continue
    // Don't overwrite an existing non-empty furniture cell — be careful
    if (layerName !== 'floor' && layer.data[idx(x, y)] !== 0) continue
    layer.data[idx(x, y)] = t
    count++
  }
  writeFileSync(path, JSON.stringify(map, null, 2) + '\n')
  console.log(`OK ${file}: +${count} tile placements`)
}

// Lobby (30×20): finish the rug at col 4 row 13 (had only tile 30 center).
// Use carpet edges to make a small rug rectangle around col 3-5 rows 12-14.
patch('lobby.tmj', [
  // Top edge (row 12, cols 3-5)
  ['floor', 3, 12, 10], ['floor', 4, 12, 10], ['floor', 5, 12, 10],
  // Middle row (already has 30 at 4,13). Add edges
  ['floor', 3, 13, 43],   // carpet W
  ['floor', 5, 13, 44],   // carpet E
  // Bottom edge (row 14)
  ['floor', 3, 14, 42], ['floor', 4, 14, 42], ['floor', 5, 14, 42],
  // Decorate: small round table + armchair against right wall
  ['furniture_below', 25, 7, 48],   // round table near (25,7)
  ['furniture_below', 24, 7, 47]    // armchair to its left
])

// Library (25×18): add chair facing up at table + an armchair in nook
patch('library.tmj', [
  ['furniture_below', 6, 16, 47],   // armchair in left reading nook
  ['furniture_below', 22, 16, 47],  // armchair in right reading nook
  ['furniture_below', 11, 8, 46],   // up-facing chair at center table
  ['furniture_below', 15, 6, 48]    // round side table near east bookshelf
])

// Kitchen (20×12): add a round table near the central seating
patch('kitchen.tmj', [
  ['furniture_below', 6, 7, 48],    // round table left of central long table
  ['furniture_below', 13, 7, 48]    // round table right
])

// 4 bedrooms — mirror on left wall (col 0 is the wall tile, can't replace
// it; instead put mirror on the wall row at col 9, row 1)
for (const f of ['bedroom_mio.tmj', 'bedroom_halle.tmj', 'bedroom_sora.tmj', 'bedroom_theo.tmj']) {
  patch(f, [
    ['floor', 9, 0, 45]   // mirror on top wall right side
  ])
}

// NOTE: tile 41 wildflower is in indoor_lobby_v1 only. outdoor_grove_v1
// uses id 41 for water_B (animation frame), so do NOT place it in grove.
// Grove already has yellow (29) + pink (30) flowers — the "3rd color"
// audit gap is closed for indoor rooms only. Adding a 3rd grove flower
// would require extending outdoor_grove_v1 itself.

// Revert any grove flower placements from previous runs (defensive)
{
  const path = join(ROOT, 'public', 'lounge', 'assets', 'rooms', 'grove.tmj')
  const map = JSON.parse(readFileSync(path, 'utf8'))
  const W = map.width
  const idx = (x, y) => y * W + x
  const floor = map.layers.find(l => l.name === 'floor')
  let reverted = 0
  // Cells the bad patch may have written
  const suspect = [[5, 4], [15, 7], [9, 12], [20, 5]]
  for (const [x, y] of suspect) {
    if (floor.data[idx(x, y)] === 41) { floor.data[idx(x, y)] = 1; reverted++ }
  }
  if (reverted > 0) {
    writeFileSync(path, JSON.stringify(map, null, 2) + '\n')
    console.log(`OK grove.tmj: reverted ${reverted} mistaken water_B placements → grass`)
  }
}
