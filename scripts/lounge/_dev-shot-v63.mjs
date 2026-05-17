import { chromium } from 'playwright'
const browser = await chromium.launch()
const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } })
const page = await ctx.newPage()
await page.addInitScript(() => {
  // 22:00 China time → night, glow on
  const realDate = Date
  class FakeDate extends realDate {
    constructor(...a) { if (!a.length) super('2026-05-17T14:00:00Z'); else super(...a) }
    static now() { return new realDate('2026-05-17T14:00:00Z').getTime() }
  }
  globalThis.Date = FakeDate
  localStorage.setItem('lounge_visitor_id', crypto.randomUUID())
  localStorage.setItem('lounge_name_v1', 'TestBear')
  sessionStorage.setItem('vp_country', 'CN')
})
await page.goto('http://127.0.0.1:4321/lounge/', { waitUntil: 'networkidle' })
await page.waitForTimeout(4000)
try { const skip = await page.$('button:has-text("Skip")'); if (skip) await skip.click() } catch {}
async function shot(roomId, name) {
  await page.evaluate(r => {
    const g = window.__loungeGame
    const s = g.scene.getScenes(true)[0] || g.scene.scenes[0]
    s.scene.restart({ roomId: r, spawnPoint: 'from_lobby' })
  }, roomId)
  await page.waitForTimeout(3500)
  try { const skip = await page.$('button:has-text("Skip")'); if (skip) await skip.click() } catch {}
  await page.screenshot({ path: `/tmp/lounge-v63-${name}.png` })
  console.log(`shot → /tmp/lounge-v63-${name}.png`)
}
await shot('room_lobby',    'lobby-night')
await shot('room_dj_floor', 'dj-night')
await browser.close()
