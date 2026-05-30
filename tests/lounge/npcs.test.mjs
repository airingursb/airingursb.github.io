import { test } from 'node:test'
import assert from 'node:assert/strict'

const { pickBracket, parseHHMM } = await import('../../src/lounge/npcs_schedule.ts')

// Adapter to keep the existing per-test shape: previously `getActiveBracket(def, now)`,
// new pure helper is `pickBracket(brackets, now)`.
function getActiveBracket(def, now) { return pickBracket(def.schedule, now) }
function npc(brackets) { return { schedule: brackets } }

function bracket(from, to, room = 'room_lobby', state = 'idle') {
  return { from, to, room, x: 0, y: 0, state }
}

function at(hours, minutes = 0) {
  const d = new Date('2026-01-01T00:00:00Z')
  d.setHours(hours, minutes, 0, 0)
  return d
}

test('returns null when schedule is empty', () => {
  assert.equal(getActiveBracket(npc([]), at(12)), null)
})

test('matches when minutes-of-day is inside [from, to)', () => {
  const b = bracket('09:00', '17:00')
  assert.equal(getActiveBracket(npc([b]), at(12)), b)
})

test('matches at the start boundary (inclusive)', () => {
  const b = bracket('09:00', '17:00')
  assert.equal(getActiveBracket(npc([b]), at(9, 0)), b)
})

test('does NOT match at the end boundary (half-open)', () => {
  const b = bracket('09:00', '17:00')
  assert.equal(getActiveBracket(npc([b]), at(17, 0)), null)
})

test('matches one minute before the end', () => {
  const b = bracket('09:00', '17:00')
  assert.equal(getActiveBracket(npc([b]), at(16, 59)), b)
})

test('end=23:59 special case is INCLUSIVE (so all-day schedules cover 23:59)', () => {
  const b = bracket('00:00', '23:59')
  assert.equal(getActiveBracket(npc([b]), at(23, 59)), b)
  assert.equal(getActiveBracket(npc([b]), at(0, 0)), b)
})

test('returns the first matching bracket in array order', () => {
  const a = bracket('09:00', '12:00', 'room_a')
  const b = bracket('11:00', '15:00', 'room_b')   // overlaps with `a` at 11:00–12:00
  assert.equal(getActiveBracket(npc([a, b]), at(11, 30)), a)
})

test('skips invalid HH:MM brackets silently', () => {
  const bad = { from: 'nope', to: '??:??', room: 'room_x', x: 0, y: 0, state: 'idle' }
  const good = bracket('00:00', '23:59')
  assert.equal(getActiveBracket(npc([bad, good]), at(12)), good)
})

test('returns null when no bracket matches', () => {
  const b = bracket('09:00', '17:00')
  assert.equal(getActiveBracket(npc([b]), at(20)), null)
  assert.equal(getActiveBracket(npc([b]), at(6)), null)
})
