// V8.3 — Camera tool + memories.
// A "memory" is a saved snapshot of a moment: room + game-time + visible NPCs +
// (optional) free-text caption. Stored in localStorage. Future V8.3.1 will
// serialize to canvas image and display in Home as framed pictures.

import { formatGameTime, getGameNow } from './gametime'

export type Memory = {
  id: string
  roomId: string
  roomLabel: string
  gameTime: string
  realTimestamp: number
  visibleNpcs: string[]
  visiblePeers: string[]
  caption?: string
  weather?: string
}

const STORAGE_KEY = 'lounge_memories_v1'
const MAX_MEMORIES = 36

function loadAll(): Memory[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const arr = JSON.parse(raw)
    return Array.isArray(arr) ? arr : []
  } catch { return [] }
}

function saveAll(memories: Memory[]) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(memories.slice(0, MAX_MEMORIES))) } catch {}
}

export function captureMemory(opts: {
  roomId: string
  roomLabel: string
  visibleNpcs?: string[]
  visiblePeers?: string[]
  weather?: string
  caption?: string
}): Memory {
  const m: Memory = {
    id: 'mem_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 6),
    roomId: opts.roomId,
    roomLabel: opts.roomLabel,
    gameTime: formatGameTime(getGameNow()),
    realTimestamp: Date.now(),
    visibleNpcs: opts.visibleNpcs ?? [],
    visiblePeers: opts.visiblePeers ?? [],
    caption: opts.caption,
    weather: opts.weather
  }
  const all = loadAll()
  all.unshift(m)
  saveAll(all)
  return m
}

export function listMemories(): Memory[] { return loadAll() }
export function deleteMemory(id: string) {
  saveAll(loadAll().filter(m => m.id !== id))
}
export function getMemoryCount(): number { return loadAll().length }

// Toolbelt: which tool is currently equipped. Camera is the first tool.
export type Tool = 'none' | 'camera'
const TOOL_KEY = 'lounge_tool_v1'
export function getEquippedTool(): Tool {
  try {
    const v = localStorage.getItem(TOOL_KEY) as Tool | null
    return v === 'camera' ? 'camera' : 'none'
  } catch { return 'none' }
}
export function setEquippedTool(t: Tool) {
  try { localStorage.setItem(TOOL_KEY, t) } catch {}
}
