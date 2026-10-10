import assert from 'node:assert/strict';
import test from 'node:test';
import { loadReadingCover } from '../src/lib/reading-cover.ts';
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

test('optimized covers preserve feed identity, source links and localized content', () => {
  const covers = new Map([
    [item.cover_url, 'https://ursb.me/_astro/cover-zh.jpeg'],
    [item.cover_url_en, 'https://ursb.me/_astro/cover-en.jpeg'],
  ]);
  for (const lang of ['zh', 'en']) {
    const [original] = readingRssItems([item], lang);
    const [optimized] = readingRssItems([item], lang, covers);
    const source = lang === 'en' ? item.cover_url_en : item.cover_url;
    const escaped = source.replaceAll('&', '&amp;');
    assert.deepEqual(optimized, {
      ...original,
      content: original.content.replace(escaped, covers.get(source)),
    });
    assert.ok(optimized.content.includes('https://ursb.me/_astro/cover-'));
  }
  const fallback = { ...item, cover_url_en: null };
  const [entry] = readingRssItems([fallback], 'en', covers);
  assert.ok(entry.content.includes(covers.get(item.cover_url)));
  assert.equal(entry.title, item.title_en);
});

test('Reading RSS omits a cover that could not be fetched or measured', () => {
  const covers = new Map([[item.cover_url, null]]);
  const [entry] = readingRssItems([item], 'zh', covers);

  assert.doesNotMatch(entry?.content ?? '', /<img/);
  assert.match(entry?.content ?? '', /中文摘要/);
  assert.match(entry?.content ?? '', /阅读原文/);
});

test('loadReadingCover warns with the item and URL, then keeps going', async () => {
  const missing = 'https://r2.airingdeng.com/notion/this-cover-does-not-exist-404.png';
  const warnings = [];
  const originalWarn = console.warn;
  console.warn = (...args) => {
    warnings.push(args.map(String).join(' '));
  };

  try {
    const result = await loadReadingCover(
      '"Dream-RSI · 让 Agent 在自己的历史里做梦来自我进化" (dream-rsi-evolving-worlds)',
      missing,
      async () => {
        throw new Error(`FailedToFetchRemoteImageDimensions: Failed to get the dimensions for ${missing}`);
      },
    );

    assert.equal(result, null);
    assert.match(warnings.join('\n'), /Dream-RSI/);
    assert.match(warnings.join('\n'), /dream-rsi-evolving-worlds/);
    assert.match(warnings.join('\n'), new RegExp(missing.replaceAll('.', '\\.')));
  } finally {
    console.warn = originalWarn;
  }
});

test('loadReadingCover returns the optimized cover when the probe succeeds', async () => {
  const result = await loadReadingCover('"ok" (ok)', 'https://r2.example.com/ok.png', async () => 'https://ursb.me/_astro/ok.jpeg');
  assert.equal(result, 'https://ursb.me/_astro/ok.jpeg');
});

test('a real 404 cover URL is skipped with a warning naming the item and URL', async () => {
  const missing = 'https://r2.airingdeng.com/notion/this-cover-does-not-exist-404.png';
  const warnings = [];
  const originalWarn = console.warn;
  console.warn = (...args) => {
    warnings.push(args.map(String).join(' '));
  };

  try {
    const result = await loadReadingCover(
      '"Dream-RSI · 让 Agent 在自己的历史里做梦来自我进化" (dream-rsi-evolving-worlds)',
      missing,
      async () => {
        const response = await fetch(missing);
        if (!response.ok) {
          throw new Error(`FailedToFetchRemoteImageDimensions: Failed to get the dimensions for ${missing}`);
        }
        return 'should-not-optimize-a-missing-cover';
      },
    );

    assert.equal(result, null);
    assert.match(warnings.join('\n'), /\[reading\] skip missing cover for "Dream-RSI/);
    assert.match(warnings.join('\n'), /dream-rsi-evolving-worlds/);
    assert.match(warnings.join('\n'), /this-cover-does-not-exist-404\.png/);
  } finally {
    console.warn = originalWarn;
  }
});
