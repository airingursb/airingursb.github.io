import { test } from 'node:test'
import assert from 'node:assert/strict'

// residentTargetCount lives in the Phaser-free logic module so Node can import it.
const { residentTargetCount } = await import('../../src/lounge/ambient_residents_logic.ts')

test('normal: site=11, peers=2, max=5 → clamped to 5', () => {
  assert.equal(residentTargetCount(11, 2, 5), 5)
})

test('normal: site=4, peers=1, max=5 → 3', () => {
  assert.equal(residentTargetCount(4, 1, 5), 3)
})

test('more peers than online → 0 (no negative)', () => {
  assert.equal(residentTargetCount(1, 3, 5), 0)
})

test('NaN online count → 0', () => {
  assert.equal(residentTargetCount(NaN, 0, 5), 0)
})

test('normal: site=3, peers=0, max=5 → 3', () => {
  assert.equal(residentTargetCount(3, 0, 5), 3)
})

test('exactly at cap: site=10, peers=2, max=5 → 5', () => {
  assert.equal(residentTargetCount(10, 2, 5), 5)
})

test('zero online → 0', () => {
  assert.equal(residentTargetCount(0, 0, 5), 0)
})

test('negative online → 0', () => {
  assert.equal(residentTargetCount(-5, 0, 5), 0)
})

test('negative peers treated as 0 (no extra residents)', () => {
  assert.equal(residentTargetCount(3, -2, 5), 3)
})

test('max=0 always yields 0', () => {
  assert.equal(residentTargetCount(100, 0, 0), 0)
})
