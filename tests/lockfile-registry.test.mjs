import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

// CI can only reach the public npm registry. A lockfile regenerated behind a
// private mirror (e.g. bnpm.byted.org) breaks `npm ci` in the Deploy workflow.
test('package-lock.json resolves only from public registries', () => {
  const lock = readFileSync(new URL('../package-lock.json', import.meta.url), 'utf8');
  const bad = lock.split('\n').filter((line) => line.includes('byted.org'));
  assert.deepEqual(
    bad,
    [],
    'package-lock.json points at a private mirror; rewrite these resolved URLs to https://registry.npmjs.org/',
  );
});
