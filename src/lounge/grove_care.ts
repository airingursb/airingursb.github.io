// V9.5 — "Care for the Grove" mini-loop.
//
// Visitor plants a flower in their slot at the Grove (cost: shells). Each day
// they water it (cost: energy + tap action). After 5 days of watering it
// blooms — its appearance becomes flowery and counts toward an atmosphere
// bonus that all visitors implicitly enjoy.
//
// MVP scope:
//   • Per-visitor flower state in localStorage (id, plantedAtUtcDay,
//     wateringDays array of UTC date strings, bloomedAt or null)
//   • Plant button + Water button gated on conditions
//   • Visual: small flower sprite at a fixed grove slot, color shifts as it
//     grows + bloomed flowers get a sparkle particle pulse
//   • Future V9.5.1: shared leaderboard via lounge_progress aggregation

import { spendShells } from './shells'
import { consumeEnergy } from './energy'
import { awardXp } from './skills'

export type FlowerState = {
  plantedDay: string         // YYYY-MM-DD UTC
  wateredDays: string[]      // UTC days when watered
  bloomedDay: string | null  // when flower bloomed (5 unique waterings)
  variety: 'yellow' | 'pink' | 'white'
}

const STORAGE_KEY = 'lounge_grove_flower_v1'
const PLANT_COST_SHELLS = 5
const WATER_ENERGY = 4
const BLOOM_DAYS = 5

function utcDay(d = new Date()): string { return d.toISOString().slice(0, 10) }

export function getFlower(): FlowerState | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) as FlowerState : null
  } catch { return null }
}
function saveFlower(s: FlowerState | null) {
  try {
    if (s == null) localStorage.removeItem(STORAGE_KEY)
    else localStorage.setItem(STORAGE_KEY, JSON.stringify(s))
  } catch {}
}

export type PlantResult = { ok: true } | { ok: false; reason: 'already_planted' | 'not_enough_shells' }
export function tryPlant(variety: FlowerState['variety']): PlantResult {
  if (getFlower()) return { ok: false, reason: 'already_planted' }
  if (!spendShells(PLANT_COST_SHELLS)) return { ok: false, reason: 'not_enough_shells' }
  saveFlower({ plantedDay: utcDay(), wateredDays: [], bloomedDay: null, variety })
  return { ok: true }
}

export type WaterResult = { ok: true; daysWatered: number; bloomed: boolean } | { ok: false; reason: 'no_flower' | 'already_watered_today' | 'bloomed_already' }
export function tryWater(): WaterResult {
  const f = getFlower()
  if (!f) return { ok: false, reason: 'no_flower' }
  if (f.bloomedDay) return { ok: false, reason: 'bloomed_already' }
  const today = utcDay()
  if (f.wateredDays.includes(today)) return { ok: false, reason: 'already_watered_today' }
  consumeEnergy(WATER_ENERGY)
  const updated: FlowerState = { ...f, wateredDays: [...f.wateredDays, today] }
  if (updated.wateredDays.length >= BLOOM_DAYS) {
    updated.bloomedDay = today
    awardXp('curating', 8)   // big curation reward
  } else {
    awardXp('curating', 2)
  }
  saveFlower(updated)
  return { ok: true, daysWatered: updated.wateredDays.length, bloomed: !!updated.bloomedDay }
}

export function uprootFlower() {
  // Allow restarting the loop after bloom; no refund
  saveFlower(null)
}
