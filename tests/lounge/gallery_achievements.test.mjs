import { test } from 'node:test'
import assert from 'node:assert/strict'

const { computeUnlockedAchievements, ACHIEVEMENTS } = await import(
  '../../src/lounge/gallery_achievements_logic.ts'
)

function visited(...urls) { return new Set(urls) }

test('empty set unlocks nothing', () => {
  assert.deepEqual(computeUnlockedAchievements(visited()), [])
})

test('partial visits do not unlock any achievement', () => {
  const v = visited('/immersive/http3/')   // Networks needs TLS too
  const unlocked = computeUnlockedAchievements(v)
  assert.equal(unlocked.length, 0)
})

test('networks unlocks at http3 + tls-handshake', () => {
  const v = visited('/immersive/http3/', '/immersive/tls-handshake/')
  const unlocked = computeUnlockedAchievements(v)
  const ids = unlocked.map((a) => a.id)
  assert.ok(ids.includes('networks'))
  assert.ok(!ids.includes('web_internals'))
  assert.ok(!ids.includes('curator'))
})

test('web_internals unlocks at all 6 internals exhibits', () => {
  const v = visited(
    '/immersive/chromium-renderer/', '/immersive/css-engine/',
    '/immersive/react-internals/',   '/immersive/webgpu/',
    '/immersive/webassembly/',       '/immersive/image-formats/',
  )
  const ids = computeUnlockedAchievements(v).map((a) => a.id)
  assert.ok(ids.includes('web_internals'))
  assert.ok(!ids.includes('curator'))
})

test('curator unlocks ONLY when all 14 immersive visited', () => {
  const all14 = [
    '/immersive/chromium-renderer/', '/immersive/css-engine/',
    '/immersive/react-internals/', '/immersive/webgpu/',
    '/immersive/webassembly/', '/immersive/image-formats/',
    '/immersive/gc/', '/immersive/helio/', '/immersive/jank-stutter/',
    '/immersive/llm-inference-life/', '/immersive/quickjs/', '/immersive/v8-fast-js/',
    '/immersive/http3/', '/immersive/tls-handshake/',
  ]
  const ids = computeUnlockedAchievements(visited(...all14)).map((a) => a.id)
  assert.ok(ids.includes('curator'))
  // And as a sanity check, all three category achievements come along for free
  assert.ok(ids.includes('web_internals'))
  assert.ok(ids.includes('performance'))
  assert.ok(ids.includes('networks'))
})

test('curator does NOT unlock at 13/14', () => {
  const all14 = [
    '/immersive/chromium-renderer/', '/immersive/css-engine/',
    '/immersive/react-internals/', '/immersive/webgpu/',
    '/immersive/webassembly/', '/immersive/image-formats/',
    '/immersive/gc/', '/immersive/helio/', '/immersive/jank-stutter/',
    '/immersive/llm-inference-life/', '/immersive/quickjs/', '/immersive/v8-fast-js/',
    '/immersive/http3/',
    // missing tls-handshake
  ]
  const ids = computeUnlockedAchievements(visited(...all14)).map((a) => a.id)
  assert.ok(!ids.includes('curator'), 'curator should require ALL 14, missing one is not enough')
})

test('easter_egg unlocks at "/" visit', () => {
  const ids = computeUnlockedAchievements(visited('/')).map((a) => a.id)
  assert.ok(ids.includes('easter_egg'))
})

test('order is preserved (matches medallion slot allocation)', () => {
  const all14 = [
    '/', '/immersive/chromium-renderer/', '/immersive/css-engine/',
    '/immersive/react-internals/', '/immersive/webgpu/',
    '/immersive/webassembly/', '/immersive/image-formats/',
    '/immersive/gc/', '/immersive/helio/', '/immersive/jank-stutter/',
    '/immersive/llm-inference-life/', '/immersive/quickjs/', '/immersive/v8-fast-js/',
    '/immersive/http3/', '/immersive/tls-handshake/',
  ]
  const unlocked = computeUnlockedAchievements(visited(...all14))
  // Match the source order: web_internals, performance, networks, curator, easter_egg
  const expectedOrder = ['web_internals', 'performance', 'networks', 'curator', 'easter_egg']
  assert.deepEqual(unlocked.map((a) => a.id), expectedOrder)
})

test('achievement constant has stable id/label shape', () => {
  for (const a of ACHIEVEMENTS) {
    assert.ok(typeof a.id === 'string' && a.id.length > 0)
    assert.ok(typeof a.label === 'string' && a.label.length > 0)
    assert.ok(Array.isArray(a.requiresAll))
    assert.ok(a.requiresAll.length > 0)
  }
})

test('total achievement count = 5 (4 categories + 1 easter egg)', () => {
  assert.equal(ACHIEVEMENTS.length, 5)
})
