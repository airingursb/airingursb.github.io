#!/usr/bin/env node
// Idempotent patch: add a south door to balcony that leads to the beach.
//
// Run: node scripts/lounge/patch-balcony-beach-door.mjs

import { readFileSync, writeFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..')
const FILE = join(ROOT, 'public', 'lounge', 'assets', 'rooms', 'balcony.tmj')

// Balcony is 25x15. South wall at tile row 14. Door at tile col 12.
const DOOR_TILE_X = 12
const DOOR_TILE_Y = 14
const DOOR_PX_X = DOOR_TILE_X * 16
const DOOR_PX_Y = DOOR_TILE_Y * 16
const ROOM_W_PX = 25 * 16
const DOOR_TILE_ID = 3

const j = JSON.parse(readFileSync(FILE, 'utf8'))

const floor = j.layers.find((l) => l.name === 'floor')
const w = floor.width
const floorIdx = DOOR_TILE_Y * w + DOOR_TILE_X
if (floor.data[floorIdx] !== DOOR_TILE_ID) {
  floor.data[floorIdx] = DOOR_TILE_ID
  console.log('stamped DOOR at south', DOOR_TILE_X, DOOR_TILE_Y)
} else {
  console.log('south DOOR already stamped — idempotent')
}

const portals = j.layers.find((l) => l.name === 'portals')
if (!portals.objects.some((o) => o.name === 'to_beach')) {
  const nextId = (j.nextobjectid ?? 100)
  portals.objects.push({
    id: nextId, name: 'to_beach',
    x: DOOR_PX_X, y: DOOR_PX_Y,
    width: 16, height: 16,
    properties: [
      { name: 'target_room', type: 'string', value: 'room_beach' },
      { name: 'target_spawn', type: 'string', value: 'from_balcony' }
    ]
  })
  j.nextobjectid = nextId + 1
  console.log('added to_beach portal')
} else {
  console.log('to_beach already present — idempotent')
}

const spawns = j.layers.find((l) => l.name === 'spawn_points')
if (!spawns.objects.some((o) => o.name === 'from_beach')) {
  const nextId = (j.nextobjectid ?? 100)
  spawns.objects.push({
    id: nextId, name: 'from_beach',
    x: DOOR_PX_X + 8, y: (DOOR_TILE_Y - 1) * 16 + 8,
    width: 0, height: 0
  })
  j.nextobjectid = nextId + 1
  console.log('added from_beach spawn')
} else {
  console.log('from_beach spawn already present — idempotent')
}

const collision = j.layers.find((l) => l.name === 'collision')
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
