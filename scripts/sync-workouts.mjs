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
// Default source: project-local `workouts-source/` (gitignored).
// Drop full HealthAutoExport JSONs there with any filename.
// Override via $WORKOUTS_SOURCE_DIR for one-off runs against another path.
const DEFAULT_DIR = path.join(ROOT, 'workouts-source');
const SRC_DIR = process.env.WORKOUTS_SOURCE_DIR
  || process.env.WORKOUTS_BACKUP_DIR        // legacy env name
  || DEFAULT_DIR;
const OUT_DATA_DIR    = path.join(ROOT, 'src/data/workouts');
const OUT_INDEX       = path.join(ROOT, 'src/data/workouts.json');
const OUT_CONTENT_DIR = path.join(ROOT, 'src/content/workouts');

async function main() {
  await fs.mkdir(OUT_DATA_DIR,    { recursive: true });
  await fs.mkdir(OUT_CONTENT_DIR, { recursive: true });

  let entries = [];
  try {
    entries = await fs.readdir(SRC_DIR);
  } catch (err) {
    // No source dir → produce empty index so the build still succeeds.
    console.warn(`[workouts] no source dir at ${SRC_DIR} (${err.code}); writing empty index`);
    await fs.writeFile(OUT_INDEX, '[]\n');
    return;
  }
  const files = entries
    .filter(f => f.endsWith('.json') && !f.startsWith('.'))
    .map(f => path.join(SRC_DIR, f));

  console.log(`[workouts] scanning ${files.length} source file(s) in ${SRC_DIR}`);

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
  const date = w.start.slice(0, 10);
  const typeLabel = ({
    hiking: '徒步',
    walking: '步行',
    running: '跑步',
    cycling: '骑行',
    other:   '运动',
  })[w.type] ?? '运动';
  const typeLabelEn = w.type.charAt(0).toUpperCase() + w.type.slice(1);
  const km = w.stats.distanceKm.toFixed(2);
  const mins = Math.floor(w.durationSec / 60);
  const hh = Math.floor(mins / 60);
  const mm = mins % 60;
  const dur = `${hh}:${String(mm).padStart(2, '0')}`;
  return `---
# ${date} · ${km} km · ${dur}
# Replace placeholder strings below; leave fields empty ("") to skip them.
title:
  zh: ${date} · ${typeLabel}
  en: ${date} · ${typeLabelEn}
description:
  zh: ""
  en: ""
location:
  zh: ""
  en: ""
weather:
  zh: ""
  en: ""
# companions: ["A", "B"]    # uncomment when needed
public: false               # flip to true to publish this hike to the public site
---

## 路线 / Route

{/* 走了哪条路、起点终点、印象最深的几段 */}

## 体感 / How it felt

{/* 状态、节奏、累不累、配速感受 */}

## 装备 / Gear

{/* 鞋、背包、补给、随身物 */}

## 备注 / Notes

{/* 其他想记下的 */}
`;
}

main().catch((err) => { console.error(err); process.exit(1); });
