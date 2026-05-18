// V17.0 — Local profile state: bio + status + mood + pinned achievements.
// Persists to localStorage and (when the WS is connected) syncs via
// sendProfile. On welcome the server's canonical values overwrite local
// (server is source of truth across devices).

const BIO_KEY = 'lounge_bio_v1'
const STATUS_KEY = 'lounge_status_v1'
const MOOD_KEY = 'lounge_mood_v1'
const PINNED_KEY = 'lounge_pinned_achievements_v1'

export const BIO_MAX_LEN = 140
export const STATUS_MAX_LEN = 60

// Server-side handlers also enforce these — kept here for client-side
// preview/feedback so users see "too long" before submitting.

function readStr(key: string): string {
  try { return localStorage.getItem(key) ?? '' } catch { return '' }
}
function writeStr(key: string, v: string) {
  try {
    if (v.length > 0) localStorage.setItem(key, v)
    else localStorage.removeItem(key)
  } catch {}
}
function readJson<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return fallback
    return JSON.parse(raw) as T
  } catch { return fallback }
}
function writeJson(key: string, v: unknown) {
  try { localStorage.setItem(key, JSON.stringify(v)) } catch {}
}

export function getBio(): string { return readStr(BIO_KEY) }
export function getStatus(): string { return readStr(STATUS_KEY) }
export function getMood(): string { return readStr(MOOD_KEY) }
export function getPinnedAchievements(): string[] {
  const arr = readJson<string[]>(PINNED_KEY, [])
  return Array.isArray(arr) ? arr.slice(0, 3) : []
}

export function setBio(v: string)    { writeStr(BIO_KEY, v.slice(0, BIO_MAX_LEN)) }
export function setStatus(v: string) { writeStr(STATUS_KEY, v.slice(0, STATUS_MAX_LEN)) }
export function setMood(v: string)   { writeStr(MOOD_KEY, Array.from(v).slice(0, 4).join('')) }
export function setPinnedAchievements(ids: string[]) {
  writeJson(PINNED_KEY, ids.slice(0, 3))
}

/** Hydrate local storage from server welcome (server is source of truth on
 *  first connect across devices). Only overwrites when the server value is
 *  non-null — avoids wiping a local-only draft if the player set something
 *  before the welcome landed (rare but possible on slow networks). */
export function applyWelcomeProfile(m: {
  bio?: string | null
  status?: string | null
  mood?: string | null
  pinned_achievements?: string[]
}) {
  if (typeof m.bio === 'string') setBio(m.bio)
  if (typeof m.status === 'string') setStatus(m.status)
  if (typeof m.mood === 'string') setMood(m.mood)
  if (Array.isArray(m.pinned_achievements)) setPinnedAchievements(m.pinned_achievements)
}

// ─── Peer profile cache ────────────────────────────────────────────────
// V17.0 — per-visitor profile data received via snap/join/profile_changed.
// Keyed by visitor_id (not session id) so it survives reconnect. V17.2
// profile-card UI reads from here.

export type PeerProfile = {
  bio: string | null
  status: string | null
  mood: string | null
  pinned_achievements: string[]
}

const peerProfiles = new Map<string, PeerProfile>()

export function cachePeerProfile(visitor_id: string | null | undefined, p: Partial<PeerProfile>) {
  if (!visitor_id) return
  const prev = peerProfiles.get(visitor_id) ?? { bio: null, status: null, mood: null, pinned_achievements: [] }
  peerProfiles.set(visitor_id, {
    bio: 'bio' in p ? (p.bio ?? null) : prev.bio,
    status: 'status' in p ? (p.status ?? null) : prev.status,
    mood: 'mood' in p ? (p.mood ?? null) : prev.mood,
    pinned_achievements: 'pinned_achievements' in p ? (p.pinned_achievements ?? []) : prev.pinned_achievements
  })
}
export function getPeerProfile(visitor_id: string | null | undefined): PeerProfile | null {
  if (!visitor_id) return null
  return peerProfiles.get(visitor_id) ?? null
}
/** Look up by *session* id via a id→visitor_id resolver (RoomScene supplies it). */
export function getPeerProfileBySessionId(
  session_id: string,
  resolveVisitorId: (sid: string) => string | null
): PeerProfile | null {
  return getPeerProfile(resolveVisitorId(session_id))
}
