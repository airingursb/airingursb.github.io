import assert from 'node:assert/strict';
import { actorEvidence, assertPageHealth, capture, observeActor, openEditorialPage, waitForMotion, waitForRest } from './editorial-motion-qa.mjs';

const desktop = { surface: 'harness', lang: 'en', width: 1280, theme: 'dark' };

export async function inspectFullPerformances(browser) {
  const session = await openEditorialPage(browser, desktop);
  const { page } = session;
  const results = [];
  try {
    await assertPageHealth(session);
    await page.locator('[data-demo-ready="true"]').last().waitFor();
    for (const clip of ['arrival', 'bookmark', 'bird', 'tumble', 'reverse', 'close', 'subscribe']) {
      const button = page.locator(`[data-demo-clip="${clip}"]`);
      const section = page.locator('[data-editorial-demo]').filter({ has: button });
      const actor = section.locator('[data-editorial-actor]');
      await actor.scrollIntoViewIfNeeded();
      await observeActor(actor);
      await button.click();
      await waitForMotion(actor);
      const playing = await capture(page, `temporal-${clip}-playing`);
      const evidence = await waitForRest(actor, clip);
      assert.ok(evidence.pixelStates > 1 && evidence.frameCount > 8);
      assert.ok(evidence.events.some(event => event.kind === 'start' && event.clip === `${clip}-rest`));
      const resting = await capture(page, `temporal-${clip}-rest`);
      results.push({ clip, ...evidence, screenshots: [playing, resting] });
      console.log(`Temporal complete: ${clip}`);
    }
    const counter = page.locator('[data-editorial-demo]').filter({ has: page.locator('[data-demo-clip="subscribe"]') }).locator('[data-editorial-actor]');
    await page.locator('h1').scrollIntoViewIfNeeded();
    await page.waitForFunction(() => document.querySelector('[data-editorial-actor*="counter/"]')?.dataset.actorState === 'paused');
    const pausedFrame = await counter.getAttribute('data-actor-frame');
    await page.waitForTimeout(650);
    assert.equal(await counter.getAttribute('data-actor-frame'), pausedFrame, 'Offscreen actor frame stays fixed');
    await counter.scrollIntoViewIfNeeded();
    await page.waitForFunction(frame => document.querySelector('[data-editorial-actor*="counter/"]')?.dataset.actorFrame !== frame, pausedFrame);
    const pause = { frame: pausedFrame, resumed: await counter.getAttribute('data-actor-frame') };
    await assertPageHealth(session);
    return { performances: results, offscreenPause: pause, mediaRequests: session.mediaRequests, pageErrors: session.pageErrors };
  } finally {
    await session.context.close();
  }
}

export async function inspectReducedMotion(browser) {
  const report = [];
  for (const lang of ['zh', 'en']) for (const surface of ['blog', 'harness', 'article']) {
    const session = await openEditorialPage(browser, { lang, surface, width: 375, theme: 'dark', reduced: true });
    const { page } = session;
    try {
      if (surface === 'blog') {
        await page.locator('[data-cart-replay]').click();
      } else if (surface === 'harness') {
        await page.locator('[data-demo-ready="true"]').last().waitFor();
        for (const clip of ['arrival', 'close', 'subscribe']) await page.locator(`[data-demo-clip="${clip}"]`).click();
      } else {
        const dock = page.locator('[data-article-pet-dock][data-dock-ready="true"]');
        await dock.scrollIntoViewIfNeeded();
        await page.waitForFunction(() => document.querySelector('[data-article-pet-dock]')?.dataset.dockState === 'docked');
        const section = page.locator('[data-newspaper-subscription]');
        await page.locator('[data-subscription-state="idle"]').waitFor();
        session.subscriptions.mode = 'confirmed';
        await section.locator('input[type="email"]').fill('reader@example.test');
        await section.locator('button[type="submit"]').click();
        await page.locator('[data-subscription-state="confirmed"]').waitFor();
      }
      const animated = session.mediaRequests.filter(url => !url.includes('/poster.'));
      assert.deepEqual(animated, [], 'Reduced motion must not request manifests or atlases');
      assert.equal(await page.locator('[data-actor-canvas]:visible').count(), 0);
      const screenshot = await capture(page, `reduced-${lang}-${surface}`);
      await assertPageHealth(session);
      report.push({ lang, surface, mediaRequests: session.mediaRequests, screenshot });
    } finally { await session.context.close(); }
  }
  return report;
}

export async function inspectResourceFailure(browser) {
  const session = await openEditorialPage(browser, desktop);
  const { page } = session;
  try {
    await page.route('**/editorial-motion/cart/arrival.webp', route => route.fulfill({ status: 404, body: 'QA deliberate asset failure' }));
    await page.locator('[data-demo-ready="true"]').last().waitFor();
    await page.locator('[data-demo-clip="arrival"]').click();
    await page.waitForFunction(() => document.querySelector('[data-editorial-actor*="cart/"]')?.dataset.actorState === 'unavailable');
    const actor = page.locator('[data-editorial-actor*="cart/"]');
    assert.equal(await actor.locator('canvas').isVisible(), false);
    assert.equal(await actor.locator('img').isVisible(), true);
    assert.equal(await actor.locator('img').evaluate(image => image.complete && image.naturalWidth > 0), true);
    return { intentionalFailure: session.mediaFailures, screenshot: await capture(page, 'resource-failure-poster') };
  } finally { await session.context.close(); }
}

export async function inspectSurprise(browser) {
  const session = await openEditorialPage(browser, { ...desktop, surface: 'blog', surprise: true });
  const { page } = session;
  try {
    const actor = page.locator('[data-archive-bookcart] [data-editorial-actor]');
    await observeActor(actor);
    await actor.scrollIntoViewIfNeeded();
    await page.waitForFunction(() => window.__editorialEvents.some(event => event.kind === 'start' && event.clip === 'bookmark'), null, { timeout: 60_000 });
    assert.equal(await page.evaluate(() => sessionStorage.getItem('editorial-bookcart-surprise-v1')), 'used');
    await waitForRest(actor, 'bookmark');
    const events = await page.evaluate(() => window.__editorialEvents);
    assert.equal(events.filter(event => event.kind === 'start' && event.clip === 'bookmark').length, 1);
    await assertPageHealth(session);
    return { events, screenshot: await capture(page, 'bookcart-surprise-rest') };
  } finally { await session.context.close(); }
}
