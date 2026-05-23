// SHU-733/735 · Multiplayer WS client for 3D pocket worlds.
//
// Connects to blog-api `/api/world/{slug}/ws`. Pushes self position
// (throttled 100ms) + receives peer state into the zustand store. Auto-
// reconnect with exponential backoff. Single instance per world (idempotent
// on connect-while-connected).

import { useGroveStore } from './store'

const WS_URL_BASE =
  typeof window !== 'undefined' && window.location.hostname === 'localhost'
    ? `ws://${window.location.hostname}:8904`
    : 'wss://chat.ursb.me'

const MOVE_THROTTLE_MS = 100
const RECONNECT_DELAY_MS = 2000
const MAX_RECONNECT_DELAY_MS = 30000

interface Peer {
  id: string
  species: string
  displayName?: string
  x: number; y: number; z: number; rotY: number
}

let ws: WebSocket | null = null
let connected = false
let reconnectDelay = RECONNECT_DELAY_MS
let lastMoveSentAt = 0
let currentSlug: string | null = null
let helloSent = false

export function connectWorld(slug: string, opts: { species: string; displayName: string }) {
  if (ws && (ws.readyState === WebSocket.CONNECTING || ws.readyState === WebSocket.OPEN) && currentSlug === slug) {
    return
  }
  currentSlug = slug
  _open(opts)
}

export function disconnectWorld() {
  currentSlug = null
  if (ws) {
    try { ws.close(1000, 'leave') } catch (_) {}
    ws = null
    connected = false
  }
  useGroveStore.setState({ peers: {} })
}

export function sendMove(x: number, y: number, z: number, rotY: number) {
  if (!connected || !ws) return
  const now = Date.now()
  if (now - lastMoveSentAt < MOVE_THROTTLE_MS) return
  lastMoveSentAt = now
  try { ws.send(JSON.stringify({ t: 'move', x, y, z, rotY })) } catch (_) {}
}

export function sendSay(text: string) {
  if (!connected || !ws) return
  try { ws.send(JSON.stringify({ t: 'say', text })) } catch (_) {}
}

function _open(opts: { species: string; displayName: string }) {
  if (!currentSlug) return
  try {
    ws = new WebSocket(`${WS_URL_BASE}/api/world/${currentSlug}/ws`)
  } catch (err) {
    console.warn('[grove3d/ws] open failed:', err)
    _scheduleReconnect(opts)
    return
  }

  ws.onopen = () => {
    connected = true
    reconnectDelay = RECONNECT_DELAY_MS
    helloSent = false
    try {
      ws!.send(JSON.stringify({ t: 'hello', species: opts.species, displayName: opts.displayName }))
      helloSent = true
    } catch (_) {}
  }

  ws.onmessage = (e) => {
    let msg: any
    try { msg = JSON.parse(e.data) } catch { return }

    if (msg.t === 'peers') {
      const peers: Record<string, Peer> = {}
      for (const p of msg.peers ?? []) peers[p.id] = p
      useGroveStore.setState({ peers })
      return
    }
    if (msg.t === 'peer') {
      useGroveStore.setState((st) => ({ peers: { ...st.peers, [msg.id]: msg } }))
      return
    }
    if (msg.t === 'move') {
      useGroveStore.setState((st) => {
        const cur = st.peers[msg.id]
        if (!cur) return st
        return { peers: { ...st.peers, [msg.id]: { ...cur, x: msg.x, y: msg.y, z: msg.z, rotY: msg.rotY } } }
      })
      return
    }
    if (msg.t === 'leave') {
      useGroveStore.setState((st) => {
        const { [msg.id]: _, ...rest } = st.peers
        return { peers: rest }
      })
      return
    }
    // 'say' could float a bubble — Phase 11 polish
  }

  ws.onclose = () => {
    connected = false
    helloSent = false
    if (currentSlug) _scheduleReconnect(opts)
  }

  ws.onerror = () => { /* close handler runs */ }
}

function _scheduleReconnect(opts: { species: string; displayName: string }) {
  setTimeout(() => {
    if (!currentSlug) return
    _open(opts)
  }, reconnectDelay)
  reconnectDelay = Math.min(reconnectDelay * 2, MAX_RECONNECT_DELAY_MS)
}
