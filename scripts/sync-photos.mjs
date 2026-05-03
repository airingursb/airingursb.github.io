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
import { normalizeExif, cleanAperture } from './lib/photos-exif.mjs';
import { generateVariants } from './lib/photos-variants.mjs';
import { uploadIfChanged, publicUrl } from './lib/photos-r2.mjs';
import { reverseGeocode, cityCoords } from './lib/photos-geocode.mjs';
import { computeHistogram } from './lib/photos-histogram.mjs';
import { generateOG, computeOgHash } from './lib/photos-og.mjs';
import { generateAlbumOG, computeAlbumOgHash } from './lib/photos-album-og.mjs';
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
const ALBUM_HASHES = path.join(ROOT, 'src/data/photos-albums-hashes.json');

function albumSlug(name) {
  return (name || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

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
    // Backfill: legacy records may carry raw FNumber floats like
    // "f/1.7799999713880652" — re-clean so display + OG show "f/1.8".
    const cleanedExif = existingRecord.exif
      ? { ...existingRecord.exif, aperture: cleanAperture(existingRecord.exif.aperture) }
      : existingRecord.exif;
    const newOgHash = computeOgHash({
      sourceHash,
      title: finalTitle,
      place,
      exif: cleanedExif,
      takenAt: existingRecord.takenAt,
    });
    // Force regen when: missing, content stale, OR still pointing at the old PNG URL.
    const ogStale =
      !existingRecord.ogImage
      || !existingRecord.ogImage.endsWith('.jpg')
      || existingRecord.ogHash !== newOgHash;
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
              exif: cleanedExif,
              takenAt: existingRecord.takenAt,
              title: finalTitle,
              place,
            });
            const result = await uploadIfChanged({
              key: `photos/${entry.slug}/og.jpg`,
              body: og,
              contentType: 'image/jpeg',
            });
            console.log(`    ${result.status === 'uploaded' ? '↑' : '·'} og.jpg (regen)`);
            ogImage = publicUrl(`photos/${entry.slug}/og.jpg`);
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
      ...(cleanedExif ? { exif: cleanedExif } : {}),
    };
    if (entry.albums.length) updated.albums = entry.albums;
    else delete updated.albums;
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
    outputs.push({ key: 'og.jpg', body: og, contentType: 'image/jpeg' });
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
    ...(entry.albums.length ? { albums: entry.albums } : {}),
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
    ...(og ? { ogImage: publicUrl(`photos/${entry.slug}/og.jpg`), ogHash } : {}),
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

  await syncAlbumOGs(sorted, entries);
}

// ── Album OG generation ────────────────────────────────────────────────
//
// After the per-photo manifest is written, group records by album, pick
// the 4 most-recent photos per album as cover sources, and regen the
// 1200×630 mosaic OG only when something visible changed (album name,
// count, date range, or any cover's source binary).
async function syncAlbumOGs(records, entries) {
  const entriesBySlug = new Map(entries.map((e) => [e.slug, e]));

  // Aggregate album → photo records (most recent first)
  const groups = new Map();
  for (const r of records) {
    const albums = Array.isArray(r.albums) ? r.albums : [];
    for (const name of albums) {
      const slug = albumSlug(name);
      if (!slug) continue;
      if (!groups.has(slug)) groups.set(slug, { slug, name, photos: [] });
      groups.get(slug).photos.push(r);
    }
  }
  for (const g of groups.values()) {
    g.photos.sort((a, b) => {
      if (!a.takenAt && !b.takenAt) return 0;
      if (!a.takenAt) return 1;
      if (!b.takenAt) return -1;
      return b.takenAt.localeCompare(a.takenAt);
    });
  }

  if (groups.size === 0) {
    // No albums — wipe stale hash file entries (best effort)
    await fs.writeFile(ALBUM_HASHES, JSON.stringify({}, null, 2) + '\n').catch(() => {});
    return;
  }

  console.log(`processing ${groups.size} album(s)`);

  // Existing hashes
  let prevHashes = {};
  try {
    prevHashes = JSON.parse(await fs.readFile(ALBUM_HASHES, 'utf-8'));
  } catch (err) {
    if (err.code !== 'ENOENT') throw err;
  }

  const nextHashes = {};
  for (const g of groups.values()) {
    const dated = g.photos.filter((p) => p.takenAt);
    const earliest = dated.length ? dated[dated.length - 1].takenAt : null;
    const latest = dated.length ? dated[0].takenAt : null;
    const covers = g.photos.slice(0, 3); // newest 3 → polaroid stack
    const coverHashes = covers.map((p) => p.sourceHash);

    const newHash = computeAlbumOgHash({
      name: g.name,
      count: g.photos.length,
      earliest,
      latest,
      coverHashes,
    });
    nextHashes[g.slug] = newHash;

    if (prevHashes[g.slug] === newHash) {
      console.log(`  · album ${g.slug} unchanged`);
      continue;
    }

    // Re-resolve cover file paths from this run's source entries
    const coverEntries = covers
      .map((p) => entriesBySlug.get(p.slug))
      .filter(Boolean);
    if (coverEntries.length === 0) {
      console.warn(`  ! album ${g.slug}: no cover sources found, skipping OG`);
      continue;
    }

    const decoded = [];
    try {
      for (const entry of coverEntries) {
        const { decodePath, cleanup } = await prepareDecodable(entry.filePath);
        decoded.push({ path: decodePath, cleanup });
      }

      const og = await generateAlbumOG({
        name: g.name,
        count: g.photos.length,
        earliest,
        latest,
        coverFilePaths: decoded.map((d) => d.path),
      });

      const result = await uploadIfChanged({
        key: `albums/${g.slug}/og.jpg`,
        body: og,
        contentType: 'image/jpeg',
      });
      console.log(`  ${result.status === 'uploaded' ? '↑' : '·'} album ${g.slug} og.jpg`);
    } catch (err) {
      console.warn(`  ! album ${g.slug} OG failed: ${err.message}`);
      // Don't persist hash on failure so next run retries.
      delete nextHashes[g.slug];
    } finally {
      for (const d of decoded) await d.cleanup();
    }
  }

  await fs.writeFile(ALBUM_HASHES, JSON.stringify(nextHashes, null, 2) + '\n');
  console.log(`wrote ${ALBUM_HASHES} (${Object.keys(nextHashes).length} entry/entries)`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
