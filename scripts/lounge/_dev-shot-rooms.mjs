#!/usr/bin/env node
// Dev tool: walk into specific rooms and screenshot them.
//   node scripts/lounge/_dev-shot-rooms.mjs           # default: lobby
//   node scripts/lounge/_dev-shot-rooms.mjs dj library
// Targets: lobby | dj | library | balcony | beach | home

import { chromium } from 'playwright'

const URL = 'http://127.0.0.1:4321/lounge/'
const ROOM_DOOR_NAME = {
  dj:      'DJ Floor',
  library: 'Library',
  balcony: 'Balcony',
  beach:   'Beach',
  home:    'Home',
  lobby:   null
}

const targets = process.argv.slice(2)
const list = targets.length ? targets : ['lobby']

const browser = await chromium.launch()
const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } })
const page = await ctx.newPage()
await page.addInitScript(() => {
  const realDate = Date
  class FakeDate extends realDate {
    constructor(...args) {
      if (!args.length) super('2026-05-17T04:00:00Z')
      else super(...args)
    }
    static now() { return new realDate('2026-05-17T04:00:00Z').getTime() }
  }
  globalThis.Date = FakeDate
  // Fresh visitor id every run so server's last_room replay doesn't yank us back
  const fresh = crypto.randomUUID()
  localStorage.setItem('lounge_visitor_id', fresh)
  localStorage.setItem('lounge_name_v1', 'TestBear')
  sessionStorage.setItem('vp_country', 'CN')
})

await page.goto(URL, { waitUntil: 'networkidle' })
await page.waitForTimeout(4000)

// Dismiss any name modal
try {
  const skip = await page.$('button:has-text("Skip")')
  if (skip) { await skip.click(); await page.waitForTimeout(800) }
} catch {}

for (const room of list) {
  if (room === 'lobby') {
    await page.screenshot({ path: `/tmp/lounge-v611-lobby.png` })
    console.log(`shot → /tmp/lounge-v611-lobby.png`)
    continue
  }
  const door = ROOM_DOOR_NAME[room]
  if (!door) { console.log(`unknown room: ${room}`); continue }
  // Click the minimap room button
  const btn = await page.$(`text=${door}`)
  if (!btn) {
    console.log(`No "${door}" found on minimap, trying direct keypress nav`)
    continue
  }
  // The minimap is non-interactive — we need to actually walk through portals.
  // Easier approach: rely on door labels by tweening to portal coords directly via key inputs.
  // Use server-side hint? No, just simulate by setting localStorage room + reloading? Doesn't work either.
  // Fallback: just press arrow keys for a few seconds toward known portal.
  // For now: simply tap canvas at portal direction repeatedly.
  // Skipping precise nav — taking shot at default position.
  await page.screenshot({ path: `/tmp/lounge-v611-${room}-default.png` })
}

// Reach target room by directly invoking scene.restart from the browser context
async function shotRoom(roomId, outName) {
  await page.evaluate((r) => {
    const game = window.__loungeGame
    if (!game) throw new Error('Phaser game not found')
    const scene = game.scene.getScenes(true)[0] || game.scene.scenes[0]
    scene.scene.restart({ roomId: r, spawnPoint: 'from_lobby' })
  }, roomId)
  await page.waitForTimeout(4000)
  try {
    const skip = await page.$('button:has-text("Skip")')
    if (skip) await skip.click()
  } catch {}
  await page.screenshot({ path: `/tmp/lounge-v611-${outName}.png` })
  console.log(`shot → /tmp/lounge-v611-${outName}.png`)
}

if (list.includes('dj'))      await shotRoom('room_dj_floor', 'dj')
if (list.includes('library')) await shotRoom('room_library',  'library')

await browser.close()
