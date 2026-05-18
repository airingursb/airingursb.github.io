#!/usr/bin/env node
// P5 — Bake 4 NPC bedrooms (Mio, Halle, Sora, Theo). Each is a 12×9 small
// indoor room with a bed (sofa tile as proxy), nightstand, lamp, themed
// decoration. Portal back to the NPC's main room.
//
// Run: node scripts/lounge/bake-bedrooms.mjs

import { mkdirSync, writeFileSync, readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..')

function makeBedroom({ outFile, name, parentRoom, parentLabel, themeCells }) {
  const W = 12, H = 9
  const idx = (x, y) => y * W + x
  const size = W * H

  const floor = new Array(size).fill(1)
  const fb = new Array(size).fill(0)
  const fa = new Array(size).fill(0)

  // Perimeter walls
  for (let x = 0; x < W; x++) { floor[idx(x, 0)] = 2; floor[idx(x, H - 1)] = 2 }
  for (let y = 0; y < H; y++) { floor[idx(0, y)] = 2; floor[idx(W - 1, y)] = 2 }

  // Sprinkle floor variants
  function hash(x, y) {
    let h = x * 73856093 ^ y * 19349663
    h = (h ^ (h >>> 13)) * 1274126177
    return (h ^ (h >>> 16)) >>> 0
  }
  for (let y = 1; y < H - 1; y++) {
    for (let x = 1; x < W - 1; x++) {
      if (floor[idx(x, y)] !== 1) continue
      const r = hash(x, y) % 100
      if (r < 7) floor[idx(x, y)] = 7
      else if (r < 14) floor[idx(x, y)] = 8
    }
  }

  // Bed (3-tile sofa) center-back
  fb[idx(4, 3)] = 25; fb[idx(5, 3)] = 26; fb[idx(6, 3)] = 27
  // Nightstand (small table) + lamp
  fb[idx(7, 3)] = 4
  fb[idx(7, 4)] = 22  // floor lamp
  // Plant near door
  fb[idx(2, 7)] = 6
  // Window above bed
  if (floor[idx(5, 0)] === 2) floor[idx(5, 0)] = 13
  // Door at bottom-center
  if (floor[idx(6, H - 1)] === 2) floor[idx(6, H - 1)] = 3
  // Themed extras (per NPC)
  for (const [layer, x, y, t] of themeCells ?? []) {
    if (layer === 'floor') floor[idx(x, y)] = t
    else if (layer === 'fb') fb[idx(x, y)] = t
    else if (layer === 'fa') fa[idx(x, y)] = t
  }

  // Door coordinates: col 6, row 8 → x=96, y=128 → portal at (96, 128, 16, 16)
  const map = {
    compressionlevel: -1, width: W, height: H,
    infinite: false, orientation: 'orthogonal', renderorder: 'right-down',
    tileheight: 16, tilewidth: 16,
    tiledversion: '1.10.2', type: 'map', version: '1.10',
    nextlayerid: 8, nextobjectid: 30,
    tilesets: [{
      columns: 8, firstgid: 1,
      image: '../tilesets/indoor_lobby_v1/tiles.png',
      imageheight: 80, imagewidth: 128,
      margin: 0, name: 'indoor_lobby_v1', spacing: 0,
      tilecount: 40, tileheight: 16, tilewidth: 16
    }],
    layers: [
      { id: 1, name: 'floor',           type: 'tilelayer', width: W, height: H, data: floor, opacity: 1, visible: true, x: 0, y: 0 },
      { id: 2, name: 'furniture_below', type: 'tilelayer', width: W, height: H, data: fb,    opacity: 1, visible: true, x: 0, y: 0 },
      { id: 3, name: 'furniture_above', type: 'tilelayer', width: W, height: H, data: fa,    opacity: 1, visible: true, x: 0, y: 0 },
      {
        id: 4, name: 'collision', type: 'objectgroup', draworder: 'topdown', opacity: 1, visible: true, x: 0, y: 0,
        objects: [
          { id: 1, name: 'wall_top_l', x: 0, y: 0, width: 96, height: 16 },
          { id: 2, name: 'wall_top_r', x: 112, y: 0, width: 80, height: 16 },
          { id: 3, name: 'wall_bottom_l', x: 0, y: 128, width: 96, height: 16 },
          { id: 4, name: 'wall_bottom_r', x: 112, y: 128, width: 80, height: 16 },
          { id: 5, name: 'wall_left', x: 0, y: 16, width: 16, height: 112 },
          { id: 6, name: 'wall_right', x: 176, y: 16, width: 16, height: 112 },
          { id: 7, name: 'bed', x: 64, y: 48, width: 48, height: 16 },
          { id: 8, name: 'nightstand', x: 112, y: 48, width: 16, height: 16 },
          { id: 9, name: 'lamp', x: 112, y: 64, width: 16, height: 16 },
          { id: 10, name: 'plant', x: 32, y: 112, width: 16, height: 16 }
        ]
      },
      {
        id: 5, name: 'spawn_points', type: 'objectgroup', draworder: 'topdown', opacity: 1, visible: true, x: 0, y: 0,
        objects: [
          { id: 20, name: 'default', x: 96, y: 96, width: 0, height: 0 },
          { id: 21, name: `from_${parentRoom.replace('room_', '')}`, x: 96, y: 120, width: 0, height: 0 }
        ]
      },
      {
        id: 6, name: 'portals', type: 'objectgroup', draworder: 'topdown', opacity: 1, visible: true, x: 0, y: 0,
        objects: [
          {
            id: 25, name: `to_${parentRoom.replace('room_', '')}`,
            x: 96, y: 128, width: 16, height: 16,
            properties: [
              { name: 'target_room', type: 'string', value: parentRoom },
              { name: 'target_spawn', type: 'string', value: `from_bedroom_${name}` }
            ]
          }
        ]
      },
      {
        id: 7, name: 'interactables', type: 'objectgroup', draworder: 'topdown', opacity: 1, visible: true, x: 0, y: 0,
        objects: [
          {
            id: 30, name: 'bed_sit',
            x: 64, y: 48, width: 48, height: 16,
            properties: [
              { name: 'kind', type: 'string', value: 'sit' },
              { name: 'anchor_x', type: 'int', value: 88 },
              { name: 'anchor_y', type: 'int', value: 56 },
              { name: 'facing', type: 'string', value: 'down' }
            ]
          }
        ]
      }
    ]
  }
  const path = join(ROOT, 'public', 'lounge', 'assets', 'rooms', outFile)
  writeFileSync(path, JSON.stringify(map, null, 2) + '\n')
  console.log(`OK ${outFile} (bedroom_${name}) — 12×9`)
}

// Mio's bedroom — themed with vase + clock (cafe owner)
makeBedroom({
  outFile: 'bedroom_mio.tmj', name: 'mio', parentRoom: 'room_kitchen', parentLabel: 'Kitchen',
  themeCells: [
    ['fb', 9, 7, 31],   // vase
    ['floor', 1, 4, 20] // clock on wall
  ]
})

// Halle's bedroom — bookshelves
makeBedroom({
  outFile: 'bedroom_halle.tmj', name: 'halle', parentRoom: 'room_library', parentLabel: 'Library',
  themeCells: [
    ['fb', 2, 3, 18], ['fb', 2, 4, 19],
    ['fb', 9, 4, 18], ['fb', 9, 5, 19],
    ['floor', 10, 4, 17]  // painting on right wall
  ]
})

// Sora's bedroom — shells nook (vase, painting)
makeBedroom({
  outFile: 'bedroom_sora.tmj', name: 'sora', parentRoom: 'room_beach', parentLabel: 'Beach',
  themeCells: [
    ['fb', 2, 5, 31],     // vase
    ['fb', 9, 6, 31],     // vase
    ['floor', 0, 5, 17]   // painting on left wall
  ]
})

// Theo's bedroom — extra plants (gardener)
makeBedroom({
  outFile: 'bedroom_theo.tmj', name: 'theo', parentRoom: 'room_grove', parentLabel: 'Grove',
  themeCells: [
    ['fb', 9, 7, 6],     // plant
    ['fb', 4, 7, 6],
    ['fb', 7, 7, 6]
  ]
})

// Patch parent rooms to add a "to_bedroom_*" portal in a corner
function patchParent(parentFile, npcName, portalCorner) {
  const path = join(ROOT, 'public', 'lounge', 'assets', 'rooms', parentFile)
  const map = JSON.parse(readFileSync(path, 'utf8'))
  const portals = map.layers.find(l => l.name === 'portals')
  const spawns  = map.layers.find(l => l.name === 'spawn_points')
  let nid = map.nextobjectid ?? 100
  const portalName = `to_bedroom_${npcName}`
  if (!portals.objects.some(o => o.name === portalName)) {
    portals.objects.push({
      id: nid++, name: portalName,
      x: portalCorner.x, y: portalCorner.y, width: 16, height: 16,
      properties: [
        { name: 'target_room', type: 'string', value: `room_bedroom_${npcName}` },
        { name: 'target_spawn', type: 'string', value: `from_${parentFile.replace('.tmj', '')}` }
      ]
    })
    spawns.objects.push({
      id: nid++, name: `from_bedroom_${npcName}`,
      x: portalCorner.x + 16, y: portalCorner.y + 16, width: 0, height: 0
    })
  }
  map.nextobjectid = nid
  writeFileSync(path, JSON.stringify(map, null, 2) + '\n')
  console.log(`OK ${parentFile}: + ${portalName}`)
}

// Kitchen — top-right corner
patchParent('kitchen.tmj', 'mio',   { x: 288, y: 0 })
// Library — top-right area
patchParent('library.tmj', 'halle', { x: 16,  y: 16 })  // top-left
// Beach — top-left (where the bedroom would be like a beach hut)
patchParent('beach.tmj',   'sora',  { x: 32,  y: 16 })
// Grove — top-right (near the entrance)
patchParent('grove.tmj',   'theo',  { x: 368, y: 16 })
