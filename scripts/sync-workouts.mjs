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
import yaml from 'js-yaml';
import { normalizeWorkout } from './lib/workouts-normalize.mjs';
import { generateTrackSvg } from './lib/workouts-svg-track.mjs';
import { generateWorkoutOG } from './lib/workouts-og.mjs';
import { uploadIfChanged, publicUrl } from './lib/photos-r2.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
// Default source: project-local `workouts-source/` (gitignored).
// Drop full HealthAutoExport JSONs there with any filename.
// Override via $WORKOUTS_SOURCE_DIR for one-off runs against another path.
const DEFAULT_DIR = path.join(ROOT, 'workouts-source');
const SRC_DIR = process.env.WORKOUTS_SOURCE_DIR
  || process.env.WORKOUTS_BACKUP_DIR        // legacy env name
  || DEFAULT_DIR;
const OUT_DATA_DIR        = path.join(ROOT, 'src/data/workouts');             // gitignored — full local dataset
const OUT_INDEX           = path.join(ROOT, 'src/data/workouts.json');         // gitignored — full index
const OUT_PUBLIC_DATA_DIR = path.join(ROOT, 'src/data/workouts-public');       // committed — subset (public:true)
const OUT_PUBLIC_INDEX    = path.join(ROOT, 'src/data/workouts-public.json');  // committed — public index
const OUT_CONTENT_DIR     = path.join(ROOT, 'src/content/workouts');

async function main() {
  await fs.mkdir(OUT_DATA_DIR,        { recursive: true });
  await fs.mkdir(OUT_PUBLIC_DATA_DIR, { recursive: true });
  await fs.mkdir(OUT_CONTENT_DIR,     { recursive: true });

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

  // Detect R2 once up front so we don't probe envs in the per-workout loop.
  const r2Ready = !!(process.env.R2_ACCOUNT_ID && process.env.R2_ACCESS_KEY_ID
                  && process.env.R2_SECRET_ACCESS_KEY && process.env.R2_BUCKET
                  && process.env.R2_PUBLIC_BASE);
  if (!r2Ready) console.warn('[workouts] R2 env missing → OG generation skipped');

  // Write per-workout JSON + content stubs (+ OG cards uploaded to R2)
  const indexEntries = [];
  const publicIndexEntries = [];
  const publicIds = new Set();   // for pruning the public dir
  for (const w of seen.values()) {
    const mdxPath = path.join(OUT_CONTENT_DIR, `${w.id}.mdx`);
    if (!(await exists(mdxPath))) {
      await fs.writeFile(mdxPath, makeStubMdx(w));
      console.log(`[workouts] stub mdx → ${path.basename(mdxPath)}`);
    }

    // Read the user-edited mdx frontmatter for title / location / public.
    const fm = await readFrontmatter(mdxPath);
    const titleZh = fm?.title?.zh || `${w.start.slice(0, 10)} · 徒步`;
    const titleEn = fm?.title?.en || `${w.start.slice(0, 10)} · Hiking`;
    const locationZh = fm?.location?.zh || '';
    const locationEn = fm?.location?.en || '';
    const isPublic = fm?.public === true;

    // OG cards (zh + en). Only generate + upload for public hikes so
    // private routes don't end up at predictable R2 URLs.
    let og = undefined;
    if (isPublic && r2Ready && w.bbox && w.route?.length >= 2) {
      try {
        const [zhPng, enPng] = await Promise.all([
          generateWorkoutOG({ workout: w, title: titleZh, location: locationZh, lang: 'zh' }),
          generateWorkoutOG({ workout: w, title: titleEn, location: locationEn, lang: 'en' }),
        ]);
        const [zhRes, enRes] = await Promise.all([
          uploadIfChanged({ key: `workouts/${w.id}.zh.png`, body: zhPng, contentType: 'image/png' }),
          uploadIfChanged({ key: `workouts/${w.id}.en.png`, body: enPng, contentType: 'image/png' }),
        ]);
        console.log(`[workouts] og ${w.id.slice(0, 8)} zh=${zhRes.status} en=${enRes.status}`);
        og = {
          zh: publicUrl(`workouts/${w.id}.zh.png`),
          en: publicUrl(`workouts/${w.id}.en.png`),
        };
      } catch (err) {
        console.warn(`[workouts] og ${w.id.slice(0, 8)} failed: ${err.message}`);
      }
    }

    const enriched = og ? { ...w, og } : w;

    // Always write the local (gitignored) full record.
    const detailPath = path.join(OUT_DATA_DIR, `${w.id}.json`);
    await fs.writeFile(detailPath, JSON.stringify(enriched) + '\n');

    const indexEntry = {
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
    };
    indexEntries.push(indexEntry);

    // For public hikes, ALSO write to the committed public subset so CI
    // (which doesn't have workouts-source/) can build the deployed site.
    if (isPublic) {
      const pubDetailPath = path.join(OUT_PUBLIC_DATA_DIR, `${w.id}.json`);
      await fs.writeFile(pubDetailPath, JSON.stringify(enriched) + '\n');
      publicIndexEntries.push(indexEntry);
      publicIds.add(w.id);
    }
  }

  // Sort newest first
  indexEntries.sort((a, b) => b.start.localeCompare(a.start));
  publicIndexEntries.sort((a, b) => b.start.localeCompare(a.start));

  await fs.writeFile(OUT_INDEX, JSON.stringify(indexEntries, null, 2) + '\n');
  await fs.writeFile(OUT_PUBLIC_INDEX, JSON.stringify(publicIndexEntries, null, 2) + '\n');

  // Prune public dir: remove anything not in the public set (e.g., a
  // hike that flipped from public:true → public:false).
  await pruneOrphans(OUT_PUBLIC_DATA_DIR, '.json', publicIds);

  console.log(`[workouts] wrote ${indexEntries.length} local workout(s) → ${path.relative(ROOT, OUT_INDEX)}`);
  console.log(`[workouts] wrote ${publicIndexEntries.length} public workout(s) → ${path.relative(ROOT, OUT_PUBLIC_INDEX)}`);
}

async function exists(p) {
  try { await fs.access(p); return true; } catch { return false; }
}

/** Parse the frontmatter of an mdx file (between the leading `---` fences). */
async function readFrontmatter(filePath) {
  try {
    const text = await fs.readFile(filePath, 'utf8');
    const m = /^---\r?\n([\s\S]*?)\r?\n---/.exec(text);
    if (!m) return null;
    return yaml.load(m[1]);
  } catch {
    return null;
  }
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
`;
}

main().catch((err) => { console.error(err); process.exit(1); });
