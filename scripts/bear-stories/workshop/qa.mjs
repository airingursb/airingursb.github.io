import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';

const base = process.argv[2] ?? 'http://localhost:4406';
const output = 'output/bear-stories/workshop/qa';
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const report = { base, captured: new Date().toISOString(), screenshots: [], scenarios: [], errors: [] };
const route = language => `${base}/${language === 'en' ? 'en/' : ''}previews/bear-workshop/`;

async function open(options = {}) {
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 }, ...options });
  await context.route('**/analytics.ursb.me/**', request => request.abort());
  await context.addInitScript(theme => {
    localStorage.setItem('blog-mode', theme);
    localStorage.setItem('blog-mode-set', '1');
  }, options.colorScheme ?? 'light');
  const page = await context.newPage();
  page.on('pageerror', error => report.errors.push(error.message));
  return { context, page };
}

async function capture(page, name) {
  const file = `${output}/${name}.png`;
  await page.screenshot({ path: file, fullPage: true });
  report.screenshots.push(file);
}

try {
  for (const language of ['zh', 'en']) for (const width of [375, 768, 1280]) for (const theme of ['light', 'dark']) {
    const { context, page } = await open({ viewport: { width, height: 900 }, colorScheme: theme });
    const response = await page.goto(route(language));
    assert.equal(response.status(), 200);
    await page.locator('bear-workshop[data-ready]').waitFor();
    await page.locator('.bw-poster').evaluate(image => image.decode());
    const layout = await page.evaluate(() => ({
      overflow: document.documentElement.scrollWidth > innerWidth,
      language: document.documentElement.lang,
      theme: document.documentElement.getAttribute('data-mode'),
      controls: [...document.querySelectorAll('bear-workshop button')].map(button => {
        const box = button.getBoundingClientRect(); return { width: box.width, height: box.height };
      }),
    }));
    assert.equal(layout.overflow, false);
    assert.equal(layout.language, language);
    assert.equal(layout.theme, theme);
    assert.ok(layout.controls.every(box => box.width >= 44 && box.height >= 44));
    await capture(page, `${language}-${width}-${theme}`);
    await context.close();
  }
  report.scenarios.push('12 locale / viewport / theme combinations: no overflow, correct language, every control at least 44px.');

  {
    const { context, page } = await open({ colorScheme: 'dark' });
    await page.goto(route('zh'));
    await page.locator('.bw-hotspot-reading-companion').click();
    await page.waitForFunction(() => Number(document.querySelector('bear-workshop').dataset.frame) >= 24);
    await capture(page, 'motion-tightening');
    await page.locator('.bw-choice button[data-project="living-scenes"]').click();
    await page.waitForFunction(() => Number(document.querySelector('bear-workshop').dataset.frame) >= 60);
    await capture(page, 'motion-smoke');
    await page.waitForFunction(() => Number(document.querySelector('bear-workshop').dataset.frame) >= 108);
    await capture(page, 'motion-adjustment');
    await page.locator('bear-workshop[data-phase="settled"]').waitFor({ timeout: 20000 });
    assert.equal(await page.locator('bear-workshop').getAttribute('data-project'), 'living-scenes');
    assert.equal(await page.locator('bear-workshop').getAttribute('data-frame'), '180');
    assert.equal(await page.locator('[data-result="living-scenes"]').isVisible(), true);
    assert.equal(await page.locator('[data-result="reading-companion"]').isVisible(), false);
    assert.equal(page.url(), route('zh'));
    await capture(page, 'motion-settled');
    report.scenarios.push('Both choices work; a second selection during motion coalesces without restarting or redirecting; complete frame 180 is restful.');
    await context.close();
  }

  {
    const { context, page } = await open({ viewport: { width: 375, height: 900 }, reducedMotion: 'reduce', colorScheme: 'dark' });
    const atlases = [];
    page.on('request', request => { if (request.url().includes('workshop-atlas')) atlases.push(request.url()); });
    await page.goto(route('en'));
    await page.locator('.bw-choice button[data-project="reading-companion"]').press('Enter');
    await page.locator('bear-workshop[data-phase="static"]').waitFor();
    assert.equal(await page.locator('.bw-poster').getAttribute('src'), '/bear-stories/workshop/settled.png');
    assert.equal(await page.locator('canvas').isVisible(), false);
    assert.equal(atlases.length, 0);
    await capture(page, 'reduced-motion-keyboard');
    const destination = await page.locator('[data-result="reading-companion"] .bw-exhibit-link').getAttribute('href');
    assert.equal(destination, '/en/playbook/reading-companion/');
    await page.locator('[data-result="reading-companion"] .bw-exhibit-link').click();
    await page.waitForURL(`${base}/en/playbook/reading-companion/`);
    report.scenarios.push('Reduced motion uses final PNG without requesting atlas; Enter selects project; explicit real exhibit link navigates correctly.');
    await context.close();
  }

  {
    const { context, page } = await open({ colorScheme: 'dark' });
    await context.route('**/workshop-atlas.webp', request => request.abort());
    await page.goto(route('zh'));
    await page.locator('.bw-hotspot-living-scenes').click();
    await page.locator('bear-workshop[data-phase="failure"]').waitFor();
    assert.equal(await page.locator('.bw-poster').isVisible(), true);
    assert.equal(await page.locator('[data-result="living-scenes"] .bw-exhibit-link').isVisible(), true);
    await capture(page, 'asset-failure');
    report.scenarios.push('Blocked atlas retains transparent poster and real selected project link.');
    await context.close();
  }

  {
    const { context, page } = await open({ javaScriptEnabled: false, viewport: { width: 375, height: 900 } });
    await page.goto(route('zh'));
    assert.equal(await page.locator('.bw-direct-link').count(), 2);
    assert.equal(await page.locator('.bw-direct-link').nth(1).isVisible(), true);
    await capture(page, 'no-js');
    report.scenarios.push('Without JS, complete poster and both real project links remain visible.');
    await context.close();
  }

  {
    const { context, page } = await open({ viewport: { width: 375, height: 420 } });
    await page.goto(route('zh'));
    await page.locator('.bw-hotspot-living-scenes').click();
    await page.waitForFunction(() => Number(document.querySelector('bear-workshop').dataset.frame) >= 8);
    await page.keyboard.press('End');
    await page.waitForFunction(() => document.querySelector('.bw-stage').getBoundingClientRect().bottom <= 0);
    await page.waitForTimeout(100);
    const paused = await page.locator('bear-workshop').getAttribute('data-frame');
    await page.waitForTimeout(400);
    assert.equal(await page.locator('bear-workshop').getAttribute('data-frame'), paused);
    await page.locator('.bw-stage').scrollIntoViewIfNeeded();
    await page.waitForFunction(frame => Number(document.querySelector('bear-workshop').dataset.frame) > Number(frame), paused);
    report.scenarios.push('Native scrolling out of view pauses the exact frame; scrolling back resumes it.');
    await context.close();
  }
  assert.deepEqual(report.errors, []);
  report.result = 'passed';
} finally {
  await writeFile(`${output}/report.json`, JSON.stringify(report, null, 2));
  await browser.close();
}
console.log(JSON.stringify(report));
