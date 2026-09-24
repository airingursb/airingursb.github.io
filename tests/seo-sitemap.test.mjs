import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { existsSync, mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { registerHooks } from 'node:module';
import { tmpdir } from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { getGitLastModified } from '../src/lib/seo.ts';

const root = fileURLToPath(new URL('../', import.meta.url));
const committedDate = (source) => execFileSync('git', ['log', '-1', '--format=%cI', '--', source], {
  cwd: root, encoding: 'utf8',
}).trim();
const day = (date) => new Date(date).toISOString().slice(0, 10);

test('Git lastmod reads the immersive source commit instead of the checkout timestamp', () => {
  // Given an immersive source tracked in the repository.
  const source = 'public/immersive/gc/index.html';
  const expected = new Date(committedDate(source)).toISOString();
  // When its last modification is requested.
  const actual = getGitLastModified(source);
  // Then the result is the committed content date.
  assert.equal(actual?.toISOString(), expected);
});

test('Git lastmod accepts the absolute filePath exposed by content loaders', () => {
  // Given an actual content file, independently of its generated collection ID.
  const source = 'src/content/posts/tools.md';
  // When an absolute file path is supplied.
  const actual = getGitLastModified(path.join(root, source));
  // Then it resolves to that file’s history.
  assert.equal(actual?.toISOString(), new Date(committedDate(source)).toISOString());
});

const entry = (id, date, extra = {}) => ({
  id, data: { date, draft: false, public: true, tags: [], ...extra },
});
const collections = {
  posts: [
    { ...entry('git-source-fixture', '2000-01-01', { tags: ['shared', 'R&D', 'zh-only'] }), filePath: 'src/content/posts/tools.md' },
    entry('draft-post', '2000-01-01', { draft: true }),
  ],
  postsEn: [
    { ...entry('git-source-fixture', '2001-02-03', { tags: ['shared', 'en-only'] }), filePath: 'src/content/posts/en/not-committed.md' },
    entry('english-only-post', '2002-03-04'),
  ],
  notes: [
    { ...entry('note-source-fixture', '2003-04-05'), filePath: 'src/content/notes/gc.mdx' },
    entry('private-note', '2000-01-01', { public: false }),
    entry('draft-note', '2000-01-01', { draft: true }),
  ],
  notesEn: [
    { ...entry('note-source-fixture', '2004-05-06'), filePath: 'src/content/notes/en/not-committed.mdx' },
  ],
};

const fakeModules = new Map([
  ['astro:content', `const collections = ${JSON.stringify(collections)};
    for (const kind of ['posts', 'postsEn']) for (const entry of collections[kind]) entry.data.date = new Date(entry.data.date);
    export const getCollection = async (kind, filter = () => true) => (collections[kind] || []).filter(filter);`],
  ['../lib/reading', 'export const fetchReadingItems = async () => [];'],
  ['../lib/comics', 'export const fetchComics = async () => [{issue_number: 7, published_at: "2026-05-01", created_at: "2026-04-30"}];'],
  ['../../scripts/immersive-seo/content.mjs', 'export const loadImmersiveArticles = async () => [{slug: "gc", sourcePath: "public/immersive/gc/index.html", datePublished: "2026-05-16"}];'],
]);

// Astro content collections and remote services are build-only boundaries. Keep
// the sitemap endpoint, source data, URL rendering, and Git date lookup real.
const hooks = registerHooks({
  resolve(specifier, context, nextResolve) {
    if (fakeModules.has(specifier)) {
      return { url: `data:text/javascript,${encodeURIComponent(fakeModules.get(specifier))}`, shortCircuit: true };
    }
    if (specifier.startsWith('.') && context.parentURL?.startsWith('file:')) {
      const candidate = new URL(`${specifier}.ts`, context.parentURL);
      if (existsSync(candidate)) return { url: candidate.href, shortCircuit: true };
    }
    return nextResolve(specifier, context);
  },
});
let xml;
let sitemapGet;
try {
  const { GET } = await import(pathToFileURL(path.join(root, 'src/pages/sitemap.xml.ts')).href);
  sitemapGet = GET;
  xml = await (await GET({ site: new URL('https://example.test') })).text();
} finally {
  hooks.deregister();
}
const unescape = (value) => value.replaceAll('&amp;', '&').replaceAll('&quot;', '"').replaceAll('&apos;', "'").replaceAll('&lt;', '<').replaceAll('&gt;', '>');
const urls = new Map([...xml.matchAll(/<url>([\s\S]*?)<\/url>/g)].map(([, body]) => [
  unescape(body.match(/<loc>(.*?)<\/loc>/)?.[1] ?? ''),
  { lastmod: body.match(/<lastmod>(.*?)<\/lastmod>/)?.[1], alternates: [...body.matchAll(/hreflang="([^"]+)" href="([^"]+)"/g)].map(([, lang, href]) => [lang, unescape(href)]) },
]));
const url = (pathname) => urls.get(`https://example.test${pathname}`);

test('sitemap emits final trailing-slash URLs and omits search, preview, private, and draft routes', () => {
  // Given the endpoint response for public and unpublished fixture collections.
  // When every emitted URL is inspected.
  const locations = [...urls.keys()];
  // Then only final indexable route shapes are listed.
  assert.ok(locations.every((loc) => new URL(loc).pathname.endsWith('/') && !new URL(loc).search));
  assert.ok(!locations.some((loc) => /\/(search|previews|draft-post|draft-note|private-note)\//.test(loc)));
});

test('sitemap uses each translation’s own source history or publication fallback', () => {
  // Given different source paths and publication dates for each language.
  // When the localized entries are compared.
  const actual = [url('/posts/git-source-fixture/'), url('/en/posts/git-source-fixture/'), url('/notes/note-source-fixture/'), url('/en/notes/note-source-fixture/')].map((item) => item?.lastmod);
  // Then each date comes from the correct source, including MDX and missing history.
  assert.deepEqual(actual, [day(committedDate('src/content/posts/tools.md')), '2001-02-03', day(committedDate('src/content/notes/gc.mdx')), '2004-05-06']);
});

test('sitemap gives both immersive routes the shared HTML source modification date', () => {
  // Given bilingual output generated from one tracked HTML article.
  const expected = day(committedDate('public/immersive/gc/index.html'));
  // When both language entries are read.
  const actual = [url('/immersive/gc/'), url('/en/immersive/gc/')].map((item) => item?.lastmod);
  // Then neither a query-string alias nor filesystem mtime supplies the date.
  assert.deepEqual(actual, [expected, expected]);
});

test('sitemap language links are reciprocal and never reference absent tag translations', () => {
  // Given shared tags and tags present in only one collection.
  // When alternates are followed.
  for (const [loc, item] of urls) {
    // Then each alternate is emitted and carries the same reciprocal language map.
    for (const [, alternate] of item.alternates) {
      assert.ok(urls.has(alternate), `${loc} references absent ${alternate}`);
      assert.deepEqual(urls.get(alternate).alternates, item.alternates);
    }
  }
  assert.ok(url('/en/posts/english-only-post/'));
  assert.ok(url('/en/tags/en-only/'));
  assert.equal(url('/tags/zh-only/')?.alternates.length, 0);
  assert.ok(!url('/en/tags/zh-only/'));
});

test('sitemap escapes XML characters in generated content URLs', () => {
  // Given a valid tag path containing an ampersand.
  // When the endpoint serializes it as XML.
  const rawLoc = xml.match(/<loc>([^<]*R[^<]*D[^<]*)<\/loc>/)?.[1];
  // Then the XML entity is escaped without changing its URL value.
  assert.equal(rawLoc, 'https://example.test/tags/R&amp;D/');
});

test('sitemap includes verified public photos, workouts, and bilingual comics routes', () => {
  // Given route data already used by the site’s public page generators.
  // When sitemap locations are enumerated.
  const required = ['/photos/', '/photos/calendar/', '/photos/albums/', '/photos/world/', '/photos/20260321-192231/', '/workouts/', '/en/workouts/', '/comics/', '/en/comics/', '/comics/7/', '/en/comics/7/', '/workouts/5806B990-8434-4AA5-AA40-D97071BD14C3/', '/en/workouts/5806B990-8434-4AA5-AA40-D97071BD14C3/'];
  // Then published routes are discoverable, without inventing an English photo mirror.
  for (const pathname of required) assert.ok(url(pathname), `missing ${pathname}`);
  assert.ok(!url('/en/photos/'));
});

for (const hasLocalIndex of [true, false]) {
  test(`sitemap workout routes follow ${hasLocalIndex ? 'the local index override' : 'the public index fallback'}`, async () => {
    // Given published workouts with a local index that can replace public routes.
    const fixture = mkdtempSync(path.join(tmpdir(), 'seo-workouts-'));
    const activeId = '5806B990-8434-4AA5-AA40-D97071BD14C3';
    const replacedId = 'CE5F3853-4DFE-5E29-ABC0-53998FE39350';
    mkdirSync(path.join(fixture, 'src/data/workouts-public'), { recursive: true });
    for (const id of [activeId, replacedId]) {
      writeFileSync(path.join(fixture, `src/data/workouts-public/${id}.json`), '{}');
    }
    writeFileSync(path.join(fixture, 'src/data/workouts-public.json'), JSON.stringify([{ id: activeId }, { id: replacedId }]));
    if (hasLocalIndex) writeFileSync(path.join(fixture, 'src/data/workouts.json'), JSON.stringify([{ id: activeId }, { id: 'private-local-workout' }]));
    try {
      process.chdir(fixture);
      // When the sitemap is rendered against that build input.
      const output = await (await sitemapGet({ site: new URL('https://example.test') })).text();
      // Then only published IDs selected by getStaticPaths have sitemap routes.
      for (const prefix of ['', '/en']) {
        assert.ok(output.includes(`<loc>https://example.test${prefix}/workouts/${activeId}/</loc>`));
        assert.equal(output.includes(`<loc>https://example.test${prefix}/workouts/${replacedId}/</loc>`), !hasLocalIndex);
        assert.ok(!output.includes(`/workouts/private-local-workout/`));
      }
    } finally {
      process.chdir(root);
      rmSync(fixture, { recursive: true, force: true });
    }
  });
}
