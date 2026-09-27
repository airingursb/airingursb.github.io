import assert from 'node:assert/strict';
import test from 'node:test';

test('classifies issue links with campaign query and column anchors', async () => {
  const { weeklyDestination } = await import('../src/scripts/weekly-analytics.ts');
  assert.deepEqual(weeklyDestination('https://ursb.me/en/reading/weekly/001/?utm_source=mail#column-16'), {
    issue: '001', lang: 'en', target: 'column-16', kind: 'issue',
  });
  assert.equal(weeklyDestination('https://example.org/reading/weekly/001/'), null);
  assert.equal(weeklyDestination('https://ursb.me/reading/r-story/'), null);
  assert.equal(weeklyDestination('https://ursb.me/reading/weekly/feed.xml').kind, 'rss');
  assert.equal(weeklyDestination('https://ursb.me/reading/weekly/').kind, 'archive');
});
