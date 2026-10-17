import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

// Calls a function from scripts/update_feed.py with JSON args and returns its result.
function py(fn, ...args) {
  const code = [
    'import json, sys',
    "sys.path.insert(0, 'scripts')",
    'import update_feed as u',
    `print(json.dumps(u.${fn}(*json.loads(sys.argv[1]))))`,
  ].join('\n');
  return JSON.parse(execFileSync('python3', ['-c', code, JSON.stringify(args)], { cwd: root, encoding: 'utf8' }));
}

const posts = [
  { title: '月刊（第36期）：伊始', link: 'https://ursb.me/posts/weekly-36/', date: '2026.09.06' },
  { title: '当 AI 拿走一切之后', link: 'https://ursb.me/posts/after-ai-takes-everything/', date: '2026.06.12' },
  { title: '月刊（第33期）：推理阶梯', link: 'https://ursb.me/posts/weekly-33/', date: '2025.11.15' },
];

test('groups items by year, each group tagged with its language', () => {
  const html = py('generate_writing_html', posts, 'zh', {});
  const groups = html.match(/<div class="wl-group" data-lang="zh">/g) || [];
  assert.equal(groups.length, 2);
  assert.ok(html.indexOf('>2026<') < html.indexOf('>2025<'));
});

test('renders MM/DD with the full date kept in datetime', () => {
  const html = py('generate_writing_html', posts, 'zh', {});
  assert.match(html, /<time class="post-date" datetime="2026-09-06">09\/06<\/time>/);
});

test('adds a lazy thumbnail only for items that have a cover', () => {
  const html = py('generate_writing_html', posts, 'zh', { 'weekly-36': 'https://img.example/c.webp?a=1&b=2' });
  const thumbs = html.match(/<img class="wl-thumb"/g) || [];
  assert.equal(thumbs.length, 1);
  assert.match(html, /src="https:\/\/img\.example\/c\.webp\?a=1&amp;b=2"/);
  assert.match(html, /loading="lazy"/);
});

test('keeps post-title and a dotted leader in every row', () => {
  const html = py('generate_writing_html', posts, 'zh', {});
  assert.equal((html.match(/class="post-title"/g) || []).length, 3);
  assert.equal((html.match(/class="wl-lead"/g) || []).length, 3);
});

test('draws the year watermark as a pixel svg of the last two digits', () => {
  const svg = py('pixel_year_svg', '2026');
  assert.match(svg, /^<svg class="wl-year-mark"/);
  assert.match(svg, /aria-hidden="true"/);
  assert.match(svg, /viewBox="0 0 7 5"/);
});

test('reads post covers from frontmatter, keyed by slug', () => {
  const covers = py('load_post_covers', 'zh');
  assert.equal(covers['weekly-36'], 'https://r2.airingdeng.com/blog/wj36/cover-c0b38e12b394/full.webp');
  assert.equal(covers['after-ai-takes-everything'], 'https://r2.airingdeng.com/blog/aae/cover.webp');
});
