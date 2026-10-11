import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import { hostnameOf, isLocalDevSource, isProductionAnalyticsHost } from '../src/lib/production-analytics.ts';

const root = new URL('../', import.meta.url);

test('only production hostnames may record analytics', () => {
  for (const host of ['ursb.me', 'www.ursb.me', 'airingursb.github.io']) {
    assert.equal(isProductionAnalyticsHost(host), true, host);
  }
  for (const host of ['localhost', '127.0.0.1', '::1', '0.0.0.0', '192.168.1.8', '100.93.37.97']) {
    assert.equal(isProductionAnalyticsHost(host), false, host);
  }
});

test('local-dev referrer and origin hosts are recognized', () => {
  assert.equal(hostnameOf('http://localhost:4321/posts/foo/'), 'localhost');
  assert.equal(isLocalDevSource('http://localhost:4321/'), true);
  assert.equal(isLocalDevSource(null, 'http://127.0.0.1:4321'), true);
  assert.equal(isLocalDevSource('https://ursb.me/posts/foo/'), false);
  assert.equal(isLocalDevSource('https://www.ursb.me/', 'https://ursb.me'), false);
  assert.equal(isLocalDevSource(null, ''), false);
});

test('Astro layouts never ship a static Umami script tag', async () => {
  const files = [
    'src/layouts/BaseLayout.astro',
    'src/components/UmamiLoader.astro',
    'src/components/reading/ai-weekly/WeeklyEdition.astro',
    'src/components/reading/ai-weekly/WeeklyIssue.astro',
  ];
  const sources = await Promise.all(files.map((path) => readFile(new URL(path, root), 'utf8')));
  for (const [i, source] of sources.entries()) {
    assert.doesNotMatch(
      source,
      /<script[^>]+src="https:\/\/analytics\.ursb\.me\/script\.js"/,
      `${files[i]} still has an unconditional Umami tag`,
    );
  }
  const loader = sources[1];
  assert.match(loader, /ursb\.me/);
  assert.match(loader, /airingursb\.github\.io/);
  assert.match(loader, /analytics\.ursb\.me\/script\.js/);
  assert.match(loader, /aa8d5a16-df21-4058-a0a8-0191cdd3798d/);
  assert.match(loader, /if \(host !== 'ursb\.me'/);
});

test('post and note pages gate /view POSTs behind production hostnames', async () => {
  const files = [
    'src/layouts/PostLayout.astro',
    'src/pages/notes/[...slug].astro',
    'src/pages/en/notes/[...slug].astro',
  ];
  for (const path of files) {
    const source = await readFile(new URL(path, root), 'utf8');
    const viewIdx = source.indexOf("/view', { method: 'POST' }");
    assert.notEqual(viewIdx, -1, `${path} missing /view POST`);
    const window = source.slice(Math.max(0, viewIdx - 280), viewIdx);
    assert.match(window, /ursb\.me/, `${path} /view POST is not production-gated`);
    assert.match(window, /airingursb\.github\.io/, `${path} /view POST is not production-gated`);
    assert.match(source, /\/views/, `${path} should still read view counts locally`);
  }
});

test('daily_report excludes localhost referrers from blog_pv', async () => {
  const source = await readFile(new URL('scripts/daily_report.py', root), 'utf8');
  assert.match(source, /POSTGREST_EXCLUDE_LOCAL_DEV/);
  assert.match(source, /exclude_local_dev_views/);
  assert.match(source, /select': 'ip,post_slug,referrer'/);
});

test('python local-dev referrer helper matches the JS rules', () => {
  const scriptsDir = fileURLToPath(new URL('../scripts', import.meta.url));
  const code = `
import sys
sys.path.insert(0, ${JSON.stringify(scriptsDir)})
from local_dev_traffic import is_local_dev_source, exclude_local_dev_views, POSTGREST_EXCLUDE_LOCAL_DEV
assert is_local_dev_source('http://localhost:4321/')
assert is_local_dev_source('http://127.0.0.1:4321/posts/x/')
assert is_local_dev_source(None, 'http://localhost:8111')
assert not is_local_dev_source('https://ursb.me/posts/x/')
assert not is_local_dev_source(None)
assert not is_local_dev_source('https://news.ycombinator.com/')
rows = [
    {'referrer': 'http://localhost:4321/', 'post_slug': 'dev'},
    {'referrer': 'https://ursb.me/posts/a/', 'post_slug': 'a'},
    {'referrer': None, 'post_slug': 'direct'},
]
kept = exclude_local_dev_views(rows)
assert [r['post_slug'] for r in kept] == ['a', 'direct']
assert 'localhost' in POSTGREST_EXCLUDE_LOCAL_DEV
assert '127.0.0.1' in POSTGREST_EXCLUDE_LOCAL_DEV
print('ok')
`;
  const out = execFileSync('python3', ['-c', code], { encoding: 'utf8' });
  assert.match(out, /ok/);
});
