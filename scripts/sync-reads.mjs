#!/usr/bin/env node
/**
 * Sync Notion 信息采集箱 → src/data/reads.json
 *
 * Publish gate: 公开 is true AND 外发摘要 is non-empty.
 * Snapshot only public fields — never inbox body / 「## 原文」.
 *
 * Usage:
 *   NOTION_TOKEN=... npm run sync:reads
 *
 * Without a token, leaves the committed fixture (empty list) in place
 * so CI can build.
 */

import 'dotenv/config';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { snapshotFromPages } from './lib/reads-snapshot.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const OUT = path.join(ROOT, 'src/data/reads.json');

// 信息采集箱 — not a secret; token is.
const DEFAULT_DATABASE_ID = '51c91ced1c114508ab735519bc4ca6b4';
const NOTION_VERSION = '2022-06-28';

async function readPrevious() {
  try {
    const raw = JSON.parse(await fs.readFile(OUT, 'utf8'));
    return Array.isArray(raw) ? raw : [];
  } catch {
    return [];
  }
}

async function queryNotion(token, databaseId) {
  const pages = [];
  let startCursor;
  do {
    const res = await fetch(`https://api.notion.com/v1/databases/${databaseId}/query`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Notion-Version': NOTION_VERSION,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        page_size: 100,
        start_cursor: startCursor,
        filter: {
          and: [
            { property: '公开', checkbox: { equals: true } },
            { property: '外发摘要', rich_text: { is_not_empty: true } },
          ],
        },
        sorts: [{ property: '收藏时间', direction: 'descending' }],
      }),
    });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Notion query ${res.status}: ${text.slice(0, 400)}`);
    }
    const data = await res.json();
    pages.push(...(data.results || []));
    startCursor = data.has_more ? data.next_cursor : undefined;
  } while (startCursor);
  return pages;
}

async function main() {
  const token = process.env.NOTION_TOKEN || process.env.NOTION_API_KEY || '';
  const databaseId = process.env.NOTION_READS_DATABASE_ID || DEFAULT_DATABASE_ID;
  const previous = await readPrevious();

  if (!token) {
    if (!previous.length) {
      await fs.writeFile(OUT, '[]\n');
    }
    console.warn('[reads] NOTION_TOKEN missing; keeping existing snapshot');
    return;
  }

  const pages = await queryNotion(token, databaseId);
  const items = snapshotFromPages(pages, previous);
  await fs.writeFile(OUT, `${JSON.stringify(items, null, 2)}\n`);
  console.log(`[reads] wrote ${items.length} item(s) → ${path.relative(ROOT, OUT)}`);
}

main().catch((err) => {
  console.error('[reads]', err.message || err);
  process.exit(1);
});
