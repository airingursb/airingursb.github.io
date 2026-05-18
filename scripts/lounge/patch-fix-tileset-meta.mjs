#!/usr/bin/env node
// Walk every .tmj and re-sync its tileset entry (tilecount, imageheight,
// imagewidth) against the actual tiles.json on disk. Fixes drift introduced
// when the tileset was extended (V6.1.1, E5-P0a, E5-P1b, E5-P2a) without
// re-baking the rooms.

import { readFileSync, writeFileSync, readdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..')
const ROOMS_DIR = join(ROOT, 'public', 'lounge', 'assets', 'rooms')
const TILESETS_DIR = join(ROOT, 'public', 'lounge', 'assets', 'tilesets')

function loadTilesetMeta(name) {
  try {
    const path = join(TILESETS_DIR, name, 'tiles.json')
    return JSON.parse(readFileSync(path, 'utf8'))
  } catch {
    return null
  }
}

const files = readdirSync(ROOMS_DIR).filter(f => f.endsWith('.tmj'))
let totalFixed = 0
for (const file of files) {
  const path = join(ROOMS_DIR, file)
  const map = JSON.parse(readFileSync(path, 'utf8'))
  let changed = false
  for (const ts of map.tilesets) {
    const meta = loadTilesetMeta(ts.name)
    if (!meta) { console.warn(`  ! ${file}: tileset ${ts.name} not found on disk`); continue }
    const want = {
      tilecount: meta.tile_count,
      imagewidth: meta.image_width,
      imageheight: meta.image_height,
      columns: meta.columns
    }
    const before = `count=${ts.tilecount} w=${ts.imagewidth} h=${ts.imageheight} cols=${ts.columns}`
    if (ts.tilecount !== want.tilecount) { ts.tilecount = want.tilecount; changed = true }
    if (ts.imagewidth !== want.imagewidth) { ts.imagewidth = want.imagewidth; changed = true }
    if (ts.imageheight !== want.imageheight) { ts.imageheight = want.imageheight; changed = true }
    if (ts.columns !== want.columns) { ts.columns = want.columns; changed = true }
    if (changed) {
      const after = `count=${ts.tilecount} w=${ts.imagewidth} h=${ts.imageheight} cols=${ts.columns}`
      console.log(`  ${file}: ${ts.name}  ${before}  →  ${after}`)
    }
  }
  if (changed) {
    writeFileSync(path, JSON.stringify(map, null, 2) + '\n')
    totalFixed++
  }
}
console.log(`\nOK ${totalFixed} room(s) re-synced; ${files.length - totalFixed} already current.`)
