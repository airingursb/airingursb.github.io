import { test, beforeEach } from 'node:test'
import assert from 'node:assert/strict'
import './_shim.mjs'
import { resetLocalStorage } from './_shim.mjs'

const {
  getEnergy, setEnergy, consumeEnergy, restoreEnergy,
  isExhausted, getEnergyMax, ENERGY_MAX,
} = await import('../../src/lounge/energy.ts')

beforeEach(() => resetLocalStorage())

// ── Base cap ───────────────────────────────────────────────────────────────

test('ENERGY_MAX exported = 100 (base cap)', () => {
  assert.equal(ENERGY_MAX, 100)
})

test('getEnergyMax with no buffs = 100', () => {
  assert.equal(getEnergyMax(), 100)
})

test('puppy at affection ≥10 grants +5 max', () => {
  globalThis.localStorage.setItem('lounge_pet_v1', JSON.stringify({ species: 'puppy', affection: 10 }))
  assert.equal(getEnergyMax(), 105)
})

test('puppy below affection 10 grants no bonus', () => {
  globalThis.localStorage.setItem('lounge_pet_v1', JSON.stringify({ species: 'puppy', affection: 9 }))
  assert.equal(getEnergyMax(), 100)
})

test('non-puppy pet grants no bonus', () => {
  globalThis.localStorage.setItem('lounge_pet_v1', JSON.stringify({ species: 'cat', affection: 99 }))
  assert.equal(getEnergyMax(), 100)
})

test('all 4 buffs stacked = base + 5 + 10 + 5 + 5 = 125', () => {
  const future = String(Date.now() + 60_000)
  globalThis.localStorage.setItem('lounge_pet_v1', JSON.stringify({ species: 'puppy', affection: 10 }))
  globalThis.localStorage.setItem('lounge_bath_buff_until', future)
  globalThis.localStorage.setItem('lounge_pool_buff_until', future)
  globalThis.localStorage.setItem('lounge_coffee_buff_until', future)
  assert.equal(getEnergyMax(), 125)
})

test('expired buffs do not stack', () => {
  const past = String(Date.now() - 60_000)
  globalThis.localStorage.setItem('lounge_bath_buff_until', past)
  globalThis.localStorage.setItem('lounge_pool_buff_until', past)
  assert.equal(getEnergyMax(), 100)
})

test('malformed pet JSON falls back to base cap', () => {
  globalThis.localStorage.setItem('lounge_pet_v1', '{not json')
  assert.equal(getEnergyMax(), 100)
})

// ── getEnergy / setEnergy ──────────────────────────────────────────────────

test('first call on fresh storage returns full cap', () => {
  assert.equal(getEnergy(), 100)
  // And persists the date so subsequent calls don't re-trigger the rollover
  const date = globalThis.localStorage.getItem('lounge_energy_date_v1')
  assert.equal(date, new Date().toISOString().slice(0, 10))
})

test('setEnergy clamps to [0, cap]', () => {
  setEnergy(50); assert.equal(getEnergy(), 50)
  setEnergy(-9999); assert.equal(getEnergy(), 0)
  setEnergy(99999); assert.equal(getEnergy(), 100)
})

test('consumeEnergy decrements by amount', () => {
  setEnergy(50)
  consumeEnergy(15)
  assert.equal(getEnergy(), 35)
})

test('consumeEnergy with non-positive amount is a no-op', () => {
  setEnergy(50)
  consumeEnergy(0)
  consumeEnergy(-10)
  assert.equal(getEnergy(), 50)
})

test('restoreEnergy increments by amount', () => {
  setEnergy(50)
  restoreEnergy(20)
  assert.equal(getEnergy(), 70)
})

test('restoreEnergy clamps at cap', () => {
  setEnergy(95)
  restoreEnergy(20)
  assert.equal(getEnergy(), 100)
})

test('isExhausted true only at 0', () => {
  setEnergy(1)
  assert.equal(isExhausted(), false)
  setEnergy(0)
  assert.equal(isExhausted(), true)
})

// ── UTC day rollover ───────────────────────────────────────────────────────

test('stale date in storage triggers reset to cap on next getEnergy', () => {
  globalThis.localStorage.setItem('lounge_energy_v1', '7')
  globalThis.localStorage.setItem('lounge_energy_date_v1', '2020-01-01')
  assert.equal(getEnergy(), 100)
  // And date is bumped to today
  const date = globalThis.localStorage.getItem('lounge_energy_date_v1')
  assert.equal(date, new Date().toISOString().slice(0, 10))
})
