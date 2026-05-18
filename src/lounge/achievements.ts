// V10.4 — Achievement album. 50+ unlockable milestones across discovery,
// social, crafting, skills, economy, activities, and building. Each unlock
// awards a small shell reward (5/15/30/50 by tier).
//
// State lives in localStorage `lounge_achievements_v1` as `{[id]: timestamp}`.
//
// Modules elsewhere fire events via recordEvent(); this module then runs the
// relevant evaluator(s) and auto-marks any newly-passing achievement.

import { awardShells } from './shells'

const STORAGE_KEY = 'lounge_achievements_v1'

export type AchievementTier = 1 | 2 | 3 | 4
export const TIER_REWARD: Record<AchievementTier, number> = { 1: 5, 2: 15, 3: 30, 4: 50 }

export type AchievementDef = {
  id: string
  name: string
  blurb: string
  tier: AchievementTier
  category: 'discovery' | 'social' | 'crafting' | 'skills' | 'economy' | 'activities' | 'building'
}

export const ACHIEVEMENTS: AchievementDef[] = [
  // ─── Discovery (visit each room) ───────────────────────────
  { id: 'visit_lobby',    name: 'New Regular',   blurb: 'Visit the Lobby.',      tier: 1, category: 'discovery' },
  { id: 'visit_dj_floor', name: 'On the Floor',  blurb: 'Visit the DJ Floor.',   tier: 1, category: 'discovery' },
  { id: 'visit_balcony',  name: 'Fresh Air',     blurb: 'Visit the Balcony.',    tier: 1, category: 'discovery' },
  { id: 'visit_library',  name: 'Quiet Type',    blurb: 'Visit the Library.',    tier: 1, category: 'discovery' },
  { id: 'visit_kitchen',  name: 'Cook Pass',     blurb: 'Visit the Kitchen.',    tier: 1, category: 'discovery' },
  { id: 'visit_workshop', name: 'Tool User',     blurb: 'Visit the Workshop.',   tier: 1, category: 'discovery' },
  { id: 'visit_rooftop',  name: 'Sky Watcher',   blurb: 'Visit the Rooftop.',    tier: 1, category: 'discovery' },
  { id: 'visit_beach',    name: 'Sandy Toes',    blurb: 'Visit the Beach.',      tier: 1, category: 'discovery' },
  { id: 'visit_grove',    name: 'Tree Knower',   blurb: 'Visit the Grove.',      tier: 1, category: 'discovery' },
  { id: 'visit_home',     name: 'Found Home',    blurb: 'Enter your own Home.',  tier: 1, category: 'discovery' },
  // ─── Social ────────────────────────────────────────────────
  { id: 'first_gift',     name: 'First Gift',           blurb: 'Send a gift to anyone.',                          tier: 1, category: 'social' },
  { id: 'gifts_5',        name: 'Generous',             blurb: 'Send 5 gifts.',                                   tier: 2, category: 'social' },
  { id: 'gifts_25',       name: 'Beloved',              blurb: 'Send 25 gifts.',                                  tier: 3, category: 'social' },
  { id: 'friends_1',      name: 'Hi There',             blurb: 'Reach friendship level 1 with someone.',          tier: 1, category: 'social' },
  { id: 'friends_3',      name: 'Inner Circle',         blurb: 'Reach friendship level 3 with someone.',          tier: 3, category: 'social' },
  { id: 'meet_all_npcs',  name: 'Meet the Regulars',    blurb: 'Talk to every NPC at least once.',                tier: 2, category: 'social' },
  { id: 'heart_first_5',  name: 'Halfway There',        blurb: 'Reach heart 5 with any NPC.',                     tier: 2, category: 'social' },
  { id: 'heart_first_10', name: 'Soulmate-Adjacent',    blurb: 'Reach heart 10 with any NPC.',                    tier: 4, category: 'social' },
  { id: 'marriage',       name: 'Tied the Knot',        blurb: 'Marry an NPC.',                                   tier: 4, category: 'social' },
  { id: 'letter_first',   name: 'Pen Pal',              blurb: 'Drop a letter for someone.',                      tier: 1, category: 'social' },
  // ─── Crafting / Gathering ──────────────────────────────────
  { id: 'craft_first',    name: 'First Craft',          blurb: 'Craft anything.',                                 tier: 1, category: 'crafting' },
  { id: 'craft_5',        name: 'Apprentice Maker',     blurb: 'Craft 5 items.',                                  tier: 2, category: 'crafting' },
  { id: 'craft_20',       name: 'Workshop Regular',     blurb: 'Craft 20 items.',                                 tier: 3, category: 'crafting' },
  { id: 'recipes_5',      name: 'Five Recipes',         blurb: 'Discover 5 recipes.',                             tier: 2, category: 'crafting' },
  { id: 'recipes_all',    name: 'Recipe Book Complete', blurb: 'Discover every recipe.',                          tier: 4, category: 'crafting' },
  { id: 'gather_first',   name: 'Gatherer',             blurb: 'Gather your first material.',                     tier: 1, category: 'crafting' },
  { id: 'gather_25',      name: 'Forager',              blurb: 'Gather 25 materials.',                            tier: 2, category: 'crafting' },
  { id: 'gather_100',     name: 'Wildhand',             blurb: 'Gather 100 materials.',                           tier: 3, category: 'crafting' },
  // ─── Skills ────────────────────────────────────────────────
  { id: 'skill_lv5_any',     name: 'Skilled',         blurb: 'Get any skill to level 5.',     tier: 2, category: 'skills' },
  { id: 'skill_lv10_any',    name: 'Mastered One',    blurb: 'Get any skill to level 10.',    tier: 4, category: 'skills' },
  { id: 'skill_lv5_all',     name: 'Generalist',      blurb: 'All skills at level 5+.',        tier: 3, category: 'skills' },
  { id: 'skill_lv10_three',  name: 'Triple Master',   blurb: 'Three skills at level 10.',     tier: 4, category: 'skills' },
  // ─── Economy ───────────────────────────────────────────────
  { id: 'shells_100',     name: '100 Shells',        blurb: 'Hold 100 shells at once.',           tier: 1, category: 'economy' },
  { id: 'shells_500',     name: '500 Shells',        blurb: 'Hold 500 shells at once.',           tier: 2, category: 'economy' },
  { id: 'shells_2000',    name: '2000 Shells',       blurb: 'Hold 2000 shells at once.',          tier: 3, category: 'economy' },
  { id: 'shop_first_buy', name: 'First Purchase',    blurb: 'Buy something from Mio.',            tier: 1, category: 'economy' },
  { id: 'shop_all_decor', name: 'Decor Collector',   blurb: 'Buy every decoration in the shop.',  tier: 3, category: 'economy' },
  // ─── Activities ────────────────────────────────────────────
  { id: 'jam_first',          name: 'Joined the Jam',    blurb: 'Tap a pad during a jam.',          tier: 1, category: 'activities' },
  { id: 'festival_first',     name: 'Festival-Goer',     blurb: 'Attend a festival activity.',      tier: 1, category: 'activities' },
  { id: 'cutscene_first',     name: 'A Moment',          blurb: 'See your first heart cutscene.',   tier: 1, category: 'activities' },
  { id: 'cutscenes_10',       name: 'Ten Moments',       blurb: 'See 10 cutscenes total.',          tier: 3, category: 'activities' },
  { id: 'bundle_first',       name: 'First Bundle',      blurb: 'Complete a Community Hall bundle.',tier: 2, category: 'activities' },
  { id: 'bundle_all',         name: 'Bundle Maxer',      blurb: 'Complete every Community bundle.', tier: 4, category: 'activities' },
  { id: 'pet_adopted',        name: 'Found a Friend',    blurb: 'Adopt a pet.',                     tier: 1, category: 'activities' },
  { id: 'pet_max_affection',  name: 'Best Friends',      blurb: 'Reach max affection with your pet.', tier: 3, category: 'activities' },
  { id: 'photo_first',        name: 'First Snap',        blurb: 'Take your first photo.',           tier: 1, category: 'activities' },
  { id: 'photos_25',          name: 'Photographer',      blurb: 'Save 25 photos to your album.',    tier: 3, category: 'activities' },
  // ─── Building / Home ───────────────────────────────────────
  { id: 'home_furnished',  name: 'First Decoration', blurb: 'Place a decoration in your Home.',  tier: 1, category: 'building' },
  { id: 'home_tier2',      name: 'Bigger Place',     blurb: 'Upgrade your Home to tier 2.',       tier: 3, category: 'building' },
  { id: 'home_tier3',      name: 'Manor',            blurb: 'Upgrade your Home to tier 3.',       tier: 4, category: 'building' },
  { id: 'build_carpenter', name: 'Carpenter',        blurb: 'Build any home extension.',          tier: 2, category: 'building' }
]

type UnlockMap = Record<string, number>

function loadMap(): UnlockMap {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}') } catch { return {} }
}
function saveMap(m: UnlockMap) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(m)) } catch {}
}

export function isUnlocked(id: string): boolean { return !!loadMap()[id] }

export function getUnlocked(): UnlockMap { return loadMap() }

const listeners: Array<(def: AchievementDef) => void> = []
export function onAchievementUnlocked(fn: (def: AchievementDef) => void) { listeners.push(fn) }

function markUnlocked(id: string) {
  const m = loadMap()
  if (m[id]) return
  const def = ACHIEVEMENTS.find(a => a.id === id)
  if (!def) return
  m[id] = Date.now()
  saveMap(m)
  awardShells(TIER_REWARD[def.tier])
  for (const fn of listeners) fn(def)
}

/** Numeric counter helpers, kept inside this module so callers don't need to
 *  maintain their own counts. Each named counter persists in localStorage. */
const COUNTER_KEY = 'lounge_achievement_counters_v1'
function getCounter(name: string): number {
  try {
    const all = JSON.parse(localStorage.getItem(COUNTER_KEY) || '{}')
    return Number(all[name] ?? 0)
  } catch { return 0 }
}
function incCounter(name: string, by = 1): number {
  try {
    const all = JSON.parse(localStorage.getItem(COUNTER_KEY) || '{}')
    all[name] = Number(all[name] ?? 0) + by
    localStorage.setItem(COUNTER_KEY, JSON.stringify(all))
    return all[name]
  } catch { return 0 }
}

// ─── Event dispatch ──────────────────────────────────────────

export type AchievementEvent =
  | { type: 'visit_room'; roomId: string }
  | { type: 'gift_sent' }
  | { type: 'friend_level'; level: number }
  | { type: 'npc_met'; npcId: string }
  | { type: 'npc_heart'; level: number }
  | { type: 'marriage' }
  | { type: 'letter_dropped' }
  | { type: 'craft_made' }
  | { type: 'recipe_discovered'; totalDiscovered: number; totalAvailable: number }
  | { type: 'gather' }
  | { type: 'skill_level_up'; level: number; allLevels: number[] }
  | { type: 'shells_balance'; value: number }
  | { type: 'shop_purchase'; itemId: string; allDecorOwned?: boolean }
  | { type: 'jam_tap' }
  | { type: 'festival_attended' }
  | { type: 'cutscene_played'; total: number }
  | { type: 'bundle_completed'; allComplete?: boolean }
  | { type: 'pet_adopted' }
  | { type: 'pet_affection'; level: number }
  | { type: 'photo_taken'; total: number }
  | { type: 'home_decoration_placed' }
  | { type: 'home_tier'; tier: number }
  | { type: 'home_extension_built' }

const NPC_MET_SET_KEY = 'lounge_achievement_npcs_met_v1'

export function recordEvent(ev: AchievementEvent) {
  switch (ev.type) {
    case 'visit_room': {
      const map: Record<string, string> = {
        room_lobby: 'visit_lobby', room_dj_floor: 'visit_dj_floor', room_balcony: 'visit_balcony',
        room_library: 'visit_library', room_kitchen: 'visit_kitchen', room_workshop: 'visit_workshop',
        room_rooftop: 'visit_rooftop', room_beach: 'visit_beach', room_grove: 'visit_grove'
      }
      if (ev.roomId.startsWith('room_home_')) markUnlocked('visit_home')
      else if (map[ev.roomId]) markUnlocked(map[ev.roomId])
      return
    }
    case 'gift_sent': {
      const n = incCounter('gifts_sent')
      if (n >= 1)  markUnlocked('first_gift')
      if (n >= 5)  markUnlocked('gifts_5')
      if (n >= 25) markUnlocked('gifts_25')
      return
    }
    case 'friend_level': {
      if (ev.level >= 1) markUnlocked('friends_1')
      if (ev.level >= 3) markUnlocked('friends_3')
      return
    }
    case 'npc_met': {
      try {
        const set = JSON.parse(localStorage.getItem(NPC_MET_SET_KEY) || '[]') as string[]
        if (!set.includes(ev.npcId)) {
          set.push(ev.npcId)
          localStorage.setItem(NPC_MET_SET_KEY, JSON.stringify(set))
          // V10.7-review N3 fix: compare against the live manifest count so
          // adding a 12th NPC doesn't make the achievement unreachable.
          const target = (window as any).__loungeNpcCount ?? 11
          if (set.length >= target) markUnlocked('meet_all_npcs')
        }
      } catch {}
      return
    }
    case 'npc_heart': {
      if (ev.level >= 5)  markUnlocked('heart_first_5')
      if (ev.level >= 10) markUnlocked('heart_first_10')
      return
    }
    case 'marriage':       markUnlocked('marriage'); return
    case 'letter_dropped': markUnlocked('letter_first'); return
    case 'craft_made': {
      const n = incCounter('crafts_made')
      if (n >= 1)  markUnlocked('craft_first')
      if (n >= 5)  markUnlocked('craft_5')
      if (n >= 20) markUnlocked('craft_20')
      return
    }
    case 'recipe_discovered': {
      if (ev.totalDiscovered >= 5) markUnlocked('recipes_5')
      if (ev.totalDiscovered >= ev.totalAvailable) markUnlocked('recipes_all')
      return
    }
    case 'gather': {
      const n = incCounter('gathered')
      if (n >= 1)   markUnlocked('gather_first')
      if (n >= 25)  markUnlocked('gather_25')
      if (n >= 100) markUnlocked('gather_100')
      return
    }
    case 'skill_level_up': {
      if (ev.level >= 5)  markUnlocked('skill_lv5_any')
      if (ev.level >= 10) markUnlocked('skill_lv10_any')
      if (ev.allLevels.every(l => l >= 5)) markUnlocked('skill_lv5_all')
      if (ev.allLevels.filter(l => l >= 10).length >= 3) markUnlocked('skill_lv10_three')
      return
    }
    case 'shells_balance': {
      if (ev.value >= 100)  markUnlocked('shells_100')
      if (ev.value >= 500)  markUnlocked('shells_500')
      if (ev.value >= 2000) markUnlocked('shells_2000')
      return
    }
    case 'shop_purchase': {
      markUnlocked('shop_first_buy')
      if (ev.allDecorOwned) markUnlocked('shop_all_decor')
      return
    }
    case 'jam_tap':           markUnlocked('jam_first'); return
    case 'festival_attended': markUnlocked('festival_first'); return
    case 'cutscene_played': {
      markUnlocked('cutscene_first')
      if (ev.total >= 10) markUnlocked('cutscenes_10')
      return
    }
    case 'bundle_completed': {
      markUnlocked('bundle_first')
      if (ev.allComplete) markUnlocked('bundle_all')
      return
    }
    case 'pet_adopted':   markUnlocked('pet_adopted'); return
    case 'pet_affection': if (ev.level >= 10) markUnlocked('pet_max_affection'); return
    case 'photo_taken': {
      markUnlocked('photo_first')
      if (ev.total >= 25) markUnlocked('photos_25')
      return
    }
    case 'home_decoration_placed': markUnlocked('home_furnished'); return
    case 'home_tier': {
      if (ev.tier >= 2) markUnlocked('home_tier2')
      if (ev.tier >= 3) markUnlocked('home_tier3')
      return
    }
    case 'home_extension_built': markUnlocked('build_carpenter'); return
  }
}
