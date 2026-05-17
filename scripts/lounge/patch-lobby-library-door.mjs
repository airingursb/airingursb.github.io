#!/usr/bin/env node
// Idempotent patch: add a north door to the lobby tilemap and a portal that
// leads to the library. Also splits the existing wall_top collision around
// the new door.
//
// Run: node scripts/lounge/patch-lobby-library-door.mjs

import { readFileSync, writeFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..')
const FILE = join(ROOT, 'public', 'lounge', 'assets', 'rooms', 'lobby.tmj')

const DOOR_TILE_X = 15      // tile coords (16px tiles, room is 30x20)
const DOOR_TILE_Y = 0
const DOOR_PX_X = DOOR_TILE_X * 16
const DOOR_PX_Y = DOOR_TILE_Y * 16
const ROOM_W_PX = 30 * 16   // 480

const DOOR_TILE_ID = 3      // matches FLOOR=1, WALL=2, DOOR=3 in tileset

const j = JSON.parse(readFileSync(FILE, 'utf8'))

// 1. Floor layer: stamp DOOR tile at north door position
const floor = j.layers.find((l) => l.name === 'floor')
if (!floor) throw new Error('lobby.tmj missing floor layer')
const w = floor.width
const floorIdx = DOOR_TILE_Y * w + DOOR_TILE_X
if (floor.data[floorIdx] !== DOOR_TILE_ID) {
  floor.data[floorIdx] = DOOR_TILE_ID
  console.log('stamped DOOR tile at', DOOR_TILE_X, DOOR_TILE_Y)
} else {
  console.log('DOOR tile already at', DOOR_TILE_X, DOOR_TILE_Y, '— idempotent')
}

// 2. Portals layer: add to_library portal if missing
const portals = j.layers.find((l) => l.name === 'portals')
if (!portals) throw new Error('lobby.tmj missing portals layer')
const hasLibrary = portals.objects.some((o) => o.name === 'to_library')
if (!hasLibrary) {
  const nextId = (j.nextobjectid ?? 100)
  portals.objects.push({
    id: nextId,
    name: 'to_library',
    x: DOOR_PX_X,
    y: DOOR_PX_Y,
    width: 16,
    height: 16,
    properties: [
      { name: 'target_room', type: 'string', value: 'room_library' },
      { name: 'target_spawn', type: 'string', value: 'from_library' }
    ]
  })
  j.nextobjectid = nextId + 1
  console.log('added portal to_library at', DOOR_PX_X, DOOR_PX_Y)
} else {
  console.log('portal to_library already present — idempotent')
}

// 3. Spawn points: add from_library if missing
const spawns = j.layers.find((l) => l.name === 'spawn_points')
if (!spawns) throw new Error('lobby.tmj missing spawn_points layer')
const hasSpawn = spawns.objects.some((o) => o.name === 'from_library')
if (!hasSpawn) {
  const nextId = (j.nextobjectid ?? 100)
  spawns.objects.push({
    id: nextId,
    name: 'from_library',
    x: DOOR_PX_X + 8,
    y: DOOR_PX_Y + 32,
    width: 0,
    height: 0
  })
  j.nextobjectid = nextId + 1
  console.log('added spawn from_library')
} else {
  console.log('spawn from_library already present — idempotent')
}

// 4. Collision: split wall_top around the new door (idempotent)
const collision = j.layers.find((l) => l.name === 'collision')
if (!collision) throw new Error('lobby.tmj missing collision layer')
const wallTopIdx = collision.objects.findIndex((o) => o.name === 'wall_top')
const alreadySplit = collision.objects.some((o) => o.name === 'wall_top_l') &&
                     collision.objects.some((o) => o.name === 'wall_top_r')
if (wallTopIdx >= 0 && !alreadySplit) {
  const orig = collision.objects[wallTopIdx]
  // Remove the original
  collision.objects.splice(wallTopIdx, 1)
  const nextId1 = (j.nextobjectid ?? 100)
  collision.objects.push({
    id: nextId1, name: 'wall_top_l',
    x: 0, y: 0,
    width: DOOR_PX_X, height: 16,
    properties: orig.properties ?? []
  })
  collision.objects.push({
    id: nextId1 + 1, name: 'wall_top_r',
    x: DOOR_PX_X + 16, y: 0,
    width: ROOM_W_PX - (DOOR_PX_X + 16), height: 16,
    properties: orig.properties ?? []
  })
  j.nextobjectid = nextId1 + 2
  console.log('split wall_top → wall_top_l + wall_top_r around door')
} else {
  console.log('wall_top already split (or absent) — idempotent')
}

writeFileSync(FILE, JSON.stringify(j, null, 2))
console.log('wrote', FILE)
