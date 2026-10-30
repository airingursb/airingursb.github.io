import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  TRENDING_API_BASE, markOf, statusOf, headline, cardsFor, standbyFor, usableWindows, formatCount,
} from '../src/lib/blog-trending.ts';

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

const posts = new Map(
  ['a', 'b', 'c', 'd', 'e', 'old'].map((slug, i) => [slug, { slug, href: `/posts/${slug}/`, title: `T-${slug}`, cover: i % 2 ? '' : `/c/${slug}.jpg`, year: 2019, cn: slug === 'b' }]),
);
const entry = (slug, rank, reads, prevRank, status, delta) => ({ slug, rank, reads, prevRank, status, delta });
const win = (top, moved = 0, entered = 0) => ({ churn: 0, moved, entered, top });
const payload = () => ({
  defaultWindow: 'm',
  windows: {
    w: win([entry('a', 1, 87, 1, 'same', 0), entry('b', 2, 47, 2, 'same', 0), entry('c', 3, 35, 9, 'up', 6), entry('d', 4, 25, 3, 'down', -1)], 2),
    m: win([entry('a', 1, 397, 2, 'up', 1), entry('b', 2, 220, 1, 'down', -1), entry('e', 3, 94, null, 'new', null), entry('c', 4, 30, 30, 'up', 26)], 3, 1),
    y: win([entry('a', 1, 15693, 1, 'same', 0), entry('b', 2, 1528, 2, 'same', 0), entry('c', 3, 1220, 3, 'same', 0), entry('d', 4, 1145, 4, 'same', 0)]),
    a: win([entry('a', 1, 235549, 1, 'same', 0), entry('ghost', 2, 9, 2, 'same', 0), entry('c', 3, 8, 3, 'same', 0)]),
  },
  standby: { slug: 'old', pubDate: '2019-03-01', reads30d: 13 },
});

test('committed API base is production', () => {
  assert.equal(TRENDING_API_BASE, 'https://chat.ursb.me');
  assert.match(read('src/lib/blog-trending.ts'), /\|\| 'https:\/\/chat\.ursb\.me'/);
});

test('rank marks and status words (▲3+ reads as climbing)', () => {
  assert.equal(markOf({ status: 'new', delta: null }), 'NEW');
  assert.equal(markOf({ status: 'up', delta: 4 }), '▲4');
  assert.equal(markOf({ status: 'down', delta: -1 }), '▼1');
  assert.equal(markOf({ status: 'same', delta: 0 }), '–');
  assert.deepEqual(statusOf({ status: 'up', delta: 1 }, 'zh'), ['up', '上升']);
  assert.deepEqual(statusOf({ status: 'up', delta: 3 }, 'zh'), ['up', '攀升']);
  assert.deepEqual(statusOf({ status: 'down', delta: -2 }, 'zh'), ['down', '回落']);
  assert.deepEqual(statusOf({ status: 'new', delta: null }, 'en'), ['new', 'New']);
  assert.deepEqual(statusOf({ status: 'same', delta: 0 }, 'en'), ['same', 'Steady']);
});

test('headline: 自动 only on the server default window; churn wording in both languages', () => {
  const d = payload();
  assert.deepEqual(headline(d, 'm', 'zh'), { auto: true, text: '近 30 天阅读', why: '1 篇新进、3 篇换位' });
  assert.deepEqual(headline(d, 'w', 'zh'), { auto: false, text: '近 7 天阅读', why: '2 篇换位' });
  assert.equal(headline(d, 'y', 'zh').why, '名次未变');
  assert.deepEqual(headline(d, 'm', 'en'), { auto: true, text: 'reads in 30 days', why: '1 new, 3 moved' });
  assert.equal(headline(d, 'y', 'en').why, 'no change');
});

test('cards: page titles/links/covers joined in; reads text split around the rolling number', () => {
  const [first, second, third] = cardsFor(payload(), 'm', posts, 'zh');
  assert.equal(first.title, 'T-a');
  assert.equal(first.href, '/posts/a/');
  assert.equal(first.cover, '/c/a.jpg');
  assert.equal(first.readsLabel, '近 30 天 397 次阅读');
  assert.equal(first.readsBefore + first.reads + first.readsAfter, first.readsLabel);
  assert.equal(first.prevLabel, '上月第 2');
  assert.equal(second.cn, true);
  assert.equal(third.prevLabel, '上月未上榜');
  assert.equal(third.mark, 'NEW');

  const en = cardsFor(payload(), 'a', posts, 'en');
  assert.equal(en[0].readsLabel, '235,549 reads all time');
  assert.equal(en[0].readsBefore, '');
  assert.equal(en[0].prevLabel, '#1 30 days ago');
  // unknown slugs (not on this page) are skipped rather than rendered blank
  assert.deepEqual(en.map((c) => c.slug), ['a', 'c']);
  // the unit's own digits never collide with the number
  const w = cardsFor(payload(), 'w', posts, 'zh')[0];
  assert.equal(w.readsBefore, '近 7 天 ');
  assert.equal(w.reads, '87');
});

test('standby row', () => {
  assert.deepEqual(standbyFor(payload(), posts, 'zh'), { href: '/posts/old/', title: 'T-old', cn: false, key: '候补 · 今日旧文', meta: '2019 · 近 30 天 13 次阅读 · 每天换一篇' });
  assert.equal(standbyFor(payload(), posts, 'en').meta, '2019 · 13 reads in 30 days · a new one daily');
  assert.equal(standbyFor({ ...payload(), standby: null }, posts, 'zh'), null);
  assert.equal(formatCount(235549), '235,549');
});

test('fallback rules: keep the build-time Most Popular unless the payload is usable', () => {
  const d = payload();
  // 'a' has only 2 known posts -> that tab is dropped, the rest stay
  assert.deepEqual(usableWindows(d, posts), ['w', 'm', 'y']);
  assert.deepEqual(usableWindows({ ...d, defaultWindow: 'a' }, posts), []);
  assert.deepEqual(usableWindows(null, posts), []);
  assert.deepEqual(usableWindows({ code: 'TRENDING_UNAVAILABLE' }, posts), []);
  assert.deepEqual(usableWindows({ defaultWindow: 'm', windows: { m: { top: 'x' } } }, posts), []);
});

test('both blog pages mount the component and keep the build-time Most Popular markup', () => {
  for (const page of ['src/pages/blog.astro', 'src/pages/en/blog.astro']) {
    const src = read(page);
    assert.match(src, /<BlogTrending \/>/);
    assert.match(src, /class="popular-grid"/);
    assert.match(src, /<BlogTree /);
    assert.match(src, /<WritingArchive /);
    assert.match(src, /<BlogSearch /);
  }
});
