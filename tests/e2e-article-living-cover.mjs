import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { chromium } from 'playwright';

const baseURL = process.env.EDITORIAL_QA_URL ?? 'http://localhost:4414';
const output = process.env.EDITORIAL_QA_OUTPUT ?? 'output/editorial-footer-v2/cover';
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ channel: 'chrome', headless: process.env.EDITORIAL_QA_HEADED !== '1' });
const report = [];
const heroSelector = '.cover-section video';
const playing = page => page.waitForFunction(() => {
  const video = document.querySelector('.cover-section video');
  return video && !video.paused && video.currentTime > .1 && video.hasAttribute('data-playing');
});
async function reader({ width = 1280, lang = 'zh', theme = 'light', ...options } = {}) {
  const context = await browser.newContext({ viewport: { width, height: 900 }, hasTouch: width === 375, isMobile: width === 375, colorScheme: theme, ...options });
  await context.addInitScript(value => {
    localStorage.setItem('blog-mode', value);
    localStorage.setItem('blog-mode-set', '1');
  }, theme);
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', error => errors.push({ message: error.message, stack: error.stack }));
  return { context, page, errors, url: `${baseURL}${lang === 'en' ? '/en' : ''}/posts/weekly-36/` };
}
try {
  for (const lang of ['zh', 'en']) for (const width of [375, 768, 1280]) for (const theme of ['light', 'dark']) {
    // Given a reader arriving directly, with no mouse hover or focus on the hero.
    const { context, page, url, errors } = await reader({ lang, width, theme });
    await page.goto(url, { waitUntil: 'domcontentloaded' });
    // When the hero becomes visible it starts the existing clip on every viewport.
    await page.locator('.cover-section').scrollIntoViewIfNeeded();
    assert.equal(await page.locator(heroSelector).count(), 1, 'A visible article hero must mount its living cover');
    await playing(page);
    // Then media is silent, preserves one transition target and retains its real poster.
    const state = await page.locator('.cover-section').evaluate(section => {
      const video = section.querySelector('video');
      const image = section.querySelector('img');
      const art = section.querySelector('[data-article-cover]').getBoundingClientRect();
      const media = video.getBoundingClientRect();
      return { currentTime: video.currentTime, muted: video.muted, playsInline: video.playsInline, source: video.currentSrc, targets: section.querySelectorAll('[data-article-cover]').length, poster: image.currentSrc, imageAlt: image.alt, width: art.width, height: art.height, mediaWidth: media.width, mediaHeight: media.height, overflow: document.documentElement.scrollWidth > document.documentElement.clientWidth };
    });
    assert.equal(state.muted, true);
    assert.equal(state.playsInline, true);
    assert.equal(state.targets, 1);
    assert.equal(state.overflow, false);
    assert.equal(state.mediaWidth, state.width);
    assert.equal(state.mediaHeight, state.height);
    assert.match(state.source, /\/photo-motion\/palace-clouds\.mp4$/);
    assert.ok(state.poster && state.imageAlt);
    await page.locator('.cover-section').screenshot({ path: `${output}/${lang}-${width}-${theme}-playing.png` });
    assert.deepEqual(errors.filter(error => !error.stack?.includes('at apiGet (')), [], 'No errors beyond the existing unavailable article API');
    report.push({ scenario: 'visible article arrival', lang, viewport: width, theme, ...state, errors });
    console.log(`${lang}-${width}-${theme} plays`);
    await context.close();
  }
  {
    // Given a visible hero midway through its one permitted cycle.
    const { context, page, url } = await reader();
    await page.goto(url, { waitUntil: 'domcontentloaded' });
    await playing(page);
    await page.locator('.cover-section').screenshot({ path: `${output}/motion-start.png` });
    await page.waitForFunction(() => document.querySelector('.cover-section video')?.currentTime > 1);
    await page.locator('.cover-section').screenshot({ path: `${output}/motion-middle.png` });
    // When the reader scrolls away and returns, elapsed video time is preserved.
    await page.locator('.content-grid h2').first().scrollIntoViewIfNeeded();
    await page.waitForFunction(() => document.querySelector('.cover-section video')?.paused);
    const pausedAt = await page.locator(heroSelector).evaluate(video => video.currentTime);
    await page.locator('.cover-section').scrollIntoViewIfNeeded();
    await playing(page);
    const resumedAt = await page.locator(heroSelector).evaluate(video => video.currentTime);
    assert.ok(resumedAt >= pausedAt, `Resume must preserve elapsed time (${pausedAt} -> ${resumedAt})`);
    await page.waitForFunction(() => document.querySelector('.cover-section video')?.ended);
    await page.waitForFunction(() => getComputedStyle(document.querySelector('.cover-section video')).opacity === '0');
    await page.locator('.cover-section').screenshot({ path: `${output}/motion-ended-poster.png` });
    const duration = await page.locator(heroSelector).evaluate(video => video.duration);
    report.push({ scenario: 'offscreen pause, resume, one-cycle ending', pausedAt, resumedAt, duration });
    await context.close();
  }
  {
    // Given a real video with a controlled browser-visibility fixture.
    const { context, page, url } = await reader();
    await context.addInitScript(() => {
      let hidden = false;
      Object.defineProperty(document, 'hidden', { get: () => hidden });
      window.setCoverTestVisibility = value => { hidden = value; document.dispatchEvent(new Event('visibilitychange')); };
    });
    await page.goto(url, { waitUntil: 'domcontentloaded' });
    await playing(page);
    // When visibility changes, the media pauses and resumes without rewinding.
    await page.evaluate(() => window.setCoverTestVisibility(true));
    const hidden = await page.locator(heroSelector).evaluate(video => ({ paused: video.paused, time: video.currentTime }));
    assert.equal(hidden.paused, true);
    await page.evaluate(() => window.setCoverTestVisibility(false));
    await playing(page);
    const resumed = await page.locator(heroSelector).evaluate(video => video.currentTime);
    assert.ok(resumed >= hidden.time);
    await page.emulateMedia({ reducedMotion: 'reduce' });
    const reduced = await page.locator(heroSelector).evaluate(video => ({ paused: video.paused, playing: video.hasAttribute('data-playing'), display: getComputedStyle(video).display }));
    assert.deepEqual(reduced, { paused: true, playing: false, display: 'none' });
    report.push({ scenario: 'controlled visibility fixture and live reduced-motion preference', hidden, resumed, reduced, limitation: 'Visibility property/event injected; OS tab-background behavior not claimed.' });
    await context.close();
  }
  for (const preference of ['reduced', 'saveData', 'failedMedia', 'noJavaScript']) {
    // Given a reader whose preferences or media availability require the original still.
    const { context, page, url, errors } = await reader({ reducedMotion: preference === 'reduced' ? 'reduce' : 'no-preference', javaScriptEnabled: preference !== 'noJavaScript' });
    let mediaRequests = 0;
    page.on('request', request => { if (request.url().endsWith('/photo-motion/palace-clouds.mp4')) mediaRequests++; });
    if (preference === 'saveData') await context.addInitScript(() => Object.defineProperty(navigator.connection, 'saveData', { get: () => true }));
    if (preference === 'failedMedia') await context.route('**/photo-motion/palace-clouds.mp4', route => route.fulfill({ status: 503, body: '' }));
    // When the article is shown, its poster remains usable and unnecessary media stays unloaded.
    await page.goto(url, { waitUntil: 'domcontentloaded' });
    await page.locator('.cover-section').scrollIntoViewIfNeeded();
    await page.locator('.cover-section img').evaluate(image => image.decode());
    if (preference === 'failedMedia') await page.waitForFunction(() => document.querySelector('.cover-section video')?.error !== null);
    const fallback = await page.locator('.cover-section').evaluate(section => {
      const image = section.querySelector('img');
      const video = section.querySelector('video');
      return { posterLoaded: image.complete && image.naturalWidth > 0, source: video?.getAttribute('src') ?? null, playing: video?.hasAttribute('data-playing') ?? false, paused: video?.paused ?? true, opacity: video ? getComputedStyle(video).opacity : null };
    });
    assert.equal(fallback.posterLoaded, true);
    assert.equal(fallback.playing, false);
    assert.equal(fallback.paused, true);
    if (preference !== 'failedMedia') assert.equal(mediaRequests, 0);
    assert.deepEqual(errors.filter(error => !error.stack?.includes('at apiGet (')), [], 'No errors beyond the existing unavailable article API');
    await page.locator('.cover-section').screenshot({ path: `${output}/fallback-${preference}.png` });
    report.push({ scenario: preference, mediaRequests, ...fallback, errors });
    await context.close();
  }
  for (const lang of ['zh', 'en']) {
    // Given the existing animated blog card and native page transition.
    const { context, page, errors } = await reader({ lang });
    await context.addInitScript(() => {
      window.addEventListener('DOMContentLoaded', () => {
        for (const name of ['pageswap', 'pagereveal']) window.addEventListener(name, event => {
        const entries = JSON.parse(sessionStorage.getItem('cover-transition-evidence') ?? '[]');
        entries.push({ event: name, path: location.pathname, transition: Boolean(event.viewTransition), targets: document.querySelectorAll('[style*="view-transition-name: article-cover"]').length, visibleOverlays: Array.from(document.querySelectorAll('.living-cover-video')).filter(video => !video.hidden && video.hasAttribute('data-playing')).length });
        sessionStorage.setItem('cover-transition-evidence', JSON.stringify(entries));
        });
      });
    });
    await page.goto(`${baseURL}${lang === 'en' ? '/en' : ''}/blog/`, { waitUntil: 'domcontentloaded' });
    const card = page.locator('[data-article-card][data-slug="weekly-36"]').first();
    await card.scrollIntoViewIfNeeded();
    await card.hover();
    await page.waitForFunction(() => Array.from(document.querySelectorAll('.living-cover-video')).some(video => !video.paused && video.currentTime > .1));
    // When opening the actual article and going Back, snapshots use one still cover.
    await card.click();
    await page.waitForURL('**/posts/weekly-36/');
    await playing(page);
    await page.goBack({ waitUntil: 'domcontentloaded' });
    await card.waitFor({ state: 'visible' });
    const transitions = await page.evaluate(() => JSON.parse(sessionStorage.getItem('cover-transition-evidence') ?? '[]'));
    report.push({ scenario: 'blog hover, article navigation, native Back', lang, transitions, errors });
    const active = transitions.filter(entry => entry.transition);
    assert.ok(active.some(entry => entry.event === 'pageswap' && entry.path.endsWith('/blog/')));
    assert.ok(active.some(entry => entry.event === 'pagereveal' && entry.path.endsWith('/posts/weekly-36/')));
    assert.ok(active.every(entry => entry.targets === 1));
    assert.ok(active.filter(entry => entry.event === 'pageswap').every(entry => entry.visibleOverlays === 0));
    assert.deepEqual(errors.filter(error => !error.stack?.includes('at apiGet (')), [], 'No errors beyond the existing unavailable article API');
    await context.close();
  }
} finally {
  await writeFile(`${output}/report.json`, JSON.stringify(report, null, 2));
  await browser.close();
}
