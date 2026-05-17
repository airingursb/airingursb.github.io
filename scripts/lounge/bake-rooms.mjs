#!/usr/bin/env node
// Programmatically generate the new Lounge rooms (dj_floor, balcony) as
// Tiled .tmj JSON. Saves hand-editing 600 tile IDs per room.
//
// Run: node scripts/lounge/bake-rooms.mjs

import { writeFileSync, mkdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..')
const OUT_DIR = join(ROOT, 'public', 'lounge', 'assets', 'rooms')
mkdirSync(OUT_DIR, { recursive: true })

// Tile IDs from indoor_lobby_v0 tileset (firstgid=1)
const FLOOR = 1, WALL = 2, DOOR = 3, TABLE = 4, CHAIR = 5, PLANT = 6

function makeFloorLayer(width, height, doors = []) {
  const data = []
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const isBorder = x === 0 || x === width - 1 || y === 0 || y === height - 1
      let tile = isBorder ? WALL : FLOOR
      for (const d of doors) {
        if (d.x === x && d.y === y) tile = DOOR
      }
      data.push(tile)
    }
  }
  return { id: 1, name: 'floor', type: 'tilelayer', width, height, data,
           opacity: 1, visible: true, x: 0, y: 0 }
}

function makeEmptyTileLayer(id, name, width, height) {
  return { id, name, type: 'tilelayer', width, height,
           data: new Array(width * height).fill(0),
           opacity: 1, visible: true, x: 0, y: 0 }
}

function setTile(layer, width, x, y, tileId) {
  layer.data[y * width + x] = tileId
}

function objectGroup(id, name, objects) {
  return { id, name, type: 'objectgroup', draworder: 'topdown',
           opacity: 1, visible: true, x: 0, y: 0, objects }
}

function rect(id, name, x, y, width, height, properties = []) {
  return { id, name, x, y, width, height, properties }
}

function point(id, name, x, y) {
  return { id, name, x, y, width: 0, height: 0 }
}

function prop(name, type, value) { return { name, type, value } }

function buildRoom({ width, height, floor, furniture_below, furniture_above,
                     collision, spawn_points, portals, interactables, nextId }) {
  return {
    compressionlevel: -1,
    width, height,
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
      columns: 6,
      firstgid: 1,
      image: '../tilesets/indoor_lobby_v0/tiles.png',
      imageheight: 16,
      imagewidth: 96,
      margin: 0,
      name: 'indoor_lobby_v0',
      spacing: 0,
      tilecount: 6,
      tileheight: 16,
      tilewidth: 16
    }],
    layers: [
      floor,
      furniture_below,
      furniture_above,
      collision,
      spawn_points,
      portals,
      interactables
    ]
  }
}

// ─── DJ FLOOR (30x20) ────────────────────────────────────────────────
function dj_floor() {
  const W = 30, H = 20
  const floor = makeFloorLayer(W, H, [{ x: 0, y: 9 }])
  const fb = makeEmptyTileLayer(2, 'furniture_below', W, H)
  const fa = makeEmptyTileLayer(3, 'furniture_above', W, H)

  for (let x = 12; x <= 17; x++) setTile(fb, W, x, 3, TABLE)
  setTile(fb, W, 11, 3, CHAIR)
  setTile(fb, W, 18, 3, CHAIR)

  for (let x = 4; x <= 7; x++) setTile(fb, W, x, 15, CHAIR)
  for (let x = 22; x <= 25; x++) setTile(fb, W, x, 15, CHAIR)

  setTile(fa, W, 1, 2, PLANT)
  setTile(fa, W, 28, 2, PLANT)

  const collisionRects = [
    rect(1, 'wall_top', 0, 0, W * 16, 16),
    rect(2, 'wall_bottom', 0, (H - 1) * 16, W * 16, 16),
    rect(3, 'wall_left_a', 0, 16, 16, 9 * 16),
    rect(4, 'wall_left_b', 0, 10 * 16, 16, (H - 11) * 16),
    rect(5, 'wall_right', (W - 1) * 16, 16, 16, (H - 2) * 16),
    rect(6, 'dj_booth', 11 * 16, 3 * 16, 8 * 16, 16),
    rect(7, 'couch_left', 4 * 16, 15 * 16, 4 * 16, 16),
    rect(8, 'couch_right', 22 * 16, 15 * 16, 4 * 16, 16)
  ]

  const spawns = [
    point(20, 'default', 240, 200),
    point(21, 'from_lobby', 32, 160)
  ]

  const portals = [
    rect(30, 'to_lobby', 0, 144, 16, 32, [
      prop('target_room', 'string', 'room_lobby'),
      prop('target_spawn', 'string', 'from_dj_floor')
    ])
  ]

  const interactables = [
    rect(40, 'couch_left_sit', 4 * 16, 15 * 16, 4 * 16, 16, [
      prop('kind', 'string', 'sit'),
      prop('anchor_x', 'int', 96),
      prop('anchor_y', 'int', 248),
      prop('facing', 'string', 'down')
    ]),
    rect(41, 'couch_right_sit', 22 * 16, 15 * 16, 4 * 16, 16, [
      prop('kind', 'string', 'sit'),
      prop('anchor_x', 'int', 384),
      prop('anchor_y', 'int', 248),
      prop('facing', 'string', 'down')
    ])
  ]

  return buildRoom({
    width: W, height: H,
    floor, furniture_below: fb, furniture_above: fa,
    collision:    objectGroup(4, 'collision', collisionRects),
    spawn_points: objectGroup(5, 'spawn_points', spawns),
    portals:      objectGroup(6, 'portals', portals),
    interactables: objectGroup(7, 'interactables', interactables),
    nextId: 50
  })
}

// ─── BALCONY (25x15) ─────────────────────────────────────────────────
function balcony() {
  const W = 25, H = 15
  const floor = makeFloorLayer(W, H, [{ x: W - 1, y: 7 }])
  const fb = makeEmptyTileLayer(2, 'furniture_below', W, H)
  const fa = makeEmptyTileLayer(3, 'furniture_above', W, H)

  for (let x = 10; x <= 12; x++) setTile(fb, W, x, 11, CHAIR)

  for (let x = 3; x <= 21; x += 3) setTile(fa, W, x, 1, PLANT)

  setTile(fa, W, 5, 8, PLANT)
  setTile(fa, W, 19, 8, PLANT)

  const collisionRects = [
    rect(1, 'wall_top', 0, 0, W * 16, 16),
    rect(2, 'wall_bottom', 0, (H - 1) * 16, W * 16, 16),
    rect(3, 'wall_left', 0, 16, 16, (H - 2) * 16),
    rect(4, 'wall_right_a', (W - 1) * 16, 16, 16, 7 * 16),
    rect(5, 'wall_right_b', (W - 1) * 16, 8 * 16, 16, (H - 9) * 16),
    rect(6, 'bench', 10 * 16, 11 * 16, 3 * 16, 16),
    rect(7, 'plant_l', 5 * 16, 8 * 16, 16, 16),
    rect(8, 'plant_r', 19 * 16, 8 * 16, 16, 16)
  ]

  const spawns = [
    point(20, 'default', 200, 160),
    point(21, 'from_lobby', (W - 1) * 16 - 16, 128)
  ]

  const portals = [
    rect(30, 'to_lobby', (W - 1) * 16, 112, 16, 32, [
      prop('target_room', 'string', 'room_lobby'),
      prop('target_spawn', 'string', 'from_balcony')
    ])
  ]

  const interactables = [
    rect(40, 'bench_sit', 10 * 16, 11 * 16, 3 * 16, 16, [
      prop('kind', 'string', 'sit'),
      prop('anchor_x', 'int', 184),
      prop('anchor_y', 'int', 184),
      prop('facing', 'string', 'down')
    ])
  ]

  return buildRoom({
    width: W, height: H,
    floor, furniture_below: fb, furniture_above: fa,
    collision:    objectGroup(4, 'collision', collisionRects),
    spawn_points: objectGroup(5, 'spawn_points', spawns),
    portals:      objectGroup(6, 'portals', portals),
    interactables: objectGroup(7, 'interactables', interactables),
    nextId: 50
  })
}

writeFileSync(join(OUT_DIR, 'dj_floor.tmj'), JSON.stringify(dj_floor(), null, 2))
console.log('OK dj_floor.tmj')
writeFileSync(join(OUT_DIR, 'balcony.tmj'), JSON.stringify(balcony(), null, 2))
console.log('OK balcony.tmj')
