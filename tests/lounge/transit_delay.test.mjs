import { test } from 'node:test'
import assert from 'node:assert/strict'

const { transitDelayRange } = await import('../../src/lounge/transit_delay_logic.ts')

test('online=0 → exactly [90000, 180000] (unchanged baseline)', () => {
  const [min, max] = transitDelayRange(0)
  assert.equal(min, 90_000)
  assert.equal(max, 180_000)
})

test('online=12 → exactly [20000, 40000] (busiest)', () => {
  const [min, max] = transitDelayRange(12)
  assert.equal(min, 20_000)
  assert.equal(max, 40_000)
})

test('online=6 → midpoint-ish', () => {
  const [min, max] = transitDelayRange(6)
  // busy=0.5 → minD = 90000 - 0.5*(90000-20000) = 55000; maxD = 180000 - 0.5*(180000-40000) = 110000
  assert.equal(min, 55_000)
  assert.equal(max, 110_000)
})

test('online above 12 clamps to max busy', () => {
  const [min, max] = transitDelayRange(20)
  assert.equal(min, 20_000)
  assert.equal(max, 40_000)
})

test('online below 0 clamps to 0 (no change from baseline)', () => {
  const [min, max] = transitDelayRange(-5)
  assert.equal(min, 90_000)
  assert.equal(max, 180_000)
})

test('min is always less than max', () => {
  for (const n of [0, 1, 3, 6, 9, 12, 15]) {
    const [min, max] = transitDelayRange(n)
    assert.ok(min < max, `min(${min}) should be < max(${max}) for online=${n}`)
  }
})
