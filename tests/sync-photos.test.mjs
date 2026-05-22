import { test } from 'node:test';
import assert from 'node:assert/strict';
import { deriveSlug, parseSidecar } from '../scripts/lib/photos-source.mjs';

test('deriveSlug from filename', () => {
  assert.equal(deriveSlug('IMG_2024_001.jpg'), 'img-2024-001');
  assert.equal(deriveSlug('Singapore Skyline.JPEG'), 'singapore-skyline');
  assert.equal(deriveSlug('hello--world__1.jpg'), 'hello-world-1');
});

test('parseSidecar extracts frontmatter', () => {
  const md = `---
title: Marina Bay
description: Blue hour
tags: [city, night]
slug: marina-blue
---

(body ignored)
`;
  const meta = parseSidecar(md);
  assert.equal(meta.title, 'Marina Bay');
  assert.equal(meta.description, 'Blue hour');
  assert.deepEqual(meta.tags, ['city', 'night']);
  assert.equal(meta.slug, 'marina-blue');
});

test('parseSidecar returns empty object when no frontmatter', () => {
  assert.deepEqual(parseSidecar('just body text'), {});
  assert.deepEqual(parseSidecar(''), {});
});

import { scanSource } from '../scripts/lib/photos-source.mjs';
import os from 'node:os';
import fs from 'node:fs/promises';
import path from 'node:path';

test('scanSource handles missing sidecar gracefully', async () => {
  const tmp = await fs.mkdtemp(path.join(os.tmpdir(), 'photos-test-'));
  try {
    await fs.writeFile(path.join(tmp, 'a.jpg'), 'fake');
    const out = await scanSource(tmp);
    assert.equal(out.length, 1);
    assert.equal(out[0].slug, 'a');
    assert.equal(out[0].title, '');
  } finally {
    await fs.rm(tmp, { recursive: true, force: true });
  }
});

test('scanSource throws on duplicate slugs', async () => {
  const tmp = await fs.mkdtemp(path.join(os.tmpdir(), 'photos-test-'));
  try {
    // Sidecars now live in `meta/` (changed during photos refactor) —
    // the test was written for the old flat layout.
    await fs.mkdir(path.join(tmp, 'meta'));
    await fs.writeFile(path.join(tmp, 'foo.jpg'), 'fake');
    await fs.writeFile(path.join(tmp, 'meta', 'foo.md'), '---\nslug: same\n---\n');
    await fs.writeFile(path.join(tmp, 'bar.jpg'), 'fake');
    await fs.writeFile(path.join(tmp, 'meta', 'bar.md'), '---\nslug: same\n---\n');
    await assert.rejects(() => scanSource(tmp), /Duplicate slug/);
  } finally {
    await fs.rm(tmp, { recursive: true, force: true });
  }
});

import { normalizeExif } from '../scripts/lib/photos-exif.mjs';

test('normalizeExif maps standard tags', () => {
  const raw = {
    Make: 'SONY',
    Model: 'ILCE-7M4',
    LensModel: 'FE 24-70mm F2.8 GM II',
    ISO: 400,
    ExposureTime: 1 / 250,
    FNumber: 2.8,
    FocalLength: 35,
    DateTimeOriginal: new Date('2024-08-15T18:30:00Z'),
  };
  const n = normalizeExif(raw);
  assert.equal(n.camera, 'Sony ILCE-7M4');
  assert.equal(n.lens, 'FE 24-70mm F2.8 GM II');
  assert.equal(n.iso, 400);
  assert.equal(n.shutter, '1/250');
  assert.equal(n.aperture, 'f/2.8');
  assert.equal(n.focalLength, '35mm');
  assert.equal(n.takenAt, '2024-08-15T18:30:00.000Z');
});

test('normalizeExif handles missing fields', () => {
  const n = normalizeExif({});
  assert.equal(n.camera, null);
  assert.equal(n.iso, null);
  assert.equal(n.takenAt, null);
});

test('normalizeExif formats slow shutter as decimal', () => {
  const n = normalizeExif({ ExposureTime: 2.5 });
  assert.equal(n.shutter, '2.5s');
});

import { sortByTakenAt, mergeRecords } from '../scripts/lib/photos-manifest.mjs';

test('sortByTakenAt orders newest first; nulls last', () => {
  const input = [
    { slug: 'a', takenAt: '2024-01-01T00:00:00Z' },
    { slug: 'b', takenAt: null },
    { slug: 'c', takenAt: '2024-06-01T00:00:00Z' },
  ];
  const out = sortByTakenAt(input);
  assert.deepEqual(out.map((p) => p.slug), ['c', 'a', 'b']);
});

test('mergeRecords replaces by slug, preserves untouched', () => {
  const existing = [
    { slug: 'a', title: 'Old A' },
    { slug: 'b', title: 'B' },
  ];
  const incoming = [{ slug: 'a', title: 'New A' }];
  const merged = mergeRecords(existing, incoming, new Set(['a', 'b']));
  assert.equal(merged.find((p) => p.slug === 'a').title, 'New A');
  assert.equal(merged.find((p) => p.slug === 'b').title, 'B');
});

test('mergeRecords drops records whose slug is not in liveSlugs', () => {
  const existing = [
    { slug: 'a', title: 'A' },
    { slug: 'gone', title: 'Removed from source' },
  ];
  const merged = mergeRecords(existing, [], new Set(['a']));
  assert.equal(merged.length, 1);
  assert.equal(merged[0].slug, 'a');
});
