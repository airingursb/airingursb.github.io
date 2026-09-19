import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { chromium } from 'playwright';

const baseURL = process.env.EDITORIAL_QA_URL ?? 'http://localhost:4414';
const output = process.env.EDITORIAL_QA_OUTPUT ?? '/private/tmp/editorial-components-qa';
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const report = [];
try {
  for (const lang of ['zh', 'en']) {
    for (const width of [375, 768, 1280]) {
      for (const theme of ['light', 'dark']) {
        const context = await browser.newContext({ viewport: { width, height: 900 }, hasTouch: width === 375, isMobile: width === 375, colorScheme: theme });
        await context.addInitScript((value) => {
          localStorage.setItem('blog-mode', value);
          localStorage.setItem('blog-mode-set', '1');
        }, theme);
        let requests = 0;
        let response = { status: 500, body: { ok: true, alreadySubscribed: false } };
        let release;
        let hold = false;
        const sent = [];
        await context.route('**/api/subscribe', async (route) => {
          requests++;
          sent.push(route.request().postDataJSON());
          if (hold) await new Promise(resolve => { release = resolve; });
          await route.fulfill({ status: response.status, contentType: 'application/json', body: JSON.stringify(response.body) });
        });
        const page = await context.newPage();
        const errors = [];
        page.on('pageerror', error => errors.push({ message: error.message, stack: error.stack }));
        await page.goto(`${baseURL}${lang === 'en' ? '/en' : ''}/posts/weekly-36/`, { waitUntil: 'domcontentloaded' });
        const section = page.locator('[data-newspaper-subscription]');
        await page.evaluate(() => document.addEventListener('editorial-actor-start', event => {
          if (event.target.closest('[data-newspaper-subscription]')) event.target.dataset.lastStartedClip = event.detail.clip;
        }, true));
        await page.evaluate(() => document.fonts.ready);
        await page.locator('[data-newspaper-subscription][data-subscription-state="idle"]').waitFor();
        assert.equal(await page.locator('html').getAttribute('data-mode'), theme);
        assert.equal(await section.locator('.newspaper-unsubscribe').evaluate(element => element.getBoundingClientRect().height <= Number.parseFloat(getComputedStyle(element).lineHeight) + 1), true, 'Unsubscribe reassurance stays on one line');
        const paper = page.locator('[data-page-paper]').first();
        await paper.scrollIntoViewIfNeeded();
        assert.equal(await paper.locator('.next-page-description').isVisible(), true, 'Selected C keeps the excerpt readable without disclosure');
        assert.equal(await paper.locator('.next-page-read').getAttribute('href'), await paper.locator('[data-article-card]').getAttribute('href'));
        await paper.locator('img').evaluateAll(images => Promise.all(images.map(image => image.decode())));
        const layout = await page.locator('[data-article-ending]').evaluate(element => {
          const next = element.querySelector('[data-next-page-preview]').getBoundingClientRect();
          const newsletter = element.querySelector('[data-newspaper-subscription]').getBoundingClientRect();
          const like = document.querySelector('.article-like-section').getBoundingClientRect();
          return { stacked: newsletter.top >= next.bottom, sideBySide: newsletter.left > next.right, likesBefore: like.bottom <= element.getBoundingClientRect().top };
        });
        assert.equal(layout.likesBefore, true, 'Original prominent like control precedes direction C');
        assert.equal(width <= 600 ? layout.stacked : layout.sideBySide, true);
        await page.locator('[data-article-ending]').screenshot({ path: `${output}/${lang}-${width}-${theme}-preview.png` });
        const actor = section.locator('[data-editorial-actor]');
        await page.waitForFunction(() => Number(document.querySelector('[data-newspaper-subscription] [data-editorial-actor]')?.dataset.actorFrame) > 2);
        const initialFrame = await actor.getAttribute('data-actor-frame');
        await page.waitForFunction(frame => document.querySelector('[data-newspaper-subscription] [data-editorial-actor]')?.dataset.actorFrame !== frame, initialFrame);
        assert.equal(await actor.getAttribute('data-actor-loop'), 'true');
        await section.locator('h3').click();
        await section.screenshot({ path: `${output}/${lang}-${width}-${theme}-idle.png` });
        await page.screenshot({ path: `${output}/${lang}-${width}-${theme}-layout.png` });
        const href = await paper.locator('[data-article-card]').getAttribute('href');
        assert.ok(href.startsWith(lang === 'en' ? '/en/posts/' : '/posts/'));
        const input = section.locator('input[type=email]');
        const submit = section.locator('button[type=submit]');
        await input.fill('invalid');
        await submit.click();
        assert.equal(requests, 0, 'Native email validation prevents invalid submission');
        await input.fill('reader@example.test');
        hold = true;
        await submit.click();
        await page.waitForFunction(() => document.querySelector('[data-newspaper-subscription]')?.dataset.subscriptionState === 'submitting');
        assert.equal(await submit.isDisabled(), true);
        assert.equal(await input.evaluate(element => element.readOnly), true);
        await input.press('Enter');
        assert.equal(requests, 1, 'Submitting remains single-flight');
        assert.equal(typeof release, 'function');
        release();
        hold = false;
        await page.waitForFunction(() => document.querySelector('[data-newspaper-subscription]')?.dataset.subscriptionState === 'error');
        assert.equal(await input.inputValue(), 'reader@example.test');
        assert.equal(await submit.isEnabled(), true);
        await section.screenshot({ path: `${output}/${lang}-${width}-${theme}-error.png` });
        response = { status: 200, body: { ok: true, alreadySubscribed: true } };
        await submit.click();
        await page.waitForFunction(() => document.querySelector('[data-newspaper-subscription]')?.dataset.subscriptionState === 'already');
        assert.equal(await input.inputValue(), 'reader@example.test');
        assert.notEqual(await actor.getAttribute('data-last-started-clip'), 'subscribe', 'Duplicate subscription never performs success');
        await section.screenshot({ path: `${output}/${lang}-${width}-${theme}-already.png` });
        response = { status: 200, body: { ok: true, alreadySubscribed: false } };
        await submit.click();
        await page.waitForFunction(() => document.querySelector('[data-newspaper-subscription]')?.dataset.subscriptionState === 'confirmed');
        assert.equal(await input.inputValue(), '');
        await page.waitForFunction(() => document.querySelector('[data-newspaper-subscription] [data-editorial-actor]')?.dataset.lastStartedClip === 'subscribe');
        await section.screenshot({ path: `${output}/${lang}-${width}-${theme}-confirmed.png` });
        const dimensions = await section.evaluate(element => {
          const actor = element.querySelector('[data-editorial-actor]').getBoundingClientRect();
          const button = element.querySelector('button').getBoundingClientRect();
          const field = element.querySelector('input[type=email]').getBoundingClientRect();
          return { section: element.getBoundingClientRect().width, actor: { width: actor.width, height: actor.height }, buttonHeight: button.height, inputHeight: field.height, overflow: document.documentElement.scrollWidth > document.documentElement.clientWidth };
        });
        assert.equal(dimensions.overflow, false, 'Page has no horizontal overflow');
        assert.ok(dimensions.buttonHeight >= 44 && dimensions.inputHeight >= 44);
        assert.equal(requests, 3);
        assert.ok(sent.every(body => body.email === 'reader@example.test' && body.lang === lang));
        report.push({ lang, width, theme, requests, dimensions, pageErrors: errors });
        console.log(JSON.stringify(report.at(-1)));
        await context.close();
      }
    }
  }
} finally {
  await writeFile(`${output}/report.json`, JSON.stringify(report, null, 2));
  await browser.close();
}

console.log(`Completed ${report.length} subscription scenarios; browser closed.`);
process.exit(0);
