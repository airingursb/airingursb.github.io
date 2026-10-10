import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import {
  readingCoverFrameHtml,
  readingCoverFrameMarkers,
  skippedCoverLeavesNoFrame,
} from '../src/lib/reading-cover-frame.ts';

const files = Object.fromEntries([
  ['detailZh', 'src/pages/reading/[slug].astro'],
  ['detailEn', 'src/pages/en/reading/[slug].astro'],
  ['card', 'src/components/reading/ReadingCard.astro'],
  ['home', 'src/pages/index.astro'],
  ['weeklyStory', 'src/components/reading/WeeklyStory.astro'],
  ['weeklyEdition', 'src/components/reading/WeeklyEditionLink.astro'],
  ['share', 'src/components/reading/ReadingShareModal.astro'],
  ['readingCss', 'src/styles/reading.css'],
  ['weeklyCss', 'src/styles/reading-weekly-issue.css'],
].map(([key, path]) => [key, readFileSync(new URL(`../${path}`, import.meta.url), 'utf8')]));

function coverGuardedBlock(source, className) {
  const match = source.match(new RegExp(`\\{cover && \\(([\\s\\S]*?${className}[\\s\\S]*?)\\n\\s*\\)\\}`));
  return match?.[1] ?? '';
}

test('a skipped 404 cover fixture omits every reading cover frame', () => {
  const fixtures = {
    detail: readingCoverFrameHtml('detail', false, [
      '<div class="reading-detail-cover">',
      '<button class="reading-poster"><span class="reading-zoom-label">⌕ 点击查看原图</span></button>',
      '<div class="reading-caption"><span>Agent 生成阅读卡片 · 1536 × 1024</span></div>',
      '</div><div class="reading-lightbox"></div>',
    ].join('')),
    card: readingCoverFrameHtml('card', false, '<a class="reading-card-cover" href="/reading/r-bcsejv8vnyctm_sz/"></a>'),
    home: readingCoverFrameHtml('home-thumb', false, '<div class="reading-home-thumb"><span class="reading-home-new">NEW</span></div>'),
    weekly: readingCoverFrameHtml('weekly-story', false, '<a class="weekly-story-cover" href="/reading/r-bcsejv8vnyctm_sz/"></a>'),
    share: readingCoverFrameHtml('share', false, '<div class="share-image"></div>'),
  };

  assert.equal(fixtures.detail, '');
  assert.ok(skippedCoverLeavesNoFrame('detail', fixtures.detail));
  assert.ok(skippedCoverLeavesNoFrame('card', fixtures.card));
  assert.ok(skippedCoverLeavesNoFrame('home-thumb', fixtures.home));
  assert.ok(skippedCoverLeavesNoFrame('weekly-story', fixtures.weekly));
  assert.ok(skippedCoverLeavesNoFrame('share', fixtures.share));
  for (const marker of [
    'reading-poster',
    'reading-caption',
    '1536 × 1024',
    'reading-zoom-label',
    'reading-card-cover',
    'reading-home-thumb',
    'weekly-story-cover',
    'share-image',
  ]) {
    assert.doesNotMatch(Object.values(fixtures).join('\n'), new RegExp(marker));
  }
});

test('a present cover still keeps its frame', () => {
  const html = readingCoverFrameHtml(
    'detail',
    true,
    '<div class="reading-detail-cover"><button class="reading-poster"></button><div class="reading-caption"></div></div>',
  );
  assert.match(html, /reading-poster/);
  assert.match(html, /reading-caption/);
  assert.deepEqual(readingCoverFrameMarkers('detail'), [
    'reading-poster',
    'reading-caption',
    'reading-zoom-label',
    'reading-lightbox',
  ]);
});

test('detail templates only render poster, caption, zoom label and lightbox when cover exists', () => {
  for (const source of [files.detailZh, files.detailEn]) {
    const block = coverGuardedBlock(source, 'reading-poster');
    assert.match(block, /reading-poster/);
    assert.match(block, /reading-caption/);
    assert.match(block, /reading-zoom-label/);
    assert.match(source, /\{cover && \([\s\S]*reading-lightbox/);
    assert.match(source, /class="reading-detail-cover"/);
  }
});

test('list, home, weekly and share frames are omitted without a resolved cover', () => {
  assert.match(files.card, /\{cover && \([\s\S]*reading-card-cover/);
  assert.match(files.home, /\{\(coverZh \|\| coverEn\) \? \([\s\S]*reading-home-thumb/);
  assert.match(files.weeklyStory, /\{cover && \([\s\S]*weekly-story-cover/);
  assert.match(files.weeklyEdition, /cover \? \([\s\S]*ReadingCover/);
  assert.match(files.share, /\{cover && \([\s\S]*share-image/);
});

test('layout CSS collapses leftover cover columns when a frame is absent', () => {
  assert.match(files.readingCss, /reading-detail-grid:not\(:has\(\.reading-detail-cover\)\)/);
  assert.match(files.readingCss, /reading-related--no-cover/);
  assert.match(files.weeklyCss, /weekly-story--no-cover/);
});
