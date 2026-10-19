import assert from 'node:assert/strict';
import { readFile, access } from 'node:fs/promises';
import test from 'node:test';
import { parse } from 'parse5';
import sharp from 'sharp';
import { aiWeeklyIssues, weeklyArticleCount } from '../../src/data/ai-weekly.ts';
import sources from '../../src/data/ai-weekly/004.sources.json' with { type: 'json' };
import { weeklyDestination } from '../../src/scripts/weekly-analytics.ts';

const issue = aiWeeklyIssues.find(issue => issue.number === '004');
const built = path => new URL('../../dist' + path, import.meta.url);
const nodes = root => [root, ...(root.childNodes ?? []).flatMap(nodes)];
const attr = (node, key) => node?.attrs?.find(item => item.name === key)?.value;
const documentAt = async path => nodes(parse(await readFile(built(path), 'utf8')));

for (const lang of ['zh', 'en']) {
  const prefix = lang === 'en' ? '/en' : '';
  test(`${lang} 004 publishes all readings and reachable editorial units`, async () => {
    const document = await documentAt(issue.href[lang] + 'index.html');
    const ids = document.map(n => attr(n, 'id')).filter(Boolean);
    assert.equal(weeklyArticleCount(issue), 34);
    assert.equal(issue.columns.length, 22);
    assert.equal(issue.topics.reduce((sum, t) => sum + t.count, 0), 22);
    assert.deepEqual(ids.filter(id => /^source-\d+$/.test(id)), sources.map(s => `source-${s.n}`));
    const urls = new Set(issue.columns.flatMap(c => [c.source, ...(c.relatedSources ?? [])]));
    assert.deepEqual([...urls].sort(), sources.map(s => s.reading_url ?? s.original_url).sort());
    for (const column of issue.columns) {
      assert.equal(ids.filter(id => id === column.anchor).length, 1, column.anchor);
      assert.equal(document.filter(n => attr(n, 'data-weekly-column') === column.anchor && ['section', 'article'].includes(n.tagName)).length, 1);
    }
    for (const node of document.filter(n => n.tagName === 'a' && attr(n, 'href')?.startsWith('#'))) {
      const target = attr(node, 'href').slice(1);
      assert.ok(ids.includes(target), target);
      assert.equal(weeklyDestination(`https://ursb.me${issue.href[lang]}#${target}`).target, target);
    }
    for (const source of sources.filter(s => s.reading_url)) await access(built(`${prefix}/reading/${source.slug}/index.html`));
    assert.equal(attr(document.find(n => n.tagName === 'body'), 'data-weekly-surface'), 'weekly-issue');
    assert.equal(attr(document.find(n => n.attrs?.some(a => a.name === 'data-language-switch')), 'href'), issue.href[lang === 'zh' ? 'en' : 'zh']);
    assert.ok(document.some(n => n.nodeName === '#text' && n.value.includes('2026.10.19')));
  });

  test(`${lang} 004 has published metadata, share and subscription controls; previews stay isolated`, async () => {
    const document = await documentAt(issue.href[lang] + 'index.html');
    const meta = name => attr(document.find(n => attr(n, 'name') === name || attr(n, 'property') === name), 'content');
    assert.equal(meta('robots'), undefined);
    assert.equal(meta('og:url'), 'https://ursb.me' + issue.href[lang]);
    assert.equal(meta('og:image'), 'https://ursb.me' + issue.socialImage[lang]);
    assert.equal(meta('og:description'), issue.description[lang]);
    assert.equal(meta('twitter:card'), 'summary_large_image');
    assert.equal(attr(document.find(n => attr(n, 'rel') === 'canonical'), 'href'), meta('og:url'));
    assert.equal(attr(document.find(n => attr(n, 'id') === 'share-url'), 'value'), meta('og:url'));
    assert.equal(attr(document.find(n => attr(n, 'class') === 'save-cover'), 'href'), issue.shareCover[lang]);
    assert.ok(document.some(n => n.attrs?.some(a => a.name === 'data-subscribe-open')));
    assert.ok(document.some(n => attr(n, 'rel') === 'prev' && attr(n, 'href') === `${prefix}/reading/weekly/003/`));
    const previous = await documentAt(`${prefix}/reading/weekly/003/index.html`);
    assert.ok(previous.some(n => attr(n, 'rel') === 'next' && attr(n, 'href') === issue.href[lang]));
    const preview = await documentAt(`${prefix}/previews/ai-weekly-004/index.html`);
    assert.equal(attr(preview.find(n => attr(n, 'name') === 'robots'), 'content'), 'noindex,nofollow');
    assert.ok(!preview.some(n => attr(n, 'data-weekly-surface') || attr(n, 'id') === 'issue-share'));
  });

  test(`${lang} 004 leads discovery and RSS with bounded cover variants`, async () => {
    for (const path of [prefix + '/reading/weekly/index.html', prefix + '/reading/index.html', '/index.html']) {
      const html = await readFile(built(path), 'utf8');
      assert.ok(html.includes(issue.href[lang]), path);
      assert.ok(html.includes(issue.cover[lang]), path);
    }
    const archive = await readFile(built(prefix + '/reading/weekly/index.html'), 'utf8');
    assert.ok(archive.indexOf('issue-004') < archive.indexOf('issue-003'));
    const feed = await readFile(built(prefix + '/reading/weekly/feed.xml'), 'utf8');
    assert.ok(feed.includes('ai-weekly-004') && feed.includes('utm_medium=rss'));
    for (const column of issue.columns) assert.ok(feed.includes(column.anchor));
    for (const [file, size, budget] of [
      [issue.cover[lang], [540, 764], 100000],
      [issue.shareCover[lang].replace('.png', '.webp'), [864, 1222], 250000],
      [issue.shareCover[lang], [1080, 1528], 5000000],
      [issue.socialImage[lang], [1200, 600], 1000000],
    ]) {
      const buffer = await readFile(built(file));
      const meta = await sharp(buffer).metadata();
      assert.deepEqual([meta.width, meta.height], size, file);
      assert.ok(buffer.length < budget, `${file}: ${buffer.length}`);
    }
  });
}
