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
export function findCutsceneForRoom(roomId: string, now: Date = new Date(), opts: {
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
