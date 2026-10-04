import assert from 'node:assert/strict';
import sharp from 'sharp';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { getRssString } from '@astrojs/rss';
import { XMLParser, XMLValidator } from 'fast-xml-parser';
import { parse } from 'parse5';
import { aiWeeklyIssues, weeklyArticleCount } from '../src/data/ai-weekly.ts';
import { aiWeeklyRssItems } from '../src/lib/ai-weekly-feed.ts';

const documents = await Promise.all(['001.html', '001.en.html'].map(async (file) =>
  parse(await readFile(new URL(`../src/data/ai-weekly/${file}`, import.meta.url), 'utf8'))));
function nodes(root) { return [root, ...(root.childNodes || []).flatMap(nodes)]; }
const attribute = (node, key) => node.attrs?.find((attr) => attr.name === key)?.value;
const hasClass = (node, name) => attribute(node, 'class')?.split(' ').includes(name);

test('each issue covers Sunday through Saturday and publishes after a Sunday editing buffer', () => {
  for (const issue of aiWeeklyIssues) {
    // Given a catalog issue whose date-only fields use the UTC+8 publication calendar.
    const start = new Date(`${issue.startDate}T00:00:00Z`);
    const end = new Date(`${issue.endDate}T00:00:00Z`);
    const publication = new Date(`${issue.publishedAt}T00:00:00Z`);
    // When the coverage and publication dates are compared as calendar days.
    const day = 24 * 60 * 60 * 1000;
    // Then the seven-day issue ends on Saturday, with Sunday free before Monday publication.
    assert.equal(start.getUTCDay(), 0, issue.number);
    assert.equal(end.getTime() - start.getTime(), 6 * day, issue.number);
    assert.equal(publication.getTime() - end.getTime(), 2 * day, issue.number);
  }
});

test('English edition preserves every column, section, figure and highlight', () => {
  const [zh, en] = documents.map(nodes);
  for (const className of ['column-article', 'column-section', 'source-figure', 'editorial-mark']) {
    assert.equal(en.filter((node) => hasClass(node, className)).length,
      zh.filter((node) => hasClass(node, className)).length, className);
  }
  assert.deepEqual(en.filter((node) => hasClass(node, 'column-article')).map((node) => attribute(node, 'id')),
    Array.from({ length: 16 }, (_, i) => `column-${String(i + 1).padStart(2, '0')}`));
  assert.deepEqual(en.filter((node) => hasClass(node, 'column-article')).map((node) => attribute(node, 'data-source')),
    zh.filter((node) => hasClass(node, 'column-article')).map((node) => attribute(node, 'data-source')));
});

test('English edition has translated visible text and accessible labels', () => {
  for (const node of nodes(documents[1])) {
    if (node.nodeName === '#text') assert.doesNotMatch(node.value, /\p{Script=Han}/u);
    for (const attr of node.attrs || []) {
      if (['alt', 'aria-label'].includes(attr.name)) assert.doesNotMatch(attr.value, /\p{Script=Han}/u);
    }
  }
});

for (const lang of ['zh', 'en']) {
  test(`weekly RSS attributes issue and all sixteen column links to the ${lang} edition`, () => {
    // Given the issue's language-specific destination and public campaign metadata.
    const path = `${lang === 'en' ? '/en' : ''}/reading/weekly/001/`;
    const campaign = { utm_source: 'ai-weekly', utm_medium: 'rss', utm_campaign: 'ai-weekly-001', lang };
    // When the feed item is generated.
    const [entry] = aiWeeklyRssItems(aiWeeklyIssues.filter(issue => issue.number === '001'), lang);
    const content = nodes(parse(entry.content));
    const links = content.filter((node) => node.tagName === 'a').map((node) => attribute(node, 'href'));
    // Then every destination has only public attribution fields and retains its absolute path and anchor.
    for (const [index, href] of [entry.link, ...links].entries()) {
      const link = new URL(href, 'https://ursb.me');
      const placement = index === 0 ? 'issue' : `column-${String(index).padStart(2, '0')}`;
      assert.deepEqual(Object.fromEntries(link.searchParams), { ...campaign, utm_content: placement });
      assert.equal(href, link.href);
      assert.equal(link.origin, 'https://ursb.me');
      assert.equal(link.pathname, path);
      assert.equal(link.hash, index === 0 ? '' : `#${placement}`);
    }
    assert.equal(links.length, 16);
  });

  test(`weekly RSS XML keeps the ${lang} canonical GUID and publication metadata`, async () => {
    // Given a previously published item identified by its original canonical URL.
    const issue = aiWeeklyIssues.find(issue => issue.number === '001');
    const canonical = `https://ursb.me${issue.href[lang]}`;
    const items = aiWeeklyRssItems([issue], lang);
    // When the installed Astro RSS adapter serializes the tracked item.
    const xml = await getRssString({ title: 'Weekly feed', description: 'RSS contract', site: 'https://ursb.me', items });
    const entry = new XMLParser({ ignoreAttributes: false }).parse(xml).rss.channel.item;
    // Then tracking changes the clickable link without changing reader identity or metadata.
    assert.equal(XMLValidator.validate(xml), true);
    assert.deepEqual(entry.guid, { '#text': canonical, '@_isPermaLink': 'true' });
    assert.equal(entry.link, new URL(items[0].link, 'https://ursb.me').href);
    assert.equal(entry.pubDate, new Date(`${issue.publishedAt}T00:00:00+08:00`).toUTCString());
    assert.deepEqual(entry.category, issue.topics.map((topic) => topic.title[lang]));
    assert.equal(entry['content:encoded'], items[0].content);
    assert.match(items[0].content, /utm_source=ai-weekly&amp;utm_medium=rss/);
  });

  test(`weekly RSS presents the complete ${lang} magazine cover at A4 proportions`, () => {
    // Given the localized full cover used for issue sharing.
    const issue = aiWeeklyIssues.find(issue => issue.number === '001');
    // When the RSS item is rendered as HTML.
    const [entry] = aiWeeklyRssItems([issue], lang);
    const image = nodes(parse(entry.content)).find((node) => node.tagName === 'img');
    // Then readers see the complete cover without stretching the artwork.
    assert.equal(attribute(image, 'src'), new URL(issue.shareCover[lang], 'https://ursb.me').href);
    assert.ok(Math.abs(Number(attribute(image, 'height')) / Number(attribute(image, 'width')) - 297 / 210) < 0.001);
  });
}


test('the issue represents every saved read in its coverage range, including related reads in a shared column', async () => {
  // Given the frozen Reading Stream snapshot and the issue’s calendar window.
  const issue = aiWeeklyIssues.find(issue => issue.number === '001');
  const snapshot = JSON.parse(await readFile(new URL('./fixtures/ai-weekly-001-reads.json', import.meta.url), 'utf8'));
  const start = Date.parse(issue.startDate + 'T00:00:00+08:00');
  const end = Date.parse(issue.endDate + 'T00:00:00+08:00') + 86400000;
  const expected = snapshot.filter((item) => Date.parse(item.savedAt) >= start && Date.parse(item.savedAt) < end).map((item) => item.url);
  // When the primary and related sources of every column are combined.
  const sources = issue.columns.flatMap((column) => [column.source, ...(column.relatedSources || [])]);
  // Then all saved reads remain represented and openable in both language editions.
  assert.deepEqual(new Set(sources), new Set(expected));
  assert.equal(weeklyArticleCount(issue), expected.length);
  for (const [index, document] of documents.entries()) {
    const links = new Set(nodes(document).filter((node) => node.tagName === 'a').map((node) => attribute(node, 'href')));
    for (const source of sources) assert.ok(links.has(index === 0 ? source : source.replace('/reading/', '/en/reading/')), source);
  }
});


test('share previews are lightweight in both locales while downloads retain the full cover', async () => {
  for (const [index, document] of documents.entries()) {
    const lang = index === 0 ? 'zh' : 'en';
    const image = nodes(document).find((node) => attribute(node, 'id') === 'share-cover');
    const download = nodes(document).find((node) => hasClass(node, 'save-cover'));
    const resolve = (value) => new URL(value, 'https://ursb.me/reading/weekly/001/').pathname;
    const previewPath = resolve(attribute(image, 'src'));
    const originalPath = resolve(attribute(download, 'href'));
    assert.equal(originalPath, aiWeeklyIssues.find(issue => issue.number === '001').shareCover[lang]);
    assert.notEqual(previewPath, originalPath);
    assert.equal(attribute(image, 'loading'), 'lazy');
    assert.equal(attribute(image, 'decoding'), 'async');
    assert.ok(attribute(download, 'download').endsWith('.png'));
    const [preview, original] = await Promise.all([previewPath, originalPath].map((path) =>
      readFile(new URL(`../public${path}`, import.meta.url))));
    const [small, full] = await Promise.all([sharp(preview).metadata(), sharp(original).metadata()]);
    assert.equal(small.format, 'webp');
    assert.equal(full.format, 'png');
    assert.ok(small.width >= 800, 'retain sufficient resolution for the dialog');
    assert.ok(Math.abs(small.width / small.height - full.width / full.height) < 0.001);
    assert.ok(preview.length < original.length / 4, 'avoid loading a full-size download as preview');
    assert.equal(Number(attribute(image, 'width')), small.width);
    assert.equal(Number(attribute(image, 'height')), small.height);
  }
});
