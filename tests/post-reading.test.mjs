import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { pickTrend, trendEntry } from '../src/lib/post-trend.ts';
import { allocateMinutes, sectionWeight, minuteLabel } from '../src/lib/post-sections.ts';
import { countWords, textCounts } from '../src/lib/blog-archive.ts';
import { readingMinutes } from '../src/lib/post-meta.ts';

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
const NOW = new Date('2026-10-30T15:55:04Z');
const s = (reads, rank, prevRank) => ({ reads, rank, prevRank });

// Real rows from the 2026-10-30 post_views snapshot (computeTrending output).
const W36 = { w: s(53, 2, 2), m: s(267, 2, 1) };
const CHROMIUM = { w: s(39, 3, 3), m: s(115, 3, 7) };
const CROSS_END = { w: s(24, 6, 21), m: s(59, 11, 13) };
const SUMMARY_2021 = { w: s(2, null, null), m: s(6, null, null) };

test('trend: one line per situation, real snapshot rows', () => {
  const w36 = pickTrend(W36, { pubDate: '2026-09-06', now: NOW, lang: 'zh' });
  assert.deepEqual([w36.rule, w36.text, w36.mark], ['week-top', '本周第 2', null]);

  const chr = pickTrend(CHROMIUM, { pubDate: '2022-10-16', now: NOW, lang: 'zh' });
  assert.deepEqual([chr.rule, chr.text, chr.mark], ['read-again', '最近又有人在读', null]);
  assert.match(chr.tip, /^2022 年的文章 · 近 7 天 39 次阅读，本周第 3（上周第 3） · 近 30 天 115 次阅读，本月第 3（上月第 7）$/);

  const cross = pickTrend(CROSS_END, { pubDate: '2023-02-25', now: NOW, lang: 'zh' });
  assert.deepEqual([cross.rule, cross.text, cross.mark], ['week-climb', '本周第 6', '▲15']);

  assert.equal(pickTrend(SUMMARY_2021, { pubDate: '2022-01-30', now: NOW, lang: 'zh' }), null);
});

test('trend: priority order and thresholds', () => {
  const at = (e, pub = '2026-01-01') => pickTrend(e, { pubDate: pub, now: NOW, lang: 'zh' });
  assert.equal(at({ w: s(20, 7, 45), m: s(35, 28, 31) }).rule, 'week-new'); // prev > 30 → new
  assert.equal(at({ w: s(20, 9, null), m: s(34, 31, null) }).text, '本周第 9 ·');
  assert.equal(at({ w: s(20, 5, 7), m: s(90, 4, 15) }).rule, 'month-climb'); // week +2 < 3
  assert.equal(at({ w: s(20, 5, 7), m: s(90, 4, 15) }).mark, '▲11');
  assert.equal(at({ w: s(20, 5, 7), m: s(90, 4, 15) }, '2020-01-01').rule, 'read-again'); // old + rising wins over month-climb
  assert.equal(at({ w: s(20, 11, 8), m: s(71, 6, 9) }, '2024-03-29').rule, 'read-again');
  assert.equal(at({ w: s(20, 11, 8), m: s(71, 6, 9) }, '2025-03-29').rule, 'month-climb');
  assert.equal(at({ w: s(13, 24, 7), m: s(69, 8, 3) }).rule, 'month-top'); // falling still shows rank
  assert.equal(at({ w: s(13, 11, 7), m: s(30, 12, 3) }), null); // outside top 10 everywhere
  assert.equal(at(null), null);
});

test('trend: English copy', () => {
  assert.equal(pickTrend(W36, { now: NOW, lang: 'en' }).text, '#2 this week');
  const cross = pickTrend(CROSS_END, { pubDate: '2023-02-25', now: NOW, lang: 'en' });
  assert.deepEqual([cross.text, cross.mark], ['#6 this week', '▲15']);
  assert.match(cross.tip, /^24 reads in 7 days, #6 this week \(#21 last week\) · 59 reads in 30 days, #11 this month \(#13 last month\)$/);
  assert.equal(pickTrend(CHROMIUM, { pubDate: '2022-10-16', now: NOW, lang: 'en' }).text, 'Being read again');
});

test('trend: payload validation', () => {
  const payload = { posts: { 'weekly-36': { views: 2171, ...W36 }, bad: { w: { reads: 'x' } } } };
  assert.deepEqual(trendEntry(payload, 'weekly-36'), W36);
  assert.equal(trendEntry(payload, 'bad'), null);
  assert.equal(trendEntry(payload, 'missing'), null);
  assert.equal(trendEntry({ code: 'TRENDING_UNAVAILABLE' }, 'weekly-36'), null);
  assert.equal(trendEntry(null, 'weekly-36'), null);
});

test('trend: browser glue reuses the shared API base, never hard-codes the host', () => {
  const src = read('src/scripts/post-reading.ts');
  assert.match(src, /TRENDING_API_BASE \+ TRENDING_PATH/);
  assert.doesNotMatch(src, /chat\.ursb\.me/);
});

test('minutes: sections always add up to the article reading time', () => {
  const cases = [
    [[1.41, 1.12, 3.08, 1.74, 0.88, 2.08, 1.87, 1.25], 14], // weekly-36 (lede folded into §1)
    [[0.2, 0.1, 0.05], 1],
    [[5, 0, 0, 0.01], 26],
    [[0, 0, 0], 7],
    [Array.from({ length: 24 }, (_, i) => (i * 37) % 11 / 3), 26],
  ];
  for (const [weights, total] of cases) {
    const { share, whole } = allocateMinutes(weights, total);
    assert.equal(whole.reduce((a, b) => a + b, 0), total, `whole ${weights}`);
    assert.ok(Math.abs(share.reduce((a, b) => a + b, 0) - total) < 1e-9, `share ${weights}`);
    whole.forEach((w, i) => assert.ok(Math.abs(w - share[i]) < 1, 'each label within a minute of its share'));
  }
  assert.deepEqual(allocateMinutes([], 5), { share: [], whole: [] });
  assert.deepEqual(allocateMinutes([1, 2, 3, 4, 5, 6, 7, 8], 14).whole, [0, 1, 1, 2, 2, 2, 3, 3]);
  assert.equal(minuteLabel(0), '<1');
  assert.equal(minuteLabel(3), '3');
});

test('minutes: same word rule as the /blog list and the same speed as readingMinutes', () => {
  const md = '前言一段话。\n\n## 第一节\n\n这是第一节，有 some English words here。\n\n```js\nconst skipped = 1;\n```\n\n## 第二节\n\n![img](a.png) [链接文字](https://x.y) 结尾。';
  const plain = '前言一段话。 第一节 这是第一节，有 some English words here。 第二节 链接文字 结尾。';
  assert.equal(textCounts(plain).cjk + textCounts(plain).latin, countWords(md));
  const c = textCounts(plain);
  assert.equal(Math.max(1, Math.round(sectionWeight(c))), readingMinutes(md));
  assert.ok(Math.abs(sectionWeight({ cjk: 350, latin: 220 }) - 2) < 1e-9);
});

test('layout wires the additions without touching the TOC structure', () => {
  const layout = read('src/layouts/PostLayout.astro');
  assert.match(layout, /id="postTrend" hidden/);
  assert.match(layout, /id="readProgressLeft" hidden/);
  assert.match(layout, /id="tocMinCol" aria-hidden="true" hidden/);
  assert.match(layout, /import '\.\.\/scripts\/post-reading'/);
  // TOC auto-scroll measures inside the nav, not the sidebar.
  assert.match(layout, /var linkTop = link\.getBoundingClientRect\(\)\.top - navBox\.top \+ nav\.scrollTop;/);
  assert.match(layout, /window\.innerHeight - navBox\.top/);
  assert.doesNotMatch(layout, /nav\.scrollTop = link\.offsetTop/);
  const mtoc = read('src/components/MobileToc.astro');
  assert.match(mtoc, /from '\.\.\/lib\/post-sections'/);
  assert.doesNotMatch(mtoc, /totalLen/);
});
