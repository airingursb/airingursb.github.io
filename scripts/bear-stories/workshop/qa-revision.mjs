// Run: node scripts/bear-stories/workshop/qa-revision.mjs http://localhost:4407
import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
const base = process.argv[2] ?? 'http://localhost:4407';
const output = 'output/bear-stories/revision-2/workshop/after/browser';
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ channel: 'chrome', headless: false, args: ['--window-position=30,30', '--disable-backgrounding-occluded-windows'] });
const report = { base, errors: [], themes: [], reducedMotion: false, assetMatches: false };
const expectedHash = createHash('sha256').update(await readFile('public/bear-stories/workshop/workshop-atlas.webp')).digest('hex');
try {
  for (const theme of ['dark', 'light']) {
    const context = await browser.newContext({ viewport: { width: 1280, height: 900 }, colorScheme: theme, recordVideo: { dir: output, size: { width: 1280, height: 900 } } });
    await context.route('**/analytics.ursb.me/**', request => request.abort());
    await context.addInitScript(mode => { localStorage.setItem('blog-mode', mode); localStorage.setItem('blog-mode-set', '1'); }, theme);
    const page = await context.newPage();
    page.on('pageerror', error => report.errors.push(error.message));
    await page.goto(`${base}/${theme === 'light' ? 'en/' : ''}previews/bear-workshop/`);
    await page.locator('bear-workshop[data-ready]').waitFor();
    await page.locator('.bw-poster').evaluate(image => image.decode());
    assert.equal(await page.locator('html').getAttribute('data-mode'), theme);
    await page.locator('.bw-stage').screenshot({ path: `${output}/${theme}-idle.png` });
    const atlasResponse = page.waitForResponse(response => response.url().endsWith('/workshop-atlas.webp'));
    await page.locator('.bw-hotspot-reading-companion').click();
    const actualHash = createHash('sha256').update(await (await atlasResponse).body()).digest('hex');
    assert.equal(actualHash, expectedHash);
    report.assetMatches = true;
    for (const frame of [24, 60, 90, 132, 180]) {
      await page.waitForFunction(target => Number(document.querySelector('bear-workshop').dataset.frame) >= target, frame, { timeout: 20000 });
      await page.locator('.bw-stage').screenshot({ path: `${output}/${theme}-frame-${frame}.png` });
      if (frame === 24) await page.locator('.bw-choice button[data-project="living-scenes"]').click();
    }
    await page.locator('bear-workshop[data-phase="settled"]').waitFor();
    assert.equal(await page.locator('bear-workshop').getAttribute('data-project'), 'living-scenes');
    assert.equal(await page.locator('[data-result="living-scenes"] .bw-exhibit-link').isVisible(), true);
    await page.screenshot({ path: `${output}/${theme}-page.png`, fullPage: true });
    await context.close();
    await page.video().saveAs(`${output}/${theme}-full-action.webm`);
    await page.video().delete();
    report.themes.push({ theme, completedFrame: 180, selected: 'living-scenes' });
  }
  const context = await browser.newContext({ viewport: { width: 375, height: 900 }, colorScheme: 'dark', reducedMotion: 'reduce' });
  await context.route('**/analytics.ursb.me/**', request => request.abort());
  await context.addInitScript(() => { localStorage.setItem('blog-mode', 'dark'); localStorage.setItem('blog-mode-set', '1'); });
  const page = await context.newPage();
  await page.goto(`${base}/previews/bear-workshop/`);
  await page.locator('.bw-choice button[data-project="reading-companion"]').press('Enter');
  await page.locator('bear-workshop[data-phase="static"]').waitFor();
  await page.locator('.bw-poster').evaluate(image => image.decode());
  assert.equal(await page.locator('.bw-poster').getAttribute('src'), '/bear-stories/workshop/settled.png');
  assert.equal(await page.locator('canvas').isVisible(), false);
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
  await page.screenshot({ path: `${output}/mobile-reduced-motion.png`, fullPage: true });
  report.reducedMotion = true;
  await context.close();
  assert.deepEqual(report.errors, []);
} finally {
  await browser.close();
  await writeFile(`${output}/report.json`, JSON.stringify(report, null, 2));
}
console.log(JSON.stringify(report));
