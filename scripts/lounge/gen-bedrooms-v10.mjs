#!/usr/bin/env node
// V10.0 — Generate 4 NPC bedrooms (marin/cole/wren/dane) by cloning theo's
// template, personalizing the decoration tile + accent floor color, and
// wiring portals into the source rooms each NPC frequents.
//
// Source → target:
//   lobby    → marin (writer)
//   library  → cole  (photographer with prints in library)
//   library  → wren  (book-club host)
//   dj_floor → dane  (dancer)

import fs from 'node:fs'
import path from 'node:path'

const ROOMS_DIR = path.join(process.cwd(), 'public/lounge/assets/rooms')

const TEMPLATE = JSON.parse(fs.readFileSync(path.join(ROOMS_DIR, 'bedroom_theo.tmj'), 'utf8'))

// indoor_lobby_v1 tileset uses gids 1..48. Some accent ideas:
//  - tile 2: warm-wood floor (default)
//  - tile 1: lighter cream floor
//  - tile 13 / 45 / 7: accent decorations (rug / mat / pattern)
// We keep the floor identical and personalize via furniture_above tiles +
// the carpet anchor below the bed.

// Each spec: which source room, where the new bedroom's portal lives in
// that source, and a flavor decoration tile (drops a unique trinket on the
// floor above the bed for visual variety).
const BEDROOMS = [
  {
    id: 'marin', name: 'Marin',
    source: 'lobby',
    // Lobby is 30x20 tiles (480x320 px). Stash portal in the left wall
    // alcove at top-left (away from existing portals south/west).
    sourcePortal: { x: 32, y: 16, w: 16, h: 16 },
    sourceSpawn:  { x: 48, y: 40 },
    // Trinket on furniture_above (typewriter idea — use tile 22, an accent)
    trinketTile: 22, trinketRowCol: { r: 1, c: 3 }
  },
  {
    id: 'cole', name: 'Cole',
    source: 'library',
    // Library: pick a free coordinate. halle already at x=16 y=16; place
    // cole at x=464 y=16 (top-right corner of a wide library).
    sourcePortal: { x: 64, y: 16, w: 16, h: 16 },
    sourceSpawn:  { x: 80, y: 40 },
    // Cole = photographer. Decorate with a "camera" via tile 25 (chair-back)
    trinketTile: 25, trinketRowCol: { r: 1, c: 9 }
  },
  {
    id: 'wren', name: 'Wren',
    source: 'library',
    sourcePortal: { x: 112, y: 16, w: 16, h: 16 },
    sourceSpawn:  { x: 128, y: 40 },
    // Wren = reader. Book-pile decoration via tile 26
    trinketTile: 26, trinketRowCol: { r: 1, c: 9 }
  },
  {
    id: 'dane', name: 'Dane',
    source: 'dj_floor',
    // DJ floor: 30x20. Drop portal in top-left.
    sourcePortal: { x: 32, y: 16, w: 16, h: 16 },
    sourceSpawn:  { x: 48, y: 40 },
    // Glow-stick stash decoration via tile 27
    trinketTile: 27, trinketRowCol: { r: 1, c: 9 }
  }
]

// 1. Generate the 4 bedroom TMJs
for (const bedroom of BEDROOMS) {
  const out = JSON.parse(JSON.stringify(TEMPLATE))   // deep clone

  // Layer 3 = furniture_above. Place trinket tile at (row, col).
  const aboveLayer = out.layers.find(l => l.name === 'furniture_above')
  if (aboveLayer && bedroom.trinketTile) {
    const idx = bedroom.trinketRowCol.r * out.width + bedroom.trinketRowCol.c
    aboveLayer.data[idx] = bedroom.trinketTile
  }

  // Update spawn point name: from_grove → from_<source>
  const spawnLayer = out.layers.find(l => l.name === 'spawn_points')
  if (spawnLayer) {
    for (const s of spawnLayer.objects) {
      if (s.name === 'from_grove') s.name = `from_${bedroom.source}`
    }
  }

  // Update portal target_room + target_spawn
  const portalsLayer = out.layers.find(l => l.name === 'portals')
  if (portalsLayer) {
    for (const p of portalsLayer.objects) {
      if (p.name === 'to_grove') {
        p.name = `to_${bedroom.source}`
        for (const prop of (p.properties ?? [])) {
          if (prop.name === 'target_room')  prop.value = `room_${bedroom.source}`
          if (prop.name === 'target_spawn') prop.value = `from_bedroom_${bedroom.id}`
        }
      }
    }
  }

  const outPath = path.join(ROOMS_DIR, `bedroom_${bedroom.id}.tmj`)
  fs.writeFileSync(outPath, JSON.stringify(out, null, 2) + '\n')
  console.log(`wrote ${outPath}`)
}

// 2. Patch each source room: add portal + spawn point pointing into bedroom.
//    We group bedrooms by their source room (so each source gets one pass).
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
  if (!spawnLayer || !portalLayer) {
    console.warn(`SKIP ${source}: missing spawn or portal layer`)
    continue
  }

  for (const b of bedrooms) {
    // Idempotent: skip if a portal of this name already exists
    if (portalLayer.objects.some(o => o.name === `to_bedroom_${b.id}`)) {
      console.log(`  ${source}.tmj: to_bedroom_${b.id} already wired, skip`)
      continue
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
  console.log(`patched ${srcPath}`)
}

console.log('\nDONE — remember to update:')
console.log('  public/lounge/manifest.json (4 new room entries)')
console.log('  src/lounge/config.ts STATIC_ROOMS')
console.log('  src/lounge/scenes/RoomScene.ts (loader + labelMap)')
console.log('  public/lounge/data/npcs.json (sleep brackets → bedroom rooms)')
