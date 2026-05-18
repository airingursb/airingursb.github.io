#!/usr/bin/env node
// V13.4 — Patch lobby.tmj to add 3 staircase portals (bath / arcade /
// greenhouse) + matching from_bath / from_arcade / from_greenhouse spawn
// points. Idempotent: skips if portals already exist.

import fs from 'node:fs'
import path from 'node:path'

const LOBBY = path.join(process.cwd(), 'public/lounge/assets/rooms/lobby.tmj')
const src = JSON.parse(fs.readFileSync(LOBBY, 'utf8'))

const STAIRS = [
  {
    id: 'bath',
    // Top-right corner of lobby (in lobby's 30×20 tile grid; 480×320 px)
    portal:  { x: 384, y: 16, w: 16, h: 16 },
    spawn:   { x: 400, y: 40 }
  },
  {
    id: 'arcade',
    portal:  { x: 416, y: 16, w: 16, h: 16 },
    spawn:   { x: 432, y: 40 }
  },
  {
    id: 'greenhouse',
    portal:  { x: 448, y: 16, w: 16, h: 16 },
    spawn:   { x: 464, y: 40 }
  }
]

let nextId = src.nextobjectid
const spawnLayer  = src.layers.find(l => l.name === 'spawn_points')
const portalLayer = src.layers.find(l => l.name === 'portals')

for (const s of STAIRS) {
  if (portalLayer.objects.some(o => o.name === `to_${s.id}`)) {
    console.log(`  lobby.tmj: to_${s.id} already wired, skip`)
    continue
  }
  portalLayer.objects.push({
    id: nextId++,
    name: `to_${s.id}`,
    x: s.portal.x, y: s.portal.y,
    width: s.portal.w, height: s.portal.h,
    properties: [
      { name: 'target_room',  type: 'string', value: `room_${s.id}` },
      { name: 'target_spawn', type: 'string', value: 'from_lobby' }
    ]
  })
  spawnLayer.objects.push({
    id: nextId++,
    name: `from_${s.id}`,
    x: s.spawn.x, y: s.spawn.y, width: 0, height: 0
  })
}

src.nextobjectid = nextId
fs.writeFileSync(LOBBY, JSON.stringify(src, null, 2) + '\n')
console.log('patched lobby.tmj with V13.4 staircase portals')
