// Run against the old preview first, then the updated dev/production server.
import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';

const base = process.argv[2] ?? 'http://localhost:4408';
const output = process.argv[3] ?? 'output/bear-stories/revision-3/workshop/after';
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ channel: 'chrome', headless: false,
  args: ['--window-position=30,30', '--disable-backgrounding-occluded-windows'] });
const report = { base, captured: new Date().toISOString(), result: 'failed', errors: [], requests: [], responses: [], samples: [] };
const expectedHash = createHash('sha256').update(await readFile('public/bear-stories/workshop/workshop-atlas.webp')).digest('hex');
const context = await browser.newContext({ viewport: { width: 1280, height: 900 }, colorScheme: 'dark' });
await context.route('**/analytics.ursb.me/**', request => request.abort());
await context.addInitScript(() => {
  localStorage.setItem('blog-mode', 'dark'); localStorage.setItem('blog-mode-set', '1');
});
const page = await context.newPage();
page.on('pageerror', error => report.errors.push(error.message));
page.on('request', request => { if (request.url().includes('workshop-atlas')) report.requests.push(request.url()); });
page.on('response', response => {
  if (response.url().includes('workshop-atlas')) report.responses.push({ status: response.status(), url: response.url() });
});
async function sample(name) {
  const state = await page.evaluate(() => {
    const scene = document.querySelector('bear-workshop');
    const stage = document.querySelector('.bw-stage');
    return { phase: scene?.dataset.phase, frame: scene?.dataset.frame ?? null, project: scene?.dataset.project,
      canvasHidden: document.querySelector('canvas')?.hidden, visibility: document.visibilityState,
      reducedMotion: matchMedia('(prefers-reduced-motion: reduce)').matches,
      stage: stage?.getBoundingClientRect().toJSON() };
  });
  report.samples.push({ name, ...state, atlasRequests: report.requests.length });
  await page.screenshot({ path: `${output}/${name}.png`, fullPage: true });
  return state;
}
try {
  await page.goto(`${base}/previews/bear-workshop/`);
  await page.locator('bear-workshop[data-ready]').waitFor();
  // A bounded observation window is intentional: no action may be needed to start.
  await page.waitForTimeout(1600);
  const arrival = await sample('no-input-arrival');
  await page.locator('.bw-choice button[data-project="reading-companion"]').click();
  await page.waitForFunction(() => Number(document.querySelector('bear-workshop')?.dataset.frame) >= 8);
  await sample('project-click');
  const response = await context.request.get(`${base}/bear-stories/workshop/workshop-atlas.webp`);
  assert.equal(response.status(), 200);
  const actualHash = createHash('sha256').update(await response.body()).digest('hex');
  assert.equal(actualHash, expectedHash);
  report.assetHash = actualHash;
  assert.equal(arrival.visibility, 'visible');
  assert.equal(arrival.reducedMotion, false);
  assert.equal(arrival.phase, 'working', 'A visible first visit must start the performance without a project click.');
  assert.ok(Number(arrival.frame) >= 4, 'The first visit must visibly progress, not just enter loading.');
  assert.equal(report.requests.length, 1, 'Arrival and project selection must share one atlas load.');
  assert.deepEqual(report.errors, []);
  report.result = 'passed';
} finally {
  await writeFile(`${output}/arrival-report.json`, `${JSON.stringify(report, null, 2)}\n`);
  await browser.close();
}
console.log(JSON.stringify(report));
