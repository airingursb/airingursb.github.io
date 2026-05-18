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

// V9.6 — Weekly market: prices fluctuate ±20% based on the ISO week + item id.
// Deterministic so all visitors see the same prices. Also: every Sunday the
// shop rotates a "rare" item that lists at a higher cost.

function isoWeek(d: Date = new Date()): number {
  const target = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()))
  const dayNr = (target.getUTCDay() + 6) % 7
  target.setUTCDate(target.getUTCDate() - dayNr + 3)
  const firstThursday = target.getTime()
  target.setUTCMonth(0, 1)
  if (target.getUTCDay() !== 4) {
    target.setUTCMonth(0, 1 + ((4 - target.getUTCDay()) + 7) % 7)
  }
  return 1 + Math.ceil((firstThursday - target.getTime()) / 604800000)
}

function priceMultiplier(itemId: string, now: Date = new Date()): number {
  const wk = isoWeek(now)
  let h = wk * 73856093
  for (let i = 0; i < itemId.length; i++) h = (h ^ itemId.charCodeAt(i) * 19349663) >>> 0
  // Map h % 41 (0..40) → multiplier in [0.8, 1.2]
  const m = 0.8 + ((h % 41) / 40) * 0.4
  return Math.round(m * 100) / 100
}

/** Returns this week's price for a shop item (rounded). */
export function getEffectivePrice(item: ShopItem, now: Date = new Date()): number {
  return Math.max(1, Math.round(item.cost * priceMultiplier(item.id, now)))
}

/** Returns the active weekly market event if today is in its window. */
export type MarketEvent = { id: string; name: string; emoji: string; blurb: string; multiplier: number }
export function getActiveMarketEvent(now: Date = new Date()): MarketEvent | null {
  // Each ISO week rolls one of 4 outcomes. V9.7-review I6: return null for
  // the neutral "bulk" week so the UI doesn't show a banner for nothing.
  // Removed the false "+20% premium" claim from rare_week — that feature
  // isn't actually implemented yet; rare_week stays as a flavor banner.
  const wk = isoWeek(now)
  const events: Array<MarketEvent | null> = [
    { id: 'discount_week', name: 'Discount Week', emoji: '💸', blurb: 'All shop items 20% off.', multiplier: 0.8 },
    null,
    { id: 'tariff_week',   name: 'Tariff Week',   emoji: '⚖️', blurb: 'Items priced +15% this week.', multiplier: 1.15 },
    { id: 'rare_week',     name: 'Rare Week',     emoji: '💎', blurb: 'Mio is in a generous mood — keep an eye out.', multiplier: 1.0 }
  ]
  return events[wk % events.length]
}

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

/** N1/N2: shared helper for stripping the deco prefix used by shop_* (Mio
 *  purchases) and craft_* (V9.1 crafted decorations). Inverse of how the
 *  inventory provider in RoomScene tags items. Both kinds share the same
 *  lounge_purchases_v1 storage map keyed by the bare id. */
export function decoStorageKey(prefixedId: string): string {
  return prefixedId.replace(/^(shop_|craft_)/, '')
}

const listeners: Array<(value: number) => void> = []
export function onShellsChange(fn: (value: number) => void) { listeners.push(fn) }
function notify(v: number) { for (const l of listeners) l(v) }
