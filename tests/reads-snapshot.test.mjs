import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  slugifyTitle,
  assignSlugs,
  isPublishable,
  dropInboxTags,
  pageToRead,
  pagePassesPublishGate,
  snapshotFromPages,
  enclosureType,
  RSS_TRACK_BASE,
} from '../scripts/lib/reads-snapshot.mjs';

test('slugifyTitle keeps ascii and falls back to id', () => {
  assert.equal(slugifyTitle('LLM Wiki · 能自我构建的个人知识库', 'abc-123'), 'llm-wiki');
  assert.equal(
    slugifyTitle('能自我构建的个人知识库', '3cffdd52-9483-81d3-9ed6-c56645348a69'),
    '3cffdd52948381d39ed6c56645348a69',
  );
  assert.equal(slugifyTitle('', ''), 'read');
});

test('assignSlugs reuses previous slug for the same Notion id', () => {
  const prev = new Map([['id-1', { slug: 'old-stable-slug' }]]);
  const [item] = assignSlugs([{ id: 'id-1', title: 'Brand New Title' }], prev);
  assert.equal(item.slug, 'old-stable-slug');
});

test('assignSlugs disambiguates collisions', () => {
  const items = assignSlugs([
    { id: 'aaaaaaaa', title: 'Same Title' },
    { id: 'bbbbbbbb', title: 'Same Title' },
  ]);
  assert.equal(items[0].slug, 'same-title');
  assert.equal(items[1].slug, 'same-title-bbbbbbbb');
  assert.notEqual(items[0].slug, items[1].slug);
});

test('publish gate requires 公开 + non-empty 外发摘要', () => {
  assert.equal(isPublishable({ published: true, summary: 'hello' }), true);
  assert.equal(isPublishable({ published: '__YES__', summary: 'hello' }), true);
  assert.equal(isPublishable({ published: true, summary: '   ' }), false);
  assert.equal(isPublishable({ published: false, summary: 'hello' }), false);
  assert.equal(isPublishable({ published: '__NO__', summary: 'hello' }), false);
});

test('dropInboxTags removes 待读 only', () => {
  assert.deepEqual(dropInboxTags(['待读', 'GitHub', 'Web']), ['GitHub', 'Web']);
});

function fakePage(overrides = {}) {
  return {
    id: '3cffdd52-9483-81d3-9ed6-c56645348a69',
    cover: { type: 'external', external: { url: 'https://r2.airingdeng.com/notion/llm-wiki-cover.png' } },
    properties: {
      名称: { title: [{ plain_text: 'LLM Wiki' }] },
      外发摘要: { rich_text: [{ plain_text: 'A public summary.' }] },
      原始链接: { url: 'https://github.com/nashsu/llm_wiki' },
      来源: { select: { name: 'GitHub' } },
      '作者/来源': { rich_text: [{ plain_text: 'nashsu' }] },
      收藏时间: { date: { start: '2026-09-02T12:31:00.000Z' } },
      标签: { multi_select: [{ name: '待读' }, { name: 'GitHub' }] },
      公开: { checkbox: true },
    },
    ...overrides,
  };
}

test('pageToRead maps public fields and drops 待读; never copies body', () => {
  const page = fakePage({ body: '## 原文\nshould never leak' });
  const item = pageToRead(page);
  assert.equal(item.id, page.id);
  assert.equal(item.title, 'LLM Wiki');
  assert.equal(item.summary, 'A public summary.');
  assert.equal(item.sourceUrl, 'https://github.com/nashsu/llm_wiki');
  assert.equal(item.cover, 'https://r2.airingdeng.com/notion/llm-wiki-cover.png');
  assert.equal(item.source, 'GitHub');
  assert.equal(item.author, 'nashsu');
  assert.equal(item.publishedAt, '2026-09-02T12:31:00.000Z');
  assert.deepEqual(item.tags, ['GitHub']);
  assert.equal('body' in item, false);
  assert.equal(JSON.stringify(item).includes('原文'), false);
});

test('pagePassesPublishGate rejects unpublished / empty-summary rows', () => {
  assert.equal(pagePassesPublishGate(fakePage()), true);
  assert.equal(pagePassesPublishGate(fakePage({
    properties: { ...fakePage().properties, 公开: { checkbox: false } },
  })), false);
  assert.equal(pagePassesPublishGate(fakePage({
    properties: { ...fakePage().properties, 外发摘要: { rich_text: [] } },
  })), false);
});

test('snapshotFromPages returns [] when nothing is publishable', () => {
  assert.deepEqual(snapshotFromPages([]), []);
  assert.deepEqual(snapshotFromPages([fakePage({
    properties: { ...fakePage().properties, 公开: { checkbox: false } },
  })]), []);
});

test('RSS tracking pixel host is chat.ursb.me', () => {
  assert.equal(RSS_TRACK_BASE, 'https://chat.ursb.me/api/rss-track');
  assert.equal(enclosureType('https://r2.example/cover.png'), 'image/png');
  assert.equal(enclosureType('https://r2.example/cover.jpg?x=1'), 'image/jpeg');
});

import { readToRssFields } from '../src/lib/reads.ts';

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
