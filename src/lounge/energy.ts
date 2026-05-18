// V8.1 — Energy/stamina system. Client-only (localStorage). Reset to 100 each
// new real-world day (UTC). Future V8.5 day-cycle will reset on game-bed sleep.

const STORAGE_KEY_VALUE = 'lounge_energy_v1'
const STORAGE_KEY_DATE  = 'lounge_energy_date_v1'   // last-modified date key (YYYY-MM-DD UTC)

const ENERGY_MAX_BASE = 100
const PUPPY_BONUS = 5   // V10.2 — puppy pet at max affection
const BATH_BONUS   = 10  // V13.1 — bath buff (24h after standing up from tub)
const POOL_BONUS   = 5   // V13.7 — summer rooftop pool (24h)
const COFFEE_BONUS = 5   // V14.1 — morning coffee group ritual (24h)
/** Per-call max so pet adoption / bath visit mid-session adjusts the cap. */
export function getEnergyMax(): number {
  let max = ENERGY_MAX_BASE
  try {
    const raw = localStorage.getItem('lounge_pet_v1')
    if (raw) {
      const p = JSON.parse(raw)
      if (p?.species === 'puppy' && p?.affection >= 10) max += PUPPY_BONUS
    }
  } catch {}
  try {
    const until = Number(localStorage.getItem('lounge_bath_buff_until') || '0')
    if (Date.now() < until) max += BATH_BONUS
  } catch {}
  try {
    const until = Number(localStorage.getItem('lounge_pool_buff_until') || '0')
    if (Date.now() < until) max += POOL_BONUS
  } catch {}
  try {
    const until = Number(localStorage.getItem('lounge_coffee_buff_until') || '0')
    if (Date.now() < until) max += COFFEE_BONUS
  } catch {}
  return max
}
// Back-compat: old call sites import a static MAX. Computed lazily via getter
// would require module rewrite; instead we expose the base value here as the
// nominal cap and clamp through getEnergyMax() in setEnergy.
export const ENERGY_MAX = ENERGY_MAX_BASE

export const COST = {
  walk_per_tile: 1 / 30,   // 30 tiles drained → -1
  interact: 2,
  tool_use: 4,
  gift: 1
}

function utcDay(d: Date = new Date()): string {
  return d.toISOString().slice(0, 10)
}

function readRaw(): { value: number; date: string } {
  try {
    const v = Number(localStorage.getItem(STORAGE_KEY_VALUE))
    const d = localStorage.getItem(STORAGE_KEY_DATE) ?? ''
    const cap = getEnergyMax()
    if (!isFinite(v)) return { value: cap, date: utcDay() }
    return { value: Math.max(0, Math.min(cap, v)), date: d || utcDay() }
  } catch {
    return { value: getEnergyMax(), date: utcDay() }
  }
}

function writeRaw(value: number, date: string) {
  try {
    localStorage.setItem(STORAGE_KEY_VALUE, String(value))
    localStorage.setItem(STORAGE_KEY_DATE, date)
  } catch {}
  notify(value)
}

export function getEnergy(): number {
  const { value, date } = readRaw()
  const today = utcDay()
  const cap = getEnergyMax()
  if (date !== today) {
    // First load of a new day → restore to full (cap includes pet perk)
    writeRaw(cap, today)
    return cap
  }
  return value
}

export function setEnergy(value: number) {
  const clamped = Math.max(0, Math.min(getEnergyMax(), value))
  writeRaw(clamped, utcDay())
}

export function consumeEnergy(amount: number) {
  if (amount <= 0) return
  setEnergy(getEnergy() - amount)
}

export function restoreEnergy(amount: number) {
  if (amount <= 0) return
  setEnergy(getEnergy() + amount)
}

export function isExhausted(): boolean {
  return getEnergy() <= 0
}

const listeners: Array<(value: number) => void> = []
export function onEnergyChange(fn: (value: number) => void) { listeners.push(fn) }
function notify(value: number) { for (const l of listeners) l(value) }
