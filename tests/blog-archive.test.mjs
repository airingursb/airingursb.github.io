import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import yaml from 'js-yaml';
import {
  countWords, issueOf, toArchivePosts, yearFolders, heatGrid, archiveStats, parseQuery, searchPosts,
  highlight, coverPhrase, textCoverHTML,
} from '../src/lib/blog-archive.ts';

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

// The real posts collection, loaded the way astro:content does (frontmatter + body).
function loadPosts() {
  const dir = new URL('../src/content/posts/', import.meta.url);
  return readdirSync(dir).filter((f) => f.endsWith('.md')).map((f) => {
    const m = readFileSync(new URL(f, dir), 'utf8').match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);
    const data = yaml.load(m[1]);
    return { id: f.replace(/\.md$/, ''), body: m[2], data: { ...data, date: new Date(data.date) } };
  }).filter((p) => !p.data.draft);
}

test('word count: CJK characters + Latin words, code / images / link targets removed', () => {
  assert.equal(countWords('你好 world'), 3);
  assert.equal(countWords('```js\nconst a = 1;\n```\n文字'), 2);
  assert.equal(countWords('![图](https://x/y.png) [链接](https://a.b/c) ok'), 3);
  assert.equal(countWords('<img src="a.png"> 字 https://ursb.me/x'), 1);
});

test('monthly issue numbers come from the title', () => {
  assert.equal(issueOf('月刊（第36期）：伊始'), 36);
  assert.equal(issueOf('周刊（第8期）：三幕剧与英雄旅程'), 8);
  assert.equal(issueOf('2025，全新旅途'), null);
});

test('stats are computed from the collection: 34 monthly issues (No.1–36 without 14, 15)', () => {
  const posts = toArchivePosts(loadPosts());
  const s = archiveStats(posts);
  const issues = posts.filter((p) => p.issue).map((p) => p.issue).sort((a, b) => a - b);
  assert.equal(s.issues, issues.length);
  assert.ok(!issues.includes(14) && !issues.includes(15));
  assert.equal(issues[0], 1);
  assert.ok(s.issues >= 34);
  assert.equal(s.words, posts.reduce((a, p) => a + p.words, 0));
  assert.equal(s.avg, Math.round(s.words / s.posts));
  assert.equal(s.longest.words, Math.max(...posts.map((p) => p.words)));
  const perYear = posts.filter((p) => p.year === s.busiest.year).length;
  assert.equal(perYear, s.busiest.count);
  assert.ok(posts.every((p, i) => i === 0 || posts[i - 1].date >= p.date), 'newest first');
});

test('tree folders: one per year, months add up, words add up', () => {
  const posts = toArchivePosts(loadPosts());
  const folders = yearFolders(posts);
  assert.deepEqual(folders.map((f) => f.year), [...new Set(posts.map((p) => p.year))].sort((a, b) => b - a));
  folders.forEach((f) => {
    assert.equal(f.months.reduce((a, b) => a + b, 0), f.posts.length);
    assert.equal(f.words, f.posts.reduce((a, p) => a + p.words, 0));
  });
  assert.equal(folders.reduce((a, f) => a + f.posts.length, 0), posts.length);
});

test('heat grid: 2015 → now, future months flagged, current month marked, totals match', () => {
  const posts = toArchivePosts(loadPosts());
  const rows = heatGrid(posts, 2015, new Date(Date.UTC(2026, 9, 30)));
  assert.equal(rows[0].year, 2026);
  assert.equal(rows.at(-1).year, 2015);
  assert.ok(rows.every((r) => r.cells.length === 12));
  assert.ok(rows[0].cells[9].now && !rows[0].cells[9].future);
  assert.ok(rows[0].cells[10].future && rows[0].cells[11].future);
  assert.equal(rows.reduce((a, r) => a + r.total, 0), posts.filter((p) => p.year >= 2015).length);
  const jun22 = rows.find((r) => r.year === 2022).cells[5];
  assert.ok(jun22.monthly && jun22.count === posts.filter((p) => p.year === 2022 && p.month === 6).length);
});

test('search: terms AND, tag: in either language, years, shuf', () => {
  const posts = toArchivePosts(loadPosts());
  const tech = posts.filter((p) => p.tag === 'tech').length;
  assert.equal(searchPosts(posts, 'tag:技术').length, tech);
  assert.equal(searchPosts(posts, 'tag:tech').length, tech);
  assert.equal(searchPosts(posts, '#技术').length, tech);
  assert.ok(searchPosts(posts, 'tag:技术 2019').every((p) => p.tag === 'tech' && p.year === 2019));
  assert.ok(searchPosts(posts, 'flutter').every((p) => (p.title + p.desc).toLowerCase().includes('flutter')));
  assert.deepEqual(parseQuery('shuf'), { terms: [], tags: [], years: [], shuf: true });
  assert.equal(parseQuery('shuf flutter').shuf, false);
});

test('highlight escapes HTML and marks every term', () => {
  assert.equal(highlight('<b>Flutter</b> 渲染', 'flutter 渲染'), '&lt;b&gt;<mark>Flutter</mark>&lt;/b&gt; <mark>渲染</mark>');
});

test('text covers: short phrase, tag pattern, English phrase on the English page', () => {
  assert.deepEqual(coverPhrase({ zh: '月刊（第24期）：十年编程之路', title: '月刊（第24期）：十年编程之路', tag: 'weekly', year: 2023, issue: 24 }), { kicker: '月刊 · No.24', big: '十年编程之路' });
  assert.deepEqual(coverPhrase({ zh: '2019，走走停停', title: '2019，走走停停', tag: 'annually', year: 2020, issue: null }), { kicker: '年度 · 2019', big: '走走停停' });
  assert.equal(coverPhrase({ zh: '前端安全 | HPP 的攻击举例与防范', title: '前端安全 | HPP 的攻击举例与防范', tag: 'tech', year: 2019, issue: null }).big, 'HPP');
  assert.deepEqual(coverPhrase({ zh: '月刊（第36期）：伊始', title: 'Monthly #36: A Beginning', tag: 'weekly', year: 2026, issue: 36 }), { kicker: 'monthly · No.36', big: 'A Beginning' });
  const html = textCoverHTML({ zh: '<x>', title: '<x>', tag: 'essays', year: 2020, issue: null });
  assert.match(html, /class="tc tc--essays"/);
  assert.doesNotMatch(html, /<x>/);
});

test('shared terminal window: one stylesheet for both pages, title bar can no longer shrink', () => {
  const css = read('src/styles/term-window.css');
  assert.match(css, /\.tw-win > \* \{ flex: none; \}/);
  assert.match(css, /\.tw-tb \{[^}]*height: 32px;/);
  assert.match(css, /\.tw-tb \.tw-lights i \{ width: 12px; height: 12px; \}/);
  assert.match(read('src/components/HomeNav.astro'), /import TermWindow from '\.\/TermWindow\.astro'/);
  assert.match(read('src/components/blog/BlogSearch.astro'), /import TermWindow from '\.\.\/TermWindow\.astro'/);
  assert.match(read('src/scripts/home-nav.ts'), /createTermWindow\(/);
  assert.match(read('src/scripts/blog-search.ts'), /createTermWindow\(/);
  assert.doesNotMatch(read('src/components/HomeNav.astro'), /\.nc-win|\.nc-tb/);
});

test('search preview uses the post page endpoints, not the ranking likes', () => {
  const src = read('src/scripts/blog-search.ts');
  assert.match(src, /'\/views'/);
  assert.match(src, /'\/likes'/);
  assert.doesNotMatch(src.replace(/\/\/.*$/gm, ''), /ranking/);
});
