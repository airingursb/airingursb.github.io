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
    await fs.writeFile(path.join(tmp, 'foo.jpg'), 'fake');
    await fs.writeFile(path.join(tmp, 'foo.md'), '---\nslug: same\n---\n');
    await fs.writeFile(path.join(tmp, 'bar.jpg'), 'fake');
    await fs.writeFile(path.join(tmp, 'bar.md'), '---\nslug: same\n---\n');
    await assert.rejects(() => scanSource(tmp), /Duplicate slug/);
  } finally {
    await fs.rm(tmp, { recursive: true, force: true });
  }
});
