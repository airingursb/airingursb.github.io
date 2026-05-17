#!/usr/bin/env node
// Lounge asset validator. Read-only. Walks the manifest and confirms every
// declared file exists. Also flags orphan tilemaps (.tmj on disk but not in
// manifest) and validates room ids + tilemap shape.
//
// BGM and ambient files are 404-tolerant by design — they're declared as
// slots but the actual audio may not exist yet (will land in patch updates).
// We warn on missing BGM/ambient but do NOT fail.
//
// Run: node scripts/lounge/validate-assets.mjs
// Exit 0 = OK; exit 1 = at least one hard failure

import { readFileSync, existsSync, readdirSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..')
const ASSETS_DIR = join(ROOT, 'public', 'lounge', 'assets')
const MANIFEST = join(ROOT, 'public', 'lounge', 'manifest.json')
const CONFIG_TS = join(ROOT, 'src', 'lounge', 'config.ts')

const ROOM_ID_RE = /^room_[a-z][a-z0-9_]*$/

const errors = []
const warnings = []
const okmsgs = []

function err(msg)  { errors.push(msg) }
function warn(msg) { warnings.push(msg) }
function ok(msg)   { okmsgs.push(msg) }

function checkFile(rel, label, soft = false) {
  const abs = join(ASSETS_DIR, rel)
  if (!existsSync(abs)) {
    if (soft) warn(`${label}: missing ${rel}`)
    else err(`${label}: missing ${rel}`)
    return false
  }
  return true
}

let manifest
try {
  manifest = JSON.parse(readFileSync(MANIFEST, 'utf8'))
} catch (e) {
  err(`Cannot read manifest: ${e.message}`)
  printAndExit()
}

// 1. Rooms
const declaredRoomFiles = new Set()
for (const r of manifest.rooms ?? []) {
  if (!ROOM_ID_RE.test(r.id)) err(`Room id "${r.id}" doesn't match ${ROOM_ID_RE}`)
  if (!r.file) { err(`Room ${r.id} missing "file"`); continue }
  declaredRoomFiles.add(r.file)
  if (!checkFile(r.file, `room ${r.id}`)) continue

  // Tilemap shape sanity
  try {
    const tm = JSON.parse(readFileSync(join(ASSETS_DIR, r.file), 'utf8'))
    if (!Array.isArray(tm.layers)) err(`${r.file}: no layers array`)
    if (!Array.isArray(tm.tilesets)) err(`${r.file}: no tilesets array`)
    const layerNames = (tm.layers ?? []).map(l => l.name)
    if (!layerNames.includes('spawn_points')) err(`${r.file}: missing spawn_points object layer`)
    if (!layerNames.includes('portals'))      err(`${r.file}: missing portals object layer`)
    if (!layerNames.includes('floor'))        err(`${r.file}: missing floor tile layer`)
  } catch (e) {
    err(`${r.file}: invalid JSON — ${e.message}`)
  }

  if (r.bgm)     checkFile(r.bgm,     `room ${r.id} bgm`,     /* soft */ true)
  if (r.ambient) checkFile(r.ambient, `room ${r.id} ambient`, /* soft */ true)
}

// 2. Orphan tilemaps on disk
try {
  const onDisk = readdirSync(join(ASSETS_DIR, 'rooms')).filter(f => f.endsWith('.tmj'))
  for (const f of onDisk) {
    if (!declaredRoomFiles.has(`rooms/${f}`)) err(`Orphan tilemap on disk: rooms/${f}`)
  }
} catch (e) {
  err(`Cannot list rooms dir: ${e.message}`)
}

// 3. Tilesets
for (const t of manifest.tilesets ?? []) {
  if (!t.file) { err(`Tileset ${t.id} missing "file"`); continue }
  checkFile(t.file, `tileset ${t.id}`)
}

// 4. Sprites
for (const s of manifest.sprites ?? []) {
  if (!s.file) { err(`Sprite ${s.id} missing "file"`); continue }
  if (!checkFile(s.file, `sprite ${s.id}`)) continue
  try {
    const sm = JSON.parse(readFileSync(join(ASSETS_DIR, s.file), 'utf8'))
    const baseDir = dirname(s.file)
    for (const region of sm.regions ?? []) {
      checkFile(join(baseDir, region, 'sprite.png'), `sprite ${s.id}/${region} png`)
      checkFile(join(baseDir, region, 'sprite.json'), `sprite ${s.id}/${region} json`)
    }
  } catch (e) {
    err(`Sprite manifest ${s.file}: ${e.message}`)
  }
}

// 5. SFX — every declared key must exist as .ogg or .mp3
for (const key of manifest.audio?.sfx ?? []) {
  const ogg = `audio/sfx/${key}.ogg`
  const mp3 = `audio/sfx/${key}.mp3`
  if (!existsSync(join(ASSETS_DIR, ogg)) && !existsSync(join(ASSETS_DIR, mp3))) {
    err(`sfx ${key}: missing both ${ogg} and ${mp3}`)
  }
}

// 6. SFX list matches AUDIO_SFX_KEYS in config.ts (regex extract)
try {
  const configSrc = readFileSync(CONFIG_TS, 'utf8')
  const m = configSrc.match(/AUDIO_SFX_KEYS\s*=\s*\[([\s\S]*?)\]/)
  if (m) {
    const codeKeys = [...m[1].matchAll(/'([a-z_]+)'/g)].map(x => x[1])
    const manifestKeys = manifest.audio?.sfx ?? []
    const codeSet = new Set(codeKeys)
    const manSet = new Set(manifestKeys)
    for (const k of codeKeys) if (!manSet.has(k)) err(`config.ts AUDIO_SFX_KEYS has "${k}" but manifest does not`)
    for (const k of manifestKeys) if (!codeSet.has(k)) err(`manifest sfx has "${k}" but config.ts AUDIO_SFX_KEYS does not`)
  } else {
    warn('Could not locate AUDIO_SFX_KEYS in config.ts — skipping sync check')
  }
} catch (e) {
  warn(`config.ts read failed: ${e.message}`)
}

// 7. BGM + ambient: soft check (404-tolerant by design)
for (const path of manifest.audio?.bgm ?? []) {
  checkFile(path, `manifest.bgm[]`, /* soft */ true)
}
for (const path of manifest.audio?.ambient ?? []) {
  checkFile(path, `manifest.ambient[]`, /* soft */ true)
}

// 7b. Booth tracks (V3.2) — hard check, these ship with the build
let boothCount = 0
for (const t of manifest.audio?.booth ?? []) {
  boothCount++
  if (!t.id || !/^[a-z][a-z0-9_]*$/.test(t.id)) err(`booth track id "${t.id}" invalid`)
  if (!t.name || typeof t.name !== 'string') err(`booth track ${t.id}: missing name`)
  if (!t.file) { err(`booth track ${t.id}: missing file`); continue }
  // Accept either .ogg or .mp3 fallback
  const oggOk = existsSync(join(ASSETS_DIR, t.file))
  const mp3Path = t.file.replace(/\.ogg$/, '.mp3')
  const mp3Ok = existsSync(join(ASSETS_DIR, mp3Path))
  if (!oggOk && !mp3Ok) err(`booth track ${t.id}: missing both ${t.file} and ${mp3Path}`)
}

// 8. NPC manifest validation (V3.1)
const NPC_FILE = join(ROOT, 'public', 'lounge', 'data', 'npcs.json')
const REGIONS = ['asia','americas','europe','oceania','africa','unknown']
const FACINGS = ['up','down','left','right']
const NPC_STATES = ['idle','sit','dance']
const HHMM = /^([01]\d|2[0-3]):([0-5]\d)$/
const NPC_ID_RE = /^npc_[a-z_]+$/
let npcCount = 0
if (!existsSync(NPC_FILE)) {
  warn('npcs.json missing — no NPCs declared')
} else {
  try {
    const nm = JSON.parse(readFileSync(NPC_FILE, 'utf8'))
    if (!Array.isArray(nm.npcs)) {
      err('npcs.json: missing or invalid "npcs" array')
    } else {
      npcCount = nm.npcs.length
      // Lookup tables for room floor bounds from manifest
      const roomFloors = {}
      // We don't have ROOM_FLOORS here; just check room is in VALID_ROOMS via manifest.rooms.
      const validRooms = new Set((manifest.rooms ?? []).map(r => r.id))

      for (const def of nm.npcs) {
        const label = `npc ${def.id}`
        if (!NPC_ID_RE.test(def.id ?? '')) err(`${label}: id doesn't match ${NPC_ID_RE}`)
        if (typeof def.name !== 'string' || def.name.length === 0 || def.name.length > 24) err(`${label}: invalid name`)
        if (!REGIONS.includes(def.region)) err(`${label}: invalid region "${def.region}"`)
        if (!FACINGS.includes(def.facing)) err(`${label}: invalid facing "${def.facing}"`)
        if (!Array.isArray(def.schedule) || def.schedule.length === 0) err(`${label}: schedule must be non-empty array`)
        if (!Array.isArray(def.dialog_pool) || def.dialog_pool.length === 0 || def.dialog_pool.length > 10) {
          err(`${label}: dialog_pool must be 1-10 entries`)
        } else {
          for (const line of def.dialog_pool) {
            if (typeof line !== 'string' || line.length === 0 || line.length > 80) {
              err(`${label}: dialog_pool entry must be 1-80 char string ("${String(line).slice(0,20)}...")`)
            }
          }
        }
        // Schedule validation
        if (Array.isArray(def.schedule)) {
          const sorted = [...def.schedule].map((b, i) => ({ ...b, _idx: i }))
            .filter(b => HHMM.test(b.from) && HHMM.test(b.to))
          for (const b of def.schedule) {
            if (!HHMM.test(b.from)) err(`${label}: bracket from "${b.from}" not HH:MM`)
            if (!HHMM.test(b.to)) err(`${label}: bracket to "${b.to}" not HH:MM`)
            if (!validRooms.has(b.room)) err(`${label}: bracket room "${b.room}" not in manifest`)
            if (!NPC_STATES.includes(b.state)) err(`${label}: bracket state "${b.state}" not in ${NPC_STATES.join('|')}`)
            // x/y range: we don't have floor bounds here, so just check non-negative + integer
            if (!Number.isInteger(b.x) || b.x < 0 || b.x > 1000) err(`${label}: bracket x=${b.x} out of plausible range`)
            if (!Number.isInteger(b.y) || b.y < 0 || b.y > 1000) err(`${label}: bracket y=${b.y} out of plausible range`)
          }
          // Overlap detection within this NPC
          const minOf = (s) => { const m = HHMM.exec(s); return m ? +m[1] * 60 + +m[2] : NaN }
          sorted.sort((a, b) => minOf(a.from) - minOf(b.from))
          for (let i = 1; i < sorted.length; i++) {
            const prevTo = minOf(sorted[i - 1].to)
            const curFrom = minOf(sorted[i].from)
            if (curFrom < prevTo) err(`${label}: bracket [${sorted[i].from}, ${sorted[i].to}) overlaps with prior [${sorted[i-1].from}, ${sorted[i-1].to})`)
          }
        }
      }
    }
  } catch (e) {
    err(`npcs.json: invalid JSON — ${e.message}`)
  }
}

// 9. Pebbles manifest (V3.3)
const PEBBLES_FILE = join(ROOT, 'public', 'lounge', 'data', 'pebbles.json')
const PEBBLE_ID_RE = /^pebble_[a-z][a-z0-9_]*$/
let pebbleCount = 0
if (!existsSync(PEBBLES_FILE)) {
  warn('pebbles.json missing')
} else {
  try {
    const pm = JSON.parse(readFileSync(PEBBLES_FILE, 'utf8'))
    if (!Array.isArray(pm.pebbles)) {
      err('pebbles.json: missing or invalid "pebbles" array')
    } else {
      pebbleCount = pm.pebbles.length
      const validRooms = new Set((manifest.rooms ?? []).map(r => r.id))
      const seenIds = new Set()
      for (const p of pm.pebbles) {
        const label = `pebble ${p.id}`
        if (!PEBBLE_ID_RE.test(p.id ?? '')) err(`${label}: id doesn't match ${PEBBLE_ID_RE}`)
        if (seenIds.has(p.id)) err(`${label}: duplicate id`)
        seenIds.add(p.id)
        if (!validRooms.has(p.room)) err(`${label}: room "${p.room}" not in manifest`)
        if (!Number.isInteger(p.x) || p.x < 0 || p.x > 1000) err(`${label}: x out of range`)
        if (!Number.isInteger(p.y) || p.y < 0 || p.y > 1000) err(`${label}: y out of range`)
        if (typeof p.name !== 'string' || p.name.length === 0 || p.name.length > 32) err(`${label}: invalid name`)
      }
    }
  } catch (e) {
    err(`pebbles.json: invalid JSON — ${e.message}`)
  }
}

// 10. Seasons manifest (V3.4)
const SEASONS_FILE = join(ROOT, 'public', 'lounge', 'data', 'seasons.json')
const HEX_RE = /^#([0-9a-f]{6})$/i
const ALLOWED_PARTICLES = ['petals','sunlight','leaves','snow','lanterns','snowflakes']
let seasonCount = 0
let holidayCount = 0
if (!existsSync(SEASONS_FILE)) {
  warn('seasons.json missing')
} else {
  try {
    const sm = JSON.parse(readFileSync(SEASONS_FILE, 'utf8'))
    if (!Array.isArray(sm.seasons)) err('seasons.json: missing seasons array')
    if (!Array.isArray(sm.holidays)) err('seasons.json: missing holidays array')
    seasonCount = sm.seasons?.length ?? 0
    holidayCount = sm.holidays?.length ?? 0

    // Validate seasons: 4 seasons, months 1-12 cover all
    const monthCoverage = new Set()
    for (const s of sm.seasons ?? []) {
      if (!s.id || typeof s.id !== 'string') err(`season missing id`)
      if (!Array.isArray(s.months) || s.months.some(m => m < 1 || m > 12)) err(`season ${s.id}: invalid months`)
      for (const m of s.months ?? []) monthCoverage.add(m)
      if (!HEX_RE.test(s.tint ?? '')) err(`season ${s.id}: invalid tint`)
      if (typeof s.alpha !== 'number' || s.alpha < 0 || s.alpha > 1) err(`season ${s.id}: invalid alpha`)
      if (!ALLOWED_PARTICLES.includes(s.particle)) err(`season ${s.id}: particle "${s.particle}" not in ${ALLOWED_PARTICLES.join('|')}`)
    }
    if (monthCoverage.size !== 12) warn(`seasons only cover ${monthCoverage.size}/12 months`)

    for (const h of sm.holidays ?? []) {
      if (!h.id) err('holiday missing id')
      if (!HEX_RE.test(h.tint ?? '')) err(`holiday ${h.id}: invalid tint`)
      if (typeof h.alpha !== 'number' || h.alpha < 0 || h.alpha > 1) err(`holiday ${h.id}: invalid alpha`)
      if (!ALLOWED_PARTICLES.includes(h.particle)) err(`holiday ${h.id}: invalid particle`)
      if (!Array.isArray(h.windows) || h.windows.length === 0) err(`holiday ${h.id}: needs windows`)
      for (const w of h.windows ?? []) {
        if (!/^\d{4}-\d{2}-\d{2}$/.test(w.from) || !/^\d{4}-\d{2}-\d{2}$/.test(w.to))
          err(`holiday ${h.id}: window has bad YYYY-MM-DD`)
        if (w.from > w.to) err(`holiday ${h.id}: window from > to`)
      }
    }
  } catch (e) {
    err(`seasons.json: invalid JSON — ${e.message}`)
  }
}

// Summary
ok(`Declared: ${manifest.rooms?.length ?? 0} rooms, ${manifest.tilesets?.length ?? 0} tilesets, ` +
   `${manifest.sprites?.length ?? 0} sprite sets, ${manifest.audio?.sfx?.length ?? 0} SFX, ` +
   `${manifest.audio?.bgm?.length ?? 0} BGM slots, ${manifest.audio?.ambient?.length ?? 0} ambient slots, ` +
   `${boothCount} booth tracks, ${npcCount} NPCs, ${pebbleCount} pebbles, ` +
   `${seasonCount} seasons, ${holidayCount} holidays`)

function printAndExit() {
  for (const m of okmsgs)  console.log(`✓ ${m}`)
  for (const m of warnings) console.log(`! ${m}`)
  for (const m of errors)   console.log(`✗ ${m}`)
  if (errors.length === 0) {
    console.log(warnings.length === 0 ? '\nAll good.' : `\n${warnings.length} warning(s), no errors.`)
    process.exit(0)
  } else {
    console.log(`\n${errors.length} error(s), ${warnings.length} warning(s).`)
    process.exit(1)
  }
}
printAndExit()
