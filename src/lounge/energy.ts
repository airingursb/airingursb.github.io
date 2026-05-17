// V8.1 — Energy/stamina system. Client-only (localStorage). Reset to 100 each
// new real-world day (UTC). Future V8.5 day-cycle will reset on game-bed sleep.

const STORAGE_KEY_VALUE = 'lounge_energy_v1'
const STORAGE_KEY_DATE  = 'lounge_energy_date_v1'   // last-modified date key (YYYY-MM-DD UTC)

export const ENERGY_MAX = 100

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
    if (!isFinite(v)) return { value: ENERGY_MAX, date: utcDay() }
    return { value: Math.max(0, Math.min(ENERGY_MAX, v)), date: d || utcDay() }
  } catch {
    return { value: ENERGY_MAX, date: utcDay() }
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
  if (date !== today) {
    // First load of a new day → restore to full
    writeRaw(ENERGY_MAX, today)
    return ENERGY_MAX
  }
  return value
}

export function setEnergy(value: number) {
  const clamped = Math.max(0, Math.min(ENERGY_MAX, value))
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
