import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  slugifyTitle,
  normalizeReadsSnapshot,
  enclosureType,
  RSS_TRACK_BASE,
  READS_SNAPSHOT_URL,
} from '../scripts/lib/reads-snapshot.mjs';
import { readToRssFields } from '../src/lib/reads.ts';

test('R2 snapshot URL is the public reads.json (no Notion)', () => {
  assert.equal(READS_SNAPSHOT_URL, 'https://r2.airingdeng.com/reads.json');
});

test('slugifyTitle keeps ascii and falls back to id', () => {
  assert.equal(slugifyTitle('LLM Wiki · 能自我构建的个人知识库', 'abc-123'), 'llm-wiki');
  assert.equal(
    slugifyTitle('能自我构建的个人知识库', '3cffdd52-9483-81d3-9ed6-c56645348a69'),
    '3cffdd52948381d39ed6c56645348a69',
  );
  assert.equal(slugifyTitle('', ''), 'read');
});

test('normalizeReadsSnapshot returns [] for empty or invalid payloads', () => {
  assert.deepEqual(normalizeReadsSnapshot(null), []);
  assert.deepEqual(normalizeReadsSnapshot(undefined), []);
  assert.deepEqual(normalizeReadsSnapshot([]), []);
  assert.deepEqual(normalizeReadsSnapshot({}), []);
  assert.deepEqual(normalizeReadsSnapshot({ items: [] }), []);
  assert.deepEqual(normalizeReadsSnapshot('nope'), []);
});

test('normalizeReadsSnapshot keeps public fields and drops inbox extras', () => {
  const [item] = normalizeReadsSnapshot([
    {
      id: 'abc',
      slug: 'llm-wiki',
      title: 'LLM Wiki',
      summary: 'A public summary.',
      sourceUrl: 'https://github.com/nashsu/llm_wiki',
      cover: 'https://r2.airingdeng.com/notion/llm-wiki-cover.png',
      source: 'GitHub',
      author: 'nashsu',
      publishedAt: '2026-09-02T12:31:00.000Z',
      tags: ['GitHub'],
      body: '## 原文\nshould never leak',
      原文: 'full article',
    },
  ]);
  assert.deepEqual(item, {
    id: 'abc',
    slug: 'llm-wiki',
    title: 'LLM Wiki',
    summary: 'A public summary.',
    sourceUrl: 'https://github.com/nashsu/llm_wiki',
    cover: 'https://r2.airingdeng.com/notion/llm-wiki-cover.png',
    source: 'GitHub',
    author: 'nashsu',
    publishedAt: '2026-09-02T12:31:00.000Z',
    tags: ['GitHub'],
  });
  assert.equal('body' in item, false);
  assert.equal(JSON.stringify(item).includes('原文'), false);
});

test('normalizeReadsSnapshot fills slug from title when missing', () => {
  const [item] = normalizeReadsSnapshot([{ id: 'id-1', title: 'Hello World', summary: 'x' }]);
  assert.equal(item.slug, 'hello-world');
});

test('RSS tracking pixel host is chat.ursb.me', () => {
  assert.equal(RSS_TRACK_BASE, 'https://chat.ursb.me/api/rss-track');
  assert.equal(enclosureType('https://r2.example/cover.png'), 'image/png');
  assert.equal(enclosureType('https://r2.example/cover.jpg?x=1'), 'image/jpeg');
});

test('RSS item uses permalink, enclosure, and chat.ursb.me pixel', () => {
  const fields = readToRssFields({
    id: 'abc',
    slug: 'llm-wiki',
    title: 'LLM Wiki',
    summary: 'A public summary.',
    sourceUrl: 'https://github.com/nashsu/llm_wiki',
    cover: 'https://r2.airingdeng.com/notion/llm-wiki-cover.png',
    source: 'GitHub',
    author: 'nashsu',
    publishedAt: '2026-09-02T12:31:00.000Z',
    tags: ['GitHub'],
  });
  assert.equal(fields.link, '/reads/llm-wiki/');
  assert.equal(fields.link.includes('github.com'), false);
  assert.equal(fields.enclosure.url, 'https://r2.airingdeng.com/notion/llm-wiki-cover.png');
  assert.equal(fields.enclosure.type, 'image/png');
  assert.match(fields.content, /https:\/\/chat\.ursb\.me\/api\/rss-track\?post=llm-wiki/);
  assert.equal(fields.content.includes('https://ursb.me/api/rss-track'), false);
});
