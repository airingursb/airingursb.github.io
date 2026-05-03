#!/usr/bin/env node
/**
 * Sync photos-source/ → R2 + src/data/photos.json
 *
 * Usage:
 *   npm run sync:photos
 */

import 'dotenv/config';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import exifr from 'exifr';

import { scanSource } from './lib/photos-source.mjs';
import { normalizeExif } from './lib/photos-exif.mjs';
import { generateVariants } from './lib/photos-variants.mjs';
import { uploadIfChanged, publicUrl } from './lib/photos-r2.mjs';
import { reverseGeocode, cityCoords } from './lib/photos-geocode.mjs';
import { computeHistogram } from './lib/photos-histogram.mjs';
import { generateOG, computeOgHash } from './lib/photos-og.mjs';
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

// Formats sharp can't decode out of the box (HEIC needs HEVC; RAW needs libraw).
// macOS sips handles all of these via the Image I/O framework, preserving EXIF.
const NEEDS_TRANSCODE = /\.(heic|heif|dng|raf|cr2|cr3|nef|arw|orf|rw2|pef|3fr|fff|iiq)$/i;

async function transcodeToJpeg(srcPath) {
  if (process.platform !== 'darwin') {
    throw new Error(
      `Decoding ${path.extname(srcPath)} currently requires macOS (sips). Got platform ${process.platform}. ` +
      `Convert ${path.basename(srcPath)} to JPEG before running sync, or run sync on macOS.`
    );
  }
  const tmpPath = path.join(
    os.tmpdir(),
    `photos-sync-${crypto.randomBytes(6).toString('hex')}.jpg`
  );
  await new Promise((resolve, reject) => {
    const proc = spawn('sips', ['-s', 'format', 'jpeg', srcPath, '--out', tmpPath], { stdio: 'ignore' });
    proc.on('close', (code) => (code === 0 ? resolve() : reject(new Error(`sips exited ${code} on ${path.basename(srcPath)}`))));
    proc.on('error', reject);
  });
  return tmpPath;
}

async function prepareDecodable(filePath) {
  if (NEEDS_TRANSCODE.test(filePath)) {
    const tmp = await transcodeToJpeg(filePath);
    return { decodePath: tmp, cleanup: () => fs.unlink(tmp).catch(() => {}) };
  }
  return { decodePath: filePath, cleanup: async () => {} };
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

// Read GPS from a source file (transcoding HEIC if needed) and reverse-geocode.
// Returns null if no GPS or geocode fails. Coords stay inside this function.
async function geocodeFromFile(filePath) {
  const { decodePath, cleanup } = await prepareDecodable(filePath);
  try {
    const buf = await fs.readFile(decodePath);
    const r = (await exifr.parse(buf, { gps: true })) || {};
    if (typeof r.latitude !== 'number' || typeof r.longitude !== 'number') return null;
    return await reverseGeocode(r.latitude, r.longitude);
  } finally {
    await cleanup();
  }
}

// Resolve final `place` field: sidecar > auto GPS > existing record > null.
// Always enriches with city centroid `coords` (forward-geocoded) for maps.
async function resolvePlace({ sidecarPlace, autoPlace, existingPlace, filePath }) {
  let place = sidecarPlace || autoPlace || existingPlace;
  if (!place && filePath) {
    place = await geocodeFromFile(filePath).catch(() => null);
  }
  if (!place || !place.city) return null;
  // Backfill coords if missing (for sidecar overrides or pre-coords records).
  if (!Array.isArray(place.coords) || place.coords.length !== 2) {
    const coords = await cityCoords(place.city, place.country).catch(() => null);
    if (coords) place = { ...place, coords };
  }
  return place;
}

async function processPhoto(entry, existingRecord) {
  const sourceHash = await sha256File(entry.filePath);
  if (existingRecord && existingRecord.sourceHash === sourceHash) {
    // unchanged binary — refresh metadata; backfill place / histogram / og if missing or stale
    const place = await resolvePlace({
      sidecarPlace: entry.placeOverride,
      autoPlace: null,
      existingPlace: existingRecord.place,
      filePath: existingRecord.place ? null : entry.filePath,
    });
    const finalTitle = entry.title || existingRecord.title;
    const newOgHash = computeOgHash({
      sourceHash,
      title: finalTitle,
      place,
      exif: existingRecord.exif,
      takenAt: existingRecord.takenAt,
    });
    const ogStale = !existingRecord.ogImage || existingRecord.ogHash !== newOgHash;
    const histogramMissing = !existingRecord.histogram;

    let histogram = existingRecord.histogram;
    let ogImage = existingRecord.ogImage;
    if (histogramMissing || ogStale) {
      const { decodePath, cleanup } = await prepareDecodable(entry.filePath);
      try {
        if (histogramMissing) {
          try {
            histogram = await computeHistogram(decodePath);
          } catch (err) {
            console.warn(`  ! histogram backfill failed for ${entry.slug}: ${err.message}`);
          }
        }
        if (ogStale) {
          try {
            const og = await generateOG({
              filePath: decodePath,
              exif: existingRecord.exif,
              takenAt: existingRecord.takenAt,
              title: finalTitle,
              place,
            });
            const result = await uploadIfChanged({
              key: `photos/${entry.slug}/og.png`,
              body: og,
              contentType: 'image/png',
            });
            console.log(`    ${result.status === 'uploaded' ? '↑' : '·'} og.png (regen)`);
            ogImage = publicUrl(`photos/${entry.slug}/og.png`);
          } catch (err) {
            console.warn(`  ! og regen failed for ${entry.slug}: ${err.message}`);
          }
        }
      } finally {
        await cleanup();
      }
    }

    const updated = {
      ...existingRecord,
      title: finalTitle,
      description: entry.description || existingRecord.description,
      tags: entry.tags.length ? entry.tags : existingRecord.tags,
    };
    if (place) updated.place = place;
    else delete updated.place;
    if (histogram) updated.histogram = histogram;
    if (ogImage) {
      updated.ogImage = ogImage;
      updated.ogHash = newOgHash;
    }
    console.log(`  ✓ ${entry.slug} (unchanged binary)${place ? ` · ${place.city}` : ''}`);
    return updated;
  }

  console.log(`  ⟳ ${entry.slug} — processing`);
  const { decodePath, cleanup } = await prepareDecodable(entry.filePath);
  let width, height, dominant, outputs, exif, histogram, place, og, autoPlace = null;
  try {
    const buf = await fs.readFile(decodePath);
    const rawExif = (await exifr.parse(buf, { tiff: true, exif: true, gps: true })) || {};
    exif = normalizeExif(rawExif);
    if (typeof rawExif.latitude === 'number' && typeof rawExif.longitude === 'number') {
      // lat/lng stays inside this scope only; only city/country leaves the function
      autoPlace = await reverseGeocode(rawExif.latitude, rawExif.longitude);
    }
    ({ width, height, dominant, outputs } = await generateVariants(decodePath));
    histogram = await computeHistogram(decodePath);
    place = await resolvePlace({
      sidecarPlace: entry.placeOverride,
      autoPlace,
      existingPlace: existingRecord?.place,
      filePath: null,
    });
    og = await generateOG({
      filePath: decodePath,
      exif,
      takenAt: exif.takenAt,
      title: entry.title,
      place,
    });
  } finally {
    await cleanup();
  }

  if (og) {
    outputs.push({ key: 'og.png', body: og, contentType: 'image/png' });
  }

  for (const o of outputs) {
    const result = await uploadIfChanged({
      key: `photos/${entry.slug}/${o.key}`,
      body: o.body,
      contentType: o.contentType,
    });
    console.log(`    ${result.status === 'uploaded' ? '↑' : '·'} ${o.key}`);
  }

  const ogHash = computeOgHash({ sourceHash, title: entry.title, place, exif, takenAt: exif.takenAt });

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
    ...(place ? { place } : {}),
    ...(histogram ? { histogram } : {}),
    variants: buildVariantUrls(entry.slug),
    ...(og ? { ogImage: publicUrl(`photos/${entry.slug}/og.png`), ogHash } : {}),
    sourceHash,
    syncedAt: new Date().toISOString(),
  };
}

async function main() {
  console.log(`scanning ${SOURCE_DIR}`);
  const entries = await scanSource(SOURCE_DIR);
  console.log(`found ${entries.length} photo(s)`);

  if (entries.length === 0) {
    console.log('nothing to do (source empty — manifest left untouched)');
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
