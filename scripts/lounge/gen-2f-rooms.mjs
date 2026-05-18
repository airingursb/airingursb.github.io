#!/usr/bin/env node
// V13.1 / V13.2 / V13.3 — Generate the three 2nd-floor rooms:
//   room_bath        — bath house with 1 tub_sit interactable
//   room_arcade      — 6 arcade-cabinet interactables (one per mini-game)
//   room_greenhouse  — 4 rare-flower gather spots
//
// All three are 12×9 tiles. Portal back to lobby at the bottom-center
// (the lobby stair portal lands the player at the matching spawn).
//
// Layer order matches the existing room TMJs: floor, furniture_below,
// furniture_above, collision (object), spawn_points (object), portals
// (object), interactables (object).

import fs from 'node:fs'
import path from 'node:path'

const ROOMS_DIR = path.join(process.cwd(), 'public/lounge/assets/rooms')
const TILE_2F = {
  bathFloor: 1, stoneWall: 2, tubEdge: 3, tubWater: 4,
  towelRack: 5, drain: 6, steamWisp: 7, woodDeck: 8,
  arcadeBottom: 9, arcadeTop: 10, joystick: 11, neonWall: 12,
  glassFloor: 13, planter: 14, rareFlower: 15, vineWall: 16
}
const W = 12, H = 9

// Empty 12×9 layer
const emptyLayer = () => new Array(W * H).fill(0)

function buildRoom(opts) {
  const { id, floor, walls, fbelow, fabove, collisions, spawns, portals, interactables } = opts
  const floorData = emptyLayer()
  const fbelowData = emptyLayer()
  const faboveData = emptyLayer()
  // Floor + walls
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    if (walls(x, y))      floorData[y * W + x] = TILE_2F.stoneWall
    else                  floorData[y * W + x] = floor(x, y)
  }
  // Furniture-below layer (optional)
  if (fbelow) for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const t = fbelow(x, y); if (t) fbelowData[y * W + x] = t
  }
  if (fabove) for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const t = fabove(x, y); if (t) faboveData[y * W + x] = t
  }
  let nextId = 1
  const collisionObjects = collisions.map((c) => ({
    id: nextId++, name: c.name, x: c.x, y: c.y, width: c.w, height: c.h
  }))
  const spawnObjects = spawns.map((s) => ({
    id: nextId++, name: s.name, x: s.x, y: s.y, width: 0, height: 0
  }))
  const portalObjects = portals.map((p) => ({
    id: nextId++, name: p.name, x: p.x, y: p.y, width: p.w, height: p.h,
    properties: [
      { name: 'target_room', type: 'string', value: p.targetRoom },
      { name: 'target_spawn', type: 'string', value: p.targetSpawn }
    ]
  }))
  const interactObjects = interactables.map((it) => ({
    id: nextId++, name: it.name, x: it.x, y: it.y, width: it.w ?? 16, height: it.h ?? 16,
    properties: Object.entries(it.props).map(([k, v]) => ({
      name: k,
      type: typeof v === 'number' ? 'int' : typeof v === 'boolean' ? 'bool' : 'string',
      value: v
    }))
  }))

  const tmj = {
    compressionlevel: -1,
    width: W, height: H,
    infinite: false,
    orientation: 'orthogonal',
    renderorder: 'right-down',
    tileheight: 16, tilewidth: 16,
    tiledversion: '1.10.2',
    type: 'map',
    version: '1.10',
    nextlayerid: 8,
    nextobjectid: nextId,
    tilesets: [{
      columns: 4,
      firstgid: 1,
      image: '../tilesets/indoor_2f_v0/tiles.png',
      imageheight: 64, imagewidth: 64,
      margin: 0, name: 'indoor_2f_v0',
      spacing: 0, tilecount: 16,
      tileheight: 16, tilewidth: 16
    }],
    layers: [
      { id: 1, name: 'floor', type: 'tilelayer', width: W, height: H, data: floorData, opacity: 1, visible: true, x: 0, y: 0 },
      { id: 2, name: 'furniture_below', type: 'tilelayer', width: W, height: H, data: fbelowData, opacity: 1, visible: true, x: 0, y: 0 },
      { id: 3, name: 'furniture_above', type: 'tilelayer', width: W, height: H, data: faboveData, opacity: 1, visible: true, x: 0, y: 0 },
      { id: 4, name: 'collision', type: 'objectgroup', draworder: 'topdown', opacity: 1, visible: true, x: 0, y: 0, objects: collisionObjects },
      { id: 5, name: 'spawn_points', type: 'objectgroup', draworder: 'topdown', opacity: 1, visible: true, x: 0, y: 0, objects: spawnObjects },
      { id: 6, name: 'portals', type: 'objectgroup', draworder: 'topdown', opacity: 1, visible: true, x: 0, y: 0, objects: portalObjects },
      { id: 7, name: 'interactables', type: 'objectgroup', draworder: 'topdown', opacity: 1, visible: true, x: 0, y: 0, objects: interactObjects }
    ]
  }
  fs.writeFileSync(path.join(ROOMS_DIR, `${id}.tmj`), JSON.stringify(tmj, null, 2) + '\n')
  console.log(`wrote ${id}.tmj`)
}

// ─── Bath house ──────────────────────────────────────────────────
buildRoom({
  id: 'bath',
  floor: () => TILE_2F.bathFloor,
  walls: (x, y) => x === 0 || x === W-1 || y === 0,
  fbelow: (x, y) => {
    // 4×2 tub area (cols 4-7, rows 3-4): edge tiles + water inside
    if (y === 3 && x >= 4 && x <= 7) return TILE_2F.tubEdge
    if (y === 4 && x >= 4 && x <= 7) return TILE_2F.tubWater
    if (y === 5 && x >= 4 && x <= 7) return TILE_2F.tubEdge
    // Towel rack on left wall
    if (x === 1 && y === 2) return TILE_2F.towelRack
    if (x === 1 && y === 6) return TILE_2F.towelRack
    // Drain at top-right corner
    if (x === 10 && y === 2) return TILE_2F.drain
    return 0
  },
  fabove: (x, y) => {
    // Steam wisps above tub
    if ((x === 5 || x === 6) && y === 2) return TILE_2F.steamWisp
    return 0
  },
  collisions: [
    { name: 'wall_left',  x: 0,   y: 16,  w: 16,  h: 128 },
    { name: 'wall_right', x: 176, y: 16,  w: 16,  h: 128 },
    { name: 'wall_top_l', x: 0,   y: 0,   w: 96,  h: 16 },
    { name: 'wall_top_r', x: 112, y: 0,   w: 80,  h: 16 },
    { name: 'tub_bounds', x: 64,  y: 48,  w: 64,  h: 48 }
  ],
  spawns: [
    { name: 'default', x: 96, y: 112 },
    { name: 'from_lobby', x: 96, y: 120 }
  ],
  portals: [
    { name: 'to_lobby', x: 96, y: 128, w: 16, h: 16,
      targetRoom: 'room_lobby', targetSpawn: 'from_bath' }
  ],
  interactables: [
    { name: 'tub_sit', x: 80, y: 56, w: 32, h: 32,
      props: { kind: 'sit', anchor_x: 96, anchor_y: 80, facing: 'down', bath_buff: true } }
  ]
})

// ─── Arcade ──────────────────────────────────────────────────────
buildRoom({
  id: 'arcade',
  floor: () => TILE_2F.bathFloor,         // reuse warm floor; cabinets darken
  walls: (x, y) => x === 0 || x === W-1 || y === 0,
  fbelow: (x, y) => {
    // 6 cabinets across cols 1-11, row 2 (each 1 tile wide)
    // x positions: 1, 3, 5, 7, 9, 10
    if (y === 2 && [1, 3, 5, 7, 9, 10].includes(x)) return TILE_2F.arcadeBottom
    // Neon wall panels on back wall
    if (y === 0 && [4, 7].includes(x)) return TILE_2F.neonWall
    return 0
  },
  fabove: (x, y) => {
    // Cabinet tops (visual marquee)
    if (y === 1 && [1, 3, 5, 7, 9, 10].includes(x)) return TILE_2F.arcadeTop
    return 0
  },
  collisions: [
    { name: 'wall_left',  x: 0,   y: 16,  w: 16,  h: 128 },
    { name: 'wall_right', x: 176, y: 16,  w: 16,  h: 128 },
    { name: 'wall_top_l', x: 0,   y: 0,   w: 96,  h: 16 },
    { name: 'wall_top_r', x: 112, y: 0,   w: 80,  h: 16 },
    // Cabinet collision blocks
    { name: 'cab_dice',   x: 16,  y: 32,  w: 16,  h: 16 },
    { name: 'cab_rhythm', x: 48,  y: 32,  w: 16,  h: 16 },
    { name: 'cab_cook',   x: 80,  y: 32,  w: 16,  h: 16 },
    { name: 'cab_word',   x: 112, y: 32,  w: 16,  h: 16 },
    { name: 'cab_shell',  x: 144, y: 32,  w: 16,  h: 16 },
    { name: 'cab_garden', x: 160, y: 32,  w: 16,  h: 16 }
  ],
  spawns: [
    { name: 'default', x: 96, y: 112 },
    { name: 'from_lobby', x: 96, y: 120 }
  ],
  portals: [
    { name: 'to_lobby', x: 96, y: 128, w: 16, h: 16,
      targetRoom: 'room_lobby', targetSpawn: 'from_arcade' }
  ],
  interactables: [
    { name: 'play_dice',   x: 16,  y: 32, props: { kind: 'minigame', game_id: 'dice' } },
    { name: 'play_rhythm', x: 48,  y: 32, props: { kind: 'minigame', game_id: 'rhythm' } },
    { name: 'play_cook',   x: 80,  y: 32, props: { kind: 'minigame', game_id: 'cook' } },
    { name: 'play_word',   x: 112, y: 32, props: { kind: 'minigame', game_id: 'word' } },
    { name: 'play_shell',  x: 144, y: 32, props: { kind: 'minigame', game_id: 'shell' } },
    { name: 'play_garden', x: 160, y: 32, props: { kind: 'minigame', game_id: 'garden' } }
  ]
})

// ─── Greenhouse ──────────────────────────────────────────────────
buildRoom({
  id: 'greenhouse',
  floor: () => TILE_2F.glassFloor,
  walls: (x, y) => {
    if (x === 0 || x === W-1) return true
    if (y === 0) return true
    return false
  },
  fbelow: (x, y) => {
    // Vine wall accent at corners
    if ((y === 0 && (x === 1 || x === 10))) return TILE_2F.vineWall
    // 4 planters with rare flowers at fixed spots
    if (y === 3 && [2, 5, 8].includes(x)) return TILE_2F.planter
    if (y === 6 && x === 5) return TILE_2F.planter
    return 0
  },
  fabove: (x, y) => {
    // Rare flowers (visual; the interactable is at same coord)
    if (y === 2 && [2, 5, 8].includes(x)) return TILE_2F.rareFlower
    if (y === 5 && x === 5) return TILE_2F.rareFlower
    return 0
  },
  collisions: [
    { name: 'wall_left',  x: 0,   y: 16,  w: 16,  h: 128 },
    { name: 'wall_right', x: 176, y: 16,  w: 16,  h: 128 },
    { name: 'wall_top_l', x: 0,   y: 0,   w: 96,  h: 16 },
    { name: 'wall_top_r', x: 112, y: 0,   w: 80,  h: 16 },
    { name: 'planter_1',  x: 32,  y: 48,  w: 16, h: 16 },
    { name: 'planter_2',  x: 80,  y: 48,  w: 16, h: 16 },
    { name: 'planter_3',  x: 128, y: 48,  w: 16, h: 16 },
    { name: 'planter_4',  x: 80,  y: 96,  w: 16, h: 16 }
  ],
  spawns: [
    { name: 'default', x: 96, y: 112 },
    { name: 'from_lobby', x: 96, y: 120 }
  ],
  portals: [
    { name: 'to_lobby', x: 96, y: 128, w: 16, h: 16,
      targetRoom: 'room_lobby', targetSpawn: 'from_greenhouse' }
  ],
  interactables: [
    { name: 'gather_orchid', x: 32,  y: 48, props: { kind: 'gather_spot', material: 'rare_orchid' } },
    { name: 'gather_moss',   x: 80,  y: 48, props: { kind: 'gather_spot', material: 'rare_moss' } },
    { name: 'gather_seed',   x: 128, y: 48, props: { kind: 'gather_spot', material: 'rare_seed' } },
    { name: 'gather_root',   x: 80,  y: 96, props: { kind: 'gather_spot', material: 'rare_root' } }
  ]
})

console.log('\nDONE — remember to update manifest.json + config.STATIC_ROOMS +')
console.log('       RoomScene loader + labelMap, then wire lobby staircase (V13.4).')
