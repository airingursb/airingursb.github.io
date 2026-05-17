#!/usr/bin/env node
// Generate the library room (V2.5) as Tiled .tmj.
// Same tileset (indoor_lobby_v0) — bookshelves use the wall tile, reading
// chair uses CHAIR. Door is on the south wall back to lobby.
//
// Run: node scripts/lounge/bake-library.mjs

import { writeFileSync, mkdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..')
const OUT_DIR = join(ROOT, 'public', 'lounge', 'assets', 'rooms')
mkdirSync(OUT_DIR, { recursive: true })

const FLOOR = 1, WALL = 2, DOOR = 3, TABLE = 4, CHAIR = 5, PLANT = 6

function makeFloorLayer(width, height, doors = []) {
  const data = []
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const isBorder = x === 0 || x === width - 1 || y === 0 || y === height - 1
      let tile = isBorder ? WALL : FLOOR
      for (const d of doors) if (d.x === x && d.y === y) tile = DOOR
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
function setTile(layer, width, x, y, tileId) { layer.data[y * width + x] = tileId }
function objectGroup(id, name, objects) {
  return { id, name, type: 'objectgroup', draworder: 'topdown',
           opacity: 1, visible: true, x: 0, y: 0, objects }
}
function rect(id, name, x, y, width, height, properties = []) {
  return { id, name, x, y, width, height, properties }
}
function point(id, name, x, y) { return { id, name, x, y, width: 0, height: 0 } }
function prop(name, type, value) { return { name, type, value } }

function buildRoom(spec) {
  return {
    compressionlevel: -1,
    width: spec.width, height: spec.height,
    infinite: false,
    orientation: 'orthogonal',
    renderorder: 'right-down',
    tileheight: 16, tilewidth: 16,
    tiledversion: '1.10.2',
    type: 'map',
    version: '1.10',
    nextlayerid: 8,
    nextobjectid: spec.nextId,
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
      spec.floor,
      spec.furniture_below,
      spec.furniture_above,
      spec.collision,
      spec.spawn_points,
      spec.portals,
      spec.interactables
    ]
  }
}

function library() {
  const W = 25, H = 18
  // South door at center-bottom (back to lobby)
  const SOUTH_DOOR_X = 12
  const floor = makeFloorLayer(W, H, [{ x: SOUTH_DOOR_X, y: H - 1 }])
  const fb = makeEmptyTileLayer(2, 'furniture_below', W, H)
  const fa = makeEmptyTileLayer(3, 'furniture_above', W, H)

  // Bookshelves: north wall interior row (y=1), two banks with gap above the door
  for (let x = 2; x <= 9; x++) setTile(fa, W, x, 1, WALL)
  for (let x = 15; x <= 22; x++) setTile(fa, W, x, 1, WALL)

  // Bookshelves along east + west interior (vertical banks)
  for (let y = 3; y <= 6; y++) setTile(fa, W, 1, y, WALL)
  for (let y = 3; y <= 6; y++) setTile(fa, W, W - 2, y, WALL)

  // Reading chair + side table cluster (cozy corner left-center)
  setTile(fb, W, 6, 8, CHAIR)
  setTile(fb, W, 7, 8, TABLE)

  // Center reading nook: another chair facing the table
  setTile(fb, W, 12, 11, CHAIR)
  setTile(fb, W, 13, 11, TABLE)
  setTile(fb, W, 14, 11, CHAIR)

  // Decorative plants in corners
  setTile(fa, W, 1, H - 3, PLANT)
  setTile(fa, W, W - 2, H - 3, PLANT)

  const collisionRects = [
    rect(1, 'wall_top', 0, 0, W * 16, 16),
    rect(2, 'wall_bottom_l', 0, (H - 1) * 16, SOUTH_DOOR_X * 16, 16),
    rect(3, 'wall_bottom_r', (SOUTH_DOOR_X + 1) * 16, (H - 1) * 16, (W - SOUTH_DOOR_X - 1) * 16, 16),
    rect(4, 'wall_left', 0, 16, 16, (H - 2) * 16),
    rect(5, 'wall_right', (W - 1) * 16, 16, 16, (H - 2) * 16),
    rect(6, 'bookshelf_north_l', 2 * 16, 16, 8 * 16, 16),
    rect(7, 'bookshelf_north_r', 15 * 16, 16, 8 * 16, 16),
    rect(8, 'bookshelf_west', 16, 3 * 16, 16, 4 * 16),
    rect(9, 'bookshelf_east', (W - 2) * 16, 3 * 16, 16, 4 * 16),
    rect(10, 'chair_a', 6 * 16, 8 * 16, 16, 16),
    rect(11, 'table_a', 7 * 16, 8 * 16, 16, 16),
    rect(12, 'chair_b', 12 * 16, 11 * 16, 16, 16),
    rect(13, 'table_b', 13 * 16, 11 * 16, 16, 16),
    rect(14, 'chair_c', 14 * 16, 11 * 16, 16, 16),
    rect(15, 'plant_l', 16, (H - 3) * 16, 16, 16),
    rect(16, 'plant_r', (W - 2) * 16, (H - 3) * 16, 16, 16)
  ]

  const spawns = [
    point(20, 'default', 12 * 16, 9 * 16),
    point(21, 'from_lobby', SOUTH_DOOR_X * 16 + 8, (H - 2) * 16 + 8)
  ]

  const portals = [
    rect(30, 'to_lobby', SOUTH_DOOR_X * 16, (H - 1) * 16, 16, 16, [
      prop('target_room', 'string', 'room_lobby'),
      prop('target_spawn', 'string', 'from_library')
    ])
  ]

  const interactables = [
    rect(40, 'reading_chair_a', 6 * 16, 8 * 16, 16, 16, [
      prop('kind', 'string', 'sit'),
      prop('anchor_x', 'int', 6 * 16 + 8),
      prop('anchor_y', 'int', 9 * 16),
      prop('facing', 'string', 'up')
    ]),
    rect(41, 'reading_chair_b', 12 * 16, 11 * 16, 16, 16, [
      prop('kind', 'string', 'sit'),
      prop('anchor_x', 'int', 12 * 16 + 8),
      prop('anchor_y', 'int', 12 * 16),
      prop('facing', 'string', 'right')
    ]),
    rect(42, 'reading_chair_c', 14 * 16, 11 * 16, 16, 16, [
      prop('kind', 'string', 'sit'),
      prop('anchor_x', 'int', 14 * 16 + 8),
      prop('anchor_y', 'int', 12 * 16),
      prop('facing', 'string', 'left')
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

writeFileSync(join(OUT_DIR, 'library.tmj'), JSON.stringify(library(), null, 2))
console.log('OK library.tmj')
