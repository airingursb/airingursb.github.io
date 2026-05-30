import { test, beforeEach } from 'node:test'
import assert from 'node:assert/strict'
import './_shim.mjs'
import { resetLocalStorage } from './_shim.mjs'

const { saveStickyChat, loadStickyChat, clearStickyChat } = await import('../../src/lounge/sticky_chat.ts')

beforeEach(() => resetLocalStorage())

test('loadStickyChat returns null when nothing saved', () => {
  assert.equal(loadStickyChat(), null)
})

test('saveStickyChat round-trips a snapshot', () => {
  saveStickyChat({
    npc_id: 'npc_jue', npc_name: 'Airing', npc_where: 'library',
    hints: { time_phase: 'evening', current_room: 'room_library' },
    bubbles: [
      { role: 'user', text: '你今天写日记了吗？' },
      { role: 'assistant', text: '写了一段关于潮汐的。' },
    ],
  })
  const snap = loadStickyChat()
  assert.ok(snap)
  assert.equal(snap.npc_id, 'npc_jue')
  assert.equal(snap.npc_name, 'Airing')
  assert.equal(snap.npc_where, 'library')
  assert.deepEqual(snap.hints, { time_phase: 'evening', current_room: 'room_library' })
  assert.equal(snap.bubbles.length, 2)
  assert.equal(snap.bubbles[0].role, 'user')
  assert.equal(snap.bubbles[1].text, '写了一段关于潮汐的。')
  assert.equal(typeof snap.savedAt, 'number')
})

test('loadStickyChat expires after 30 min TTL', () => {
  saveStickyChat({ npc_id: 'npc_jue', npc_name: 'Airing', bubbles: [{ role: 'user', text: 'hi' }] })
  const raw = JSON.parse(globalThis.localStorage.getItem('nook:sticky-chat:v1'))
  raw.savedAt = Date.now() - (31 * 60 * 1000)
  globalThis.localStorage.setItem('nook:sticky-chat:v1', JSON.stringify(raw))
  assert.equal(loadStickyChat(), null)
  // Also auto-cleared after expiry read
  assert.equal(globalThis.localStorage.getItem('nook:sticky-chat:v1'), null)
})

test('clearStickyChat removes the entry', () => {
  saveStickyChat({ npc_id: 'npc_jue', npc_name: 'Airing', bubbles: [] })
  assert.ok(loadStickyChat())
  clearStickyChat()
  assert.equal(loadStickyChat(), null)
})

test('loadStickyChat returns null on malformed JSON', () => {
  globalThis.localStorage.setItem('nook:sticky-chat:v1', '{not json')
  assert.equal(loadStickyChat(), null)
})

test('loadStickyChat returns null when savedAt missing', () => {
  globalThis.localStorage.setItem('nook:sticky-chat:v1', JSON.stringify({ npc_id: 'x', npc_name: 'y', bubbles: [] }))
  assert.equal(loadStickyChat(), null)
})

test('saveStickyChat preserves speaker label on group bubbles', () => {
  saveStickyChat({
    npc_id: 'npc_jue', npc_name: 'Airing',
    bubbles: [
      { role: 'assistant', text: '我也想去。', speaker: 'Pip' },
      { role: 'assistant', text: '走嘛。', speaker: 'Mio' },
    ],
  })
  const snap = loadStickyChat()
  assert.equal(snap.bubbles[0].speaker, 'Pip')
  assert.equal(snap.bubbles[1].speaker, 'Mio')
})
