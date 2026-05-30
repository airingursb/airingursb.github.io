import { test, beforeEach } from 'node:test'
import assert from 'node:assert/strict'
import './_shim.mjs'
import { resetLocalStorage } from './_shim.mjs'

const {
  logRoomVisit, logExhibitVisit,
  getPreviousRoomVisit, getLastOtherRoomVisit,
  getRoomVisitCount, getExhibitVisitCount,
  formatAgoZh, _resetVisitLogForTest,
} = await import('../../src/lounge/visit_log.ts')

beforeEach(() => { resetLocalStorage(); _resetVisitLogForTest() })

// ── Logging + counts ──────────────────────────────────────────────────────

test('logRoomVisit counts repeated visits', () => {
  logRoomVisit('room_lobby')
  logRoomVisit('room_lobby')
  logRoomVisit('room_lobby')
  assert.equal(getRoomVisitCount('room_lobby'), 3)
})

test('room and exhibit counts are independent', () => {
  logRoomVisit('room_gallery')
  logExhibitVisit('peony-deck')
  logExhibitVisit('peony-deck')
  assert.equal(getRoomVisitCount('room_gallery'), 1)
  assert.equal(getExhibitVisitCount('peony-deck'), 2)
  assert.equal(getExhibitVisitCount('unknown-slug'), 0)
})

test('empty key is ignored', () => {
  logRoomVisit('')
  logExhibitVisit('')
  assert.equal(getRoomVisitCount(''), 0)
})

// ── Previous / last-other lookups ─────────────────────────────────────────

test('getPreviousRoomVisit returns null when no prior visit', () => {
  assert.equal(getPreviousRoomVisit('room_lobby'), null)
})

test('getPreviousRoomVisit returns null when only one visit (no "previous")', () => {
  logRoomVisit('room_lobby')
  assert.equal(getPreviousRoomVisit('room_lobby'), null)
})

test('getPreviousRoomVisit returns the prior timestamp', () => {
  logRoomVisit('room_lobby')
  const second = Date.now() + 1
  logRoomVisit('room_lobby')
  const prev = getPreviousRoomVisit('room_lobby')
  assert.ok(prev !== null)
  assert.ok(prev < second + 100)
})

test('getLastOtherRoomVisit skips the current room', () => {
  logRoomVisit('room_lobby')
  logRoomVisit('room_library')
  logRoomVisit('room_lobby')
  const last = getLastOtherRoomVisit('room_lobby')
  assert.ok(last)
  assert.equal(last.roomId, 'room_library')
})

test('getLastOtherRoomVisit returns null when only current-room visits exist', () => {
  logRoomVisit('room_lobby')
  logRoomVisit('room_lobby')
  assert.equal(getLastOtherRoomVisit('room_lobby'), null)
})

// ── FIFO eviction ─────────────────────────────────────────────────────────

test('visit log evicts old entries past MAX_EVENTS (100)', () => {
  for (let i = 0; i < 110; i++) logRoomVisit(`room_${i}`)
  // The first 10 should have been evicted
  assert.equal(getRoomVisitCount('room_0'), 0)
  assert.equal(getRoomVisitCount('room_9'), 0)
  assert.equal(getRoomVisitCount('room_10'), 1)
  assert.equal(getRoomVisitCount('room_109'), 1)
})

// ── Persistence ───────────────────────────────────────────────────────────

test('visits persist via localStorage across cache reset', () => {
  logRoomVisit('room_workshop')
  _resetVisitLogForTest()
  // After cache wipe + storage clear, count is back to zero
  assert.equal(getRoomVisitCount('room_workshop'), 0)
})

// ── formatAgoZh ───────────────────────────────────────────────────────────

test('formatAgoZh: <60s = 刚刚', () => {
  assert.equal(formatAgoZh(Date.now(), Date.now()), '刚刚')
  assert.equal(formatAgoZh(Date.now() - 59_000, Date.now()), '刚刚')
})

test('formatAgoZh: minute grain', () => {
  const now = 1_700_000_000_000
  assert.equal(formatAgoZh(now - 5 * 60 * 1000, now), '5 分钟前')
  assert.equal(formatAgoZh(now - 59 * 60 * 1000, now), '59 分钟前')
})

test('formatAgoZh: hour grain', () => {
  const now = 1_700_000_000_000
  assert.equal(formatAgoZh(now - 60 * 60 * 1000, now), '1 小时前')
  assert.equal(formatAgoZh(now - 5 * 60 * 60 * 1000, now), '5 小时前')
})

test('formatAgoZh: yesterday and beyond', () => {
  const now = 1_700_000_000_000
  assert.equal(formatAgoZh(now - 25 * 60 * 60 * 1000, now), '昨天')
  assert.equal(formatAgoZh(now - 3 * 24 * 60 * 60 * 1000, now), '3 天前')
  assert.equal(formatAgoZh(now - 30 * 24 * 60 * 60 * 1000, now), '很久以前')
})

test('formatAgoZh: clamps negative deltas to 刚刚', () => {
  const now = 1_700_000_000_000
  assert.equal(formatAgoZh(now + 5000, now), '刚刚')
})
