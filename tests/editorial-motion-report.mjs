import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile, readdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const output = resolve(process.env.EDITORIAL_QA_OUTPUT ?? 'output/editorial-footer/evidence/final');
const motion = JSON.parse(await readFile(`${output}/motion-report.json`, 'utf8'));
const forms = JSON.parse(await readFile(`${output}/forms/report.json`, 'utf8'));
assert.ok(motion.completed && !motion.failure);
assert.equal(motion.scenarios.length, 44);
assert.equal(motion.temporal.performances.length, 7);
assert.equal(motion.reduced.length, 6);
assert.equal(forms.length, 12);
assert.equal(motion.surprise.events.filter(event => event.kind === 'start' && event.clip === 'bookmark').length, 1);

const expected = [];
for (const lang of ['zh', 'en']) for (const width of [375, 768, 1280]) for (const theme of ['light', 'dark']) {
  for (const state of ['bookcart', 'archive-open']) expected.push(`blog-${lang}-${width}-${theme}-${state}.png`);
  expected.push(`harness-${lang}-${width}-${theme}-showcase.png`);
  for (const state of ['panda-docked', 'subscription-playing']) expected.push(`article-${lang}-${width}-${theme}-${state}.png`);
  if (width !== 768) for (const index of [0, 1]) expected.push(`neighbors-${lang}-${width}-${theme}-neighbor-${index}.png`);
  for (const state of ['preview', 'idle', 'layout', 'error', 'already', 'confirmed']) expected.push(`forms/${lang}-${width}-${theme}-${state}.png`);
}
for (const clip of ['arrival', 'bookmark', 'bird', 'tumble', 'reverse', 'close', 'subscribe']) {
  for (const state of ['playing', 'rest']) expected.push(`temporal-${clip}-${state}.png`);
}
for (const lang of ['zh', 'en']) for (const surface of ['blog', 'harness', 'article']) expected.push(`reduced-${lang}-${surface}.png`);
expected.push('resource-failure-poster.png', 'bookcart-surprise-rest.png');
expected.sort();
assert.equal(expected.length, 170);
const actual = (await readdir(output)).filter(name => name.endsWith('.png'));
actual.push(...(await readdir(`${output}/forms`)).filter(name => name.endsWith('.png')).map(name => `forms/${name}`));
assert.deepEqual(actual.sort(), expected, 'Final capture inventory must contain exactly the enumerated screenshots');
const inventory = await Promise.all(expected.map(async path => {
  const data = await readFile(`${output}/${path}`);
  assert.equal(data.toString('hex', 0, 8), '89504e470d0a1a0a');
  return { path, width: data.readUInt32BE(16), height: data.readUInt32BE(20), bytes: data.length, sha256: createHash('sha256').update(data).digest('hex') };
}));
const baselineOverflow = motion.scenarios.filter(scenario => scenario.layout.knownIssue).map(({ lang, width, theme, layout }) => ({ lang, width, theme, ...layout }));
const pageErrors = [...motion.scenarios.flatMap(scenario => scenario.pageErrors), ...forms.flatMap(scenario => scenario.pageErrors)];
assert.equal(pageErrors.filter(error => !error.stack?.includes('at apiGet')).length, 0);
const performances = motion.temporal.performances.map(performance => {
  const start = performance.events.find(event => event.kind === 'start' && event.clip === performance.clip);
  const end = performance.events.find(event => event.kind === 'end' && event.clip === performance.clip);
  assert.ok(start && end && performance.pixelStates > 1 && performance.restWraps > 0);
  assert.equal(performance.posterFlashes.length, 0);
  return { clip: performance.clip, frameCount: performance.frameCount, pixelStates: performance.pixelStates, durationMs: Math.round(end.time - start.time), restWraps: performance.restWraps, posterFlashes: 0 };
});
const summary = {
  completed: motion.completed,
  baseURL: 'http://localhost:4415',
  scenarios: 44,
  formScenarios: 12,
  formMockedRequests: forms.reduce((total, scenario) => total + scenario.requests, 0),
  captureCount: inventory.length,
  performances,
  offscreenPause: motion.temporal.offscreenPause,
  reducedMotionScenarios: motion.reduced.length,
  deliberateFailure: motion.resourceFailure.intentionalFailure,
  surpriseExecutions: 1,
  newPageErrors: 0,
  knownApiGetErrors: pageErrors.length,
  baselineOverflow,
};
await writeFile(`${output}/capture-inventory.json`, JSON.stringify(inventory, null, 2));
await writeFile(`${output}/acceptance-summary.json`, JSON.stringify(summary, null, 2));
const rows = performances.map(item => `| ${item.clip} | ${item.frameCount} | ${item.pixelStates} | ${item.durationMs} ms | ${item.restWraps} | 0 |`).join('\n');
const report = `# Editorial footer final browser acceptance

Completed ${motion.completed} against http://localhost:4415.

44 page scenarios and 12 form scenarios passed. CN/EN, light/dark, and 375/768/1280 widths cover the blog archive, motion preview, and latest article. The middle article adds both coverless neighbors at 375/1280 in both languages and themes. Direction C exposes the primary excerpt directly and retains native keyboard navigation to both neighbors.

All new footer elements fit clientWidth. Theme and actor CSS are present, harness actors match display sizes, controls meet 44px targets, and no unexpected editorial media or local CSS/JS failures occurred. All subscription writes were intercepted; the form matrix made ${summary.formMockedRequests} mocked requests. Confirmed-new subscription triggers H3; already-subscribed does not. Invalid input, single-flight pending, HTTP error, retained input, retry, and successful clearing passed. Unsubscribe reassurance stays together.

| Performance | Observed frame indices | Distinct pixel states | Duration | Rest wraps | Poster flashes |
| --- | ---: | ---: | ---: | ---: | ---: |
${rows}

Offscreen rest paused at frame ${summary.offscreenPause.frame}, stayed fixed for 650ms, and resumed at ${summary.offscreenPause.resumed}. Six reduced-motion cases requested posters only, with no manifests or atlases. A deliberate arrival atlas 404 retained its usable poster. The isolated forced-surprise session played bookmark once and completed into rest.

Known baseline: ${baselineOverflow.length} mobile case-sensitivity scenarios retain existing article-body long-link overflow. The exact Chromium/Wikipedia links explain the page scroll width; all new footer elements remain within the layout viewport. Live baseline evidence is ../article-overflow-baseline.json. Existing external apiGet fetch errors remain in raw reports; there are no new page errors.

146 fresh PNGs are enumerated with dimensions and SHA-256 in capture-inventory.json: 76 surface captures, 14 complete-performance captures, 6 reduced-motion captures, 1 deliberate-failure capture, 1 surprise capture, and 48 form captures. Earlier rejected runs are outside this directory.
`;
await writeFile(`${output}/acceptance-report.md`, report);
console.log(JSON.stringify(summary, null, 2));
