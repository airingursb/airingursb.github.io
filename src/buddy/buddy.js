// Buddy System - Core generation logic
// Ported from Claude Code's companion.ts + types.ts

export const RARITIES = ['common', 'uncommon', 'rare', 'epic', 'legendary']

export const SPECIES = [
  'duck', 'goose', 'blob', 'cat', 'dragon', 'octopus', 'owl', 'penguin',
  'turtle', 'snail', 'ghost', 'axolotl', 'capybara', 'cactus', 'robot',
  'rabbit', 'mushroom', 'chonk',
]

export const SPECIES_LABELS = {
  duck: '鸭鸭', goose: '鹅鹅', blob: '果冻', cat: '猫咪', dragon: '龙龙',
  octopus: '章鱼', owl: '猫头鹰', penguin: '企鹅', turtle: '海龟',
  snail: '蜗牛', ghost: '幽灵', axolotl: '六角龙', capybara: '水豚',
  cactus: '仙人掌', robot: '机器人', rabbit: '兔兔', mushroom: '蘑菇',
  chonk: '胖橘',
}

export const EYES = ['·', '✦', '×', '◉', '@', '°']

export const HATS = ['none', 'crown', 'tophat', 'propeller', 'halo', 'wizard', 'beanie', 'tinyduck']

export const STAT_NAMES = ['DEBUGGING', 'PATIENCE', 'CHAOS', 'WISDOM', 'SNARK']

export const RARITY_WEIGHTS = {
  common: 60, uncommon: 25, rare: 10, epic: 4, legendary: 1,
}

export const RARITY_STARS = {
  common: '★', uncommon: '★★', rare: '★★★', epic: '★★★★', legendary: '★★★★★',
}

export const RARITY_COLORS = {
  common: '#888', uncommon: '#22c55e', rare: '#3b82f6', epic: '#a855f7', legendary: '#f59e0b',
}

export const RARITY_LABELS = {
  common: '普通', uncommon: '稀有', rare: '珍贵', epic: '史诗', legendary: '传说',
}

// Mulberry32 - tiny seeded PRNG
function mulberry32(seed) {
  let a = seed >>> 0
  return function () {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

// FNV-1a hash
function hashString(s) {
  let h = 2166136261
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

function pick(rng, arr) {
  return arr[Math.floor(rng() * arr.length)]
}

function rollRarity(rng) {
  const total = Object.values(RARITY_WEIGHTS).reduce((a, b) => a + b, 0)
  let roll = rng() * total
  for (const rarity of RARITIES) {
    roll -= RARITY_WEIGHTS[rarity]
    if (roll < 0) return rarity
  }
  return 'common'
}

const RARITY_FLOOR = {
  common: 5, uncommon: 15, rare: 25, epic: 35, legendary: 50,
}

function rollStats(rng, rarity) {
  const floor = RARITY_FLOOR[rarity]
  const peak = pick(rng, STAT_NAMES)
  let dump = pick(rng, STAT_NAMES)
  while (dump === peak) dump = pick(rng, STAT_NAMES)

  const stats = {}
  for (const name of STAT_NAMES) {
    if (name === peak) {
      stats[name] = Math.min(100, floor + 50 + Math.floor(rng() * 30))
    } else if (name === dump) {
      stats[name] = Math.max(1, floor - 10 + Math.floor(rng() * 15))
    } else {
      stats[name] = floor + Math.floor(rng() * 40)
    }
  }
  return stats
}

const SALT = 'friend-2026-401'

function rollFrom(rng) {
  const rarity = rollRarity(rng)
  return {
    rarity,
    species: pick(rng, SPECIES),
    eye: pick(rng, EYES),
    hat: rarity === 'common' ? 'none' : pick(rng, HATS),
    shiny: rng() < 0.01,
    stats: rollStats(rng, rarity),
  }
}

export function roll(userId) {
  const key = userId + SALT
  return rollFrom(mulberry32(hashString(key)))
}

// Get or create a persistent visitor ID
export function getVisitorId() {
  const KEY = 'buddy-visitor-id'
  let id = localStorage.getItem(KEY)
  if (!id) {
    id = crypto.randomUUID()
    localStorage.setItem(KEY, id)
  }
  return id
}
