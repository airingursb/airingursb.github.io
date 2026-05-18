// V19.0 — NPC personal storylines.
//
// Each NPC can have at most one story right now (extensible). A story is
// a small sequence of 3 lines that the NPC says progressively as the
// player's heart level with that NPC climbs. Step 1 unlocks at heart 3,
// step 2 at 5, step 3 at 8. Completing all steps awards a cosmetic +
// achievement.
//
// State is per-visitor in localStorage as { [story_id]: stepIndex }
// where 0 = not started, len(steps) = complete.
//
// Persistence is local-only for now (story progress is private + tiny;
// we can sync via the profile blob in a follow-up if cross-device
// matters).

export type NpcStoryStep = {
  /** The line the NPC says. Picked over normal dialog when eligible. */
  line: string
  /** Heart level required to unlock this step. Steps must be sorted ascending. */
  heart_min: number
}

export type NpcStory = {
  id: string                  // e.g. 'mox_brass_cricket'
  npc_id: string              // e.g. 'npc_mox'
  title: string
  blurb: string               // one-line summary shown in story panel
  steps: NpcStoryStep[]
  /** Cosmetic id unlocked at story complete (must be in COSMETICS registry). */
  reward_cosmetic: string
  /** Achievement id awarded at story complete (added to ACHIEVEMENTS). */
  reward_achievement: string
}

export const NPC_STORIES: NpcStory[] = [
  // V19.1 — Mox the engineer is missing a tiny brass cricket she rebuilt.
  // Heart 3 = she mentions it; 5 = asks for help; 8 = gives the pin.
  {
    // V19.5-review C1 — id must equal the achievement registry id so
    // markUnlocked(story.id) hits the right ACHIEVEMENTS entry.
    id: 'story_mox_cricket',
    npc_id: 'npc_mox',
    title: "Mox's Brass Cricket",
    blurb: 'A small mechanical cricket she rebuilt has gone missing.',
    steps: [
      { heart_min: 3, line: "I rebuilt a brass cricket that chirps in C minor — but it's missing. I think I left it on a windowsill somewhere." },
      { heart_min: 5, line: "Still no sign of the cricket. If you find a small brass thing that hums, that's it. Keep it safe — I'd rather you wear it than lose it again." },
      { heart_min: 8, line: "I made another, smaller this time — a pin. For you. The first one will turn up. They always do." }
    ],
    reward_cosmetic: 'cricket_pin',
    reward_achievement: 'story_mox_cricket'
  },
  // V19.1 — Iris the gardener waits for the moonflower to bloom.
  // Heart 3 = mentions it; 5 = invites you to come see it; 8 = gives you a cutting.
  {
    id: 'story_iris_moonflower',
    npc_id: 'npc_iris',
    title: 'The Moonflower',
    blurb: "A flower in Iris's grove that only blooms when someone is genuinely sad nearby.",
    steps: [
      { heart_min: 3, line: "The moonflower won't bloom yet. It only opens when someone close by is genuinely sad. I can't fake it for it — neither can you." },
      { heart_min: 5, line: "It bloomed last night, just briefly. Someone in the library was crying about a letter. The plant knew before I did." },
      { heart_min: 8, line: "Here. A cutting in your hair. Wear it. It'll close when you're happy, open when you're not. Plants are honest like that." }
    ],
    reward_cosmetic: 'moonflower',
    reward_achievement: 'story_iris_moonflower'
  },
  // V19.1 — Halle the librarian and the secret of page seventeen.
  {
    id: 'story_halle_bookmark',
    npc_id: 'npc_halle',
    title: 'Page Seventeen',
    blurb: "Halle reads exactly one page from a memoir she keeps under the counter — page seventeen, never the others.",
    steps: [
      { heart_min: 3, line: "Page seventeen is the only one I read aloud. The other pages are mine. I'm sorry — it's not personal." },
      { heart_min: 5, line: "The author was my mother. She finished the book three days before she died. Page seventeen was the day I was born." },
      { heart_min: 8, line: "Take this bookmark. It was hers. She used to say a book without a marker is a thought without a place to rest. Find your own page." }
    ],
    reward_cosmetic: 'bookmark',
    reward_achievement: 'story_halle_bookmark'
  }
]

const STORAGE_KEY = 'lounge_npc_stories_v1'

function loadProgress(): Record<string, number> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return {}
    const obj = JSON.parse(raw)
    return (obj && typeof obj === 'object') ? obj : {}
  } catch { return {} }
}
function saveProgress(map: Record<string, number>) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(map)) } catch {}
}

export function getStoryProgress(story_id: string): number {
  const n = loadProgress()[story_id]
  return typeof n === 'number' ? n : 0
}

export function setStoryProgress(story_id: string, step: number) {
  const map = loadProgress()
  map[story_id] = Math.max(0, Math.floor(step))
  saveProgress(map)
}

export function getStoriesForNpc(npc_id: string): NpcStory[] {
  return NPC_STORIES.filter(s => s.npc_id === npc_id)
}

/** Returns the line the NPC should say next given the player's heart with
 *  them, or null if no story applies. Advances progress as a side effect
 *  (so calling twice in a row returns step 1 then step 2 — story moves
 *  forward each NPC click). Last step returns its line and triggers the
 *  reward callback. */
export function consumeStoryStep(
  npc_id: string,
  npcHeart: number,
  onComplete: (story: NpcStory) => void
): string | null {
  const stories = getStoriesForNpc(npc_id)
  for (const story of stories) {
    const progress = getStoryProgress(story.id)
    // Already complete?
    if (progress >= story.steps.length) continue
    const nextStep = story.steps[progress]
    // Gated by heart?
    if (npcHeart < nextStep.heart_min) continue
    // Advance + fire reward if this was the last step.
    setStoryProgress(story.id, progress + 1)
    if (progress + 1 >= story.steps.length) {
      try { onComplete(story) } catch (e) { console.error('[stories] reward failed:', e) }
    }
    return nextStep.line
  }
  return null
}

/** Returns true if the story has been completed (final step shown). */
export function isStoryComplete(story_id: string): boolean {
  const story = NPC_STORIES.find(s => s.id === story_id)
  if (!story) return false
  return getStoryProgress(story.id) >= story.steps.length
}
