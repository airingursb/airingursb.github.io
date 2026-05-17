#!/usr/bin/env node
// Generate room_beach (V5.0). 30x20 tiles = 480x320 px. Outdoor sandy
// environment with cliff borders, palm trees, beach umbrella, and a
// driftwood log (sit interactable).
//
// Uses outdoor_beach_v0 tileset:
//   FLOOR=1 sand, WALL=2 cliff, DOOR=3 driftwood plank,
//   TABLE=4 driftwood log, CHAIR=5 umbrella, PLANT=6 palm
//
// Run: node scripts/lounge/bake-beach.mjs

import { writeFileSync, mkdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..')
const OUT_DIR = join(ROOT, 'public', 'lounge', 'assets', 'rooms')
mkdirSync(OUT_DIR, { recursive: true })

const FLOOR = 1, WALL = 2, DOOR = 3, LOG = 4, UMBRELLA = 5, PALM = 6

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
    type: 'map', version: '1.10',
    nextlayerid: 8,
    nextobjectid: spec.nextId,
    tilesets: [{
      columns: 6,
      firstgid: 1,
      image: '../tilesets/outdoor_beach_v0/tiles.png',
      imageheight: 16, imagewidth: 96,
      margin: 0, name: 'outdoor_beach_v0',
      spacing: 0, tilecount: 6, tileheight: 16, tilewidth: 16
    }],
    layers: [
      spec.floor, spec.furniture_below, spec.furniture_above,
      spec.collision, spec.spawn_points, spec.portals, spec.interactables
    ]
  }
}

function beach() {
  const W = 30, H = 20
  // North door at center → back to Balcony south door
  const NORTH_DOOR_X = 14
  const floor = makeFloorLayer(W, H, [{ x: NORTH_DOOR_X, y: 0 }])
  const fb = makeEmptyTileLayer(2, 'furniture_below', W, H)
  const fa = makeEmptyTileLayer(3, 'furniture_above', W, H)

  // Palm trees scattered along edges (decorative + collide)
  setTile(fa, W, 3, 2, PALM)
  setTile(fa, W, 26, 2, PALM)
  setTile(fa, W, 5, 16, PALM)
  setTile(fa, W, 24, 16, PALM)

  // Beach umbrella + driftwood log cluster: east side
  setTile(fb, W, 22, 9, LOG)        // log to sit on
  setTile(fb, W, 24, 8, UMBRELLA)   // umbrella nearby

  // Another quieter spot west side
  setTile(fb, W, 6, 11, LOG)
  setTile(fb, W, 8, 10, UMBRELLA)

  const collisionRects = [
    rect(1, 'wall_top_l', 0, 0, NORTH_DOOR_X * 16, 16),
    rect(2, 'wall_top_r', (NORTH_DOOR_X + 1) * 16, 0, (W - NORTH_DOOR_X - 1) * 16, 16),
    rect(3, 'wall_bottom', 0, (H - 1) * 16, W * 16, 16),
    rect(4, 'wall_left', 0, 16, 16, (H - 2) * 16),
    rect(5, 'wall_right', (W - 1) * 16, 16, 16, (H - 2) * 16),
    rect(6, 'palm_nw', 3 * 16, 2 * 16, 16, 16),
    rect(7, 'palm_ne', 26 * 16, 2 * 16, 16, 16),
    rect(8, 'palm_sw', 5 * 16, 16 * 16, 16, 16),
    rect(9, 'palm_se', 24 * 16, 16 * 16, 16, 16),
    rect(10, 'log_east', 22 * 16, 9 * 16, 16, 16),
    rect(11, 'umbrella_east', 24 * 16, 8 * 16, 16, 16),
    rect(12, 'log_west', 6 * 16, 11 * 16, 16, 16),
    rect(13, 'umbrella_west', 8 * 16, 10 * 16, 16, 16)
  ]

  const spawns = [
    point(20, 'default', 240, 200),
    point(21, 'from_balcony', NORTH_DOOR_X * 16 + 8, 32)
  ]

  const portals = [
    rect(30, 'to_balcony', NORTH_DOOR_X * 16, 0, 16, 16, [
      prop('target_room', 'string', 'room_balcony'),
      prop('target_spawn', 'string', 'from_beach')
    ])
  ]

  const interactables = [
    rect(40, 'log_east_sit', 22 * 16, 9 * 16, 16, 16, [
      prop('kind', 'string', 'sit'),
      prop('anchor_x', 'int', 22 * 16 + 8),
      prop('anchor_y', 'int', 10 * 16),
      prop('facing', 'string', 'up')
    ]),
    rect(41, 'log_west_sit', 6 * 16, 11 * 16, 16, 16, [
      prop('kind', 'string', 'sit'),
      prop('anchor_x', 'int', 6 * 16 + 8),
      prop('anchor_y', 'int', 12 * 16),
      prop('facing', 'string', 'up')
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

writeFileSync(join(OUT_DIR, 'beach.tmj'), JSON.stringify(beach(), null, 2))
console.log('OK beach.tmj')
