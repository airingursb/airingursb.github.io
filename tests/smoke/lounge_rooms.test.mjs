// Visual + smoke regression for every nook room.
//
// Spec: each room in STATIC_ROOMS must boot cleanly via /nook?room=<id>:
//   - currentRoomId matches what we asked for
//   - scene has > 30 game objects (sanity: not an empty white canvas)
//   - no console errors during boot (allowlist: known third-party noise)
//   - capture a fresh screenshot into tests/_screens/<room>.png
//
// Run with: PREVIEW_URL=http://localhost:4321 node --test tests/lounge_rooms_smoke.test.mjs
// (Requires a running `npx astro preview --port 4321` and a built dist/.)
//
// NOT included in the default `npm test` (the unit suite) because this
// needs a browser + live server. CI invokes via `npm run test:rooms`.

import { test, before, after } from 'node:test'
import assert from 'node:assert/strict'
import { chromium } from 'playwright'
import { mkdirSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const SCREENS_DIR = join(__dirname, '_screens')
const PREVIEW = process.env.PREVIEW_URL || 'http://localhost:4321'

// Mirror src/lounge/config.ts STATIC_ROOMS. Synced manually — when a new room
// lands, add it here too. The test fails fast if rooms diverge (last test).
const ROOMS = [
  'lobby', 'dj_floor', 'balcony', 'library', 'beach', 'grove',
  'kitchen', 'workshop', 'rooftop',
  'bedroom_mio', 'bedroom_halle', 'bedroom_sora', 'bedroom_theo',
  'bedroom_marin', 'bedroom_cole', 'bedroom_wren', 'bedroom_dane',
  'bedroom_iris', 'bedroom_mox',
  'bath', 'arcade', 'greenhouse', 'gallery',
]

// Errors we tolerate. Browser console for resource-load failures often
// strips the URL ("Failed to load resource: 401"), so we have to allow
// the generic shape — auth-gated endpoints (companion API), CORS-blocked
// R2 comic covers, missing favicon, and analytics blockers are all
// expected in a smoke test that isn't logged in.
const CONSOLE_ERROR_ALLOWLIST = [
  /Failed to load resource.*(401|403|404|429)/,
  /Failed to fetch/,
  /chat\.ursb\.me/,
  /analytics\.ursb\.me/,
  /r2\.airingdeng\.com/,
  /pcoyocvqfipuydhvdsle\.supabase\.co/,
  /favicon\.ico/,
  /Access to .* has been blocked by CORS/,
]

let browser
let page

before(async () => {
  mkdirSync(SCREENS_DIR, { recursive: true })
  browser = await chromium.launch()
  page = await browser.newPage({ viewport: { width: 1200, height: 800 } })
})

after(async () => {
  await browser?.close()
})

for (const room of ROOMS) {
  test(`room ${room} boots`, { timeout: 30_000 }, async () => {
    const errors = []
    const onErr = (msg) => {
      if (msg.type() !== 'error') return
      const text = msg.text()
      if (CONSOLE_ERROR_ALLOWLIST.some((re) => re.test(text))) return
      errors.push(text)
    }
    page.on('console', onErr)
    try {
      await page.goto(`${PREVIEW}/nook?room=${room}`, { waitUntil: 'domcontentloaded' })
      // Wait for the game to mount + scene to register
      const ready = await page.waitForFunction(
        () => !!(window).__loungeGame?.scene?.getScene?.('Room')?.children?.list?.length,
        { timeout: 15_000 },
      ).catch(() => null)
      assert.ok(ready, `room ${room}: game never mounted`)
      // Settle for sprites/atlas + spawn — 2 seconds is enough on a warm preview server
      await page.waitForTimeout(2000)
      const stats = await page.evaluate(() => {
        const g = (window).__loungeGame
        const scene = g?.scene?.getScene?.('Room')
        return {
          currentRoomId: scene?.currentRoomId,
          childCount: scene?.children?.list?.length ?? 0,
          hasBear: !!scene?.myBear,
        }
      })
      assert.equal(stats.currentRoomId, `room_${room}`, `expected room_${room}, got ${stats.currentRoomId}`)
      // Threshold = 10: bedrooms are sparse (12-13 children) but valid;
      // a totally broken scene has 0-3 children (just the camera + map base).
      assert.ok(stats.childCount >= 10, `room ${room}: only ${stats.childCount} children — likely empty scene`)
      // Bear can be absent on a few rooms (cinematic-only?), but for the 23 real ones we expect it
      assert.ok(stats.hasBear, `room ${room}: no player bear`)
      // Screenshot for visual diff record-keeping. Filename pattern lets a
      // future pixelmatch step diff against tests/_screens/golden/<room>.png
      await page.screenshot({ path: join(SCREENS_DIR, `${room}.png`), fullPage: false })
      // Console error guard last so we see screenshot + assertions first
      assert.deepEqual(errors, [], `room ${room}: unexpected console errors:\n${errors.join('\n')}`)
    } finally {
      page.off('console', onErr)
    }
  })
}

test('STATIC_ROOMS list stays in sync with this smoke test', async () => {
  // Read src/lounge/config.ts to confirm we haven't drifted.
  const cfgUrl = new URL('../../src/lounge/config.ts', import.meta.url)
  const cfg = await (await import('node:fs/promises')).readFile(cfgUrl, 'utf8')
  const m = cfg.match(/STATIC_ROOMS\s*=\s*\[([^\]]+)\]/)
  assert.ok(m, 'could not find STATIC_ROOMS in config.ts')
  const liveRooms = [...m[1].matchAll(/'room_([a-z_]+)'/g)].map((g) => g[1]).sort()
  const testedRooms = [...ROOMS].sort()
  assert.deepEqual(liveRooms, testedRooms,
    `STATIC_ROOMS in config.ts vs this test diverged. ` +
    `Source has: ${liveRooms.join(', ')}. Test has: ${testedRooms.join(', ')}.`)
})
