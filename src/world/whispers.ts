// Curated "whisper" lines — the island/world speaks. Inspired by David
// O'Reilly's Mountain (2014), but tuned for a warm forest-cabin diorama
// rather than a lonely planet. Lines drift in ambiently every 60-180s,
// or trigger on specific events (first visit / dusk / idle / etc).
//
// Keep lines SHORT (≤ 24 zh chars / ≤ 8 en words). Mix Chinese and
// English. Avoid emojis. The island is not chipper — it observes.

export type WhisperTrigger =
  | 'ambient'         // drifts in randomly
  | 'firstVisit'      // user's very first session
  | 'idle'            // mouse hasn't moved for 30s
  | 'dusk'            // user toggled to dusk theme
  | 'cameraReset'     // 3rd+ camera reset in session
  | 'emptyClick'      // 3rd+ click on empty ground
  | 'zoneFocus'       // camera dwells near a work display

export type ZoneId = 'blog' | 'comics' | 'music' | 'reading' | 'chat'

export interface WhisperLine {
  id: string                  // stable id for localStorage dedup
  text: string                // the line itself
  trigger: WhisperTrigger
  zone?: ZoneId               // for zoneFocus only
  weight?: number             // higher = more likely to be picked (default 1)
}

export const LINES: WhisperLine[] = [
  // === Ambient (drift in randomly) — 30 lines ===
  { id: 'a01', text: '风从远处来。',                  trigger: 'ambient' },
  { id: 'a02', text: '云在动。',                      trigger: 'ambient' },
  { id: 'a03', text: 'All things settle.',           trigger: 'ambient' },
  { id: 'a04', text: '今天和昨天一样吗。',            trigger: 'ambient' },
  { id: 'a05', text: '苔藓又厚了一点。',              trigger: 'ambient' },
  { id: 'a06', text: 'I am the island.',             trigger: 'ambient' },
  { id: 'a07', text: '湖水记得每一片落叶。',          trigger: 'ambient' },
  { id: 'a08', text: 'Sometimes I forget I float.',  trigger: 'ambient' },
  { id: 'a09', text: '灯笼今晚要不要点。',            trigger: 'ambient' },
  { id: 'a10', text: 'A bird passed. It was here.',  trigger: 'ambient' },
  { id: 'a11', text: '树根伸向虚空。',                trigger: 'ambient' },
  { id: 'a12', text: 'Becoming.',                    trigger: 'ambient' },
  { id: 'a13', text: '鸭子从来不问为什么。',          trigger: 'ambient' },
  { id: 'a14', text: 'The wind has many names.',     trigger: 'ambient' },
  { id: 'a15', text: '石头比我有耐心。',              trigger: 'ambient' },
  { id: 'a16', text: 'Briefly, joy.',                trigger: 'ambient' },
  { id: 'a17', text: '蘑菇也是会做梦的。',            trigger: 'ambient' },
  { id: 'a18', text: 'I dreamt of a city once.',     trigger: 'ambient' },
  { id: 'a19', text: 'Airing 在火堆边发呆。',         trigger: 'ambient' },
  { id: 'a20', text: 'Everything is on its way.',    trigger: 'ambient' },
  { id: 'a21', text: '瀑布从早到晚不停说话。',        trigger: 'ambient' },
  { id: 'a22', text: 'I am old. I am also new.',     trigger: 'ambient' },
  { id: 'a23', text: '野花开了，没人看到。',          trigger: 'ambient' },
  { id: 'a24', text: '今天有访客。',                  trigger: 'ambient' },
  { id: 'a25', text: 'Listen.',                      trigger: 'ambient' },
  { id: 'a26', text: '时间在这里走得慢。',            trigger: 'ambient' },
  { id: 'a27', text: 'Memory is a kind of weather.', trigger: 'ambient' },
  { id: 'a28', text: '蝴蝶停在过去的某一刻。',        trigger: 'ambient' },
  { id: 'a29', text: '我曾经也是一颗种子。',          trigger: 'ambient' },
  { id: 'a30', text: 'Even silence has a shape.',    trigger: 'ambient' },

  // === First visit ===
  { id: 'fv1', text: '你来了。',                                   trigger: 'firstVisit', weight: 4 },
  { id: 'fv2', text: '在这里，你不必做什么。',                     trigger: 'firstVisit', weight: 2 },
  { id: 'fv3', text: 'Welcome. Stay as long as you like.',         trigger: 'firstVisit', weight: 2 },
  { id: 'fv4', text: '随便看看，灯一直亮着。',                     trigger: 'firstVisit', weight: 1 },

  // === Idle (mouse hasn't moved for 30s+) ===
  { id: 'id1', text: '你在想什么。',                trigger: 'idle' },
  { id: 'id2', text: '可以待久一点。',              trigger: 'idle' },
  { id: 'id3', text: 'Take your time.',            trigger: 'idle' },
  { id: 'id4', text: '我们并不忙。',                trigger: 'idle' },
  { id: 'id5', text: '看，光又移动了。',            trigger: 'idle' },
  { id: 'id6', text: 'What if we just stay.',      trigger: 'idle' },
  { id: 'id7', text: '你来了多久了。',              trigger: 'idle' },
  { id: 'id8', text: '不急。',                      trigger: 'idle' },

  // === Dusk (when user toggles to dusk theme) ===
  { id: 'du1', text: '天慢慢黑了。',                 trigger: 'dusk' },
  { id: 'du2', text: 'Evening has a smell.',         trigger: 'dusk' },
  { id: 'du3', text: '日落的颜色不属于任何人。',     trigger: 'dusk' },
  { id: 'du4', text: '篝火该点了。',                 trigger: 'dusk' },
  { id: 'du5', text: 'I love this time of day.',     trigger: 'dusk' },
  { id: 'du6', text: '影子比白天更诚实。',           trigger: 'dusk' },

  // === Camera reset (≥ 3rd reset — user is searching for something) ===
  { id: 'cr1', text: '再看一遍？',                       trigger: 'cameraReset' },
  { id: 'cr2', text: 'Same view, different moment.',     trigger: 'cameraReset' },
  { id: 'cr3', text: '也行。',                           trigger: 'cameraReset' },
  { id: 'cr4', text: 'Maybe the angle isn’t it.',   trigger: 'cameraReset' },

  // === Empty-ground clicks (≥ 3 clicks on nothing) ===
  { id: 'ec1', text: '那里什么也没有。',                  trigger: 'emptyClick' },
  { id: 'ec2', text: 'Were you looking for something?',   trigger: 'emptyClick' },
  { id: 'ec3', text: '也许在别的地方。',                  trigger: 'emptyClick' },
  { id: 'ec4', text: 'Try the cabin.',                    trigger: 'emptyClick' },

  // === Zone focus (camera dwells near a display board for 5s+) ===
  { id: 'zfb', text: '那些字是我写的。也不是。',          trigger: 'zoneFocus', zone: 'blog' },
  { id: 'zfc', text: '四格里有最近的我。',                trigger: 'zoneFocus', zone: 'comics' },
  { id: 'zfm', text: '今晚还是想单曲循环。',              trigger: 'zoneFocus', zone: 'music' },
  { id: 'zfr', text: '别人的句子，借来用一下。',          trigger: 'zoneFocus', zone: 'reading' },
]

const SEEN_KEY = 'world-whispers-seen-v1'

function readSeen(): Set<string> {
  if (typeof window === 'undefined') return new Set()
  try {
    const raw = localStorage.getItem(SEEN_KEY)
    if (!raw) return new Set()
    return new Set(JSON.parse(raw) as string[])
  } catch {
    return new Set()
  }
}

function writeSeen(set: Set<string>) {
  if (typeof window === 'undefined') return
  try { localStorage.setItem(SEEN_KEY, JSON.stringify(Array.from(set))) } catch {}
}

/**
 * Pick a whisper matching the given trigger (+ optional zone).
 * Prefers lines we haven't shown recently — resets the "seen" set
 * when all matching lines have been seen so the same line never
 * repeats until the rest are exhausted.
 */
export function pickWhisper(trigger: WhisperTrigger, zone?: ZoneId): WhisperLine | null {
  const pool = LINES.filter(l => l.trigger === trigger && (!zone || l.zone === zone))
  if (pool.length === 0) return null
  let seen = readSeen()
  let candidates = pool.filter(l => !seen.has(l.id))
  if (candidates.length === 0) {
    // exhausted — reset only the entries for this trigger
    pool.forEach(l => seen.delete(l.id))
    writeSeen(seen)
    candidates = pool
  }
  // Weighted random
  const totalWeight = candidates.reduce((s, l) => s + (l.weight ?? 1), 0)
  let r = Math.random() * totalWeight
  for (const c of candidates) {
    r -= c.weight ?? 1
    if (r <= 0) {
      seen.add(c.id)
      writeSeen(seen)
      return c
    }
  }
  const fallback = candidates[candidates.length - 1]
  seen.add(fallback.id)
  writeSeen(seen)
  return fallback
}

export function hasVisitedBefore(): boolean {
  if (typeof window === 'undefined') return true
  try { return !!localStorage.getItem('world-visited-v1') } catch { return true }
}

export function markVisited() {
  if (typeof window === 'undefined') return
  try { localStorage.setItem('world-visited-v1', String(Date.now())) } catch {}
}
