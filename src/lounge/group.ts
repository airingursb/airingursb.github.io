// V14.0 — Group session client. Subscribes to server-side ephemeral
// multiplayer activities (morning coffee, cook-along, jam, dance, etc.)
// and exposes a tiny observable surface for the activity UIs.
//
// Wire-up: server messages routed via net.ts.onGroupMsg → applyGroupMsg here.

export type GroupKind = 'morning_coffee' | 'cook_along' | 'jam_combo' | 'dance' | 'group_photo' | 'public_event' | 'npc_event'

export type GroupMember = { visitor_id: string; display_name: string | null }

export type GroupSession = {
  id: string
  kind: GroupKind
  room: string
  owner_visitor_id: string | null
  state: Record<string, unknown>
  members: GroupMember[]
  created_at: number
}

type Listener = (s: GroupSession | null) => void

let currentSession: GroupSession | null = null
let lastList: GroupSession[] = []
const listeners = new Set<Listener>()
const listListeners = new Set<(sessions: GroupSession[]) => void>()

export function getCurrentSession(): GroupSession | null { return currentSession }
export function getKnownSessions(): GroupSession[] { return lastList }

export function onSessionChange(fn: Listener): () => void {
  listeners.add(fn); return () => listeners.delete(fn)
}
export function onListChange(fn: (sessions: GroupSession[]) => void): () => void {
  listListeners.add(fn); return () => listListeners.delete(fn)
}

function setSession(s: GroupSession | null) {
  currentSession = s
  for (const l of listeners) l(s)
}
function setList(s: GroupSession[]) {
  lastList = s
  for (const l of listListeners) l(s)
}

/** Called by net.ts whenever a 'group_*' message arrives. */
export function applyGroupMsg(msg: any) {
  if (!msg || typeof msg.t !== 'string') return
  switch (msg.t) {
    case 'group_created':
    case 'group_joined': {
      if (msg.session) setSession(msg.session as GroupSession)
      return
    }
    case 'group_left':
    case 'group_ended': {
      if (currentSession?.id === msg.session_id) setSession(null)
      return
    }
    case 'group_state_update': {
      if (currentSession?.id !== msg.session_id) return
      const next: GroupSession = {
        ...currentSession,
        state: msg.state ?? {},
        members: msg.members ?? currentSession.members
      }
      setSession(next)
      return
    }
    case 'group_member_join': {
      if (currentSession?.id !== msg.session_id) return
      const exists = currentSession.members.some(m => m.visitor_id === msg.visitor_id)
      if (exists) return
      setSession({
        ...currentSession,
        members: [...currentSession.members, { visitor_id: msg.visitor_id, display_name: msg.display_name ?? null }]
      })
      return
    }
    case 'group_member_leave': {
      if (currentSession?.id !== msg.session_id) return
      setSession({
        ...currentSession,
        members: currentSession.members.filter(m => m.visitor_id !== msg.visitor_id)
      })
      return
    }
    case 'group_list_resp': {
      setList((msg.sessions ?? []) as GroupSession[])
      return
    }
  }
}
