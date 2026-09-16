import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';

const base = process.env.SUITCASE_QA_ORIGIN || 'http://localhost:4406';
const output = 'output/bear-stories/suitcase/qa';
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const results = [];
const slugs = ['img-2604', 'img-2251', 'dscf0841'];
const viewports = [{ width: 375, height: 812 }, { width: 768, height: 1024 }, { width: 1280, height: 900 }];
const errorLogs = [];

async function prepare({ viewport, theme, language = 'zh', motion = 'reduce' }) {
  const context = await browser.newContext({ viewport, reducedMotion: motion });
  await context.addInitScript(mode => {
    localStorage.setItem('blog-mode', mode);
    localStorage.setItem('blog-mode-set', '1');
  }, theme);
  const page = await context.newPage();
  page.on('pageerror', error => errorLogs.push(error.message));
  const atlasRequests = [];
  page.on('request', request => { if (/\/bear-stories\/suitcase\/(open|close)-\d\.webp/.test(request.url())) atlasRequests.push(request.url()); });
  const prefix = language === 'en' ? '/en' : '';
  const response = await page.goto(`${base}${prefix}/previews/bear-suitcase/`, { waitUntil: 'domcontentloaded' });
  assert.equal(response.status(), 200);
  await page.locator('[data-case-open] img').evaluate(image => image.decode());
  return { context, page, atlasRequests };
}

async function openCase(page) {
  await page.locator('[data-case-open]').click();
  await page.waitForFunction(() => document.querySelector('[data-suitcase]')?.getAttribute('data-state') === 'open');
  await page.locator('[data-case-still]').evaluate(image => image.decode());
}

try {
  for (const viewport of viewports) for (const theme of ['light', 'dark']) {
    const language = theme === 'dark' ? 'en' : 'zh';
    const key = `${viewport.width}-${theme}-${language}`;
    const { context, page, atlasRequests } = await prepare({ viewport, theme, language });
    assert.equal(await page.locator('html').getAttribute('lang'), language);
    await page.screenshot({ path: `${output}/${key}-closed.png`, fullPage: true });
    await openCase(page);
    assert.equal(atlasRequests.length, 0, 'Reduced motion must not request animation sheets');
    const geometry = await page.locator('[data-memory]').evaluateAll(targets => targets.map(target => target.getBoundingClientRect().toJSON()));
    geometry.forEach(rect => { assert.ok(rect.width >= 44); assert.ok(rect.height >= 44); });
    for (const [i, a] of geometry.entries()) for (const b of geometry.slice(i + 1)) assert.ok(a.right <= b.left || b.right <= a.left || a.bottom <= b.top || b.bottom <= a.top, 'Hotspots must not overlap');
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'Page must not overflow horizontally');
    await page.screenshot({ path: `${output}/${key}-open.png` });
    for (const slug of slugs) {
      await page.locator(`[data-memory="${slug}"]`).click();
      const photo = page.locator(`[data-photo="${slug}"]`);
      await photo.locator('img').evaluate(image => image.decode());
      assert.equal(await photo.isVisible(), true);
      assert.equal(await page.locator('[data-photo]:visible').count(), 1);
      assert.equal(await photo.locator('a').first().getAttribute('href'), `/photos/${slug}/`);
      await page.screenshot({ path: `${output}/${key}-${slug}.png` });
      assert.equal(await page.locator('[data-case-dismiss]').isVisible(), true);
    }
    await page.keyboard.press('Escape');
    assert.equal(await page.locator('[data-case-dialog]').isVisible(), false);
    assert.equal(await page.locator('[data-case-open]').evaluate(element => element === document.activeElement), true);
    await openCase(page);
    await page.keyboard.press('Tab');
    assert.equal(await page.locator('[data-memory]').first().evaluate(element => element === document.activeElement), true);
    await page.keyboard.press('Space');
    assert.equal(await page.locator('[data-photo="img-2604"]').isVisible(), true);
    await page.locator('[data-case-pack]').click();
    assert.equal(await page.locator('[data-case-dialog]').isVisible(), false);
    results.push({ key, state: 'PASS', minTarget: Math.min(...geometry.map(rect => Math.min(rect.width, rect.height))), atlasRequests: atlasRequests.length });
    await context.close();
  }

  const animated = await prepare({ viewport: viewports[2], theme: 'dark', motion: 'no-preference' });
  const page = animated.page;
  await page.locator('[data-case-open]').click();
  await page.waitForFunction(() => document.querySelector('[data-suitcase]')?.hasAttribute('data-playing'));
  await page.screenshot({ path: `${output}/motion-start.png` });
  await page.waitForTimeout(4200);
  await page.screenshot({ path: `${output}/motion-unfold.png` });
  await page.waitForFunction(() => document.querySelector('[data-suitcase]')?.getAttribute('data-state') === 'open');
  await page.screenshot({ path: `${output}/motion-open.png` });
  assert.equal(new Set(animated.atlasRequests).size, 4);
  await page.locator('[data-case-pack]').click();
  await page.waitForTimeout(1800);
  await page.screenshot({ path: `${output}/motion-pack.png` });
  await page.waitForFunction(() => document.querySelector('[data-suitcase]')?.getAttribute('data-state') === 'closed');
  await page.locator('[data-case-open]').click();
  await page.keyboard.press('Escape');
  assert.equal(await page.locator('[data-suitcase]').getAttribute('data-state'), 'closed');
  assert.equal(await page.locator('[data-case-open]').evaluate(element => element === document.activeElement), true);
  results.push({ key: 'authored-motion-and-interruption', state: 'PASS', sheets: new Set(animated.atlasRequests).size });
  await animated.context.close();

  const failed = await prepare({ viewport: viewports[0], theme: 'dark', language: 'en', motion: 'no-preference' });
  await failed.page.route('**/bear-stories/suitcase/open-*.webp', route => route.abort());
  await openCase(failed.page);
  assert.match(await failed.page.locator('[data-case-status]').textContent(), /unavailable/);
  await failed.page.locator('[data-memory="dscf0841"]').click();
  await failed.page.locator('[data-photo="dscf0841"] img').evaluate(image => image.decode());
  await failed.page.screenshot({ path: `${output}/375-media-failure.png` });
  await failed.page.locator('[data-case-dialog] a[href="/photos/albums/2024-new-zealand/"]').click();
  await failed.page.waitForURL('**/photos/albums/2024-new-zealand/');
  results.push({ key: 'failed-atlas-and-real-album-navigation', state: 'PASS', url: failed.page.url() });
  await failed.context.close();
  assert.deepEqual(errorLogs, []);
  await writeFile(`${output}/report.json`, JSON.stringify({ base, browser: 'Chrome stable via Playwright', results, pageErrors: errorLogs }, null, 2));
  console.log(JSON.stringify({ scenarios: results.length, state: 'PASS', output }, null, 2));
} finally {
  await browser.close();
}
