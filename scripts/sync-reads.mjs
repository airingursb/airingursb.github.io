#!/usr/bin/env node
/**
 * Pull the public reads snapshot from R2 → src/data/reads.json
 *
 * Source of truth: https://r2.airingdeng.com/reads.json (written by 采集).
 * This repo never talks to Notion and must not hold a Notion token.
 *
 * Usage:
 *   npm run sync:reads
 *
 * Curl failure or empty/invalid payload → write [] so CI still builds.
 */

import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { READS_SNAPSHOT_URL, normalizeReadsSnapshot } from './lib/reads-snapshot.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const OUT = path.join(ROOT, 'src/data/reads.json');

async function fetchSnapshot(url) {
  const res = await fetch(url, {
    headers: { 'User-Agent': 'ursb-reads-sync/1.0' },
    signal: AbortSignal.timeout(20_000),
  });
  if (!res.ok) {
    throw new Error(`HTTP ${res.status}`);
  }
  return res.json();
}

async function writeEmpty(reason) {
  await fs.writeFile(OUT, '[]\n');
  console.warn(`[reads] ${reason}; wrote []`);
}

async function main() {
  const url = process.env.READS_SNAPSHOT_URL || READS_SNAPSHOT_URL;
  let raw;
  try {
    raw = await fetchSnapshot(url);
  } catch (err) {
    await writeEmpty(`fetch failed (${err.message || err})`);
    return;
  }

  const items = normalizeReadsSnapshot(raw);
  if (items.length === 0) {
    await writeEmpty('snapshot empty or invalid');
    return;
  }

  await fs.writeFile(OUT, `${JSON.stringify(items, null, 2)}\n`);
  console.log(`[reads] wrote ${items.length} item(s) from ${url} → ${path.relative(ROOT, OUT)}`);
}

main().catch(async (err) => {
  try {
    await writeEmpty(err.message || String(err));
  } catch (writeErr) {
    console.error('[reads]', writeErr);
    process.exit(1);
  }
});
