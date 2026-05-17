// V8.4 — Shells currency + Mio's shop.
// Client-only for now (localStorage). Future V8.4.1 will add a Supabase
// lounge_currency table for cross-device balance.

const STORAGE_KEY = 'lounge_shells_v1'
const DAILY_KEY   = 'lounge_shells_daily_v1'   // last UTC day a daily bonus was claimed

const DAILY_VISIT_REWARD = 10
export const SHELL_REWARD = {
  gift_accepted: 5,
  daily_visit:   DAILY_VISIT_REWARD,
  npc_first_meet: 3
}

export type ShopItemId = 'extra_letters' | 'pebble_bag_plus' | 'lantern_keepsake' | 'fox_figurine' | 'sketch_print'
export type ShopItem = {
  id: ShopItemId
  name: string
  cost: number
  blurb: string
  /** what unlocking does — purely cosmetic / informational for MVP */
  effect: 'letter_slots' | 'inventory_slots' | 'decoration'
}

export const SHOP: ShopItem[] = [
  { id: 'extra_letters',    name: 'Extra Letter Slots (+3)', cost: 25, blurb: 'Drop more notes per day.',         effect: 'letter_slots' },
  { id: 'pebble_bag_plus',  name: 'Pebble Bag (+8 slots)',   cost: 30, blurb: 'More room in your inventory.',     effect: 'inventory_slots' },
  { id: 'lantern_keepsake', name: 'Lantern Keepsake',        cost: 18, blurb: 'A small hanging lantern for Home.', effect: 'decoration' },
  { id: 'fox_figurine',     name: 'Fox Figurine',            cost: 22, blurb: 'A tiny carved fox.',                effect: 'decoration' },
  { id: 'sketch_print',     name: 'Sketch Print (Cole)',     cost: 35, blurb: 'A signed print from Cole.',         effect: 'decoration' }
]

function utcDay(d: Date = new Date()): string {
  return d.toISOString().slice(0, 10)
}

export function getShells(): number {
  try {
    const v = Number(localStorage.getItem(STORAGE_KEY) || '0')
    return Math.max(0, Math.floor(isFinite(v) ? v : 0))
  } catch { return 0 }
}

export function setShells(value: number) {
  try { localStorage.setItem(STORAGE_KEY, String(Math.max(0, Math.floor(value)))) } catch {}
  notify(getShells())
}

export function awardShells(amount: number) {
  if (amount <= 0) return
  setShells(getShells() + amount)
}

export function spendShells(amount: number): boolean {
  if (amount <= 0) return true
  const cur = getShells()
  if (cur < amount) return false
  setShells(cur - amount)
  return true
}

/** Returns the reward amount if a fresh daily was awarded just now, else 0. */
export function claimDailyVisitBonus(): number {
  try {
    const last = localStorage.getItem(DAILY_KEY)
    const today = utcDay()
    if (last === today) return 0
    localStorage.setItem(DAILY_KEY, today)
    awardShells(DAILY_VISIT_REWARD)
    return DAILY_VISIT_REWARD
  } catch { return 0 }
}

const STORAGE_PURCHASES = 'lounge_purchases_v1'
type PurchaseLog = { [k in ShopItemId]?: number }   // timestamp

export function getPurchases(): PurchaseLog {
  try { return JSON.parse(localStorage.getItem(STORAGE_PURCHASES) || '{}') } catch { return {} }
}
export function hasPurchased(id: ShopItemId): boolean {
  return !!getPurchases()[id]
}
export function markPurchased(id: ShopItemId) {
  const m = getPurchases(); m[id] = Date.now()
  try { localStorage.setItem(STORAGE_PURCHASES, JSON.stringify(m)) } catch {}
}

const listeners: Array<(value: number) => void> = []
export function onShellsChange(fn: (value: number) => void) { listeners.push(fn) }
function notify(v: number) { for (const l of listeners) l(v) }
