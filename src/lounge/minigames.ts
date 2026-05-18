// V11.6 — Mini-game registry + scoring helpers.
//
// Each game is a self-contained module that renders into a shared overlay
// (#lounge-minigame-overlay) and reports a score on completion. Best score
// is tracked per UTC day in lounge_minigame_scores_v1; a 🎮 top-bar button
// opens a picker listing all games.

export type MinigameDef = {
  id: string
  emoji: string
  name: string
  blurb: string
  room: string              // thematic home; not enforced (any room can launch)
  bestScoreLabel: string    // e.g. "best roll", "max combo"
  /** Reward shells based on the score. Implementations may cap. */
  reward: (score: number) => number
}

export const MINIGAMES: MinigameDef[] = [
  {
    id: 'dice',
    emoji: '🎲',
    name: 'Lobby Dice',
    blurb: 'Roll two dice. The Lobby is feeling lucky.',
    room: 'room_lobby',
    bestScoreLabel: 'best roll',
    reward: (s) => Math.max(0, Math.min(s, 12))
  },
  {
    id: 'rhythm',
    emoji: '🎧',
    name: 'DJ Rhythm',
    blurb: 'Tap each note in time. Higher accuracy = more shells.',
    room: 'room_dj_floor',
    bestScoreLabel: 'max accuracy',
    reward: (s) => Math.floor(s / 10)   // 100% accuracy → 10 shells
  },
  {
    id: 'cook',
    emoji: '🍳',
    name: 'Stir-fry Timing',
    blurb: 'Stop the bar inside the green zone. Closer to center = bigger bonus.',
    room: 'room_kitchen',
    bestScoreLabel: 'best precision',
    reward: (s) => Math.floor(s / 20)
  }
]

const SCORES_KEY = 'lounge_minigame_scores_v1'

type ScoreLog = Record<string, {
  bestScore: number
  bestDay: string          // 'YYYY-MM-DD' UTC, when best was set
  todayScore: number
  todayDay: string         // resets each UTC day
}>

function loadScores(): ScoreLog {
  try { return JSON.parse(localStorage.getItem(SCORES_KEY) || '{}') } catch { return {} }
}
function saveScores(s: ScoreLog) {
  try { localStorage.setItem(SCORES_KEY, JSON.stringify(s)) } catch {}
}
function utcDay(): string { return new Date().toISOString().slice(0, 10) }

export function getBestScore(id: string): { best: number; today: number } {
  const s = loadScores()[id]
  const today = utcDay()
  if (!s) return { best: 0, today: 0 }
  return { best: s.bestScore || 0, today: s.todayDay === today ? s.todayScore : 0 }
}

export function recordScore(id: string, score: number): { newBest: boolean; reward: number } {
  const scores = loadScores()
  const today = utcDay()
  const cur = scores[id] ?? { bestScore: 0, bestDay: '', todayScore: 0, todayDay: '' }
  let newBest = false
  if (cur.todayDay !== today) { cur.todayDay = today; cur.todayScore = 0 }
  if (score > cur.todayScore) cur.todayScore = score
  if (score > cur.bestScore) { cur.bestScore = score; cur.bestDay = today; newBest = true }
  scores[id] = cur
  saveScores(scores)
  const def = MINIGAMES.find(m => m.id === id)
  const reward = def ? def.reward(score) : 0
  return { newBest, reward }
}
