import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const files = await Promise.all([
  'src/components/reading/ReadingCard.astro',
  'src/components/reading/ReadingShareModal.astro',
  'src/components/SubscriptionDialog.astro',
  'src/components/LangSwitch.astro',
  'src/pages/index.astro',
  'src/pages/reading/index.astro',
  'src/pages/en/reading/index.astro',
  'src/pages/reading/[slug].astro',
  'src/pages/en/reading/[slug].astro',
].map((path) => readFile(new URL(`../${path}`, import.meta.url), 'utf8')));

const source = files.join('\n');

test('Reading surfaces expose the complete machine-consumed analytics event schema', () => {
  for (const eventName of [
    'reading-card-open',
    'reading-source-open',
    'reading-filter',
    'reading-original-open',
    'reading-share-action',
    'reading-subscribe-open',
    'reading-subscribe',
    'reading-rss-copy',
    'reading-opml-export',
    'reading-lang-switch',
  ]) {
    assert.match(source, new RegExp(`['\"]${eventName}['\"]`), `missing ${eventName}`);
  }
});

test('Reading analytics never attach an email address to Umami events', () => {
  const trackingCalls = source.match(/(?:umami\?*\.track|trackEvent)\([^;]+/g) ?? [];
  for (const call of trackingCalls) {
    assert.doesNotMatch(call, /\bemail\b/i);
  }
});
