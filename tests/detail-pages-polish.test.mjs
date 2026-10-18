import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { formatDisplayDate } from '../src/lib/display-date.ts';
import { splitCharacters, visibleText, weeklyFontUrl, WEEKLY_FONT_TARGETS } from '../scripts/weekly-fonts/subset.mjs';
import { unicodeRange } from '../scripts/echo-fonts/hand-subset.mjs';

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

test('detail pages share one date format: zh 2026.08.15, en Aug 15, 2026 (Asia/Shanghai)', () => {
  assert.equal(formatDisplayDate('2026-08-15T03:00:00Z', 'zh'), '2026.08.15');
  assert.equal(formatDisplayDate('2026-08-15T03:00:00Z', 'en'), 'Aug 15, 2026');
  // 20:30 UTC is already the next day in Shanghai.
  assert.equal(formatDisplayDate('2026-08-14T20:30:00Z', 'zh'), '2026.08.15');
});

test('weekly font subsetting keeps only printed text and splits latin / CJK faces', () => {
  const html = '<html><head><title>忽略</title></head><body><h1>AI 趋势&amp;周刊</h1><script>var 脚本 = 1</script><style>.x{}</style><p>Hi&#x4E2D;</p></body></html>';
  const text = visibleText(html);
  assert.ok(!text.includes('脚本'));
  assert.ok(text.includes('&') && text.includes('中'));
  const { latin, cjk } = splitCharacters(text);
  assert.equal(cjk, [...'趋势周刊中'].sort().join(''));
  assert.ok(latin.includes('A') && latin.includes('&'));
  assert.equal(weeklyFontUrl('003', 'en', 700, 'cjk'), '/reading/weekly/003/fonts/noto-serif-sc-en-700-cjk.woff2');
  assert.deepEqual(WEEKLY_FONT_TARGETS.map((target) => target.issue), ['002', '003']);
});

test('Echo handwriting subsets declare exactly their characters as a compact unicode-range', () => {
  assert.equal(unicodeRange('abcz\n'), 'U+61-63, U+7A');
  assert.equal(unicodeRange('信信封'), 'U+4FE1, U+5C01');
});

test('Echo envelope stamps use 2x display derivatives while the PNG masters stay', () => {
  const postage = read('src/features/echo/data/postage.ts');
  assert.match(postage, /postage-display\/\*\.webp/);
  assert.match(read('src/features/echo/components/PostalMark.astro'), /postageDisplayFor/);
  for (const id of ['mist', 'output', 'offer-autumn']) {
    assert.ok(existsSync(new URL(`../src/features/echo/assets/postage-display/${id}.webp`, import.meta.url)), id);
    assert.ok(existsSync(new URL(`../src/features/echo/assets/postage/${id}.png`, import.meta.url)), id);
  }
});

test('comics, reading, workouts and photos share the native dialog', () => {
  for (const file of ['src/components/comics/ComicShareModal.astro', 'src/components/reading/ReadingShareModal.astro', 'src/components/workouts/WorkoutShareModal.astro', 'src/pages/photos/[slug].astro']) {
    assert.match(read(file), /ShareDialog/, file);
  }
  const script = read('src/scripts/share-dialog.ts');
  assert.match(script, /showModal\(\)/);
  assert.match(read('src/components/ShareDialog.astro'), /<dialog/);
});

test('diorama defers three.js and the plush models behind a poster on phones', () => {
  const client = read('src/diorama/client.ts');
  assert.doesNotMatch(client, /^import .* from '\.\/scene'/m);
  assert.match(client, /import\('\.\/scene'\)/);
  assert.match(client, /data-world-start/);
  assert.match(read('src/components/diorama/DioramaExperience.astro'), /data-world-poster/);
});

test('English 404 hand-off keeps the requested /en/ address', () => {
  const lost = read('src/components/bear-discovery/LostPage.astro');
  assert.match(lost, /location\.replace\('\/en\/404\/\?from='/);
});
