// V10.3 — Marriage / Partnership.
//
// One partner at a time. Prerequisites:
//   - heart level 10 with the target NPC (from npc_hearts.ts)
//   - one MARRIAGE_PEBBLE_ITEM in inventory
// Effects:
//   - records partner_npc_id + marriedAt
//   - consumes the marriage pebble
//   - spouse renders in player's Home room during morning (07:00-10:00) and
//     evening (18:00-22:00) game-time windows (see RoomScene)
//   - daily greeting once per UTC day on home entry

const STORAGE_KEY = 'lounge_marriage_v1'
const PEBBLE_KEY = 'lounge_marriage_pebble_v1'

export const MARRIAGE_PEBBLE_ITEM = 'marriage_pebble'
export const MARRIAGE_PEBBLE_COST = 100   // shells, from Mio's shop

/** Marriage pebble is a consumable counter (not the regular purchase-log).
 *  The shop credits this counter on buy; propose consumes it. */
export function getMarriagePebbleCount(): number {
  try { return Math.max(0, Number(localStorage.getItem(PEBBLE_KEY) || '0')) } catch { return 0 }
}
export function addMarriagePebble(n = 1) {
  const cur = getMarriagePebbleCount()
  try { localStorage.setItem(PEBBLE_KEY, String(cur + n)) } catch {}
}
export function consumeMarriagePebble(): boolean {
  const cur = getMarriagePebbleCount()
  if (cur < 1) return false
  try { localStorage.setItem(PEBBLE_KEY, String(cur - 1)) } catch {}
  return true
}

export type Marriage = {
  partner_npc_id: string
  married_at: number          // epoch ms
  last_greeting_day: string   // 'YYYY-MM-DD' UTC, for daily greeting throttle
}

export function getMarriage(): Marriage | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const m = JSON.parse(raw) as Marriage
    return m?.partner_npc_id ? m : null
  } catch { return null }
}

export function isMarriedTo(npcId: string): boolean {
  return getMarriage()?.partner_npc_id === npcId
}

export function setMarriage(npcId: string) {
  const m: Marriage = { partner_npc_id: npcId, married_at: Date.now(), last_greeting_day: '' }
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(m)) } catch {}
}

/** Returns true if a greeting hasn't been shown yet today. Mark via markGreetedToday. */
export function shouldGreetToday(): boolean {
  const m = getMarriage(); if (!m) return false
  const today = new Date().toISOString().slice(0, 10)
  return m.last_greeting_day !== today
}

export function markGreetedToday() {
  const m = getMarriage(); if (!m) return
  m.last_greeting_day = new Date().toISOString().slice(0, 10)
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(m)) } catch {}
}

/** Returns 'morning' / 'evening' / null based on the current in-game time. */
export function spousePresenceWindow(date: Date): 'morning' | 'evening' | null {
  const h = date.getHours()
  if (h >= 7 && h < 10)  return 'morning'
  if (h >= 18 && h < 22) return 'evening'
  return null
}
