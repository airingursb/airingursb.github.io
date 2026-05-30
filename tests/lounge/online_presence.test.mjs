import { test } from 'node:test'
import assert from 'node:assert/strict'

// Regression for the "lobby empty for ~45s" bug: the first online-count fetch is
// async, so a synchronous reconcile reads 0. The fix makes online_presence NOTIFY
// subscribers when the count arrives, so residents reconcile within ~1s instead of
// waiting the full 45s poll cadence. This test asserts that notification fires.

test('online_presence: count lands + listeners fire on first poll', async () => {
  globalThis.fetch = async () => ({ ok: true, json: async () => ({ site: 7 }) })

  const { startOnlinePolling, stopOnlinePolling, getOnlineSite, onOnlineChange } =
    await import('../../src/lounge/online_presence.ts')

  assert.equal(getOnlineSite(), 0, 'cold: 0 before any poll resolves')

  let fired = 0
  const unsub = onOnlineChange(() => { fired++ })

  startOnlinePolling()
  await new Promise((r) => setTimeout(r, 20)) // let the async poll resolve

  assert.equal(getOnlineSite(), 7, 'count is cached after the poll')
  assert.ok(fired >= 1, 'subscriber is notified when the count first arrives')

  unsub()
  stopOnlinePolling()
})
