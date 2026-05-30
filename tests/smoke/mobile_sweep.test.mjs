// Mobile-viewport screenshot sweep for the nook page.
//
// Boots /nook at iPhone-13-mini dimensions (375×812) with touch=true,
// then opens each major modal/overlay one at a time and snapshots into
// tests/smoke/_screens_mobile/<name>.png. Visual review only — there's no
// pixelmatch baseline yet; the test passes if every step doesn't throw.
//
// Run: PREVIEW_URL=http://localhost:4321 node --test tests/smoke/mobile_sweep.test.mjs

import { test, before, after } from 'node:test'
import assert from 'node:assert/strict'
import { chromium, devices } from 'playwright'
import { mkdirSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const SCREENS_DIR = join(__dirname, '_screens_mobile')
const PREVIEW = process.env.PREVIEW_URL || 'http://localhost:4321'

let browser
let context

before(async () => {
  mkdirSync(SCREENS_DIR, { recursive: true })
  browser = await chromium.launch()
  context = await browser.newContext({
    ...devices['iPhone 13 Mini'],
    locale: 'zh-CN',
  })
})

after(async () => {
  await browser?.close()
})

async function snap(page, name) {
  await page.screenshot({ path: join(SCREENS_DIR, `${name}.png`), fullPage: false })
}

async function bootNook(page) {
  await page.goto(`${PREVIEW}/nook`, { waitUntil: 'domcontentloaded' })
  await page.waitForFunction(
    () => !!(window).__loungeGame?.scene?.getScene?.('Room')?.children?.list?.length,
    { timeout: 15_000 },
  )
  // Settle for sprites/atlas + spawn
  await page.waitForTimeout(2500)
}

test('mobile · lobby default', async () => {
  const page = await context.newPage()
  await bootNook(page)
  await snap(page, '01-lobby-default')
  await page.close()
})

test('mobile · touch d-pad visible', async () => {
  const page = await context.newPage()
  await bootNook(page)
  // Force the touch overlay (CSS-gated on .is-touch.is-narrow on body)
  await page.evaluate(() => {
    document.body.classList.add('is-touch', 'is-narrow')
    const ov = document.getElementById('lounge-touch-overlay')
    if (ov) ov.removeAttribute('hidden')
  })
  await page.waitForTimeout(300)
  await snap(page, '02-touch-dpad')
  await page.close()
})

test('mobile · companion chat open', async () => {
  const page = await context.newPage()
  await bootNook(page)
  await page.evaluate(async () => {
    const m = await import('/src/lounge/companion_ui.ts')
    await m.openCompanionChat({
      npc_id: 'npc_jue', npc_name: 'Airing', npc_where: 'library',
      time_phase: 'evening', current_room: 'room_library', language: 'zh',
    })
  }).catch(async () => {
    // Module path differs in built output — fall back to clicking via window event
    await page.evaluate(() => window.dispatchEvent(new CustomEvent('open-companion-chat', {
      detail: { npc_id: 'npc_jue', npc_name: 'Airing' },
    })))
  })
  await page.waitForTimeout(400)
  await snap(page, '03-companion-chat')
  await page.close()
})

test('mobile · login overlay', async () => {
  const page = await context.newPage()
  await bootNook(page)
  await page.evaluate(async () => {
    const m = await import('/src/lounge/auth_ui.ts').catch(() => null)
    if (m?.showLogin) m.showLogin()
    else {
      // Fallback — toggle the static DOM overlay directly
      const el = document.getElementById('nook-auth-overlay')
      if (el) el.removeAttribute('hidden')
    }
  })
  await page.waitForTimeout(400)
  await snap(page, '04-login-overlay')
  await page.close()
})

test('mobile · settings popover open', async () => {
  const page = await context.newPage()
  await bootNook(page)
  await page.click('#lounge-grp-settings', { force: true }).catch(() => {})
  await page.waitForTimeout(300)
  await snap(page, '05-settings-popover')
  await page.close()
})

test('viewport stays at iPhone-mini width', async () => {
  // Sanity guard so a future refactor doesn't accidentally widen the context
  const page = await context.newPage()
  const size = page.viewportSize()
  assert.equal(size?.width, 375, `viewport width drifted: ${size?.width}`)
  await page.close()
})
