import assert from 'node:assert/strict';
import test from 'node:test';
import { readingRssItems } from '../src/lib/reading-feed.ts';

const item = {
  id: 'reading-1',
  slug: 'r-static-feed',
  title: '中文标题',
  title_en: 'English title',
  author: 'Airing',
  source: 'Web',
  item_type: '网页',
  original_url: 'https://example.com/source?a=1&b=2',
  cover_url: 'https://r2.example.com/zh.png?a=1&b=2',
  cover_url_en: 'https://r2.example.com/en.png',
  summary: '中文摘要',
  summary_en: 'English summary',
  topics: ['Agents', 'Browser'],
  saved_at: '2026-09-03T12:00:00.000Z',
  original_published_at: null,
  updated_at: '2026-09-03T12:00:00.000Z',
};

test('Reading RSS maps a public item to the static Chinese permalink', () => {
  const [entry] = readingRssItems([item], 'zh');

  assert.equal(entry?.title, item.title);
  assert.equal(entry?.link, `/reading/${item.slug}/`);
  assert.deepEqual(entry?.categories, item.topics);
  assert.match(entry?.content ?? '', /中文摘要/);
  assert.match(entry?.content ?? '', /a=1&amp;b=2/);
});

test('Reading RSS localizes the item and permalink for the English static feed', () => {
  const [entry] = readingRssItems([item], 'en');

  assert.equal(entry?.title, item.title_en);
  assert.equal(entry?.link, `/en/reading/${item.slug}/`);
  assert.match(entry?.content ?? '', /English summary/);
  assert.match(entry?.content ?? '', /r2\.example\.com\/en\.png/);
});
