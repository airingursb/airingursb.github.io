import { WS_URL, PROTOCOL_VERSION, DEFAULT_ROOM, getOrCreateVisitorId, getMyCC, type RoomId } from './config'

export type SnapMsg = {
  v: number
  t: 'snap'
  you: string
  peers: Array<{ id: string; x: number; y: number; cc: string | null; state: string; room: RoomId; display_name?: string | null }>
}
export type JoinMsg = { v: number; t: 'join'; id: string; x: number; y: number; cc: string | null; state: string; room: RoomId; display_name?: string | null }
export type LeaveMsg = { v: number; t: 'leave'; id: string; room: RoomId }
export type PosMsg = { v: number; t: 'pos'; id: string; x: number; y: number; vx?: number; vy?: number; state: string; room: RoomId }
export type ActMsg = { v: number; t: 'act'; id: string; verb: string; text?: string; room: RoomId }
export type FullMsg = { v: number; t: 'full' }
export type WelcomeMsg = {
  v: number; t: 'welcome'
  visitor_id: string | null
  display_name: string | null
  last_room: RoomId | null
  last_x: number | null
  last_y: number | null
  region: string
  inventory?: string[]
}
export type CollectedMsg = { v: number; t: 'collected'; item_id: string; newly: boolean }
export type NameChangedMsg = { v: number; t: 'name_changed'; id: string; display_name: string }
export type ReplacedMsg = { v: number; t: 'replaced' }
export type ErrorMsg = { v: number; t: 'error'; reason: string; detail?: string }

export type ServerMsg = SnapMsg | JoinMsg | LeaveMsg | PosMsg | ActMsg | FullMsg
  | WelcomeMsg | NameChangedMsg | ReplacedMsg | ErrorMsg | CollectedMsg

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
  onReplaced?: () => void
  onError?: (m: ErrorMsg) => void
  onCollected?: (m: CollectedMsg) => void
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
    ws!.send(JSON.stringify({
      v: PROTOCOL_VERSION,
      t: 'hi',
      cc: getMyCC(),
      visitor_id: getOrCreateVisitorId(),
      room: initialRoom
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
    else if (msg.t === 'replaced') {
      replaced = true
      cb?.onReplaced?.()
    }
    else if (msg.t === 'error') cb?.onError?.(msg)
    else if (msg.t === 'collected') cb?.onCollected?.(msg)
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

export function sendAct(verb: string, text?: string, room: RoomId = DEFAULT_ROOM) {
  if (!ws || ws.readyState !== 1) return
  const msg: { v: number; t: 'act'; verb: string; text?: string; room: RoomId } = { v: PROTOCOL_VERSION, t: 'act', verb, room }
  if (text != null) msg.text = text
  ws.send(JSON.stringify(msg))
}

export function sendName(name: string) {
  if (!ws || ws.readyState !== 1) return
  ws.send(JSON.stringify({ v: PROTOCOL_VERSION, t: 'name', display_name: name }))
}

export function sendCollect(item_id: string) {
  if (!ws || ws.readyState !== 1) return
  ws.send(JSON.stringify({ v: PROTOCOL_VERSION, t: 'collect', item_id }))
}
