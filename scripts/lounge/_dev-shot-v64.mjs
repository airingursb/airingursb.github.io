import { chromium } from 'playwright'
const browser = await chromium.launch()
const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } })
const page = await ctx.newPage()
await page.addInitScript(() => {
  // Date hash → look up a date that produces rain in spring. 2026-05-17 = ?
  // Trying 2026-05-20 — rain probable. We patch the weather module via console after load anyway.
  const realDate = Date
  class FakeDate extends realDate {
    constructor(...a) { if (!a.length) super('2026-05-22T04:00:00Z'); else super(...a) }
    static now() { return new realDate('2026-05-22T04:00:00Z').getTime() }
  }
  globalThis.Date = FakeDate
  localStorage.setItem('lounge_visitor_id', crypto.randomUUID())
  localStorage.setItem('lounge_name_v1', 'TestBear')
  sessionStorage.setItem('vp_country', 'CN')
})
await page.goto('http://127.0.0.1:4321/lounge/', { waitUntil: 'networkidle' })
await page.waitForTimeout(4000)
try { const skip = await page.$('button:has-text("Skip")'); if (skip) await skip.click() } catch {}

// Cycle dates until we land on rain or snow visible in Balcony
const dates = ['2026-05-18T04:00:00Z','2026-05-19T04:00:00Z','2026-05-20T04:00:00Z','2026-05-21T04:00:00Z','2026-05-22T04:00:00Z','2026-05-23T04:00:00Z','2026-12-20T04:00:00Z']
for (const ds of dates) {
  const r = await page.evaluate((d) => {
    // Re-load the weather module by force-evaluating
    const realDate = Date
    class F extends realDate { constructor(...a){ if(!a.length) super(d); else super(...a) } static now(){ return new realDate(d).getTime() } }
    globalThis.Date = F
    return null
  }, ds)
  // Restart into balcony to apply new weather
  await page.evaluate(() => {
    const g = window.__loungeGame
    const s = g.scene.getScenes(true)[0] || g.scene.scenes[0]
    s.scene.restart({ roomId: 'room_balcony', spawnPoint: 'from_lobby' })
  })
  await page.waitForTimeout(3500)
  try { const skip = await page.$('button:has-text("Skip")'); if (skip) await skip.click() } catch {}
  const label = ds.slice(0, 10)
  await page.screenshot({ path: `/tmp/lounge-v64-balcony-${label}.png` })
  console.log(`shot ${label} → /tmp/lounge-v64-balcony-${label}.png`)
}
await browser.close()
