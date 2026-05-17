#!/usr/bin/env node
// Generate the home room template (V4.2). 20x12 tiles = 320x192 pixels.
// One north door back to the lobby. No furniture clutter — empty canvas for
// player decorations.
//
// Run: node scripts/lounge/bake-home.mjs

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
  return { id: 1, name: 'floor', type: 'tilelayer', width, height, data, opacity: 1, visible: true, x: 0, y: 0 }
}
function makeEmptyTileLayer(id, name, width, height) {
  return { id, name, type: 'tilelayer', width, height,
           data: new Array(width * height).fill(0),
           opacity: 1, visible: true, x: 0, y: 0 }
}
function setTile(layer, width, x, y, tileId) { layer.data[y * width + x] = tileId }
function objectGroup(id, name, objects) {
  return { id, name, type: 'objectgroup', draworder: 'topdown', opacity: 1, visible: true, x: 0, y: 0, objects }
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
      image: '../tilesets/indoor_lobby_v0/tiles.png',
      imageheight: 16, imagewidth: 96,
      margin: 0, name: 'indoor_lobby_v0',
      spacing: 0, tilecount: 6, tileheight: 16, tilewidth: 16
    }],
    layers: [
      spec.floor, spec.furniture_below, spec.furniture_above,
      spec.collision, spec.spawn_points, spec.portals, spec.interactables
    ]
  }
}

function home() {
  const W = 20, H = 12
  // North door at tile (10, 0) → back to lobby south door
  const floor = makeFloorLayer(W, H, [{ x: 10, y: 0 }])
  const fb = makeEmptyTileLayer(2, 'furniture_below', W, H)
  const fa = makeEmptyTileLayer(3, 'furniture_above', W, H)

  // Two cozy plants flanking the door (decorative)
  setTile(fa, W, 8, 1, PLANT)
  setTile(fa, W, 11, 1, PLANT)

  const collisionRects = [
    rect(1, 'wall_top_l', 0, 0, 10 * 16, 16),
    rect(2, 'wall_top_r', 11 * 16, 0, (W - 11) * 16, 16),
    rect(3, 'wall_bottom', 0, (H - 1) * 16, W * 16, 16),
    rect(4, 'wall_left', 0, 16, 16, (H - 2) * 16),
    rect(5, 'wall_right', (W - 1) * 16, 16, 16, (H - 2) * 16),
    rect(6, 'plant_l', 8 * 16, 16, 16, 16),
    rect(7, 'plant_r', 11 * 16, 16, 16, 16)
  ]

  const spawns = [
    point(20, 'default', 10 * 16, 9 * 16),
    point(21, 'from_lobby', 10 * 16 + 8, 32)
  ]

  // Portal: north door back to lobby. target_spawn 'from_home' is added to lobby.
  const portals = [
    rect(30, 'to_lobby', 10 * 16, 0, 16, 16, [
      prop('target_room', 'string', 'room_lobby'),
      prop('target_spawn', 'string', 'from_home')
    ])
  ]

  const interactables = []

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

writeFileSync(join(OUT_DIR, 'home.tmj'), JSON.stringify(home(), null, 2))
console.log('OK home.tmj')
