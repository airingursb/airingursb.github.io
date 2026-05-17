#!/usr/bin/env node
// Dev-only: launch a real browser, walk into the lobby, screenshot it.
// Not committed-as-feature; used to verify V6.1 visuals.

import { chromium } from 'playwright'

const URL = 'http://127.0.0.1:4321/lounge/'
const OUT = '/tmp/lounge-v61.png'

const browser = await chromium.launch()
const ctx = await browser.newContext({
  viewport: { width: 1280, height: 800 }
})
const page = await ctx.newPage()
// Pretend it's noon so the night overlay is off
await page.addInitScript(() => {
  const realDate = Date
  class FakeDate extends realDate {
    constructor(...args) {
      if (!args.length) { super('2026-05-17T04:00:00Z') } // 12pm China time
      else super(...args)
    }
    static now() { return new realDate('2026-05-17T04:00:00Z').getTime() }
  }
  globalThis.Date = FakeDate
  localStorage.setItem('lounge_visitor_id', '11111111-2222-3333-4444-555555555555')
  localStorage.setItem('lounge_name_v1', 'TestBear')
  sessionStorage.setItem('vp_country', 'CN')
})
page.on('console', m => console.log('CONSOLE', m.type().toUpperCase(), m.text()))
page.on('pageerror', e => console.log('PAGEERR', e.message))
page.on('requestfailed', r => console.log('REQFAIL', r.url(), r.failure()?.errorText))
await page.goto(URL, { waitUntil: 'networkidle' })
await page.waitForTimeout(4500)
// Dismiss any name dialog if still present
try {
  const skip = await page.$('button:has-text("Skip")')
  if (skip) { await skip.click(); await page.waitForTimeout(800) }
} catch {}
await page.screenshot({ path: OUT, fullPage: false })
await browser.close()
console.log('shot →', OUT)
