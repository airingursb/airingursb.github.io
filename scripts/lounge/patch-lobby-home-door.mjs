#!/usr/bin/env node
// Idempotent patch: add a south door to lobby that leads to the visitor's
// own home (target_room is dynamic, resolved client-side from visitor_id).
// We use a placeholder target_room 'room_home_self' that the client maps to
// 'room_home_<short_visitor_id>'.
//
// Run: node scripts/lounge/patch-lobby-home-door.mjs

import { readFileSync, writeFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..')
const FILE = join(ROOT, 'public', 'lounge', 'assets', 'rooms', 'lobby.tmj')

const DOOR_TILE_X = 14
const DOOR_TILE_Y = 19
const DOOR_PX_X = DOOR_TILE_X * 16
const DOOR_PX_Y = DOOR_TILE_Y * 16
const ROOM_W_PX = 30 * 16

const DOOR_TILE_ID = 3

const j = JSON.parse(readFileSync(FILE, 'utf8'))

// Floor: stamp door tile at south wall
const floor = j.layers.find((l) => l.name === 'floor')
if (!floor) throw new Error('lobby.tmj missing floor layer')
const w = floor.width
const floorIdx = DOOR_TILE_Y * w + DOOR_TILE_X
if (floor.data[floorIdx] !== DOOR_TILE_ID) {
  floor.data[floorIdx] = DOOR_TILE_ID
  console.log('stamped DOOR at south', DOOR_TILE_X, DOOR_TILE_Y)
} else {
  console.log('south DOOR already stamped — idempotent')
}

// Portals: add to_home (placeholder target — client rewrites)
const portals = j.layers.find((l) => l.name === 'portals')
if (!portals) throw new Error('lobby.tmj missing portals layer')
if (!portals.objects.some((o) => o.name === 'to_home')) {
  const nextId = (j.nextobjectid ?? 100)
  portals.objects.push({
    id: nextId, name: 'to_home',
    x: DOOR_PX_X, y: DOOR_PX_Y,
    width: 16, height: 16,
    properties: [
      { name: 'target_room', type: 'string', value: 'room_home_self' },
      { name: 'target_spawn', type: 'string', value: 'from_lobby' }
    ]
  })
  j.nextobjectid = nextId + 1
  console.log('added to_home portal')
} else {
  console.log('to_home already present — idempotent')
}

// Spawn: from_home (where returning from home you land)
const spawns = j.layers.find((l) => l.name === 'spawn_points')
if (!spawns) throw new Error('lobby.tmj missing spawn_points layer')
if (!spawns.objects.some((o) => o.name === 'from_home')) {
  const nextId = (j.nextobjectid ?? 100)
  spawns.objects.push({
    id: nextId, name: 'from_home',
    x: DOOR_PX_X + 8, y: (DOOR_TILE_Y - 1) * 16 + 8,
    width: 0, height: 0
  })
  j.nextobjectid = nextId + 1
  console.log('added from_home spawn')
} else {
  console.log('from_home spawn already present — idempotent')
}

// Collision: split wall_bottom around the new door
const collision = j.layers.find((l) => l.name === 'collision')
if (!collision) throw new Error('lobby.tmj missing collision layer')
const wallBottom = collision.objects.find((o) => o.name === 'wall_bottom')
const alreadySplit = collision.objects.some(o => o.name === 'wall_bottom_l') &&
                     collision.objects.some(o => o.name === 'wall_bottom_r')
if (wallBottom && !alreadySplit) {
  const idx = collision.objects.indexOf(wallBottom)
  collision.objects.splice(idx, 1)
  const nextId = (j.nextobjectid ?? 100)
  collision.objects.push({
    id: nextId, name: 'wall_bottom_l',
    x: 0, y: DOOR_PX_Y,
    width: DOOR_PX_X, height: 16,
    properties: wallBottom.properties ?? []
  })
  collision.objects.push({
    id: nextId + 1, name: 'wall_bottom_r',
    x: DOOR_PX_X + 16, y: DOOR_PX_Y,
    width: ROOM_W_PX - (DOOR_PX_X + 16), height: 16,
    properties: wallBottom.properties ?? []
  })
  j.nextobjectid = nextId + 2
  console.log('split wall_bottom around south door')
} else {
  console.log('wall_bottom already split (or absent) — idempotent')
}

writeFileSync(FILE, JSON.stringify(j, null, 2))
console.log('wrote', FILE)
