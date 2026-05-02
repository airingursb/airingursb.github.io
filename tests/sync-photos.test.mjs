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
