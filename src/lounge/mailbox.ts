// V8.6 — Home mailbox + NPC mail.
//
// Distinct from V5.1 user-letters (which are dropped on world tiles by
// players). NPC mail is system-generated: festival invites, quest
// follow-ups, friendship milestones, daily-visit notes from Pip.
// Stored client-side in localStorage; future V8.6.1 will sync via Supabase.

import { getActiveFestival } from './festivals'
import { getQuestState, QUESTS } from './quests'

export type NpcMail = {
  id: string
  from_npc_id: string
  from_npc_name: string
  subject: string
  body: string
  sent_at: number       // ms timestamp when it was generated/dropped
  read: boolean
  kind: 'festival' | 'quest' | 'friendship' | 'welcome' | 'general' | 'friend_activity'
}

const STORAGE_KEY = 'lounge_npc_mail_v1'
const SEEDED_KEY  = 'lounge_npc_mail_seeded_v1'   // YYYY-MM-DD list of seedings already done

const MAX_MAIL = 60

function loadAll(): NpcMail[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) as NpcMail[] : []
  } catch { return [] }
}

function saveAll(arr: NpcMail[]) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(arr.slice(0, MAX_MAIL))) } catch {}
}

export function listMail(): NpcMail[] { return loadAll() }
export function unreadCount(): number { return loadAll().filter(m => !m.read).length }
export function markRead(id: string) {
  const arr = loadAll()
  const m = arr.find(x => x.id === id)
  if (m && !m.read) { m.read = true; saveAll(arr) }
}
export function deleteMail(id: string) { saveAll(loadAll().filter(m => m.id !== id)) }

function addMail(m: Omit<NpcMail, 'id' | 'sent_at' | 'read'>): NpcMail {
  const mail: NpcMail = {
    id: 'mail_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 6),
    sent_at: Date.now(), read: false,
    ...m
  }
  saveAll([mail, ...loadAll()])
  return mail
}

// V10.6 — friend-activity notifications.
//
// Three event kinds map into one mail row each:
//   - 'online'      : friend just joined any room (we see their JoinMsg)
//   - 'home_visit'  : friend entered the player's Home room
//   - 'sent_letter' : friend dropped a letter (we see LetterAppearedMsg)
//
// Throttling: same friend × same kind throttled to once per 30 minutes so a
// friend bouncing between rooms doesn't spam the mailbox.

const FRIEND_NOTIFS_ENABLED_KEY = 'lounge_friend_notifs_enabled_v1'
const FRIEND_NOTIFS_THROTTLE_KEY = 'lounge_friend_notifs_throttle_v1'
const THROTTLE_MS = 30 * 60_000

export type FriendActivityKind = 'online' | 'home_visit' | 'sent_letter'

export function isFriendNotifsEnabled(): boolean {
  try { return localStorage.getItem(FRIEND_NOTIFS_ENABLED_KEY) !== '0' } catch { return true }
}
export function setFriendNotifsEnabled(on: boolean) {
  try { localStorage.setItem(FRIEND_NOTIFS_ENABLED_KEY, on ? '1' : '0') } catch {}
}

function shouldFireForFriend(friendId: string, kind: FriendActivityKind): boolean {
  try {
    const raw = localStorage.getItem(FRIEND_NOTIFS_THROTTLE_KEY) || '{}'
    const map = JSON.parse(raw) as Record<string, number>
    const key = `${friendId}:${kind}`
    const last = map[key] ?? 0
    if (Date.now() - last < THROTTLE_MS) return false
    map[key] = Date.now()
    localStorage.setItem(FRIEND_NOTIFS_THROTTLE_KEY, JSON.stringify(map))
    return true
  } catch { return true }
}

export function notifyFriendActivity(opts: {
  friend_id: string
  friend_name: string | null
  kind: FriendActivityKind
}) {
  if (!isFriendNotifsEnabled()) return
  if (!shouldFireForFriend(opts.friend_id, opts.kind)) return
  const name = opts.friend_name?.trim() || 'A friend'
  const map: Record<FriendActivityKind, { subject: string; body: string }> = {
    online: {
      subject: `${name} just came online`,
      body: `${name} is in the lounge. Drop by and say hi.`
    },
    home_visit: {
      subject: `${name} dropped by your Home`,
      body: `${name} let themselves into your Home. Hope you tidied.`
    },
    sent_letter: {
      subject: `${name} left you a letter`,
      body: `${name} just dropped a note for you. Check the world.`
    }
  }
  const { subject, body } = map[opts.kind]
  addMail({
    from_npc_id: opts.friend_id, from_npc_name: name,
    subject, body, kind: 'friend_activity'
  })
}

function loadSeeded(): string[] {
  try {
    const raw = localStorage.getItem(SEEDED_KEY)
    return raw ? JSON.parse(raw) as string[] : []
  } catch { return [] }
}
function markSeeded(key: string) {
  const arr = loadSeeded(); if (arr.indexOf(key) !== -1) return
  arr.push(key); try { localStorage.setItem(SEEDED_KEY, JSON.stringify(arr.slice(-60))) } catch {}
}
function isSeeded(key: string): boolean { return loadSeeded().indexOf(key) !== -1 }

/** Generate any mail that should land based on current state.
 *  Idempotent per (kind + day) — runs every scene boot but only seeds once. */
export function seedMailForToday(opts: {
  isFirstEverVisit?: boolean
  friendships?: Map<string, { level: number; display_name?: string | null }>
}) {
  const todayUtc = new Date().toISOString().slice(0, 10)

  // 1. Welcome from Pip (first-ever visit, regardless of date)
  if (opts.isFirstEverVisit && !isSeeded('welcome_pip')) {
    addMail({
      from_npc_id: 'npc_pip', from_npc_name: 'Pip',
      subject: 'Welcome to the lounge!',
      body: 'Hi traveler — Pip here. Drop by the Lobby anytime. Your mailbox lives in Home; festival invites and friend-letters land here.',
      kind: 'welcome'
    })
    markSeeded('welcome_pip')
  }

  // 2. Active festival invite from the festival's host NPC
  const fest = getActiveFestival()
  const festKey = fest ? `festival_${fest.id}_${todayUtc}` : null
  if (fest && festKey && !isSeeded(festKey)) {
    // Assign giver heuristic by host room
    const giverByRoom: Record<string, { id: string; name: string }> = {
      room_lobby:   { id: 'npc_pip',   name: 'Pip' },
      room_beach:   { id: 'npc_sora',  name: 'Sora' },
      room_grove:   { id: 'npc_theo',  name: 'Theo' },
      room_library: { id: 'npc_halle', name: 'Halle' }
    }
    const giver = giverByRoom[fest.host_room] ?? { id: 'npc_pip', name: 'Pip' }
    addMail({
      from_npc_id: giver.id, from_npc_name: giver.name,
      subject: `${fest.emoji} ${fest.name} today`,
      body: fest.blurb + ' Come hang out — bring a friend.',
      kind: 'festival'
    })
    markSeeded(festKey)
  }

  // 3. Quest follow-up: any completed quest you haven't been mailed about
  for (const q of QUESTS) {
    const st = getQuestState(q.id)
    if (!st.completed) continue
    const key = `quest_done_${q.id}`
    if (isSeeded(key)) continue
    const giverName = q.giver_npc.replace('npc_', '').replace(/^./, c => c.toUpperCase())
    addMail({
      from_npc_id: q.giver_npc, from_npc_name: giverName,
      subject: `Thanks for "${q.title}"`,
      body: `Thanks for finishing that. Your reward: ${q.reward}. — ${giverName}`,
      kind: 'quest'
    })
    markSeeded(key)
  }

  // 4. Friendship milestones — when any NPC reaches lv 2 for the first time
  if (opts.friendships) {
    for (const [npcId, fr] of opts.friendships) {
      if (fr.level < 2) continue
      const key = `friend_lv2_${npcId}`
      if (isSeeded(key)) continue
      addMail({
        from_npc_id: npcId,
        from_npc_name: fr.display_name ?? npcId.replace('npc_', '').replace(/^./, c => c.toUpperCase()),
        subject: 'I owe you a coffee.',
        body: "We've crossed paths enough that you feel like a regular. Stop by anytime.",
        kind: 'friendship'
      })
      markSeeded(key)
    }
  }
}
