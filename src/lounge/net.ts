import { WS_URL, PROTOCOL_VERSION, DEFAULT_ROOM, getOrCreateVisitorId, getMyCC, getMySpecies, type RoomId } from './config'

export type SnapMsg = {
  v: number
  t: 'snap'
  you: string
  peers: Array<{ id: string; x: number; y: number; cc: string | null; state: string; room: RoomId; display_name?: string | null; visitor_id?: string | null; species?: string; pet_species?: string | null; pet_name?: string | null }>
}
export type JoinMsg = { v: number; t: 'join'; id: string; x: number; y: number; cc: string | null; state: string; room: RoomId; display_name?: string | null; visitor_id?: string | null; species?: string; pet_species?: string | null; pet_name?: string | null }
export type SpeciesChangedMsg = { v: number; t: 'species_changed'; id: string; species: string }
// V17.0 — server broadcasts when a peer changes bio/status/mood/pinned
// V18.3 — extended with equipped_cosmetics (owned is private to self)
export type ProfileChangedMsg = {
  v: number; t: 'profile_changed'; id: string
  bio: string | null
  status: string | null
  mood: string | null
  pinned_achievements: string[]
  equipped_cosmetics?: string[]
  pinned_photos?: Array<{ id: string; dataUrl: string; roomLabel: string; takenAt: number }>
}
// V17.5-review — explicit ack/fail so the client can show a truthful toast
// V18.3 — also carries cosmetic state back so client can reconcile
export type ProfileOkMsg = {
  v: number; t: 'profile_ok'
  bio: string | null; status: string | null
  mood: string | null; pinned_achievements: string[]
  equipped_cosmetics?: string[]
  owned_cosmetics?: string[]
}
export type ProfileFailedMsg = {
  v: number; t: 'profile_failed'; reason: string; retry_after_ms?: number
}
// V20.3 — photo reactions
export type PhotoReactionsMsg = {
  v: number; t: 'photo_reactions'
  owner_visitor_id: string; photo_id: string
  reactions: Array<{ emoji: string; count: number; mine: boolean }>
}
export type PhotoReactionsInvalidatedMsg = {
  v: number; t: 'photo_reactions_invalidated'
  owner_visitor_id: string; photo_id: string
}
export type LeaveMsg = { v: number; t: 'leave'; id: string; room: RoomId }
export type PosMsg = { v: number; t: 'pos'; id: string; x: number; y: number; vx?: number; vy?: number; state: string; room: RoomId }
export type ActMsg = { v: number; t: 'act'; id: string; verb: string; text?: string; room: RoomId }
export type FullMsg = { v: number; t: 'full' }
export type FriendshipEntry = {
  friend_id: string
  display_name: string | null
  score: number
  level: number
}
export type WelcomeMsg = {
  v: number; t: 'welcome'
  visitor_id: string | null
  display_name: string | null
  last_room: RoomId | null
  last_x: number | null
  last_y: number | null
  region: string
  inventory?: string[]
  friendships?: FriendshipEntry[]
  gifts_received?: GiftEntry[]
  unread_dm_count?: number
  my_home_room?: string | null
  my_home_decorations?: HomeDecoration[]
  // P7 — HMAC token for authenticated PUT to /api/lounge/progress
  progress_token?: string | null
  // E5-P0c — server's canonical species for this visitor (lounge_visitors.species)
  species?: string
}
export type CollectedMsg = { v: number; t: 'collected'; item_id: string; newly: boolean }
export type FriendUpdateMsg = { v: number; t: 'friend_update'; friend_id: string; score: number; level: number }
export type GiftEntry = { id: number; from_visitor: string; from_name: string | null; item_id: string; sent_at: string }
export type GiftSentOkMsg = { v: number; t: 'gift_sent_ok'; to: string; item_id: string }
export type GiftFailedMsg = { v: number; t: 'gift_failed'; reason: string }
export type GiftReceivedMsg = { v: number; t: 'gift_received'; from: string; from_name: string | null; item_id: string; sent_at: string }
export type DmEntry = { id: number; from_visitor: string; to_visitor: string; message: string; sent_at: string; read_at: string | null }
export type DmSentOkMsg = { v: number; t: 'dm_sent_ok'; id: number; to: string; text: string; sent_at: string }
export type DmFailedMsg = { v: number; t: 'dm_failed'; reason: string }
export type DmReceivedMsg = { v: number; t: 'dm_received'; id: number; from: string; from_name: string | null; text: string; sent_at: string }
export type DmThreadMsg = { v: number; t: 'dm_thread'; other: string; messages: DmEntry[] }
export type DmReadAckMsg = { v: number; t: 'dm_read_ack'; from: string }
export type HomeDecoration = { item_id: string; x: number; y: number }
export type PlaceOkMsg = { v: number; t: 'place_ok'; item_id: string; x: number; y: number }
export type PlaceFailedMsg = { v: number; t: 'place_failed'; reason: string }
export type PickupOkMsg = { v: number; t: 'pickup_ok'; item_id: string }
export type PickupFailedMsg = { v: number; t: 'pickup_failed'; reason: string }
export type HomeDecorationBroadcast = { v: number; t: 'home_decoration'; owner: string; action: 'place' | 'pickup'; item_id: string; x?: number; y?: number }
export type HomeDecorationsResponseMsg = { v: number; t: 'home_decorations'; owner_visitor_id: string; decorations: HomeDecoration[] }
export type JamTapMsg = { v: number; t: 'jam_tap'; id: string; visitor_id: string | null; pad_index: number; cc: string | null; region: string }
export type JamBurstMsg = { v: number; t: 'jam_burst'; tier: 'jam' | 'circle' | 'full'; distinct_visitors: number; distinct_pads: number; bonus_per_pair: number; awarded_pairs: number }
export type LetterEntry = { id: number; author_visitor_id: string; author_name: string | null; x: number; y: number; content: string; dropped_at: string; eternal?: boolean }
export type LetterDropOkMsg = { v: number; t: 'letter_drop_ok'; id: number; x: number; y: number; content: string; dropped_at: string; eternal?: boolean }
export type LetterDropFailedMsg = { v: number; t: 'letter_drop_failed'; reason: string }
export type LetterAppearedMsg = { v: number; t: 'letter_appeared'; id: number; author_visitor_id: string; author_name: string | null; room: string; x: number; y: number; content: string; dropped_at: string; eternal?: boolean }
export type LettersInRoomMsg = { v: number; t: 'letters_in_room'; room: string; letters: LetterEntry[] }
export type WishCategory = 'sprite' | 'room' | 'dialog' | 'other'
export type WishEntry = { id: number; author_visitor_id: string; author_name: string | null; category: WishCategory; content: string; submitted_at: string; vote_count: number; voted_by_me: boolean }
export type WishesListMsg = { v: number; t: 'wishes_list'; wishes: WishEntry[] }
export type WishSubmitOkMsg = { v: number; t: 'wish_submit_ok'; id: number; category: WishCategory; content: string; submitted_at: string }
export type WishVoteOkMsg = { v: number; t: 'wish_vote_ok'; wish_id: number; voted: boolean }
export type WishFailedMsg = { v: number; t: 'wish_failed'; reason: string }
export type NameChangedMsg = { v: number; t: 'name_changed'; id: string; display_name: string }
export type ReplacedMsg = { v: number; t: 'replaced' }
export type ErrorMsg = { v: number; t: 'error'; reason: string; detail?: string }

export type ServerMsg = SnapMsg | JoinMsg | LeaveMsg | PosMsg | ActMsg | FullMsg
  | WelcomeMsg | NameChangedMsg | SpeciesChangedMsg | ReplacedMsg | ErrorMsg | CollectedMsg | FriendUpdateMsg
  | GiftSentOkMsg | GiftFailedMsg | GiftReceivedMsg
  | DmSentOkMsg | DmFailedMsg | DmReceivedMsg | DmThreadMsg | DmReadAckMsg
  | PlaceOkMsg | PlaceFailedMsg | PickupOkMsg | PickupFailedMsg
  | HomeDecorationBroadcast | HomeDecorationsResponseMsg
  | JamTapMsg | JamBurstMsg
  | LetterDropOkMsg | LetterDropFailedMsg | LetterAppearedMsg | LettersInRoomMsg
  | WishesListMsg | WishSubmitOkMsg | WishVoteOkMsg | WishFailedMsg

export type NetCallbacks = {
  onSnap: (m: SnapMsg) => void
  onJoin: (m: JoinMsg) => void
  onLeave: (m: LeaveMsg) => void
  onPos: (m: PosMsg) => void
  onAct: (m: ActMsg) => void
  onFull: () => void
  onConnectionChange: (state: 'connecting' | 'open' | 'closed') => void
  onWelcome?: (m: WelcomeMsg) => void
  onNameChanged?: (m: NameChangedMsg) => void
  onSpeciesChanged?: (m: SpeciesChangedMsg) => void
  onProfileChanged?: (m: ProfileChangedMsg) => void
  onProfileOk?: (m: ProfileOkMsg) => void
  onProfileFailed?: (m: ProfileFailedMsg) => void
  onPhotoReactions?: (m: PhotoReactionsMsg) => void
  onPhotoReactionsInvalidated?: (m: PhotoReactionsInvalidatedMsg) => void
  onReplaced?: () => void
  onError?: (m: ErrorMsg) => void
  onCollected?: (m: CollectedMsg) => void
  onFriendUpdate?: (m: FriendUpdateMsg) => void
  onGiftSentOk?: (m: GiftSentOkMsg) => void
  onGiftFailed?: (m: GiftFailedMsg) => void
  onGiftReceived?: (m: GiftReceivedMsg) => void
  onDmSentOk?: (m: DmSentOkMsg) => void
  onDmFailed?: (m: DmFailedMsg) => void
  onDmReceived?: (m: DmReceivedMsg) => void
  onDmThread?: (m: DmThreadMsg) => void
  onDmReadAck?: (m: DmReadAckMsg) => void
  onPlaceOk?: (m: PlaceOkMsg) => void
  onPlaceFailed?: (m: PlaceFailedMsg) => void
  onPickupOk?: (m: PickupOkMsg) => void
  onPickupFailed?: (m: PickupFailedMsg) => void
  onHomeDecoration?: (m: HomeDecorationBroadcast) => void
  onHomeDecorations?: (m: HomeDecorationsResponseMsg) => void
  onJamTap?: (m: JamTapMsg) => void
  onJamBurst?: (m: JamBurstMsg) => void
  onLetterDropOk?: (m: LetterDropOkMsg) => void
  onLetterDropFailed?: (m: LetterDropFailedMsg) => void
  onLetterAppeared?: (m: LetterAppearedMsg) => void
  onLettersInRoom?: (m: LettersInRoomMsg) => void
  onWishesList?: (m: WishesListMsg) => void
  onWishSubmitOk?: (m: WishSubmitOkMsg) => void
  onWishVoteOk?: (m: WishVoteOkMsg) => void
  onWishFailed?: (m: WishFailedMsg) => void
}

let ws: WebSocket | null = null
let backoff = 1000
let cb: NetCallbacks | null = null
let initialRoom: RoomId = DEFAULT_ROOM
let replaced = false   // set true on `replaced` msg or close code 4001; stops auto-reconnect

/**
 * Connect to lounge WebSocket. Idempotent — if a socket is already
 * connecting/open, this just updates the callbacks without opening a new one.
 * Use sendRoomChange() to transition the existing socket to another room.
 */
export function connect(callbacks: NetCallbacks, room: RoomId = DEFAULT_ROOM) {
  cb = callbacks
  initialRoom = room
  if (ws && (ws.readyState === WebSocket.CONNECTING || ws.readyState === WebSocket.OPEN)) {
    cb?.onConnectionChange(ws.readyState === WebSocket.OPEN ? 'open' : 'connecting')
    return
  }
  openSocket()
}

function openSocket() {
  if (replaced) return
  cb?.onConnectionChange('connecting')
  try { ws = new WebSocket(WS_URL) } catch { scheduleReconnect(); return }

  ws.addEventListener('open', () => {
    backoff = 1000
    cb?.onConnectionChange('open')
    // V10.8c — relay pet info so peers can render each other's pets.
    // Server treats both fields as opaque relay (validates pet_species against
    // ['kitten','puppy','bunny'] for safety).
    let pet_species: string | null = null
    let pet_name: string | null = null
    try {
      const raw = localStorage.getItem('lounge_pet_v1')
      if (raw) {
        const p = JSON.parse(raw)
        if (p?.species && ['kitten','puppy','bunny'].includes(p.species)) {
          pet_species = p.species
          pet_name = typeof p.name === 'string' ? p.name.slice(0, 16) : null
        }
      }
    } catch {}
    ws!.send(JSON.stringify({
      v: PROTOCOL_VERSION,
      t: 'hi',
      cc: getMyCC(),
      visitor_id: getOrCreateVisitorId(),
      room: initialRoom,
      // E5-P0c — server treats local pref as a hint; DB value is canonical
      species: getMySpecies(),
      pet_species, pet_name
    }))
  })

  ws.addEventListener('message', (e) => {
    let msg: ServerMsg
    try { msg = JSON.parse(e.data) } catch { return }
    if (msg.t === 'snap') cb?.onSnap(msg)
    else if (msg.t === 'join') cb?.onJoin(msg)
    else if (msg.t === 'leave') cb?.onLeave(msg)
    else if (msg.t === 'pos') cb?.onPos(msg)
    else if (msg.t === 'act') cb?.onAct(msg)
    else if (msg.t === 'full') cb?.onFull()
    else if (msg.t === 'welcome') cb?.onWelcome?.(msg)
    else if (msg.t === 'name_changed') cb?.onNameChanged?.(msg)
    else if (msg.t === 'species_changed') cb?.onSpeciesChanged?.(msg)
    else if (msg.t === 'profile_changed') cb?.onProfileChanged?.(msg)
    else if (msg.t === 'profile_ok') cb?.onProfileOk?.(msg)
    else if (msg.t === 'profile_failed') cb?.onProfileFailed?.(msg)
    else if (msg.t === 'photo_reactions') cb?.onPhotoReactions?.(msg)
    else if (msg.t === 'photo_reactions_invalidated') cb?.onPhotoReactionsInvalidated?.(msg)
    else if (msg.t === 'replaced') {
      replaced = true
      cb?.onReplaced?.()
    }
    else if (msg.t === 'error') cb?.onError?.(msg)
    else if (msg.t === 'collected') cb?.onCollected?.(msg)
    else if (msg.t === 'friend_update') cb?.onFriendUpdate?.(msg)
    else if (msg.t === 'gift_sent_ok') cb?.onGiftSentOk?.(msg)
    else if (msg.t === 'gift_failed') cb?.onGiftFailed?.(msg)
    else if (msg.t === 'gift_received') cb?.onGiftReceived?.(msg)
    else if (msg.t === 'dm_sent_ok') cb?.onDmSentOk?.(msg)
    else if (msg.t === 'dm_failed') cb?.onDmFailed?.(msg)
    else if (msg.t === 'dm_received') cb?.onDmReceived?.(msg)
    else if (msg.t === 'dm_thread') cb?.onDmThread?.(msg)
    else if (msg.t === 'dm_read_ack') cb?.onDmReadAck?.(msg)
    else if (msg.t === 'place_ok') cb?.onPlaceOk?.(msg)
    else if (msg.t === 'place_failed') cb?.onPlaceFailed?.(msg)
    else if (msg.t === 'pickup_ok') cb?.onPickupOk?.(msg)
    else if (msg.t === 'pickup_failed') cb?.onPickupFailed?.(msg)
    else if (msg.t === 'home_decoration') cb?.onHomeDecoration?.(msg)
    else if (msg.t === 'home_decorations') cb?.onHomeDecorations?.(msg)
    else if (msg.t === 'jam_tap') cb?.onJamTap?.(msg)
    else if (msg.t === 'jam_burst') cb?.onJamBurst?.(msg)
    else if (msg.t === 'letter_drop_ok') cb?.onLetterDropOk?.(msg)
    else if (msg.t === 'letter_drop_failed') cb?.onLetterDropFailed?.(msg)
    else if (msg.t === 'letter_appeared') cb?.onLetterAppeared?.(msg)
    else if (msg.t === 'letters_in_room') cb?.onLettersInRoom?.(msg)
    else if (msg.t === 'wishes_list') cb?.onWishesList?.(msg)
    else if (msg.t === 'wish_submit_ok') cb?.onWishSubmitOk?.(msg)
    else if (msg.t === 'wish_vote_ok') cb?.onWishVoteOk?.(msg)
    else if (msg.t === 'wish_failed') cb?.onWishFailed?.(msg)
    // V14.0 — group session protocol. Route to group.ts.
    else if (typeof msg.t === 'string' && msg.t.startsWith('group_')) {
      void import('./group').then(g => g.applyGroupMsg(msg))
    }
  })

  ws.addEventListener('close', (ev) => {
    if (ev.code === 4001) {
      replaced = true
      cb?.onReplaced?.()
      cb?.onConnectionChange('closed')
      return
    }
    scheduleReconnect()
  })
  ws.addEventListener('error', () => {})
}

function scheduleReconnect() {
  ws = null
  cb?.onConnectionChange('closed')
  if (replaced) return
  setTimeout(openSocket, backoff)
  backoff = Math.min(backoff * 2, 30_000)
}

let lastSentT = 0
const lastSent = { x: -1, y: -1, state: '', room: '' as RoomId | '' }

export function sendPos(x: number, y: number, state: string, vx: number, vy: number, room: RoomId) {
  if (!ws || ws.readyState !== 1) return
  const t = performance.now()
  if (t - lastSentT < 100) return
  if (
    Math.abs(x - lastSent.x) < 0.5 &&
    Math.abs(y - lastSent.y) < 0.5 &&
    state === lastSent.state &&
    room === lastSent.room
  ) {
    return
  }
  lastSentT = t
  lastSent.x = x; lastSent.y = y; lastSent.state = state; lastSent.room = room
  ws.send(JSON.stringify({ v: PROTOCOL_VERSION, t: 'pos', x, y, vx, vy, state, room }))
}

/** Trigger a room change on the server: send a pos update with new room. */
export function sendRoomChange(room: RoomId) {
  if (!ws || ws.readyState !== 1) return
  lastSent.room = ''
  ws.send(JSON.stringify({ v: PROTOCOL_VERSION, t: 'pos', x: 0, y: 0, vx: 0, vy: 0, state: 'idle', room }))
}

export function sendAct(verb: string, text?: string, room: RoomId = DEFAULT_ROOM, target?: string) {
  if (!ws || ws.readyState !== 1) return
  const msg: { v: number; t: 'act'; verb: string; text?: string; room: RoomId; target?: string } = { v: PROTOCOL_VERSION, t: 'act', verb, room }
  if (text != null) msg.text = text
  if (target) msg.target = target
  ws.send(JSON.stringify(msg))
}

export function sendName(name: string) {
  if (!ws || ws.readyState !== 1) return
  ws.send(JSON.stringify({ v: PROTOCOL_VERSION, t: 'name', display_name: name }))
}

// E5-P0c — notify server when player toggles species
export function sendSpecies(species: string) {
  if (!ws || ws.readyState !== 1) return
  ws.send(JSON.stringify({ v: PROTOCOL_VERSION, t: 'species', species }))
}

// V18.6-review C3 — let UI guard against actions that lose state if WS is
// down (e.g. shop purchases that spend shells before syncing).
export function isLoungeConnected(): boolean {
  return !!ws && ws.readyState === 1
}

// V20.3 — toggle / request photo reactions
export function sendPhotoReact(owner_visitor_id: string, photo_id: string, emoji: string) {
  if (!ws || ws.readyState !== 1) return
  ws.send(JSON.stringify({ v: PROTOCOL_VERSION, t: 'photo_react', owner_visitor_id, photo_id, emoji }))
}
export function sendPhotoReactionsRequest(owner_visitor_id: string, photo_ids: string[]) {
  if (!ws || ws.readyState !== 1) return
  ws.send(JSON.stringify({ v: PROTOCOL_VERSION, t: 'photo_reactions_request', owner_visitor_id, photo_ids }))
}

// V17.0 — push profile fields (bio/status/mood/pinned_achievements). Any
// undefined field is omitted so partial updates are supported.
// V18.3 — extended with equipped_cosmetics + owned_cosmetics.
// V20.0 — extended with pinned_photos (small thumbnails for profile card).
export function sendProfile(patch: {
  bio?: string | null
  status?: string | null
  mood?: string | null
  pinned_achievements?: string[]
  equipped_cosmetics?: string[]
  owned_cosmetics?: string[]
  pinned_photos?: Array<{ id: string; dataUrl: string; roomLabel: string; takenAt: number }>
}) {
  if (!ws || ws.readyState !== 1) return
  const msg: Record<string, unknown> = { v: PROTOCOL_VERSION, t: 'profile' }
  for (const [k, v] of Object.entries(patch)) if (v !== undefined) msg[k] = v
  ws.send(JSON.stringify(msg))
}

export function sendCollect(item_id: string) {
  if (!ws || ws.readyState !== 1) return
  ws.send(JSON.stringify({ v: PROTOCOL_VERSION, t: 'collect', item_id }))
}

export function sendGift(to: string, item_id: string) {
  if (!ws || ws.readyState !== 1) return
  ws.send(JSON.stringify({ v: PROTOCOL_VERSION, t: 'gift', to, item_id }))
}

export function sendDm(to: string, text: string) {
  if (!ws || ws.readyState !== 1) return
  ws.send(JSON.stringify({ v: PROTOCOL_VERSION, t: 'dm', to, text }))
}

export function requestDmThread(other: string) {
  if (!ws || ws.readyState !== 1) return
  ws.send(JSON.stringify({ v: PROTOCOL_VERSION, t: 'dm_thread', other }))
}

export function sendDmRead(from: string) {
  if (!ws || ws.readyState !== 1) return
  ws.send(JSON.stringify({ v: PROTOCOL_VERSION, t: 'dm_read', from }))
}

export function sendPlace(item_id: string, x: number, y: number) {
  if (!ws || ws.readyState !== 1) return
  ws.send(JSON.stringify({ v: PROTOCOL_VERSION, t: 'place', item_id, x: Math.round(x), y: Math.round(y) }))
}
export function sendPickup(item_id: string) {
  if (!ws || ws.readyState !== 1) return
  ws.send(JSON.stringify({ v: PROTOCOL_VERSION, t: 'pickup', item_id }))
}
export function requestHomeDecorations(owner_visitor_id: string) {
  if (!ws || ws.readyState !== 1) return
  ws.send(JSON.stringify({ v: PROTOCOL_VERSION, t: 'home_decorations', owner_visitor_id }))
}

// V14.0 — Group session client senders. Server replies via 'group_*'
// messages routed into ./group.applyGroupMsg by the dispatch above.
export function sendGroupCreate(kind: string, room: RoomId, state?: Record<string, unknown>) {
  if (!ws || ws.readyState !== 1) return
  ws.send(JSON.stringify({ v: PROTOCOL_VERSION, t: 'group_create', kind, room, state }))
}
export function sendGroupJoin(session_id: string) {
  if (!ws || ws.readyState !== 1) return
  ws.send(JSON.stringify({ v: PROTOCOL_VERSION, t: 'group_join', session_id }))
}
export function sendGroupLeave(session_id: string) {
  if (!ws || ws.readyState !== 1) return
  ws.send(JSON.stringify({ v: PROTOCOL_VERSION, t: 'group_leave', session_id }))
}
export function sendGroupState(session_id: string, patch: Record<string, unknown>) {
  if (!ws || ws.readyState !== 1) return
  ws.send(JSON.stringify({ v: PROTOCOL_VERSION, t: 'group_state', session_id, patch }))
}
export function sendGroupList(filter?: { kind?: string; room?: string }) {
  if (!ws || ws.readyState !== 1) return
  ws.send(JSON.stringify({ v: PROTOCOL_VERSION, t: 'group_list', ...(filter ?? {}) }))
}

export function sendJamTap(pad_index: number) {
  if (!ws || ws.readyState !== 1) return
  ws.send(JSON.stringify({ v: PROTOCOL_VERSION, t: 'jam_tap', pad_index }))
}

export function sendLetterDrop(content: string, x: number, y: number, opts: { eternal?: boolean } = {}) {
  if (!ws || ws.readyState !== 1) return
  ws.send(JSON.stringify({
    v: PROTOCOL_VERSION, t: 'letter_drop', content,
    x: Math.round(x), y: Math.round(y),
    eternal: opts.eternal === true
  }))
}

export function requestLettersInRoom(room: string) {
  if (!ws || ws.readyState !== 1) return
  ws.send(JSON.stringify({ v: PROTOCOL_VERSION, t: 'letters', room }))
}

export function requestWishes() {
  if (!ws || ws.readyState !== 1) return
  ws.send(JSON.stringify({ v: PROTOCOL_VERSION, t: 'wishes' }))
}
export function sendWishSubmit(category: 'sprite' | 'room' | 'dialog' | 'other', content: string) {
  if (!ws || ws.readyState !== 1) return
  ws.send(JSON.stringify({ v: PROTOCOL_VERSION, t: 'wish_submit', category, content }))
}
export function sendWishVote(wish_id: number) {
  if (!ws || ws.readyState !== 1) return
  ws.send(JSON.stringify({ v: PROTOCOL_VERSION, t: 'wish_vote', wish_id }))
}
