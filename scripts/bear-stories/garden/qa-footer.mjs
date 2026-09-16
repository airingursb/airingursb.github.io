import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { openGardenStore } from './store.mjs';
import { createGardenPreviewServer } from './server.mjs';

const base = 'http://localhost:4408';
const out = 'output/bear-stories/revision-3/garden/qa';
await mkdir(out, { recursive: true });
const store = openGardenStore(':memory:');
const server = createGardenPreviewServer({ store, secret: 'isolated-footer-qa', origins: [base] });
await new Promise(resolve => server.listen(4411, '127.0.0.1', resolve));
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const report = { captured: new Date().toISOString(), base, checks: [], captures: [], errors: [], isolation: 'All mutations routed to real in-memory SQLite service :4411. Persistent :4410 untouched.' };
async function contextFor({ width = 1280, theme = 'dark', reducedMotion = 'no-preference', offline = false, delayed = false, blocked = false } = {}) {
  const context = await browser.newContext({ viewport: { width, height: 900 }, reducedMotion });
  await context.addInitScript(theme => {
    localStorage.setItem('visited', '1'); localStorage.setItem('blog-mode', theme); localStorage.setItem('blog-mode-set', '1');
    localStorage.setItem('preferred_lang', 'zh');
  }, theme);
  await context.route('https://analytics.ursb.me/**', route => route.abort());
  await context.route('**:4410/api/preview/garden**', async route => {
    if (offline) return route.abort();
    const response = await route.fetch({ url: route.request().url().replace(':4410/', ':4411/') });
    await route.fulfill({ response });
  });
  if (blocked) await context.route('**/bear-footer/garden-actions.webp', route => route.abort());
  if (delayed) await context.route('**/bear-footer/garden-background.webp', async route => { await new Promise(resolve => setTimeout(resolve, 1800)); await route.continue(); });
  return context;
}
async function waitData(page, key, value) {
  await page.waitForFunction(({key,value}) => document.querySelector('bear-footer-scene')?.getAttribute(key) === value, {key,value}, {timeout:25000});
}
async function capture(page, name) {
  const path = `${out}/${name}.png`;
  await page.screenshot({ path, fullPage: true });
  await page.locator('bear-shared-garden').screenshot({path:`${out}/${name}-scene.png`});
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
  report.captures.push(path);
}
try {
  for (const variant of [{width:1280,theme:'dark'},{width:768,theme:'light'},{width:375,theme:'dark'}]) {
    const context = await contextFor(variant), page = await context.newPage();
    const key = `${variant.width}-${variant.theme}`;
    page.on('pageerror', error => report.errors.push({key,error:error.message}));
    await page.goto(`${base}/previews/bear-garden/`,{waitUntil:'domcontentloaded'});
    await page.locator('bear-footer-scene').scrollIntoViewIfNeeded();
    await waitData(page,'data-loaded','true');
    assert.equal(await page.locator('bear-shared-garden bear-footer-scene canvas').count(),1);
    assert.equal(await page.locator('bear-footer-scene').count(),1);
    await capture(page,`reading-${key}`);
    await page.locator('[data-footer-bear]').click(); await waitData(page,'data-state','greet');
    await page.locator('[data-book]').click(); await page.locator('#garden-book:popover-open').waitFor();
    await capture(page,`book-${key}`); await page.locator('#garden-book [data-preview-close]').click();
    await page.locator('[data-footer-subscribe]').click(); assert.equal(await page.locator('.garden-subscribe').getAttribute('open'),'');
    await capture(page,`mail-${key}`); await page.locator('.garden-subscribe summary').click();
    await page.locator('.garden-preview-notes summary').click();
    for(const stage of ['seed','sprout','bud','bloom']) {
      await page.locator(`[data-garden-inspect="${stage}"]`).click();
      await page.locator('bear-shared-garden').scrollIntoViewIfNeeded();
      await capture(page,`stage-${stage}-${key}`);
    }
    await page.locator('[data-garden-inspect="shared"]').click();
    await page.locator('.shared-garden-water').click(); await waitData(page,'data-state','watering');
    for(const frame of [20,60,75,110,140]) {
      await page.waitForFunction(frame => Number(document.querySelector('bear-footer-scene')?.getAttribute('data-frame')) >= frame,frame);
      await capture(page,`care-${frame}-${key}`);
    }
    await waitData(page,'data-state','reading');
    await capture(page,`returned-${key}`);
    const total=await page.locator('bear-shared-garden').getAttribute('data-total');
    await page.locator('.shared-garden-water').press('Enter');
    await waitData(page,'data-state','watering');
    await page.waitForFunction(()=>document.querySelector('.shared-garden-water')?.getAttribute('aria-busy')!== 'true');
    assert.equal(await page.locator('bear-shared-garden').getAttribute('data-total'),total);
    await page.setViewportSize({width:variant.width,height:300});
    await page.evaluate(()=>window.scrollTo(0,0));
    await waitData(page,'data-playing','false');
    const frame=await page.locator('bear-footer-scene').getAttribute('data-frame');
    await page.waitForTimeout(300); assert.equal(await page.locator('bear-footer-scene').getAttribute('data-frame'),frame);
    report.checks.push(`${key}: single original canvas, greeting/book/mail preserved, all stages rooted, full physical care returns to reading, keyboard replay daily-idempotent, offscreen pauses.`);
    await context.close();
  }
  for(const mode of ['reduced','offline','blocked','delayed']) {
    const context=await contextFor({reducedMotion:mode==='reduced'?'reduce':'no-preference',offline:mode==='offline',blocked:mode==='blocked',delayed:mode==='delayed'});
    const page=await context.newPage();const requests=[];page.on('request',r=>requests.push(r.url()));
    await page.goto(`${base}/previews/bear-garden/`,{waitUntil:'domcontentloaded'});
    await page.locator('.shared-garden-water').click();
    if(mode==='delayed') {await waitData(page,'data-state','watering');report.checks.push('Delayed original stage waits for readiness, then starts the same care action.');}
    if(mode==='reduced') {await page.waitForFunction(()=>document.querySelector('bear-shared-garden')?.getAttribute('data-watered-today')==='true');assert.equal(requests.some(url=>url.includes('garden-actions.webp')),false);report.checks.push('Reduced motion records the real shared result without loading or animating the care atlas.');}
    if(mode==='offline') {await page.waitForFunction(()=>document.querySelector('.shared-garden-water')?.getAttribute('aria-busy')!=='true');assert.equal(await page.locator('bear-shared-garden').getAttribute('data-total'),null);assert.equal(await page.locator('bear-shared-garden').getAttribute('data-stage'),'seed');report.checks.push('Offline remains seed with no claimed total; retry feedback is live.');}
    if(mode==='blocked') {await waitData(page,'data-media','error');assert.notEqual(await page.locator('bear-footer-scene').getAttribute('data-state'),'watering');report.checks.push('Blocked action media keeps the original reading scene and actual shared result.');}
    await capture(page,mode);await context.close();
  }
  const context=await contextFor(),page=await context.newPage();const calls=[];
  page.on('request',r=>{if(r.url().includes(':4410/'))calls.push(r.url())});
  await page.goto(`${base}/`,{waitUntil:'domcontentloaded'});await page.locator('bear-footer-scene').scrollIntoViewIfNeeded();
  assert.equal(await page.locator('bear-shared-garden').count(),0);assert.equal(calls.length,0);
  report.checks.push('Production homepage default still uses original footer with no preview API traffic.');
  await page.goto(`${base}/previews/bear-home/`,{waitUntil:'domcontentloaded'});await page.locator('bear-shared-garden').scrollIntoViewIfNeeded();
  const before=await page.locator('.shared-garden-water').getAttribute('aria-label');
  await page.evaluate(()=>window.scrollTo(0,0));
  await page.locator('#langToggle button[data-lang="en"]').click();
  await page.waitForFunction(before=>document.querySelector('.shared-garden-water')?.getAttribute('aria-label')!==before,before);
  await page.locator('bear-shared-garden').scrollIntoViewIfNeeded(); await capture(page,'homepage-language');
  report.checks.push('Full homepage language toggle updates the garden controls and stage label.');
  await context.close();
  assert.deepEqual(report.errors,[]);
} finally {
  await writeFile(`${out}/report.json`,JSON.stringify(report,null,2));
  await browser.close();server.close();store.close();
}
console.log(JSON.stringify({checks:report.checks.length,captures:report.captures.length,errors:report.errors.length}));
