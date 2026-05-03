#!/usr/bin/env node
// scripts/sync-workouts.mjs
//
// Read HealthAutoExport-*.json from $WORKOUTS_BACKUP_DIR (default iCloud path),
// normalize each workout, and write:
//   - src/data/workouts/<id>.json    (full normalized record)
//   - src/data/workouts.json         (index for list page)
//   - src/content/workouts/<id>.mdx  (stub if missing — never overwritten)
//
// Usage:
//   WORKOUTS_BACKUP_DIR="..." npm run sync:workouts

import 'dotenv/config';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';
import { normalizeWorkout } from './lib/workouts-normalize.mjs';
import { generateTrackSvg } from './lib/workouts-svg-track.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const DEFAULT_DIR = path.join(
  os.homedir(),
  'Library/Mobile Documents/iCloud~com~ifunography~HealthExport/Documents/Workouts Backup'
);
const SRC_DIR = process.env.WORKOUTS_BACKUP_DIR || DEFAULT_DIR;
const OUT_DATA_DIR    = path.join(ROOT, 'src/data/workouts');
const OUT_INDEX       = path.join(ROOT, 'src/data/workouts.json');
const OUT_CONTENT_DIR = path.join(ROOT, 'src/content/workouts');

async function main() {
  await fs.mkdir(OUT_DATA_DIR,    { recursive: true });
  await fs.mkdir(OUT_CONTENT_DIR, { recursive: true });

  const entries = await fs.readdir(SRC_DIR);
  const files = entries
    .filter(f => /^HealthAutoExport-.*\.json$/.test(f))
    .map(f => path.join(SRC_DIR, f));

  console.log(`[workouts] scanning ${files.length} backup file(s) in ${SRC_DIR}`);

  /** @type {Map<string, ReturnType<typeof normalizeWorkout>>} */
  const seen = new Map();

  for (const file of files) {
    let raw;
    try {
      raw = JSON.parse(await fs.readFile(file, 'utf8'));
    } catch (err) {
      console.warn(`[workouts] skip ${path.basename(file)}: ${err.message}`);
      continue;
    }
    const workouts = raw?.data?.workouts ?? [];
    for (const w of workouts) {
      try {
        const normalized = normalizeWorkout(w);
        if (normalized.type !== 'hiking') continue;        // hiking-only feed
        if (!seen.has(normalized.id)) {
          seen.set(normalized.id, normalized);
        }
      } catch (err) {
        console.warn(`[workouts] skip workout ${w?.id}: ${err.message}`);
      }
    }
  }

  // Prune any locally-cached non-hiking artifacts from a previous run.
  await pruneOrphans(OUT_DATA_DIR, '.json', seen);
  await pruneOrphans(OUT_CONTENT_DIR, '.mdx', seen);

  // Write per-workout JSON + content stubs
  const indexEntries = [];
  for (const w of seen.values()) {
    const detailPath = path.join(OUT_DATA_DIR, `${w.id}.json`);
    await fs.writeFile(detailPath, JSON.stringify(w) + '\n');

    const mdxPath = path.join(OUT_CONTENT_DIR, `${w.id}.mdx`);
    if (!(await exists(mdxPath))) {
      await fs.writeFile(mdxPath, makeStubMdx(w));
      console.log(`[workouts] stub mdx → ${path.basename(mdxPath)}`);
    }

    indexEntries.push({
      id: w.id,
      type: w.type,
      start: w.start,
      durationSec: w.durationSec,
      stats: {
        distanceKm: w.stats.distanceKm,
        elevationUpM: w.stats.elevationUpM,
        heart: w.stats.heart,
      },
      bbox: w.bbox,
      trackSvg: generateTrackSvg(w.route),
    });
  }

  // Sort newest first
  indexEntries.sort((a, b) => b.start.localeCompare(a.start));

  await fs.writeFile(OUT_INDEX, JSON.stringify(indexEntries, null, 2) + '\n');
  console.log(`[workouts] wrote ${indexEntries.length} workout(s) → ${path.relative(ROOT, OUT_INDEX)}`);
}

async function exists(p) {
  try { await fs.access(p); return true; } catch { return false; }
}

/** Delete files in `dir` whose basename (sans `ext`) is not a key in `keep`. */
async function pruneOrphans(dir, ext, keep) {
  const entries = await fs.readdir(dir);
  for (const f of entries) {
    if (!f.endsWith(ext)) continue;
    const id = f.slice(0, -ext.length);
    if (!keep.has(id)) {
      await fs.unlink(path.join(dir, f));
      console.log(`[workouts] prune ${f}`);
    }
  }
}

function makeStubMdx(w) {
  const dateZh = w.start.slice(0, 10);
  const typeLabel = ({
    hiking: '徒步',
    walking: '步行',
    running: '跑步',
    cycling: '骑行',
    other:   '运动',
  })[w.type] ?? '运动';
  const typeLabelEn = w.type.charAt(0).toUpperCase() + w.type.slice(1);
  return `---
title:
  zh: ${dateZh} · ${typeLabel}
  en: ${dateZh} · ${typeLabelEn}
draft: false
---
`;
}

main().catch((err) => { console.error(err); process.exit(1); });
