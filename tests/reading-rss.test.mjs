import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import test from 'node:test';
import { loadRemoteImage } from '../node_modules/astro/dist/assets/build/remote.js';
import {
  loadReadingCover,
  resetReadingCoverReachability,
} from '../src/lib/reading-cover.ts';
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

function startCoverServer() {
  const hits = new Map();
  return new Promise((resolve) => {
    const server = createServer((req, res) => {
      const url = req.url || '/';
      hits.set(url, (hits.get(url) || 0) + 1);
      if (url.startsWith('/head-ok-get-404')) {
        if (req.method === 'HEAD') {
          res.writeHead(200, { 'content-type': 'image/png' });
          res.end();
          return;
        }
        res.writeHead(404, { 'content-type': 'text/html' });
        res.end('<html>cached miss</html>');
        return;
      }
      if (url.startsWith('/ok')) {
        res.writeHead(200, { 'content-type': 'image/png', 'content-length': '2' });
        res.end(req.method === 'HEAD' ? undefined : 'ok');
        return;
      }
      res.writeHead(404, { 'content-type': 'text/plain' });
      res.end(req.method === 'HEAD' ? undefined : 'missing');
    });
    server.listen(0, '127.0.0.1', () => {
      const address = server.address();
      const port = typeof address === 'object' && address ? address.port : 0;
      resolve({
        server,
        hits,
        urlFor(path) {
          return `http://127.0.0.1:${port}${path}`;
        },
      });
    });
  });
}

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

test('unreachable covers are never queued for Astro generateImagesForPath', async () => {
  resetReadingCoverReachability();
  const { server, hits, urlFor } = await startCoverServer();
  const missing = urlFor('/missing.png');
  const warnings = [];
  const originalWarn = console.warn;
  console.warn = (...args) => {
    warnings.push(args.map(String).join(' '));
  };
  let loadCalled = false;

  try {
    await assert.rejects(
      () => loadRemoteImage(urlFor('/asset-pipeline-404.png')),
      /Failed to load remote image .* The request did not return a 200 OK response\. \(received 404\)/,
    );

    const result = await loadReadingCover(
      '"Dream-RSI · 让 Agent 在自己的历史里做梦来自我进化" (r-bcsejv8vnyctm_sz)',
      missing,
      async () => {
        loadCalled = true;
        return loadRemoteImage(missing);
      },
    );
    const again = await loadReadingCover(
      '"Monid · 用自然语言描述界面" (r-monid)',
      missing,
      async () => {
        loadCalled = true;
        return loadRemoteImage(missing);
      },
    );

    assert.equal(result, null);
    assert.equal(again, null);
    assert.equal(loadCalled, false);
    assert.equal(hits.get('/missing.png'), 1);
    assert.match(
      warnings.join('\n'),
      /\[reading\] skip missing cover for "Dream-RSI · 让 Agent 在自己的历史里做梦来自我进化" \(r-bcsejv8vnyctm_sz\): http:\/\/127\.0\.0\.1:\d+\/missing\.png \(cover is not reachable \(GET must return 200 image\/\*\)\)/,
    );
    assert.match(warnings.join('\n'), /Monid/);
  } finally {
    console.warn = originalWarn;
    resetReadingCoverReachability();
    await new Promise((resolve) => server.close(resolve));
  }
});

test('HEAD 200 with GET 404 is treated as unreachable and never queued', async () => {
  resetReadingCoverReachability();
  const { server, hits, urlFor } = await startCoverServer();
  const misleading = urlFor('/head-ok-get-404.png');
  const warnings = [];
  const originalWarn = console.warn;
  console.warn = (...args) => {
    warnings.push(args.map(String).join(' '));
  };
  let loadCalled = false;

  try {
    const result = await loadReadingCover(
      '"Dream-RSI · 让 Agent 在自己的历史里做梦来自我进化" (r-bcsejv8vnyctm_sz)',
      misleading,
      async () => {
        loadCalled = true;
        return loadRemoteImage(misleading);
      },
    );

    assert.equal(result, null);
    assert.equal(loadCalled, false);
    assert.equal(hits.get('/head-ok-get-404.png'), 1);
    assert.match(warnings.join('\n'), /head-ok-get-404\.png/);
    assert.match(warnings.join('\n'), /GET must return 200 image\/\*/);
  } finally {
    console.warn = originalWarn;
    resetReadingCoverReachability();
    await new Promise((resolve) => server.close(resolve));
  }
});

test('loadReadingCover still warns if a reachable cover later fails to optimize', async () => {
  resetReadingCoverReachability();
  const { server, urlFor } = await startCoverServer();
  const ok = urlFor('/ok.png');
  const warnings = [];
  const originalWarn = console.warn;
  console.warn = (...args) => {
    warnings.push(args.map(String).join(' '));
  };

  try {
    const result = await loadReadingCover(
      '"reachable but broken" (broken-optimize)',
      ok,
      async () => {
        throw new Error('FailedToFetchRemoteImageDimensions: Failed to get the dimensions for ' + ok);
      },
    );

    assert.equal(result, null);
    assert.match(warnings.join('\n'), /reachable but broken/);
    assert.match(warnings.join('\n'), /Failed to get the dimensions/);
  } finally {
    console.warn = originalWarn;
    resetReadingCoverReachability();
    await new Promise((resolve) => server.close(resolve));
  }
});

test('loadReadingCover returns the optimized cover when the probe succeeds', async () => {
  resetReadingCoverReachability();
  const { server, urlFor } = await startCoverServer();
  const ok = urlFor('/ok.png');

  try {
    const result = await loadReadingCover('"ok" (ok)', ok, async () => 'https://ursb.me/_astro/ok.jpeg');
    assert.equal(result, 'https://ursb.me/_astro/ok.jpeg');
  } finally {
    resetReadingCoverReachability();
    await new Promise((resolve) => server.close(resolve));
  }
});
