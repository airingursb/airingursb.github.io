#!/usr/bin/env node
/**
 * Sync photos-source/ → R2 + src/data/photos.json
 *
 * Usage:
 *   npm run sync:photos
 */

import 'dotenv/config';
import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import exifr from 'exifr';

import { scanSource } from './lib/photos-source.mjs';
import { normalizeExif } from './lib/photos-exif.mjs';
import { generateVariants } from './lib/photos-variants.mjs';
import { uploadIfChanged, publicUrl } from './lib/photos-r2.mjs';
import {
  readManifest,
  writeManifest,
  sortByTakenAt,
  mergeRecords,
} from './lib/photos-manifest.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const SOURCE_DIR = path.join(ROOT, 'photos-source');
const MANIFEST = path.join(ROOT, 'src/data/photos.json');

async function sha256File(filePath) {
  const buf = await fs.readFile(filePath);
  return crypto.createHash('sha256').update(buf).digest('hex');
}

function buildVariantUrls(slug) {
  const sizes = ['thumb', 'medium', 'full'];
  const variants = {};
  for (const s of sizes) {
    variants[s] = {
      avif: publicUrl(`photos/${slug}/${s}.avif`),
      webp: publicUrl(`photos/${slug}/${s}.webp`),
    };
  }
  return variants;
}

async function processPhoto(entry, existingRecord) {
  const sourceHash = await sha256File(entry.filePath);
  if (existingRecord && existingRecord.sourceHash === sourceHash) {
    // unchanged — refresh metadata fields from sidecar in case they edited title/desc/tags
    const updated = {
      ...existingRecord,
      title: entry.title || existingRecord.title,
      description: entry.description || existingRecord.description,
      tags: entry.tags.length ? entry.tags : existingRecord.tags,
    };
    console.log(`  ✓ ${entry.slug} (unchanged binary)`);
    return updated;
  }

  console.log(`  ⟳ ${entry.slug} — processing`);
  const buf = await fs.readFile(entry.filePath);
  const rawExif = (await exifr.parse(buf, { tiff: true, exif: true, gps: false })) || {};
  const exif = normalizeExif(rawExif);
  const { width, height, dominant, outputs } = await generateVariants(entry.filePath);

  for (const o of outputs) {
    const result = await uploadIfChanged({
      key: `photos/${entry.slug}/${o.key}`,
      body: o.body,
      contentType: o.contentType,
    });
    console.log(`    ${result.status === 'uploaded' ? '↑' : '·'} ${o.key}`);
  }

  return {
    slug: entry.slug,
    title: entry.title,
    description: entry.description,
    tags: entry.tags,
    takenAt: exif.takenAt,
    width,
    height,
    dominantColor: dominant,
    exif: {
      camera: exif.camera,
      lens: exif.lens,
      iso: exif.iso,
      shutter: exif.shutter,
      aperture: exif.aperture,
      focalLength: exif.focalLength,
    },
    variants: buildVariantUrls(entry.slug),
    sourceHash,
    syncedAt: new Date().toISOString(),
  };
}

async function main() {
  console.log(`scanning ${SOURCE_DIR}`);
  const entries = await scanSource(SOURCE_DIR);
  console.log(`found ${entries.length} photo(s)`);

  if (entries.length === 0) {
    console.log('nothing to do');
    await writeManifest(MANIFEST, []);
    return;
  }

  const existing = await readManifest(MANIFEST);
  const existingBySlug = new Map(existing.map((r) => [r.slug, r]));
  const liveSlugs = new Set(entries.map((e) => e.slug));

  const incoming = [];
  for (const entry of entries) {
    const record = await processPhoto(entry, existingBySlug.get(entry.slug));
    incoming.push(record);
  }

  const merged = mergeRecords(existing, incoming, liveSlugs);
  const sorted = sortByTakenAt(merged);
  await writeManifest(MANIFEST, sorted);
  console.log(`wrote ${MANIFEST} (${sorted.length} record(s))`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
