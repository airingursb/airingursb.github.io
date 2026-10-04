import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import sharp from 'sharp';

const draft = JSON.parse(await readFile(new URL('../src/data/ai-weekly/002.json', import.meta.url), 'utf8'));
const entries = [...draft.features, ...draft.creation, ...draft.fieldnotes, ...draft.tools, ...draft.signals];
// Independent slug list from the UTC+8 week’s visible reading_items snapshot.
const savedSlugs = `r-lt5kgsibkflzoaxu r-m3cmgjf7oep-btrv r-m3rxaomab2iylfyi r-2p9-suvgmqhcr6xr r-nfu2lv1etzehnlbz r-2xapqvudfumrk6js r-qiz_vqgnatinj_lq r-fkmhg9um4-_bh8be r-miurcg6ol5esptwe r--kwij5m-xjjs4dzi r-tdgv1pib7gs2221t r-l7osavlworu-ksmy r-xtyoobhqioqdjege r-bx1u4iivj_zdyzol r-sihydu7hxv5mqhp2 r-8bd1rgfiacdnn_0b r-8nsijqdidfu4gbwi r-mzb_oeipvjfbdsjr r-ihmmwwfd6v4xmmks r-dddnahuiqos6bq23 r-9rmzdpqzp_hpfmai r-boqohq55sbf2dw0r r-kl_queo6wz3zbo2l r-5w1nzk7gcxwak35m r-v33rllabykpnt6rw r-_hpnaoq9mn1f7-oq r-ofctjw0bneafcp_u r-ijrgesud-5gk3tvb r-q_xtcg_hdhr_oww3 r-jbuq4gaqgj3cw3kb r-k5vmbbkig80fstyn r-xnesuct8tzmcjhgw r-9diwpntg8vzy2s7s r-j3fq2z3_pz17khu3 r-hhk1tzqd7vqw-jz2 r-qx1o-dqkekgo6vo5 r-nkpu4egidrufu5yy r-vwlqhgyljon9rlz3 r-o_nfohhimoam0l41 r-qnrdsc2ifcnwfh94 r-he5oohsa166gdpgl r-ptdwebj7okqruggy r-wbptnzygdw5oipqm r-fi2ponvff2ysuxga r-yqvidiqn3liivdwr`.split(' ');

test('issue 002 covers each saved reading exactly once across editorial tiers', () => {
  assert.deepEqual(draft.sources.map(s => s.slug), savedSlugs);
  const covered = entries.flatMap(entry => entry.sources);
  assert.equal(new Set(covered).size, 45);
  assert.deepEqual(covered.toSorted((a,b) => a-b), Array.from({length:45},(_,i) => i+1));
});

test('product announcements remain concise and separate from mechanism features', () => {
  assert.equal(draft.tools.length, 10);
  assert.equal(draft.features.length, 6);
  for (const tool of draft.tools) {
    assert.ok(tool.text.zh.length + tool.use.zh.length + tool.note.zh.length < 160, tool.name);
    assert.ok(!('sections' in tool), tool.name);
  }
  assert.deepEqual(draft.tools.find(t => t.name === 'Maestro').sources, [39,43]);
});

test('both editions contain all editorial paragraphs without untranslated prose', () => {
  function check(value) {
    if (!value || typeof value !== 'object') return;
    if (Object.keys(value).length === 2 && 'zh' in value && 'en' in value) {
      assert.ok(value.zh.trim() && value.en.trim());
      assert.doesNotMatch(value.en, /\p{Script=Han}/u);
    }
    for (const child of Object.values(value)) check(child);
  }
  check(draft);
});

test('calendar preserves a Sunday buffer while preview aliases remain noindex', async () => {
  assert.equal(draft.periodStart, '2026-09-27');
  assert.equal(draft.periodEnd, '2026-10-03');
  assert.equal(draft.publishDate, '2026-10-05');
  const catalog = await readFile(new URL('../src/data/ai-weekly.ts',import.meta.url),'utf8');
  assert.doesNotMatch(catalog,/002\.draft/);
  const component = await readFile(new URL('../src/components/reading/ai-weekly/WeeklyEdition.astro',import.meta.url),'utf8');
  assert.match(component, /preview && <meta name="robots" content="noindex,nofollow"/);
  assert.match(component, /document.body.dataset.weeklySurface === 'weekly-issue'/);
  for (const path of ['previews/ai-weekly-002.astro', 'en/previews/ai-weekly-002.astro']) {
    const route = await readFile(new URL(`../src/pages/${path}`,import.meta.url),'utf8');
    assert.match(route, / preview/);
  }
});

test('saved emails keep missing original URLs instead of fabricating one', () => {
  assert.equal(draft.sources.find(s => s.n === 8).original_url, null);
  assert.equal(draft.sources.find(s => s.n === 16).original_url, null);
  assert.match(draft.signals.find(s => s.id === 'aigc').text.zh, /未保存的付费内容/);
  assert.doesNotMatch(JSON.stringify(draft), /notion_page_id|X-Amz-|service_role|NOTION_TOKEN/);
});

test('context evidence retains completion denominators and distinguishes two cost reductions', () => {
  const { baseline, optimized, taskCount, url } = draft.evidence.context;
  assert.equal(url, 'https://nvlabs.github.io/SoL-Pi/');
  assert.deepEqual([taskCount,baseline.solved,optimized.solved], [63,18,15]);
  assert.deepEqual([baseline.totalCostUSD,optimized.totalCostUSD], [286.45,211.12]);
  assert.equal((baseline.totalCostUSD/baseline.solved).toFixed(2), '15.91');
  assert.equal((optimized.totalCostUSD/optimized.solved).toFixed(2), '14.07');
  assert.equal(((1-optimized.totalCostUSD/baseline.totalCostUSD)*100).toFixed(1), '26.3');
  const perSolvedReduction=(1-(optimized.totalCostUSD/optimized.solved)/(baseline.totalCostUSD/baseline.solved))*100;
  assert.equal(perSolvedReduction.toFixed(1), '11.6');
});

test('eval evidence keeps held-out results separate from optimization and approximate cost', () => {
  const e=draft.evidence.eval;
  assert.equal(e.searchCount+e.holdoutCount,e.ticketCount);
  assert.deepEqual([e.ticketCount,e.searchCount,e.holdoutCount],[44,30,14]);
  assert.equal(e.accuracySet,'holdout');
  assert.deepEqual([e.baseline.accuracyPercent,e.optimized.accuracyPercent],[78.6,90.5]);
  assert.notEqual(e.searchBestAccuracyPercent,e.optimized.accuracyPercent);
  assert.equal((e.optimized.accuracyPercent-e.baseline.accuracyPercent).toFixed(1),'11.9');
  assert.equal(e.optimized.costApproximate,true);
  assert.equal(e.optimized.costIndex/e.baseline.costIndex,1/5);
  assert.match(draft.originalFigures.find(f=>f.id==='eval-trace').caption.en,/separate inbox demo \(24 cases\)/);
});

test('editorial storyboard covers one continuous 45-second timeline without presenting a benchmark', () => {
  const { beats, durationSeconds, framesPerSecond, kind }=draft.evidence.film;
  assert.equal(kind,'editorial-example');
  assert.equal(beats[0].start,0);
  assert.equal(beats.at(-1).end,durationSeconds);
  for(let i=0;i<beats.length;i++){
    assert.ok(beats[i].end>beats[i].start);
    if(i>0) assert.equal(beats[i].start,beats[i-1].end);
  }
  assert.equal(durationSeconds*framesPerSecond,1080);
});

test('source figures preserve image dimensions and deliver compressed web assets', async () => {
  for(const figure of draft.originalFigures){
    const asset=new URL(`../public/reading/weekly/002/assets/${figure.file}`,import.meta.url);
    const bytes=await readFile(asset);
    const metadata=await sharp(bytes).metadata();
    assert.deepEqual([metadata.width,metadata.height],[figure.width,figure.height],figure.file);
    assert.equal(metadata.format,'webp');
    assert.ok(bytes.length<100_000,`${figure.file}: ${bytes.length} bytes`);
    assert.match(figure.sourceUrl,/^https:\/\//);
  }
});

test('editorial bear illustrations keep readable aspect ratios and responsive image budgets', async () => {
  assert.equal(draft.illustrations.length, 6);
  for (const illustration of draft.illustrations) {
    assert.equal(illustration.kind, 'editorial-concept');
    for (const [file, width, height, budget] of [
      [illustration.file, illustration.width, illustration.height, 180_000],
      [illustration.smallFile, illustration.smallWidth, illustration.smallHeight, 60_000],
    ]) {
      const asset = new URL(`../public/reading/weekly/002/assets/${file}`, import.meta.url);
      const bytes = await readFile(asset);
      const metadata = await sharp(bytes).metadata();
      assert.deepEqual([metadata.width, metadata.height], [width, height], file);
      assert.equal(metadata.format, 'webp', file);
      assert.equal(width / height, 3 / 2, file);
      assert.ok(bytes.length < budget, `${file}: ${bytes.length} bytes`);
    }
    assert.equal(illustration.width / illustration.smallWidth, 2);
    assert.match(illustration.alt.zh, /小熊/);
    assert.match(illustration.alt.en, /bear/);
  }
});

test('every product uses an attributed official image with consistent crops and an uncropped enlargement', async () => {
  assert.equal(draft.toolImages.length, draft.tools.length);
  assert.ok(!('toolIllustrations' in draft));
  assert.equal(new Set(draft.tools.map(tool => tool.imageId)).size, draft.tools.length);
  for (const tool of draft.tools) {
    const artwork = draft.toolImages.find(item => item.id === tool.imageId);
    assert.ok(artwork, tool.name);
    assert.equal(artwork.product, tool.name);
    assert.ok(['official-screenshot', 'official-artwork', 'official-demo-frame', 'official-site-capture'].includes(artwork.kind));
    assert.match(artwork.sourcePage, /^https:\/\//);
    assert.match(artwork.sourceUrl, /^https:\/\//);
    assert.ok(artwork.alt.zh.includes(tool.name));
    assert.ok(artwork.alt.en.includes(tool.name));
    assert.doesNotMatch(artwork.alt.zh, /小熊|AI 生成/);
    assert.doesNotMatch(artwork.alt.en, /bear|AI-generated/);
    assert.equal(artwork.crop.width / artwork.crop.height, 3 / 2);
    assert.ok(artwork.crop.left >= 0 && artwork.crop.top >= 0);
    assert.ok(artwork.crop.left + artwork.crop.width <= artwork.originalWidth);
    assert.ok(artwork.crop.top + artwork.crop.height <= artwork.originalHeight);
    assert.ok(Math.abs(artwork.fullWidth / artwork.fullHeight - artwork.originalWidth / artwork.originalHeight) < 0.002);
    assert.notEqual(artwork.file, artwork.fullFile);
    for (const [file, width, height, budget] of [
      [artwork.file, 960, 640, 180_000],
      [artwork.smallFile, 480, 320, 60_000],
      [artwork.fullFile, artwork.fullWidth, artwork.fullHeight, 250_000],
    ]) {
      const bytes = await readFile(new URL(`../public/reading/weekly/002/assets/${file}`, import.meta.url));
      const metadata = await sharp(bytes).metadata();
      assert.deepEqual([metadata.width, metadata.height], [width, height], file);
      assert.equal(metadata.format, 'webp', file);
      assert.ok(bytes.length < budget, `${file}: ${bytes.length} bytes`);
    }
    if (artwork.kind === 'official-site-capture') assert.ok(artwork.capture.viewport);
    if (artwork.kind === 'official-demo-frame') assert.ok(Number.isInteger(artwork.frame));
  }
});
