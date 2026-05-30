import { test, beforeEach } from 'node:test'
import assert from 'node:assert/strict'
import './_shim.mjs'
import { resetLocalStorage } from './_shim.mjs'

// NB: gallery_progress holds module-level state (`visited` Set + `loaded`
// flag). The current API only exposes resetGalleryProgress() which clears
// the Set but doesn't reset `loaded`. Tests below reset localStorage and
// the Set; if you ever change `load()` semantics this guard rail catches it.
const { markVisited, hasVisited, getVisitedCount, resetGalleryProgress } =
  await import('../../src/lounge/gallery_progress.ts')

beforeEach(() => {
  resetLocalStorage()
  resetGalleryProgress()
})

test('hasVisited returns false for unknown slug', () => {
  assert.equal(hasVisited('/immersive/http3/'), false)
})

test('markVisited then hasVisited returns true', () => {
  markVisited('/immersive/http3/')
  assert.equal(hasVisited('/immersive/http3/'), true)
})

test('markVisited is idempotent — same slug counts once', () => {
  markVisited('/immersive/gc/')
  markVisited('/immersive/gc/')
  markVisited('/immersive/gc/')
  assert.equal(getVisitedCount(), 1)
})

test('empty / falsy slug is ignored', () => {
  markVisited('')
  // @ts-expect-error testing the contract
  markVisited(null)
  assert.equal(getVisitedCount(), 0)
})

test('getVisitedCount reflects multiple distinct entries', () => {
  markVisited('a')
  markVisited('b')
  markVisited('c')
  assert.equal(getVisitedCount(), 3)
})

test('persists to localStorage', () => {
  markVisited('/persisted/')
  const raw = globalThis.localStorage.getItem('gallery_visited_v1')
  assert.ok(raw, 'localStorage should have the gallery_visited_v1 key')
  const arr = JSON.parse(raw)
  assert.ok(Array.isArray(arr))
  assert.ok(arr.includes('/persisted/'))
})

test('resetGalleryProgress empties storage too', () => {
  markVisited('a')
  markVisited('b')
  resetGalleryProgress()
  assert.equal(getVisitedCount(), 0)
  const raw = globalThis.localStorage.getItem('gallery_visited_v1')
  assert.equal(raw, '[]')
})

test('survives malformed localStorage gracefully', () => {
  globalThis.localStorage.setItem('gallery_visited_v1', '{not json')
  // Should not throw; visited stays empty
  assert.equal(hasVisited('/anything/'), false)
  assert.equal(getVisitedCount(), 0)
})
