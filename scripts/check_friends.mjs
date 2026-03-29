/**
 * Check friend links accessibility and collect metadata.
 * Saves results to src/data/friends_meta.json
 *
 * Usage:
 *   node scripts/check_friends.mjs
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

const friends = JSON.parse(
  fs.readFileSync(path.join(ROOT, 'src/data/friends.json'), 'utf-8')
);

const TIMEOUT = 8000; // 8s per site
const CONCURRENCY = 10;

async function checkSite(url) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT);

  try {
    const res = await fetch(url, {
      method: 'GET',
      signal: controller.signal,
      redirect: 'follow',
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; FriendLinkChecker/1.0)',
      },
    });
    clearTimeout(timer);

    const lastModified = res.headers.get('last-modified') || null;

    return {
      status: res.status,
      ok: res.ok,
      lastModified,
    };
  } catch (err) {
    clearTimeout(timer);
    return {
      status: 0,
      ok: false,
      lastModified: null,
      error: err.name === 'AbortError' ? 'timeout' : err.message,
    };
  }
}

async function runBatch(items, fn, concurrency) {
  const results = [];
  for (let i = 0; i < items.length; i += concurrency) {
    const batch = items.slice(i, i + concurrency);
    const batchResults = await Promise.all(batch.map(fn));
    results.push(...batchResults);
    if (i + concurrency < items.length) {
      console.log(`  checked ${Math.min(i + concurrency, items.length)}/${items.length}...`);
    }
  }
  return results;
}

async function main() {
  console.log(`Checking ${friends.length} friend sites...`);

  const results = await runBatch(
    friends,
    async (f) => {
      const result = await checkSite(f.url);
      const symbol = result.ok ? '✓' : '✗';
      console.log(`  ${symbol} ${f.name} (${result.status || result.error})`);
      return {
        url: f.url,
        ...result,
      };
    },
    CONCURRENCY
  );

  // Build meta map keyed by URL
  const meta = {};
  for (const r of results) {
    meta[r.url] = {
      status: r.status,
      ok: r.ok,
      lastModified: r.lastModified,
      error: r.error || null,
    };
  }

  const output = {
    checkedAt: new Date().toISOString(),
    sites: meta,
  };

  const outPath = path.join(ROOT, 'src/data/friends_meta.json');
  fs.writeFileSync(outPath, JSON.stringify(output, null, 2) + '\n');

  const okCount = results.filter((r) => r.ok).length;
  console.log(`\nDone: ${okCount}/${results.length} accessible. Saved to src/data/friends_meta.json`);
}

main();
