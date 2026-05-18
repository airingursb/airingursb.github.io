// V7.7 — Cutscene engine. Minimal sequence executor: a Step is one of
//   { type: 'say', npc_id, text, duration_ms }
//   { type: 'wait', ms }
//   { type: 'camera_pan', x, y, duration_ms }
//   { type: 'camera_zoom', zoom, duration_ms }
//   { type: 'move_npc', npc_id, x, y, duration_ms }
//   { type: 'fade', alpha, duration_ms }    // dim a 1000-depth overlay
//   { type: 'shake', duration_ms, intensity }
//
// Cutscenes are gated by triggers (room entry + condition). At most one runs
// per scene boot. Progress is persisted in localStorage so the same cutscene
// only fires once unless reset (e.g., new visitor).

export type CutsceneStep =
  | { type: 'say';        npc_id: string; text: string; duration_ms?: number }
  | { type: 'wait';       ms: number }
  | { type: 'camera_pan'; x: number; y: number; duration_ms: number }
  | { type: 'camera_zoom'; zoom: number; duration_ms: number }
  | { type: 'move_npc';   npc_id: string; x: number; y: number; duration_ms: number }
  | { type: 'fade';       alpha: number; duration_ms: number; color?: number }
  | { type: 'shake';      duration_ms: number; intensity?: number }

export type CutsceneTrigger = {
  room?: string                                // must be in this room
  time_min?: string                            // "HH:MM"
  time_max?: string                            // "HH:MM"
  heart_min?: number                           // requires friendship with giver_npc
  heart_npc_id?: string                        // who the friendship is with
  event?: string                               // active festival id required
}

export type CutsceneDef = {
  id: string
  trigger: CutsceneTrigger
  steps: CutsceneStep[]
  /** if true, can replay on every entry; default false = once per visitor. */
  replay?: boolean
}

export const CUTSCENES: CutsceneDef[] = [
  {
    id: 'first_arrival_pip',
    trigger: { room: 'room_lobby' },  // any time, fires on first visit
    steps: [
      { type: 'wait', ms: 800 },
      { type: 'say', npc_id: 'npc_pip', text: '👋 Oh hey! Welcome to the lounge.', duration_ms: 2500 },
      { type: 'wait', ms: 600 },
      { type: 'say', npc_id: 'npc_pip', text: 'Wander around. Click anything. We have all day.', duration_ms: 2800 }
    ]
  },
  {
    id: 'sunset_at_grove',
    trigger: { room: 'room_grove', time_min: '17:30', time_max: '19:30' },
    replay: false,
    steps: [
      { type: 'wait', ms: 600 },
      { type: 'say', npc_id: 'npc_theo', text: 'Watch the light hit the pond at this hour.', duration_ms: 3000 },
      { type: 'camera_pan', x: 320, y: 224, duration_ms: 1800 },
      { type: 'wait', ms: 1500 },
      { type: 'say', npc_id: 'npc_theo', text: 'I planted those lilies the year I arrived.', duration_ms: 3000 },
      { type: 'wait', ms: 1500 },
      { type: 'camera_pan', x: 200, y: 144, duration_ms: 1800 }
    ]
  },
  {
    id: 'midnight_jam_kai',
    trigger: { room: 'room_dj_floor', time_min: '00:00', time_max: '02:00' },
    replay: false,
    steps: [
      { type: 'wait', ms: 500 },
      { type: 'say', npc_id: 'npc_kai', text: '🎧 Look who showed up.', duration_ms: 2200 },
      { type: 'shake', duration_ms: 400, intensity: 0.008 },
      { type: 'say', npc_id: 'npc_kai', text: 'This next track is dedicated. Stay on the floor.', duration_ms: 3000 }
    ]
  },

  // ─── P4 — One heart event per remaining NPC ────────────────────────
  // Each requires heart_min: 2 with that NPC and a contextual room/time.

  {
    id: 'mio_brew_reveal',
    trigger: { room: 'room_lobby', heart_npc_id: 'npc_mio', heart_min: 2 },
    steps: [
      { type: 'wait', ms: 800 },
      { type: 'say', npc_id: 'npc_mio', text: "Let me show you something. Sit.", duration_ms: 2400 },
      { type: 'wait', ms: 600 },
      { type: 'say', npc_id: 'npc_mio', text: "This is the cold-brew I never put on the menu.", duration_ms: 2800 },
      { type: 'say', npc_id: 'npc_mio', text: "First taste is yours. Tell me what you think.", duration_ms: 3000 }
    ]
  },
  {
    id: 'pip_keys',
    trigger: { room: 'room_lobby', heart_npc_id: 'npc_pip', heart_min: 3 },
    steps: [
      { type: 'wait', ms: 600 },
      { type: 'say', npc_id: 'npc_pip', text: "Hold up.", duration_ms: 1600 },
      { type: 'say', npc_id: 'npc_pip', text: "I want you to have this — set of keys to the back office.", duration_ms: 3000 },
      { type: 'say', npc_id: 'npc_pip', text: "Doesn't unlock anything important. But you're family now.", duration_ms: 3200 }
    ]
  },
  {
    id: 'ren_playlist',
    trigger: { room: 'room_dj_floor', heart_npc_id: 'npc_ren', heart_min: 2 },
    steps: [
      { type: 'wait', ms: 700 },
      { type: 'say', npc_id: 'npc_ren', text: "Wait — I made you something.", duration_ms: 2200 },
      { type: 'camera_pan', x: 152, y: 224, duration_ms: 1500 },
      { type: 'say', npc_id: 'npc_ren', text: "A mixtape. 47 minutes. No skips.", duration_ms: 2800 },
      { type: 'wait', ms: 800 },
      { type: 'camera_pan', x: 240, y: 160, duration_ms: 1500 }
    ]
  },
  {
    id: 'halle_first_edition',
    trigger: { room: 'room_library', heart_npc_id: 'npc_halle', heart_min: 3 },
    steps: [
      { type: 'wait', ms: 800 },
      { type: 'say', npc_id: 'npc_halle', text: "Shh. Come closer.", duration_ms: 2000 },
      { type: 'camera_pan', x: 96, y: 144, duration_ms: 1600 },
      { type: 'say', npc_id: 'npc_halle', text: "A first edition. I've been waiting to give it to someone careful.", duration_ms: 3200 },
      { type: 'say', npc_id: 'npc_halle', text: "Don't fold the pages. Don't even bookmark them. Just read.", duration_ms: 3200 }
    ]
  },
  {
    id: 'sora_named_shell',
    trigger: { room: 'room_beach', heart_npc_id: 'npc_sora', heart_min: 2 },
    steps: [
      { type: 'wait', ms: 600 },
      { type: 'say', npc_id: 'npc_sora', text: "Hey! Look at this one.", duration_ms: 2200 },
      { type: 'camera_pan', x: 240, y: 200, duration_ms: 1600 },
      { type: 'say', npc_id: 'npc_sora', text: "Iridescent. Pearly. I named it after you.", duration_ms: 3000 }
    ]
  },
  {
    id: 'theo_seed_gift',
    trigger: { room: 'room_grove', heart_npc_id: 'npc_theo', heart_min: 3 },
    steps: [
      { type: 'wait', ms: 700 },
      { type: 'say', npc_id: 'npc_theo', text: "Take this.", duration_ms: 1600 },
      { type: 'say', npc_id: 'npc_theo', text: "A seed from a tree my grandfather planted.", duration_ms: 2800 },
      { type: 'say', npc_id: 'npc_theo', text: "Plant it anywhere. It'll take three years to wake up. Worth the wait.", duration_ms: 3400 }
    ]
  },
  {
    id: 'marin_acknowledgment',
    trigger: { room: 'room_lobby', heart_npc_id: 'npc_marin', heart_min: 3 },
    steps: [
      { type: 'wait', ms: 700 },
      { type: 'say', npc_id: 'npc_marin', text: "Finished a draft. Want to see?", duration_ms: 2400 },
      { type: 'wait', ms: 800 },
      { type: 'say', npc_id: 'npc_marin', text: "Page one: acknowledgments. Page two: your name.", duration_ms: 3200 }
    ]
  },
  {
    id: 'cole_print',
    trigger: { room: 'room_library', heart_npc_id: 'npc_cole', heart_min: 2 },
    steps: [
      { type: 'wait', ms: 800 },
      { type: 'say', npc_id: 'npc_cole', text: "Printed this last week.", duration_ms: 2200 },
      { type: 'camera_pan', x: 304, y: 224, duration_ms: 1600 },
      { type: 'say', npc_id: 'npc_cole', text: "You. By the fireplace. 7:14pm. You didn't notice.", duration_ms: 3200 }
    ]
  },
  {
    id: 'wren_book_club',
    trigger: { room: 'room_library', heart_npc_id: 'npc_wren', heart_min: 2 },
    steps: [
      { type: 'wait', ms: 600 },
      { type: 'say', npc_id: 'npc_wren', text: "Tuesday. 7pm. You're in.", duration_ms: 2200 },
      { type: 'say', npc_id: 'npc_wren', text: "Don't read the book. The point is the talking.", duration_ms: 2800 },
      { type: 'say', npc_id: 'npc_wren', text: "I'll save you the good chair.", duration_ms: 2200 }
    ]
  },
  {
    id: 'dane_dedicated_set',
    trigger: { room: 'room_dj_floor', heart_npc_id: 'npc_dane', heart_min: 3, time_min: '00:00', time_max: '03:00' },
    steps: [
      { type: 'wait', ms: 600 },
      { type: 'say', npc_id: 'npc_dane', text: "🎧 Last track of the night. Listen.", duration_ms: 2600 },
      { type: 'shake', duration_ms: 600, intensity: 0.008 },
      { type: 'say', npc_id: 'npc_dane', text: "This one's for you. Don't sit down.", duration_ms: 3000 }
    ]
  }
]

const STORAGE_KEY = 'lounge_cutscenes_v1'

type FiredMap = Record<string, number>  // cutscene_id → timestamp

function loadFired(): FiredMap {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) as FiredMap : {}
  } catch { return {} }
}

function saveFired(map: FiredMap) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(map)) } catch {}
}

export function hasFired(cutsceneId: string): boolean {
  return !!loadFired()[cutsceneId]
}

export function markFired(cutsceneId: string) {
  const m = loadFired()
  m[cutsceneId] = Date.now()
  saveFired(m)
}

function parseHHMM(s: string): number {
  const m = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(s)
  if (!m) return NaN
  return parseInt(m[1], 10) * 60 + parseInt(m[2], 10)
}

/** Find the first cutscene whose trigger matches, that hasn't fired yet. */
import { getGameNow } from './gametime'
export function findCutsceneForRoom(roomId: string, now: Date = getGameNow(), opts: {
  friendships?: Map<string, { level: number }>,
  activeEvent?: string | null
} = {}): CutsceneDef | null {
  const minutes = now.getHours() * 60 + now.getMinutes()
  for (const c of CUTSCENES) {
    if (c.trigger.room && c.trigger.room !== roomId) continue
    if (c.trigger.time_min) {
      const t = parseHHMM(c.trigger.time_min)
      if (!isNaN(t) && minutes < t) continue
    }
    if (c.trigger.time_max) {
      const t = parseHHMM(c.trigger.time_max)
      if (!isNaN(t) && minutes > t) continue
    }
    if (c.trigger.event && c.trigger.event !== opts.activeEvent) continue
    if (c.trigger.heart_min !== undefined && c.trigger.heart_npc_id) {
      const fr = opts.friendships?.get(c.trigger.heart_npc_id)
      if (!fr || fr.level < c.trigger.heart_min) continue
    }
    if (!c.replay && hasFired(c.id)) continue
    return c
  }
  return null
}
