import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
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
  test(`weekly RSS links all sixteen columns to the ${lang} edition`, () => {
    const [entry] = aiWeeklyRssItems(aiWeeklyIssues, lang);
    const path = `${lang === 'en' ? '/en' : ''}/reading/weekly/001/`;
    assert.equal(entry.link, path);
    const content = nodes(parse(entry.content));
    const links = content.filter((node) => node.tagName === 'a').map((node) => attribute(node, 'href'));
    assert.deepEqual(links, Array.from({ length: 16 }, (_, i) => `https://ursb.me${path}#column-${String(i + 1).padStart(2, '0')}`));
    assert.equal(aiWeeklyIssues[0].columns.length, 16);
    assert.ok(Number.isFinite(entry.pubDate.getTime()));
  });
}


test('the issue represents every saved read in its coverage range, including related reads in a shared column', async () => {
  // Given the frozen Reading Stream snapshot and the issue’s calendar window.
  const [issue] = aiWeeklyIssues;
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
