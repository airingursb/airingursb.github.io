// Targeted real-Chrome regression for arrival, lifecycle and explicit replays.
import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';

const base = process.argv[2] ?? 'http://localhost:4408';
const output = process.argv[3] ?? 'output/bear-stories/revision-3/workshop/after';
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ channel: 'chrome', headless: false,
  args: ['--window-position=30,30', '--disable-backgrounding-occluded-windows'] });
const report = { base, captured: new Date().toISOString(), result: 'failed', errors: [], scenarios: [] };
const route = language => `${base}/${language === 'en' ? 'en/' : ''}previews/bear-workshop/`;
async function open(options = {}, video = false) {
  const viewport = options.viewport ?? { width: 1280, height: 900 };
  const context = await browser.newContext({ viewport, colorScheme: 'dark', ...options,
    ...(video ? { recordVideo: { dir: output, size: viewport } } : {}) });
  await context.route('**/analytics.ursb.me/**', request => request.abort());
  await context.addInitScript(theme => {
    localStorage.setItem('blog-mode', theme); localStorage.setItem('blog-mode-set', '1');
  }, options.colorScheme ?? 'dark');
  const page = await context.newPage();
  const requests = [];
  page.on('pageerror', error => report.errors.push(error.message));
  page.on('request', request => { if (request.url().includes('workshop-atlas')) requests.push(request.url()); });
  return { context, page, requests };
}
const frame = page => page.locator('bear-workshop').getAttribute('data-frame').then(Number);
const at = (page, target) => page.waitForFunction(value => Number(document.querySelector('bear-workshop')?.dataset.frame) >= value, target, { timeout: 20000 });
const capture = (page, name) => page.screenshot({ path: `${output}/${name}.png`, fullPage: true });
try {
  for (const config of [{ language: 'zh', width: 1280, theme: 'dark' }, { language: 'en', width: 375, theme: 'light' }]) {
    const { language, width, theme } = config;
    const name = `${language}-${width}-${theme}`;
    const { context, page, requests } = await open({ viewport: { width, height: 900 }, colorScheme: theme }, true);
    await page.goto(route(language));
    await at(page, 8);
    await capture(page, `${name}-arrival`);
    for (const target of [24, 60, 108, 180]) {
      await at(page, target);
      await capture(page, `${name}-frame-${target}`);
      if (target === 24) {
        const before = await frame(page);
        await page.locator('.bw-choice button[data-project="reading-companion"]').click();
        await page.locator('.bw-hotspot-bear').click();
        assert.ok(await frame(page) >= before, 'Selections and character taps during a performance must not restart it.');
      }
    }
    await page.locator('bear-workshop[data-phase="settled"]').waitFor();
    await page.waitForTimeout(500);
    assert.equal(await frame(page), 180, 'Arrival is a single performance, never a loop.');
    if (width === 375) {
      await page.setViewportSize({ width, height: 420 });
      await page.keyboard.press('End');
      await page.waitForFunction(() => document.querySelector('.bw-stage').getBoundingClientRect().bottom <= 0);
      await page.locator('.bw-stage').scrollIntoViewIfNeeded();
      await page.waitForTimeout(500);
      assert.equal(await frame(page), 180, 'Returning to view must not autoplay the settled performance again.');
      await page.setViewportSize({ width, height: 900 });
    }
    assert.equal(await page.locator('bear-workshop').getAttribute('data-project'), 'reading-companion');
    assert.equal(await page.locator('[data-result="reading-companion"] .bw-exhibit-link').isVisible(), true);
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
    assert.equal(requests.length, 1);
    await page.locator('.bw-hotspot-bear').press('Enter');
    await page.waitForFunction(() => Number(document.querySelector('bear-workshop')?.dataset.frame) < 12);
    await at(page, 8);
    await capture(page, `${name}-character-replay`);
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.locator('bear-workshop[data-phase="static"]').waitFor();
    assert.equal(await page.locator('canvas').isVisible(), false);
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    await page.locator('.bw-choice button[data-project="living-scenes"]').click();
    await page.waitForFunction(() => document.querySelector('bear-workshop')?.dataset.phase === 'working' && Number(document.querySelector('bear-workshop')?.dataset.frame) < 12);
    await at(page, 8);
    report.scenarios.push({ name, arrival: true, fullPerformance: 180, coalescing: true, noLoop: true,
      keyboardCharacterReplay: true, projectReplay: true, liveReducedMotion: true, atlasRequests: requests.length });
    await context.close();
    await page.video().saveAs(`${output}/${name}-performance.webm`);
    await page.video().delete();
  }

  {
    const { context, page, requests } = await open();
    let release;
    const loading = new Promise(resolve => { release = resolve; });
    await context.route('**/workshop-atlas.webp', async request => { await loading; await request.continue(); });
    await page.goto(route('zh'), { waitUntil: 'domcontentloaded' });
    await page.locator('bear-workshop[data-phase="loading"]').waitFor();
    for (const selector of ['.bw-choice button[data-project="reading-companion"]', '.bw-hotspot-bear', '.bw-hotspot-living-scenes']) {
      await page.locator(selector).click();
    }
    assert.equal(requests.length, 1, 'Arrival and rapid input share the pending atlas request.');
    release();
    await at(page, 8);
    assert.equal(await page.locator('bear-workshop').getAttribute('data-project'), 'living-scenes');
    assert.ok(await frame(page) < 20);
    await capture(page, 'loading-race');
    report.scenarios.push({ name: 'delayed-atlas-arrival-race', requests: requests.length, latestProject: 'living-scenes', frame: await frame(page) });
    await context.close();
  }

  {
    const { context, page, requests } = await open({ viewport: { width: 375, height: 200 } });
    await page.goto(route('zh'));
    await page.locator('bear-workshop[data-ready]').waitFor();
    await page.waitForTimeout(500);
    assert.equal(await page.locator('bear-workshop').getAttribute('data-phase'), 'idle');
    assert.equal(requests.length, 0, 'A scene below the fold must not fetch the atlas yet.');
    await page.locator('.bw-stage').scrollIntoViewIfNeeded();
    await at(page, 8);
    report.scenarios.push({ name: 'first-visible-deferred-arrival', requestsBeforeVisible: 0, visibleFrame: await frame(page) });
    await context.close();
  }

  {
    const { context, page } = await open({ viewport: { width: 375, height: 420 } });
    await page.goto(route('zh'));
    await page.locator('.bw-stage').scrollIntoViewIfNeeded();
    await at(page, 8);
    await page.keyboard.press('End');
    await page.waitForFunction(() => document.querySelector('.bw-stage').getBoundingClientRect().bottom <= 0);
    await page.waitForTimeout(120);
    const offscreen = await frame(page);
    await page.waitForTimeout(500);
    assert.equal(await frame(page), offscreen);
    await page.locator('.bw-stage').scrollIntoViewIfNeeded();
    await at(page, offscreen + 2);
    // Chrome automation forces focus per client; exercise the visibility-event branch explicitly.
    await page.evaluate(() => {
      Object.defineProperty(document, 'hidden', { configurable: true, value: true });
      document.dispatchEvent(new Event('visibilitychange'));
    });
    const hidden = await frame(page);
    await page.waitForTimeout(500);
    assert.equal(await frame(page), hidden);
    await page.evaluate(() => {
      Reflect.deleteProperty(document, 'hidden');
      document.dispatchEvent(new Event('visibilitychange'));
    });
    await at(page, hidden + 2);
    assert.ok(await frame(page) <= hidden + 4, 'Resume must continue from the paused frame without catching up.');
    report.scenarios.push({ name: 'visibility-pause', offscreen: 'actual native scroll', hidden: 'in-page visibility-event fixture',
      offscreenFrame: offscreen, hiddenFrame: hidden, resumedFrame: await frame(page) });
    await context.close();
  }

  {
    const { context, page, requests } = await open({ reducedMotion: 'reduce', viewport: { width: 375, height: 900 } });
    await page.goto(route('en'));
    await page.locator('bear-workshop[data-phase="static"]').waitFor();
    await page.locator('.bw-choice button[data-project="reading-companion"]').press('Enter');
    await page.locator('.bw-hotspot-bear').press('Enter');
    assert.equal(requests.length, 0);
    assert.equal(await page.locator('.bw-poster').getAttribute('src'), '/bear-stories/workshop/settled.png');
    assert.equal(await page.locator('canvas').isVisible(), false);
    await capture(page, 'reduced-motion-no-atlas');
    await page.locator('[data-result="reading-companion"] .bw-exhibit-link').click();
    await page.waitForURL(`${base}/en/playbook/reading-companion/`);
    report.scenarios.push({ name: 'reduced-motion-no-atlas', requests: requests.length, realLink: page.url() });
    await context.close();
  }

  {
    const { context, page, requests } = await open();
    await context.route('**/workshop-atlas.webp', request => request.abort());
    await page.goto(route('zh'));
    await page.locator('bear-workshop[data-phase="failure"]').waitFor();
    assert.equal(await page.locator('.bw-poster').isVisible(), true);
    assert.equal(await page.locator('[data-result="living-scenes"] .bw-exhibit-link').isVisible(), true);
    await capture(page, 'failed-atlas-poster');
    await context.unroute('**/workshop-atlas.webp');
    await page.locator('.bw-hotspot-bear').click();
    await at(page, 8);
    report.scenarios.push({ name: 'failure-poster-and-explicit-retry', requests: requests.length, retryFrame: await frame(page) });
    await context.close();
  }

  {
    const { context, page } = await open({ javaScriptEnabled: false, viewport: { width: 375, height: 900 } });
    await page.goto(route('zh'));
    assert.equal(await page.locator('.bw-direct-link').count(), 2);
    assert.equal(await page.locator('.bw-direct-link').nth(1).isVisible(), true);
    await capture(page, 'no-js-native-links');
    report.scenarios.push({ name: 'no-js', realLinks: 2, poster: true });
    await context.close();
  }
  assert.deepEqual(report.errors, []);
  report.result = 'passed';
} finally {
  await browser.close();
  await writeFile(`${output}/playback-report.json`, `${JSON.stringify(report, null, 2)}\n`);
}
console.log(JSON.stringify(report));
