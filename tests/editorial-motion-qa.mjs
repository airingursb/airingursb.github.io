import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

export const baseURL = process.env.EDITORIAL_QA_URL ?? 'http://localhost:4415';
export const output = resolve(process.env.EDITORIAL_QA_OUTPUT ?? 'output/editorial-footer/evidence/final');

export async function openEditorialPage(browser, scenario) {
  const context = await browser.newContext({
    viewport: { width: scenario.width, height: 900 },
    hasTouch: scenario.width === 375,
    isMobile: scenario.width === 375,
    colorScheme: scenario.theme,
    reducedMotion: scenario.reduced ? 'reduce' : 'no-preference',
  });
  await context.addInitScript(({ theme, surprise }) => {
    localStorage.setItem('blog-mode', theme);
    localStorage.setItem('blog-mode-set', '1');
    sessionStorage.setItem('editorial-bookcart-surprise-v1', surprise ? 'pending' : 'skip');
    if (surprise) Math.random = () => 0;
    window.__editorialEvents = [];
    for (const kind of ['start', 'end']) document.addEventListener(`editorial-actor-${kind}`, event => {
      window.__editorialEvents.push({ kind, clip: event.detail.clip, manifest: event.target.dataset.editorialActor, time: performance.now() });
    }, true);
  }, { theme: scenario.theme, surprise: scenario.surprise === true });
  const subscriptions = { mode: 'blocked', requests: [] };
  await context.route('**/api/subscribe', async route => {
    subscriptions.requests.push(route.request().postDataJSON());
    const status = subscriptions.mode === 'confirmed' || subscriptions.mode === 'already' ? 200 : 503;
    await route.fulfill({ status, contentType: 'application/json', body: JSON.stringify({ ok: status === 200, alreadySubscribed: subscriptions.mode === 'already' }) });
  });
  const page = await context.newPage();
  const pageErrors = [];
  const mediaRequests = [];
  const mediaFailures = [];
  const localAssetFailures = [];
  const localAsset = request => request.url().startsWith(baseURL) && ['stylesheet', 'script'].includes(request.resourceType());
  page.on('pageerror', error => pageErrors.push({ message: error.message, stack: error.stack }));
  page.on('request', request => {
    if (request.url().includes('/editorial-motion/')) mediaRequests.push(request.url());
  });
  page.on('requestfailed', request => {
    if (request.url().includes('/editorial-motion/')) mediaFailures.push({ url: request.url(), failure: request.failure() });
    if (localAsset(request)) localAssetFailures.push({ url: request.url(), failure: request.failure() });
  });
  page.on('response', response => {
    if (response.url().includes('/editorial-motion/') && !response.ok()) mediaFailures.push({ url: response.url(), status: response.status() });
    if (localAsset(response.request()) && !response.ok()) localAssetFailures.push({ url: response.url(), status: response.status() });
  });
  const prefix = scenario.lang === 'en' ? '/en' : '';
  const path = scenario.surface === 'blog' ? '/blog/#archive-bookcart'
    : scenario.surface === 'harness' ? '/previews/editorial-footer/'
      : scenario.surface === 'neighbors' ? '/posts/case-sensitivity/' : '/posts/weekly-36/';
  await page.goto(`${baseURL}${prefix}${path}`, { waitUntil: 'domcontentloaded' });
  assert.equal(await page.locator('html').getAttribute('data-mode'), scenario.theme);
  return { context, page, subscriptions, pageErrors, mediaRequests, mediaFailures, localAssetFailures };
}

export async function observeActor(actor) {
  await actor.evaluate(element => {
    if (element.__editorialQa) {
      element.__editorialQa.active = false;
      element.__editorialQa.lifetime.abort();
    }
    const lifetime = new AbortController();
    const record = { active: true, lifetime, events: [], frames: new Set(), hashes: new Set(), liveHashes: new Set(), posterFlashes: [], restWraps: 0, lastFrame: -1, lastLoopFrame: -1, drawn: false };
    element.__editorialQa = record;
    element.addEventListener('editorial-actor-start', event => {
      record.events.push({ kind: 'start', clip: event.detail.clip, time: performance.now() });
      record.liveHashes.clear();
      record.restWraps = 0;
      record.lastFrame = -1;
      record.lastLoopFrame = -1;
    }, { signal: lifetime.signal });
    element.addEventListener('editorial-actor-end', event => record.events.push({ kind: 'end', clip: event.detail.clip, time: performance.now() }), { signal: lifetime.signal });
    const canvas = element.querySelector('canvas');
    const poster = element.querySelector('img');
    const context = canvas.getContext('2d');
    const sample = () => {
      if (!element.isConnected || !record.active) return;
      const frame = Number(element.dataset.actorFrame ?? -1);
      const state = element.dataset.actorState;
      const displayed = !canvas.hidden && getComputedStyle(poster).visibility === 'hidden';
      if (record.drawn && ['playing', 'quiet', 'loading'].includes(state) && !displayed) record.posterFlashes.push({ frame, state, time: performance.now() });
      if (displayed) {
        record.drawn = true;
        record.frames.add(frame);
        if (frame !== record.lastFrame) {
          const pixels = context.getImageData(0, 0, canvas.width, canvas.height).data;
          let hash = 2166136261;
          for (let i = 0; i < pixels.length; i += 44) hash = Math.imul(hash ^ pixels[i] ^ pixels[i + 3], 16777619) >>> 0;
          record.hashes.add(hash);
          record.liveHashes.add(hash);
          record.lastFrame = frame;
        }
        if (element.dataset.actorLoop === 'true') {
          if (frame < record.lastLoopFrame) record.restWraps++;
          record.lastLoopFrame = frame;
        }
      }
      requestAnimationFrame(sample);
    };
    requestAnimationFrame(sample);
  });
}

export async function actorEvidence(actor) {
  return actor.evaluate(element => ({
    state: element.dataset.actorState,
    loop: element.dataset.actorLoop,
    frame: element.dataset.actorFrame,
    frameCount: element.__editorialQa.frames.size,
    pixelStates: element.__editorialQa.hashes.size,
    events: element.__editorialQa.events,
    posterFlashes: element.__editorialQa.posterFlashes,
    restWraps: element.__editorialQa.restWraps,
  }));
}

export async function waitForMotion(actor) {
  await actor.evaluate(element => new Promise((resolve, reject) => {
    const deadline = performance.now() + 20_000;
    const inspect = () => {
      if (element.dataset.actorState === 'playing' && element.__editorialQa.liveHashes.size >= 2) return resolve();
      if (element.dataset.actorState === 'unavailable') return reject(new Error('Editorial media unavailable'));
      if (performance.now() > deadline) return reject(new Error('Authored actor pixels did not change'));
      requestAnimationFrame(inspect);
    };
    inspect();
  }));
}

export async function waitForRest(actor, clip) {
  await actor.evaluate((element, expected) => new Promise((resolve, reject) => {
    const deadline = performance.now() + 40_000;
    const inspect = () => {
      const record = element.__editorialQa;
      if (record.events.some(event => event.kind === 'end' && event.clip === expected) && record.restWraps > 0) return resolve();
      if (element.dataset.actorState === 'unavailable') return reject(new Error('Editorial rest media unavailable'));
      if (performance.now() > deadline) return reject(new Error(`Performance ${expected} did not complete into a rest loop`));
      requestAnimationFrame(inspect);
    };
    inspect();
  }), clip);
  const evidence = await actorEvidence(actor);
  assert.equal(evidence.posterFlashes.length, 0, `${clip} must retain the canvas through the rest transition`);
  assert.equal(evidence.loop, 'true');
  return evidence;
}

export async function capture(page, name, options = {}) {
  await mkdir(output, { recursive: true });
  const path = `${output}/${name}.png`;
  await page.screenshot({ path, ...options });
  return path;
}

export async function saveReport(name, report) {
  await mkdir(output, { recursive: true });
  await writeFile(`${output}/${name}.json`, JSON.stringify(report, null, 2));
}

export async function assertPageHealth(session) {
  assert.equal(session.mediaFailures.length, 0, JSON.stringify(session.mediaFailures));
  assert.equal(session.localAssetFailures.length, 0, JSON.stringify(session.localAssetFailures));
  const newErrors = session.pageErrors.filter(error => !error.stack?.includes('at apiGet'));
  assert.equal(newErrors.length, 0, JSON.stringify(newErrors));
  const layout = await session.page.evaluate(() => {
    const clientWidth = document.documentElement.clientWidth;
    const selectors = '[data-archive-bookcart], [data-editorial-demo], [data-article-pet-dock], [data-next-page-preview], [data-newspaper-subscription]';
    const footerOverflow = [];
    for (const root of document.querySelectorAll(selectors)) for (const element of [root, ...root.querySelectorAll('*')]) {
      const rect = element.getBoundingClientRect();
      if (rect.width && (rect.left < -1 || rect.right > clientWidth + 1)) footerOverflow.push({ tag: element.tagName, class: element.className?.baseVal ?? element.className, left: rect.left, right: rect.right });
    }
    const bodyLinks = [...document.querySelectorAll('.post-content a')].flatMap(element => {
      const rect = element.getBoundingClientRect();
      return rect.right > clientWidth + 1 ? [{ href: element.href, text: element.textContent, right: rect.right }] : [];
    });
    const backgroundToken = getComputedStyle(document.documentElement).getPropertyValue('--c-bg').trim();
    const actorPosition = getComputedStyle(document.querySelector('[data-editorial-actor]')).position;
    return { clientWidth, innerWidth, scrollWidth: document.documentElement.scrollWidth, footerOverflow, bodyLinks, backgroundToken, actorPosition };
  });
  assert.ok(layout.backgroundToken, 'Site theme stylesheet must be present');
  assert.equal(layout.actorPosition, 'relative', 'Editorial actor stylesheet must be present');
  assert.deepEqual(layout.footerOverflow, [], 'Editorial components must fit the layout viewport');
  if (layout.scrollWidth > layout.clientWidth + 1) {
    const knownRoute = new URL(session.page.url()).pathname.endsWith('/posts/case-sensitivity/');
    const knownLinks = layout.bodyLinks.every(link => /chromium\.googlesource\.com|en\.wikipedia\.org\/wiki\/case_sensitivity/i.test(link.href));
    assert.ok(knownRoute && layout.bodyLinks.length > 0 && knownLinks, `Unexpected page overflow: ${JSON.stringify(layout)}`);
    assert.ok(Math.max(...layout.bodyLinks.map(link => link.right)) >= layout.scrollWidth - 2, 'Existing body links must explain the page overflow');
    return { ...layout, knownIssue: 'Existing case-sensitivity body links overflow on the live production baseline; editorial components remain inside clientWidth.' };
  }
  return layout;
}
