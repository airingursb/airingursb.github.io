// V17.0 — Local profile state: bio + status + mood + pinned achievements.
// Persists to localStorage and (when the WS is connected) syncs via
// sendProfile. On welcome the server's canonical values overwrite local
// (server is source of truth across devices).

const BIO_KEY = 'lounge_bio_v1'
const STATUS_KEY = 'lounge_status_v1'
const MOOD_KEY = 'lounge_mood_v1'
const PINNED_KEY = 'lounge_pinned_achievements_v1'
const PINNED_PHOTOS_KEY = 'lounge_pinned_photos_v1'

export type PinnedPhoto = {
  id: string         // matches the local Photo.id
  dataUrl: string    // PNG base64 (small thumbnail — see savePinnedPhotos for size discipline)
  roomLabel: string
  takenAt: number
}

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

export function getPinnedPhotos(): PinnedPhoto[] {
  const arr = readJson<PinnedPhoto[]>(PINNED_PHOTOS_KEY, [])
  return Array.isArray(arr) ? arr.slice(0, 3) : []
}
export function setPinnedPhotos(photos: PinnedPhoto[]) {
  // Cap at 3 entries; let savePinnedPhotos enforce per-entry byte budget.
  writeJson(PINNED_PHOTOS_KEY, photos.slice(0, 3))
}

/** Hydrate local storage from server welcome (server is source of truth on
 *  first connect across devices). V17.5-review I1 fix: any key PRESENT in
 *  the welcome message is authoritative — including explicit nulls, which
 *  represent "user cleared this field on another device". The previous
 *  guard (`typeof === 'string'`) silently skipped nulls and let stale local
 *  values resurface and get re-saved on next edit. */
export function applyWelcomeProfile(m: {
  bio?: string | null
  status?: string | null
  mood?: string | null
  pinned_achievements?: string[] | null
  equipped_cosmetics?: string[] | null
  owned_cosmetics?: string[] | null
}) {
  if ('bio' in m) setBio(m.bio ?? '')
  if ('status' in m) setStatus(m.status ?? '')
  if ('mood' in m) setMood(m.mood ?? '')
  if ('pinned_achievements' in m) {
    setPinnedAchievements(Array.isArray(m.pinned_achievements) ? m.pinned_achievements : [])
  }
  if ('pinned_photos' in (m as any)) {
    const arr = (m as any).pinned_photos
    setPinnedPhotos(Array.isArray(arr) ? arr : [])
  }
  // V18.3 — cosmetics. Server is authoritative across devices.
  if ('equipped_cosmetics' in m || 'owned_cosmetics' in m) {
    void import('./cosmetics').then(c => {
      if ('owned_cosmetics' in m) {
        c.setOwnedCosmetics(Array.isArray(m.owned_cosmetics) ? m.owned_cosmetics : [])
      }
      if ('equipped_cosmetics' in m) {
        c.setEquippedCosmetics(Array.isArray(m.equipped_cosmetics) ? m.equipped_cosmetics : [])
      }
    })
  }
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
  equipped_cosmetics: string[]
  pinned_photos: PinnedPhoto[]
}

const peerProfiles = new Map<string, PeerProfile>()

export function cachePeerProfile(visitor_id: string | null | undefined, p: Partial<PeerProfile>) {
  if (!visitor_id) return
  const prev = peerProfiles.get(visitor_id) ?? { bio: null, status: null, mood: null, pinned_achievements: [], equipped_cosmetics: [], pinned_photos: [] }
  peerProfiles.set(visitor_id, {
    bio: 'bio' in p ? (p.bio ?? null) : prev.bio,
    status: 'status' in p ? (p.status ?? null) : prev.status,
    mood: 'mood' in p ? (p.mood ?? null) : prev.mood,
    pinned_achievements: 'pinned_achievements' in p ? (p.pinned_achievements ?? []) : prev.pinned_achievements,
    equipped_cosmetics: 'equipped_cosmetics' in p ? (p.equipped_cosmetics ?? []) : prev.equipped_cosmetics,
    pinned_photos: 'pinned_photos' in p ? (p.pinned_photos ?? []) : prev.pinned_photos
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
