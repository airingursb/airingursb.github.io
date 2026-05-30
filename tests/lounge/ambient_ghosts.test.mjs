import { test } from 'node:test'
import assert from 'node:assert/strict'

// ghostTargetCount lives in the Phaser-free logic module so Node can import it.
const { ghostTargetCount } = await import('../../src/lounge/ambient_ghosts_logic.ts')

test('normal: site=11, peers=2, max=8 → clamped to 8', () => {
  assert.equal(ghostTargetCount(11, 2, 8), 8)
})

test('normal: site=5, peers=2, max=8 → 3', () => {
  assert.equal(ghostTargetCount(5, 2, 8), 3)
})

test('more peers than online → 0 (no negative)', () => {
  assert.equal(ghostTargetCount(1, 3, 8), 0)
})

test('NaN online count → 0', () => {
  assert.equal(ghostTargetCount(NaN, 0, 8), 0)
})

test('normal: site=3, peers=0, max=8 → 3', () => {
  assert.equal(ghostTargetCount(3, 0, 8), 3)
})

test('exactly at cap: site=10, peers=2, max=8 → 8', () => {
  assert.equal(ghostTargetCount(10, 2, 8), 8)
})

test('zero online → 0', () => {
  assert.equal(ghostTargetCount(0, 0, 8), 0)
})

test('negative online → 0', () => {
  assert.equal(ghostTargetCount(-5, 0, 8), 0)
})

test('negative peers treated as 0 (no extra ghosts)', () => {
  // negative peers → treated as 0
  assert.equal(ghostTargetCount(3, -2, 8), 3)
})

test('max=0 always yields 0', () => {
  assert.equal(ghostTargetCount(100, 0, 0), 0)
})
