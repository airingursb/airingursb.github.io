import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import { mkdir, stat, writeFile } from 'node:fs/promises';

const root = 'output/bear-stories/revision-2/suitcase/qa';
await mkdir(root, { recursive: true });
const bounded = async (promise, label) => {
  let timer;
  try { return await Promise.race([promise, new Promise((_, reject) => { timer = setTimeout(() => reject(new Error(`${label} timed out`)), 5000); })]); }
  finally { clearTimeout(timer); }
};
const server = await chromium.launchServer({ channel: 'chrome', headless: true });
const browser = await chromium.connect(server.wsEndpoint());
const errors = [], results = [];
try {
  for (const width of [1280, 375]) for (const theme of ['dark', 'light']) {
    const motion = width === 1280;
    const key = `${width}-${theme}`;
    const context = await browser.newContext({ viewport: { width, height: width === 1280 ? 900 : 812 }, reducedMotion: motion ? 'no-preference' : 'reduce' });
    await context.route('**://analytics.ursb.me/**', route => route.abort());
    await context.addInitScript(mode => {
      localStorage.setItem('blog-mode', mode);
      localStorage.setItem('blog-mode-set', '1');
      const live = new Map();
      window.suitcaseMemory = { peakImages: 0, peakDecodedBytes: 0, liveImages: 0, releases: 0 };
      window.suitcaseMotion = { open: new Set(), close: new Set(), latest: null };
      const update = () => {
        const metric = window.suitcaseMemory;
        metric.liveImages = live.size;
        metric.peakImages = Math.max(metric.peakImages, live.size);
        metric.peakDecodedBytes = Math.max(metric.peakDecodedBytes, [...live.keys()].reduce((n, image) => n + image.naturalWidth * image.naturalHeight * 4, 0));
      };
      const descriptor = Object.getOwnPropertyDescriptor(HTMLImageElement.prototype, 'src');
      Object.defineProperty(HTMLImageElement.prototype, 'src', { ...descriptor, set(value) {
        if (/\/bear-stories\/suitcase\/(open|close)-\d\.webp/.test(value)) {
          live.set(this, value);
          this.addEventListener('load', update, { once: true });
        } else if (live.delete(this)) window.suitcaseMemory.releases++;
        descriptor.set.call(this, value);
        update();
      } });
      const draw = CanvasRenderingContext2D.prototype.drawImage;
      CanvasRenderingContext2D.prototype.drawImage = function (...args) {
        const value = draw.apply(this, args);
        const match = args[0]?.src?.match(/\/(open|close)-(\d)\.webp/);
        if (match && this.canvas.matches('[data-case-canvas]')) {
          const index = Number(match[2]) * 48 + Math.floor(args[2] / 270) * 6 + args[1] / 480;
          window.suitcaseMotion[match[1]].add(index);
          window.suitcaseMotion.latest = { clip: match[1], index };
        }
        return value;
      };
    }, theme);
    const page = await context.newPage();
    page.on('pageerror', error => errors.push(error.message));
    const requests = new Set();
    page.on('request', request => { const match = request.url().match(/\/bear-stories\/suitcase\/((?:open|close)-\d\.webp)/); if (match) requests.add(match[1]); });
    const cdp = await context.newCDPSession(page);
    await cdp.send('Performance.enable');
    let peakJsHeapBytes = 0;
    const heap = async () => { const { metrics } = await cdp.send('Performance.getMetrics'); peakJsHeapBytes = Math.max(peakJsHeapBytes, metrics.find(metric => metric.name === 'JSHeapUsedSize')?.value || 0); };
    const prefix = theme === 'dark' ? '/en' : '';
    const response = await page.goto(`http://localhost:4407${prefix}/previews/bear-suitcase/`, { waitUntil: 'domcontentloaded' });
    assert.equal(response.status(), 200);
    await page.locator('[data-case-open] img').evaluate(image => image.decode());
    await page.screenshot({ path: `${root}/${key}-closed.png` });
    await page.locator('[data-case-open]').click();
    if (motion) {
      await page.waitForFunction(() => document.querySelector('[data-suitcase]').hasAttribute('data-playing'));
      await page.screenshot({ path: `${root}/${key}-opening.png` });
      await page.waitForFunction(() => window.suitcaseMotion.latest?.clip === 'open' && window.suitcaseMotion.latest.index >= 72);
      await heap();
      await page.screenshot({ path: `${root}/${key}-unfolding.png` });
    }
    await page.waitForFunction(() => document.querySelector('[data-suitcase]').dataset.state === 'open');
    await heap();
    await page.screenshot({ path: `${root}/${key}-open.png` });
    for (const slug of ['img-2604', 'img-2251', 'dscf0841']) {
      await page.locator(`[data-memory="${slug}"]`).click();
      await page.locator(`[data-photo="${slug}"] img`).evaluate(image => image.decode());
      assert.equal(await page.locator(`[data-photo="${slug}"] .suitcase-real-photo`).getAttribute('href'), `/photos/${slug}/`);
      await page.screenshot({ path: `${root}/${key}-${slug}.png` });
    }
    assert.equal(await page.locator('body').evaluate(element => element.scrollWidth <= window.innerWidth), true);
    await page.locator('[data-case-pack]').click();
    if (motion) {
      await page.waitForFunction(() => window.suitcaseMotion.latest?.clip === 'close' && window.suitcaseMotion.latest.index >= 63);
      await heap();
      await page.screenshot({ path: `${root}/${key}-packing.png` });
    }
    await page.waitForFunction(() => document.querySelector('[data-suitcase]').dataset.state === 'closed');
    assert.equal(await page.locator('[data-case-open]').evaluate(element => element === document.activeElement), true);
    const memory = await page.evaluate(() => window.suitcaseMemory);
    const rendered = await page.evaluate(() => ({ open: window.suitcaseMotion.open.size, close: window.suitcaseMotion.close.size }));
    assert.ok(memory.peakImages <= 3);
    assert.ok(memory.peakDecodedBytes <= 2 * 2880 * 2160 * 4);
    assert.equal(memory.liveImages, 0);
    const downloadBytes = (await Promise.all([...requests].map(file => stat(`public/bear-stories/suitcase/${file}`).then(fileStat => fileStat.size)))).reduce((n, bytes) => n + bytes, 0);
    assert.equal(requests.size, motion ? 7 : 0);
    await page.locator('[data-case-open]').click();
    await page.keyboard.press('Escape');
    await page.waitForFunction(() => window.suitcaseMemory.liveImages === 0);
    assert.equal(await page.locator('[data-case-dialog]').isVisible(), false);
    await page.screenshot({ path: `${root}/${key}-returned.png` });
    results.push({ key, state: 'PASS', memory, rendered, peakJsHeapBytes, firstFullOpenCloseAtlasBytes: downloadBytes, uniqueAtlasRequests: requests.size });
    await bounded(context.close(), 'Context close');
  }
  assert.deepEqual(errors, []);
  await writeFile(`${root}/report.json`, JSON.stringify({ origin: 'http://localhost:4407', browser: 'Chrome stable / Playwright', analyticsBlocked: true, results, errors }, null, 2));
  console.log(JSON.stringify({ scenarios: results.length, state: 'PASS', results }));
} finally {
  const closed = await Promise.allSettled([bounded(browser.close(), 'Browser close'), bounded(server.close(), 'Server close')]);
  if (closed.some(result => result.status === 'rejected')) server.process().kill('SIGTERM');
}
