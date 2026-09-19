import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import { actorEvidence, assertPageHealth, capture, observeActor, openEditorialPage, saveReport, waitForMotion, waitForRest } from './editorial-motion-qa.mjs';
import { inspectNeighborFallback } from './editorial-motion-scenarios.mjs';

const browser = await chromium.launch({ channel: 'chrome', headless: true });
const report = { scenarios: [], temporal: null, fallbacks: [] };
try {
  for (const lang of ['zh', 'en']) for (const width of [375, 768, 1280]) for (const theme of ['light', 'dark']) {
    const scenario = { lang, width, theme, surface: 'neighbors' };
    const session = await openEditorialPage(browser, scenario);
    try {
      await session.page.evaluate(() => document.fonts.ready);
      const result = await inspectNeighborFallback(session, `${lang}-${width}-${theme}`);
      report.scenarios.push({ ...scenario, ...result, layout: await assertPageHealth(session) });
    } finally { await session.context.close(); }
  }
  const session = await openEditorialPage(browser, { lang: 'zh', width: 1280, theme: 'dark', surface: 'article' });
  try {
    const { page } = session;
    const section = page.locator('[data-newspaper-subscription]');
    const actor = section.locator('[data-editorial-actor]');
    await observeActor(actor);
    await section.scrollIntoViewIfNeeded();
    await page.waitForFunction(() => document.querySelector('[data-newspaper-subscription] [data-editorial-actor]')?.__editorialQa.restWraps > 0, null, { timeout: 20_000 });
    const idle = await actorEvidence(actor);
    assert.ok(idle.pixelStates > 16 && idle.frameCount > 16);
    assert.equal(idle.loop, 'true');
    await page.locator('h1').scrollIntoViewIfNeeded();
    await page.waitForFunction(() => document.querySelector('[data-newspaper-subscription] [data-editorial-actor]')?.dataset.actorState === 'paused');
    const paused = await actor.getAttribute('data-actor-frame');
    await page.waitForTimeout(500);
    assert.equal(await actor.getAttribute('data-actor-frame'), paused);
    await section.scrollIntoViewIfNeeded();
    await page.waitForFunction(frame => document.querySelector('[data-newspaper-subscription] [data-editorial-actor]')?.dataset.actorFrame !== frame, paused);
    session.subscriptions.mode = 'confirmed';
    await section.locator('input[type=email]').fill('reader@example.test');
    await section.locator('button[type=submit]').click();
    await waitForMotion(actor);
    const playing = await capture(page, 'counter-success-playing');
    const success = await waitForRest(actor, 'subscribe');
    report.temporal = { idle, paused, success, screenshots: [playing, await capture(page, 'counter-success-rest')], layout: await assertPageHealth(session) };
  } finally { await session.context.close(); }
  for (const lang of ['zh', 'en']) for (const kind of ['reduced', 'media-failure']) {
    const session = await openEditorialPage(browser, { lang, width: 375, theme: 'dark', surface: 'article', reduced: kind === 'reduced' });
    try {
      const { page } = session;
      if (kind === 'media-failure') await page.route('**/editorial-motion/counter/*.webp', route => route.request().url().includes('poster.webp') ? route.continue() : route.fulfill({ status: 404, body: 'QA media failure' }));
      const section = page.locator('[data-newspaper-subscription]');
      await section.scrollIntoViewIfNeeded();
      session.subscriptions.mode = 'confirmed';
      await section.locator('input[type=email]').fill('reader@example.test');
      await section.locator('button[type=submit]').click();
      await page.locator('[data-subscription-state=confirmed]').waitFor();
      if (kind === 'media-failure') await page.waitForFunction(() => document.querySelector('[data-newspaper-subscription] [data-editorial-actor]')?.dataset.actorState === 'unavailable');
      const actor = section.locator('[data-editorial-actor]');
      assert.equal(await actor.locator('canvas').isVisible(), false);
      assert.equal(await actor.locator('img').evaluate(image => image.complete && image.naturalWidth > 0), true);
      if (kind === 'reduced') assert.deepEqual(session.mediaRequests.filter(url => !url.includes('/poster.')), []);
      report.fallbacks.push({ lang, kind, requests: session.subscriptions.requests.length, screenshots: [await capture(page, `${lang}-${kind}`)] });
    } finally { await session.context.close(); }
  }
} finally {
  await saveReport('revision-report', report);
  await browser.close();
}
