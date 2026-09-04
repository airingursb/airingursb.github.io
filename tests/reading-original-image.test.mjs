import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const readingCss = readFileSync(new URL('../src/styles/reading.css', import.meta.url), 'utf8');

test('Reading original-image badge stays legible over its fixed dark overlay', () => {
  const badgeRule = readingCss.match(/\.reading-zoom-label\s*\{(?<declarations>[^}]+)\}/)?.groups?.declarations;

  assert.ok(badgeRule, 'missing .reading-zoom-label rule');
  assert.match(badgeRule, /color:\s*white;/, 'badge foreground must remain light in every page theme');
});
