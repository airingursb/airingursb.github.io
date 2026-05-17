#!/usr/bin/env node
// V6.2 — Bake grove.tmj (room_grove): a 25×18 outdoor meadow with trees,
// flowers, a winding stone path, and a pond. Portal back to Balcony at top.

import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..')
const OUT = join(ROOT, 'public', 'lounge', 'assets', 'rooms', 'grove.tmj')

const W = 25, H = 18
const idx = (x, y) => y * W + x
const size = W * H

const floor = new Array(size).fill(1)         // all grass
const fb    = new Array(size).fill(0)         // furniture_below
const fa    = new Array(size).fill(0)         // furniture_above

// Border = rocks (impassable)
for (let x = 0; x < W; x++) { floor[idx(x, 0)] = 22; floor[idx(x, H - 1)] = 22 }
for (let y = 0; y < H; y++) { floor[idx(0, y)] = 22; floor[idx(W - 1, y)] = 22 }

// Grass variants sprinkled across interior
function hash(x, y) {
  let h = x * 73856093 ^ y * 19349663
  h = (h ^ (h >>> 13)) * 1274126177
  return (h ^ (h >>> 16)) >>> 0
}
for (let y = 1; y < H - 1; y++) {
  for (let x = 1; x < W - 1; x++) {
    const r = hash(x, y) % 100
    if (r < 8) floor[idx(x, y)] = 2
    else if (r < 14) floor[idx(x, y)] = 3
    else if (r < 18) floor[idx(x, y)] = 5
  }
}

// Portal opening on top wall (col 12-13 row 0) — grass instead of rocks
floor[idx(12, 0)] = 1; floor[idx(13, 0)] = 1

// Winding stone path from top entry, snakes south
for (let y = 1; y <= 5; y++)   { floor[idx(12, y)] = 7 }
for (let x = 12; x <= 17; x++) { floor[idx(x, 5)] = 7 }
for (let y = 5; y <= 10; y++)  { floor[idx(17, y)] = 7 }
for (let x = 8; x <= 17; x++)  { floor[idx(x, 10)] = 7 }
for (let y = 10; y <= 14; y++) { floor[idx(8, y)] = 7 }

// Pond bottom-right (cols 18-21 rows 12-14) — 12 water tiles + shores
//  shores: row 11 = N shore; row 15 = grass (interior boundary)
for (let x = 18; x <= 21; x++) floor[idx(x, 11)] = 17  // shore N
for (let y = 12; y <= 14; y++) {
  floor[idx(17, y)] = 20   // shore W (water on right side)
  floor[idx(22, y)] = 19   // shore E
  for (let x = 18; x <= 21; x++) floor[idx(x, y)] = 8
}
// Lily pad above-layer
fa[idx(19, 13)] = 21

// Trees scattered (above-layer canopies render over player)
const trees = [
  [3, 4, 'oak'], [7, 3, 'pine'], [21, 3, 'oak'],
  [3, 10, 'oak'], [21, 9, 'pine'],
  [4, 15, 'pine'], [14, 16, 'oak']
]
for (const [x, y, kind] of trees) {
  if (kind === 'oak') {
    fb[idx(x, y)] = 25; fa[idx(x, y - 1)] = 26
  } else {
    fb[idx(x, y)] = 27; fa[idx(x, y - 1)] = 28
  }
}

// Bushes
fb[idx(10, 3)] = 23
fb[idx(15, 14)] = 24
fb[idx(5, 13)] = 23

// Flower patches
fb[idx(6, 6)] = 29
fb[idx(13, 13)] = 30
fb[idx(10, 6)] = 30
fb[idx(15, 8)] = 29

// Bench in center clearing
fb[idx(13, 11)] = 32

// Mushroom cluster
fb[idx(11, 14)] = 31

const map = {
  compressionlevel: -1,
  width: W, height: H,
  infinite: false,
  orientation: 'orthogonal', renderorder: 'right-down',
  tileheight: 16, tilewidth: 16,
  tiledversion: '1.10.2', type: 'map', version: '1.10',
  nextlayerid: 8, nextobjectid: 30,
  tilesets: [{
    columns: 8, firstgid: 1,
    image: '../tilesets/outdoor_grove_v1/tiles.png',
    imageheight: 64, imagewidth: 128,
    margin: 0, name: 'outdoor_grove_v1', spacing: 0,
    tilecount: 32, tileheight: 16, tilewidth: 16
  }],
  layers: [
    { id: 1, name: 'floor', type: 'tilelayer', width: W, height: H, data: floor, opacity: 1, visible: true, x: 0, y: 0 },
    { id: 2, name: 'furniture_below', type: 'tilelayer', width: W, height: H, data: fb, opacity: 1, visible: true, x: 0, y: 0 },
    { id: 3, name: 'furniture_above', type: 'tilelayer', width: W, height: H, data: fa, opacity: 1, visible: true, x: 0, y: 0 },
    {
      id: 4, name: 'collision', type: 'objectgroup',
      draworder: 'topdown', opacity: 1, visible: true, x: 0, y: 0,
      objects: [
        { id: 1,  name: 'wall_top_l',    x: 0,   y: 0,   width: 192, height: 16 },
        { id: 2,  name: 'wall_top_r',    x: 208, y: 0,   width: 192, height: 16 },
        { id: 3,  name: 'wall_bottom',   x: 0,   y: 272, width: 400, height: 16 },
        { id: 4,  name: 'wall_left',     x: 0,   y: 16,  width: 16,  height: 256 },
        { id: 5,  name: 'wall_right',    x: 384, y: 16,  width: 16,  height: 256 },
        // pond (impassable)
        { id: 10, name: 'pond_water',    x: 272, y: 176, width: 96, height: 64 },
        // trees (collision on trunk only)
        { id: 11, name: 'tree_a', x: 48,  y: 64,  width: 16, height: 16 },
        { id: 12, name: 'tree_b', x: 112, y: 48,  width: 16, height: 16 },
        { id: 13, name: 'tree_c', x: 336, y: 48,  width: 16, height: 16 },
        { id: 14, name: 'tree_d', x: 48,  y: 160, width: 16, height: 16 },
        { id: 15, name: 'tree_e', x: 336, y: 144, width: 16, height: 16 },
        { id: 16, name: 'tree_f', x: 64,  y: 240, width: 16, height: 16 },
        { id: 17, name: 'tree_g', x: 224, y: 256, width: 16, height: 16 },
        { id: 18, name: 'bench',  x: 208, y: 176, width: 16, height: 16 }
      ]
    },
    {
      id: 5, name: 'spawn_points', type: 'objectgroup',
      draworder: 'topdown', opacity: 1, visible: true, x: 0, y: 0,
      objects: [
        { id: 20, name: 'default',      x: 200, y: 144, width: 0, height: 0 },
        { id: 21, name: 'from_balcony', x: 200, y: 32,  width: 0, height: 0 }
      ]
    },
    {
      id: 6, name: 'portals', type: 'objectgroup',
      draworder: 'topdown', opacity: 1, visible: true, x: 0, y: 0,
      objects: [
        {
          id: 25, name: 'to_balcony',
          x: 192, y: 0, width: 16, height: 16,
          properties: [
            { name: 'target_room',  type: 'string', value: 'room_balcony' },
            { name: 'target_spawn', type: 'string', value: 'from_grove' }
          ]
        }
      ]
    },
    {
      id: 7, name: 'interactables', type: 'objectgroup',
      draworder: 'topdown', opacity: 1, visible: true, x: 0, y: 0,
      objects: [
        {
          id: 28, name: 'bench_sit',
          x: 208, y: 176, width: 16, height: 16,
          properties: [
            { name: 'kind', type: 'string', value: 'sit' },
            { name: 'anchor_x', type: 'int', value: 216 },
            { name: 'anchor_y', type: 'int', value: 184 },
            { name: 'facing', type: 'string', value: 'down' }
          ]
        }
      ]
    }
  ]
}

mkdirSync(dirname(OUT), { recursive: true })
writeFileSync(OUT, JSON.stringify(map, null, 2) + '\n')
console.log(`OK grove.tmj — ${W}×${H} with 7 trees, pond, bench, winding stone path`)
