#!/usr/bin/env node
// Measure TTI / FCP / asset transfer for key pages against a preview server.
//
// Usage:
//   npx astro build && npx astro preview --port 4321 &
//   node scripts/perf/measure-tti.mjs
//
// Reports per-page timings + the 10 biggest network responses observed.
// Numbers are local-loopback so they're a lower bound, not a real-world
// estimate; useful for relative comparison across changes.

import { chromium } from 'playwright'

const PAGES = [
  { name: 'home',  url: 'http://localhost:4321/' },
  { name: 'nook',  url: 'http://localhost:4321/nook' },
  { name: 'world', url: 'http://localhost:4321/world' },
  { name: 'blog',  url: 'http://localhost:4321/blog' },
  { name: 'comics', url: 'http://localhost:4321/comics' },
]

function fmtMs(ms) { return ms.toFixed(0).padStart(5) + ' ms' }
function fmtKb(bytes) { return (bytes / 1024).toFixed(1).padStart(8) + ' KB' }

async function measurePage(page, { name, url }) {
  const responses = []
  page.on('response', (res) => {
    const ct = res.headers()['content-type'] || ''
    responses.push({ url: res.url(), type: ct.split(';')[0], status: res.status() })
  })
  const t0 = Date.now()
  await page.goto(url, { waitUntil: 'load', timeout: 30_000 })
  const loadMs = Date.now() - t0

  // Pull web-vitals-ish numbers from the navigation timing API
  const nav = await page.evaluate(() => {
    const n = performance.getEntriesByType('navigation')[0]
    const paint = performance.getEntriesByType('paint')
    const fcp = paint.find(p => p.name === 'first-contentful-paint')?.startTime
    return {
      domContentLoaded: n?.domContentLoadedEventEnd ?? 0,
      domComplete: n?.domComplete ?? 0,
      loadEventEnd: n?.loadEventEnd ?? 0,
      fcp: fcp ?? null,
      transferSize: n?.transferSize ?? 0,
      encodedBodySize: n?.encodedBodySize ?? 0,
    }
  })

  // Async — wait for resource load to settle a bit, then collect transfer sizes
  await page.waitForTimeout(800)
  const resources = await page.evaluate(() => {
    return performance.getEntriesByType('resource').map((r) => ({
      url: r.name,
      transferSize: r.transferSize ?? 0,
      encodedBodySize: r.encodedBodySize ?? 0,
      type: r.initiatorType,
    }))
  })

  const totalKb = resources.reduce((s, r) => s + (r.transferSize || 0), 0) / 1024
  const top = [...resources].sort((a, b) => (b.transferSize || 0) - (a.transferSize || 0)).slice(0, 8)

  console.log(`\n── ${name.toUpperCase()} ── ${url}`)
  console.log(`  FCP:                 ${fmtMs(nav.fcp ?? 0)}`)
  console.log(`  DOMContentLoaded:    ${fmtMs(nav.domContentLoaded)}`)
  console.log(`  load event:          ${fmtMs(nav.loadEventEnd)}`)
  console.log(`  Wall clock to load:  ${fmtMs(loadMs)}`)
  console.log(`  Total transfer:      ${(totalKb).toFixed(1)} KB across ${resources.length} reqs`)
  console.log(`  Top resources:`)
  for (const r of top) {
    const short = r.url.replace('http://localhost:4321', '').slice(0, 70)
    console.log(`    ${fmtKb(r.transferSize || 0)}  ${r.type.padEnd(8)}  ${short}`)
  }
  return { name, fcp: nav.fcp, load: nav.loadEventEnd, wallMs: loadMs, totalKb, resources }
}

async function main() {
  const browser = await chromium.launch()
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } })
  const out = []
  for (const p of PAGES) {
    const page = await ctx.newPage()
    try {
      out.push(await measurePage(page, p))
    } catch (e) {
      console.log(`  × ${p.name}: ${e.message}`)
    } finally {
      await page.close()
    }
  }
  await browser.close()

  console.log('\n=== Summary (lower is better) ===')
  console.log('page      FCP        Load       Wall       Total')
  for (const r of out) {
    console.log(
      `${r.name.padEnd(8)}  ${fmtMs(r.fcp ?? 0)}  ${fmtMs(r.load)}  ${fmtMs(r.wallMs)}  ${r.totalKb.toFixed(1).padStart(7)} KB`
    )
  }
}

main().catch((e) => { console.error(e); process.exit(1) })
