import { WS_URL, getOrCreateVisitorId, getMyCC } from './config'

export type SnapMsg = {
  t: 'snap'
  you: string
  peers: Array<{ id: string; x: number; y: number; cc: string | null; state: string }>
}
export type JoinMsg = { t: 'join'; id: string; x: number; y: number; cc: string | null; state: string }
export type LeaveMsg = { t: 'leave'; id: string }
export type PosMsg = { t: 'pos'; id: string; x: number; y: number; vx?: number; vy?: number; state: string }
export type FullMsg = { t: 'full' }
export type ServerMsg = SnapMsg | JoinMsg | LeaveMsg | PosMsg | FullMsg

export type NetCallbacks = {
  onSnap: (m: SnapMsg) => void
  onJoin: (m: JoinMsg) => void
  onLeave: (m: LeaveMsg) => void
  onPos: (m: PosMsg) => void
  onFull: () => void
  onConnectionChange: (state: 'connecting' | 'open' | 'closed') => void
}

let ws: WebSocket | null = null
let backoff = 1000
let cb: NetCallbacks | null = null

export function connect(callbacks: NetCallbacks) {
  cb = callbacks
  openSocket()
}

function openSocket() {
  cb?.onConnectionChange('connecting')
  try {
    ws = new WebSocket(WS_URL)
  } catch {
    scheduleReconnect()
    return
  }

  ws.addEventListener('open', () => {
    backoff = 1000
    cb?.onConnectionChange('open')
    ws!.send(JSON.stringify({
      t: 'hi',
      cc: getMyCC(),
      visitor_id: getOrCreateVisitorId()
    }))
  })

  ws.addEventListener('message', (e) => {
    let msg: ServerMsg
    try {
      msg = JSON.parse(e.data)
    } catch {
      return
    }
    if (msg.t === 'snap') cb?.onSnap(msg)
    else if (msg.t === 'join') cb?.onJoin(msg)
    else if (msg.t === 'leave') cb?.onLeave(msg)
    else if (msg.t === 'pos') cb?.onPos(msg)
    else if (msg.t === 'full') cb?.onFull()
  })

  ws.addEventListener('close', () => scheduleReconnect())
  ws.addEventListener('error', () => {
    /* close fires next */
  })
}

function scheduleReconnect() {
  ws = null
  cb?.onConnectionChange('closed')
  setTimeout(openSocket, backoff)
  backoff = Math.min(backoff * 2, 30_000)
}

let lastSentT = 0
const lastSent = { x: -1, y: -1, state: '' }

export function sendPos(x: number, y: number, state: string, vx: number, vy: number) {
  if (!ws || ws.readyState !== 1) return
  const t = performance.now()
  if (t - lastSentT < 100) return
  if (
    Math.abs(x - lastSent.x) < 0.5 &&
    Math.abs(y - lastSent.y) < 0.5 &&
    state === lastSent.state
  ) {
    return
  }
  lastSentT = t
  lastSent.x = x
  lastSent.y = y
  lastSent.state = state
  ws.send(JSON.stringify({ t: 'pos', x, y, vx, vy, state }))
}
