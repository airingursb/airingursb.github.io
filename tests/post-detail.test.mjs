import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkMath from 'remark-math';
import remarkRehype from 'remark-rehype';
import { visit } from 'unist-util-visit';
import { rehypePostImages, leadInText, captionAfter } from '../src/plugins/rehype-post-images.mjs';
import { remarkHasMath } from '../src/plugins/remark-has-math.mjs';
import { readingMinutes, seriesIssue, relatedPosts } from '../src/lib/post-meta.ts';
import { parseSize } from '../scripts/build-post-image-sizes.mjs';

const root = path.resolve(new URL('..', import.meta.url).pathname);

function hast(md) {
  const tree = unified().use(remarkParse).use(remarkRehype).runSync(unified().use(remarkParse).parse(md));
  rehypePostImages()(tree);
  const imgs = [];
  visit(tree, 'element', (n) => { if (n.tagName === 'img') imgs.push(n.properties); });
  return imgs;
}

test('body images: first eager, the rest lazy + async', () => {
  const imgs = hast('![](a.png)\n\ntext\n\n![](b.png)\n\n![](c.png)\n');
  assert.equal(imgs[0].loading, undefined);
  assert.equal(imgs[1].loading, 'lazy');
  assert.equal(imgs[1].decoding, 'async');
  assert.equal(imgs[2].loading, 'lazy');
});

test('alt comes from author text only: alt > title > caption > colon lead-in', () => {
  const imgs = hast([
    '![已有](a.png)',
    '',
    '![](b.png "标题文字")',
    '',
    '![](c.png)图 3：渲染流水线',
    '',
    '各引擎性能表现如下图所示：',
    '',
    '![](d.png)',
    '',
    '![](e.png)哪些地方做的不好：',
    '',
    '普通的一段话。',
    '',
    '![](f.png)',
  ].join('\n'));
  assert.deepEqual(imgs.map((p) => p.alt ?? null), ['已有', '标题文字', '图 3：渲染流水线', '各引擎性能表现', '', '']);
});

test('lead-in cleanup keeps the last sentence and drops "as shown below"', () => {
  assert.equal(leadInText('第一句。完整的 Style 的流程如下图所示：'), '完整的 Style 的流程');
  assert.equal(leadInText('The full pipeline is shown below:'), 'The full pipeline is');
  assert.equal(leadInText('没有冒号结尾'), '');
  assert.equal(captionAfter([{ type: 'element', tagName: 'img' }, { type: 'text', value: '\n下一节：' }], 0), '');
});

test('image size parser reads PNG and GIF headers', () => {
  const png = Buffer.alloc(24);
  png.set([0x89, 0x50, 0x4e, 0x47], 0);
  png.writeUInt32BE(640, 16);
  png.writeUInt32BE(360, 20);
  assert.deepEqual(parseSize(png), [640, 360]);
  const gif = Buffer.from('GIF89a\x20\x00\x10\x00', 'latin1');
  assert.deepEqual(parseSize(gif), [32, 16]);
});

test('size cache keys are real image URLs used in content', () => {
  const sizes = JSON.parse(fs.readFileSync(path.join(root, 'src/data/post-image-sizes.json'), 'utf8'));
  const entries = Object.entries(sizes);
  assert.ok(entries.length > 500);
  for (const [url, [w, h]] of entries) {
    assert.match(url, /^https?:\/\//);
    assert.ok(w > 0 && h > 0, url);
  }
});

function contentFiles(dir) {
  const out = [];
  for (const f of fs.readdirSync(dir)) {
    const p = path.join(dir, f);
    if (fs.statSync(p).isDirectory()) out.push(...contentFiles(p));
    else if (/\.mdx?$/.test(f)) out.push(p);
  }
  return out;
}

test('no prose dollar sign is parsed as TeX (prices, shell vars)', () => {
  const suspicious = [];
  const withMath = [];
  for (const file of contentFiles(path.join(root, 'src/content'))) {
    const src = fs.readFileSync(file, 'utf8').replace(/^---[\s\S]*?---/, '');
    const tree = unified().use(remarkParse).use(remarkMath).parse(src);
    let has = false;
    visit(tree, (n) => n.type === 'inlineMath' || n.type === 'math', (n) => {
      has = true;
      // Prices ("$200 USD** (originally $"), words, or Markdown inside math.
      if (/^\d[\d,.]*\s|\*\*|\bUSD\b|[一-鿿]{4,}/.test(n.value)) suspicious.push(`${path.relative(root, file)}: ${n.value.slice(0, 60)}`);
    });
    if (has) withMath.push(path.relative(root, file));
  }
  assert.deepEqual(suspicious, []);
  assert.deepEqual(withMath.sort(), ['src/content/posts/en/learning-system.md', 'src/content/posts/learning-system.md']);
});

test('remark-has-math flags only documents with math', () => {
  const run = (md) => {
    const file = { data: {} };
    remarkHasMath()(unified().use(remarkParse).use(remarkMath).parse(md), file);
    return !!file.data.astro?.frontmatter?.hasMath;
  };
  assert.equal(run('price is \\$5 and `$HOME`'), false);
  assert.equal(run('area $S = ah/2$'), true);
});

test('reading time ignores code, images and URLs', () => {
  const prose = '字'.repeat(700);
  const code = '\n```js\n' + 'const x = 1;\n'.repeat(400) + '```\n';
  const img = '![](https://example.com/' + 'a'.repeat(2000) + '.png)\n';
  assert.equal(readingMinutes(prose), 2);
  assert.equal(readingMinutes(prose + code + img), 2);
  assert.equal(readingMinutes('word '.repeat(440)), 2);
});

test('series badge uses the issue written in the title', () => {
  assert.equal(seriesIssue('月刊（第20期）：重启人生', 'weekly'), '#20');
  assert.equal(seriesIssue('Weekly #35: Vibe Coding', 'weekly'), '#35');
  assert.equal(seriesIssue('Monthly #36: A Beginning', 'weekly'), '#36');
  assert.equal(seriesIssue('2025，全新旅途', 'annually'), '2025');
  assert.equal(seriesIssue('再见了，我的大学', 'annually'), null);
});

test('related posts rank by content, not just the shared broad tag', () => {
  const d = (id, title, tags, y) => ({ id, title, tags, date: new Date(`${y}-01-01`), body: '' });
  const all = [
    d('hooks-1', 'React Hooks 源码解析（1）', ['tech'], 2019),
    d('hooks-2', 'React Hooks 源码解析（2）', ['tech'], 2019),
    d('flutter', 'Flutter 混合开发', ['tech'], 2021),
    d('chromium', 'Chromium 渲染流水线', ['tech'], 2022),
    d('newest', '最新的技术文章', ['tech'], 2025),
  ];
  assert.equal(relatedPosts(all[0], all)[0].slug, 'hooks-2');
});

test('no static file in public/og shadows a generated post OG image', () => {
  const posts = fs.readdirSync(path.join(root, 'src/content/posts')).filter((f) => f.endsWith('.md')).map((f) => f.replace(/\.md$/, ''));
  const shadowed = fs.readdirSync(path.join(root, 'public/og')).filter((f) => posts.includes(f.replace(/\.png$/, '')));
  assert.deepEqual(shadowed, []);
});

test('text that runs on after an image is prose, not a caption', () => {
  const imgs = hast('![](a.png)核心逻辑是将 [LayerTreeHost](https://x) 的数据提交\n\n![](b.png)> The full report is [here](https://x)\n');
  assert.deepEqual(imgs.map((p) => p.alt), ['', '']);
});
