import { test } from 'node:test'
import assert from 'node:assert/strict'

const { portalBlockedReasonBySeason } = await import(
  '../../src/lounge/seasonal_rules_logic.ts'
)
const fn = portalBlockedReasonBySeason
function p(name, targetRoom) { return { name, targetRoom } }

test('no season → all portals open', () => {
  assert.equal(fn('room_balcony', p('door', 'room_beach'), ''), null)
  assert.equal(fn('transit',      p('door', 'room_beach'), ''), null)
})

test('winter: balcony→beach blocked with friendly message', () => {
  const r = fn('room_balcony', p('door', 'room_beach'), 'winter')
  assert.ok(r && r.includes('snowed over'))
})

test('winter: transit→beach blocked', () => {
  const r = fn('transit', p('door', 'room_beach'), 'winter')
  assert.ok(r && r.includes('snowed over'))
})

test('winter: balcony→grove NOT blocked (only beach is)', () => {
  assert.equal(fn('room_balcony', p('door', 'room_grove'), 'winter'), null)
})

test('winter: lobby→beach NOT blocked (only balcony+transit paths gated)', () => {
  assert.equal(fn('room_lobby', p('door', 'room_beach'), 'winter'), null)
})

test('spring: balcony→beach passes', () => {
  assert.equal(fn('room_balcony', p('door', 'room_beach'), 'spring'), null)
})

test('summer: balcony→beach passes', () => {
  assert.equal(fn('room_balcony', p('door', 'room_beach'), 'summer'), null)
})

test('fall: balcony→beach passes', () => {
  assert.equal(fn('room_balcony', p('door', 'room_beach'), 'fall'), null)
})

test('unknown season string → no block (fail-open)', () => {
  assert.equal(fn('room_balcony', p('door', 'room_beach'), 'monsoon'), null)
})

test('empty target room → no block', () => {
  assert.equal(fn('room_balcony', p('door', ''), 'winter'), null)
})
