#!/usr/bin/env node
// V11.5 — Generate bedrooms for the V11.4 NPCs (Iris from Grove, Mox from
// Workshop). Same template/script pattern as gen-bedrooms-v10.mjs.

import fs from 'node:fs'
import path from 'node:path'

const ROOMS_DIR = path.join(process.cwd(), 'public/lounge/assets/rooms')
const TEMPLATE = JSON.parse(fs.readFileSync(path.join(ROOMS_DIR, 'bedroom_theo.tmj'), 'utf8'))

const BEDROOMS = [
  {
    id: 'iris', name: 'Iris',
    source: 'grove',
    // Grove map is large. North-edge portal at (160, 16).
    sourcePortal: { x: 160, y: 16, w: 16, h: 16 },
    sourceSpawn:  { x: 176, y: 40 },
    trinketTile: 28, trinketRowCol: { r: 1, c: 4 }      // flowery accent
  },
  {
    id: 'mox', name: 'Mox',
    source: 'workshop',
    sourcePortal: { x: 64, y: 16, w: 16, h: 16 },
    sourceSpawn:  { x: 80, y: 40 },
    trinketTile: 29, trinketRowCol: { r: 1, c: 8 }      // gear-ish accent
  }
]

for (const b of BEDROOMS) {
  const out = JSON.parse(JSON.stringify(TEMPLATE))
  const above = out.layers.find(l => l.name === 'furniture_above')
  if (above && b.trinketTile) {
    const idx = b.trinketRowCol.r * out.width + b.trinketRowCol.c
    above.data[idx] = b.trinketTile
  }
  const spawnLayer = out.layers.find(l => l.name === 'spawn_points')
  for (const s of spawnLayer.objects) if (s.name === 'from_grove') s.name = `from_${b.source}`
  const portalLayer = out.layers.find(l => l.name === 'portals')
  for (const p of portalLayer.objects) {
    if (p.name === 'to_grove') {
      p.name = `to_${b.source}`
      for (const prop of (p.properties ?? [])) {
        if (prop.name === 'target_room')  prop.value = `room_${b.source}`
        if (prop.name === 'target_spawn') prop.value = `from_bedroom_${b.id}`
      }
    }
  }
  fs.writeFileSync(path.join(ROOMS_DIR, `bedroom_${b.id}.tmj`), JSON.stringify(out, null, 2) + '\n')
  console.log(`wrote bedroom_${b.id}.tmj`)
}

// Patch source rooms (grove + workshop) with the new portals + spawns
const bySource = new Map()
for (const b of BEDROOMS) {
  if (!bySource.has(b.source)) bySource.set(b.source, [])
  bySource.get(b.source).push(b)
}
for (const [source, bedrooms] of bySource) {
  const srcPath = path.join(ROOMS_DIR, `${source}.tmj`)
  const src = JSON.parse(fs.readFileSync(srcPath, 'utf8'))
  let nextId = src.nextobjectid
  const spawnLayer  = src.layers.find(l => l.name === 'spawn_points')
  const portalLayer = src.layers.find(l => l.name === 'portals')
  if (!spawnLayer || !portalLayer) { console.warn(`SKIP ${source}: layers missing`); continue }
  for (const b of bedrooms) {
    if (portalLayer.objects.some(o => o.name === `to_bedroom_${b.id}`)) {
      console.log(`  ${source}.tmj: to_bedroom_${b.id} already wired, skip`); continue
    }
    portalLayer.objects.push({
      id: nextId++,
      name: `to_bedroom_${b.id}`,
      x: b.sourcePortal.x, y: b.sourcePortal.y,
      width: b.sourcePortal.w, height: b.sourcePortal.h,
      properties: [
        { name: 'target_room',  type: 'string', value: `room_bedroom_${b.id}` },
        { name: 'target_spawn', type: 'string', value: 'default' }
      ]
    })
    spawnLayer.objects.push({
      id: nextId++,
      name: `from_bedroom_${b.id}`,
      x: b.sourceSpawn.x, y: b.sourceSpawn.y, width: 0, height: 0
    })
  }
  src.nextobjectid = nextId
  fs.writeFileSync(srcPath, JSON.stringify(src, null, 2) + '\n')
  console.log(`patched ${source}.tmj`)
}

console.log('\nDONE — remember to update manifest.json, config.STATIC_ROOMS,')
console.log('       RoomScene loader + labelMap.')
