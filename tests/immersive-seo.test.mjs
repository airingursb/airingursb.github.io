import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';
import { parse } from 'parse5';
import * as transformer from '../scripts/immersive-seo/transform.mjs';

const source = `<!doctype html><html lang="zh-CN"><head><meta charset="UTF-8"><title>旧标题</title><meta name="description" content="旧描述"><meta property="og:image" content="/og/missing.png"><style>.lang-toggle button { color: red; } body:not(.lang-en) .lang-en-only{display:none} body.lang-en .lang-zh-only{display:none} .hero{background:url('article_assets/cover.png')}</style></head><body class="paper lang-zh"><div class="lang-toggle"><button id="lang-zh" class="active" aria-pressed="true">中</button><button id="lang-en" aria-pressed="false">EN</button></div><h1 class="lang-zh-only">中文</h1><h1 class="lang-en-only">English</h1><canvas id="demo"></canvas><img src="article_assets/cover.png"><script>var KEY="ursb-immersive-lang"; var saved=localStorage.getItem(KEY); document.title="旧标题"; window.POST_SLUG='note/example';</script></body></html>`;
const article = { slug: 'example', sourcePath: 'public/immersive/example/index.html', source, datePublished: '2026-05-17', locales: { zh: { title: '中文标题', description: '中文描述' }, en: { title: 'English & <title>', description: 'English "description"' } } };
function nodes(html) {
  const result = [];
  function walk(node) { result.push(node); for (const child of node.childNodes ?? []) walk(child); }
  walk(parse(html));
  return result;
}
const attr = (node, key) => node.attrs?.find(item => item.name === key)?.value;
function render(locale = 'en') {
  assert.equal(typeof transformer.transformImmersivePage, 'function', 'shared transformer is available');
  return transformer.transformImmersivePage(article, locale, { dateModified: new Date('2026-06-02T10:00:00Z') });
}

test('emits localized canonical metadata and Article dates when rendering an English route', () => {
  // Given a bilingual original with stale metadata; when rendering the English route.
  const html = render();
  const elements = nodes(html);
  const canonical = elements.filter(node => attr(node, 'rel') === 'canonical');
  const schema = elements.find(node => attr(node, 'type') === 'application/ld+json');
  // Then search engines receive English metadata, valid image route, and stable article dates.
  assert.equal(canonical.length, 1);
  assert.equal(attr(canonical[0], 'href'), 'https://ursb.me/en/immersive/example/');
  assert.equal(attr(elements.find(node => attr(node, 'property') === 'og:image'), 'content'), 'https://ursb.me/og/notes/example.png');
  assert.equal(elements.find(node => node.tagName === 'title').childNodes[0].value, article.locales.en.title);
  assert.equal(attr(elements.find(node => attr(node, 'name') === 'description'), 'content'), article.locales.en.description);
  const data = JSON.parse(schema.childNodes[0].value);
  assert.equal(data['@type'], 'Article');
  assert.equal(data.datePublished, '2026-05-17T00:00:00.000Z');
  assert.equal(data.dateModified, '2026-06-02T10:00:00.000Z');
  assert.equal(data.author.name, 'Airing');
  assert.equal(data.inLanguage, 'en');
});

test('sets static English body state and crawlable language links while preserving interaction identity', () => {
  // Given the original IDs and shared analytics identity; when rendering English HTML.
  const html = render();
  const elements = nodes(html);
  // Then the response itself is English before scripts execute and links work without JavaScript.
  assert.equal(attr(elements.find(node => node.tagName === 'html'), 'lang'), 'en');
  assert.equal(attr(elements.find(node => node.tagName === 'body'), 'class'), 'paper lang-en');
  const zh = elements.find(node => attr(node, 'id') === 'lang-zh');
  const en = elements.find(node => attr(node, 'id') === 'lang-en');
  assert.equal(zh.tagName, 'a');
  assert.equal(attr(zh, 'href'), '/immersive/example/');
  assert.equal(attr(en, 'href'), '/en/immersive/example/');
  assert.equal(attr(en, 'aria-current'), 'page');
  assert.ok(elements.some(node => node.tagName === 'canvas' && attr(node, 'id') === 'demo'));
  assert.ok(html.includes("window.POST_SLUG='note/example'"));
  assert.ok(html.includes('var saved="en"'));
});

test('resolves original relative resources without changing chapter fragment links', () => {
  // Given a relative image and CSS background; when rendering in the deeper English route.
  const html = render();
  // Then both resources retain the original article resource path.
  assert.ok(html.includes('src="/immersive/example/article_assets/cover.png"'));
  assert.ok(html.includes("url('/immersive/example/article_assets/cover.png')"));
});

test('keeps the Chinese route Chinese regardless of stored language', () => {
  // Given an English browser preference; when producing the Chinese route.
  const html = render('zh');
  const elements = nodes(html);
  // Then initial locale and legacy preference reads are fixed to that route.
  assert.equal(attr(elements.find(node => node.tagName === 'html'), 'lang'), 'zh-CN');
  assert.equal(attr(elements.find(node => node.tagName === 'body'), 'class'), 'paper lang-zh');
  assert.ok(html.includes('var saved="zh"'));
});

test('redirects legacy query languages to static routes while preserving all other URL state', async () => {
  // Given old and new route URLs with tracking queries and chapter hashes.
  const { runInNewContext } = await import('node:vm');
  const { immersiveLocaleRuntime } = await import('../scripts/immersive-seo/runtime.mjs');
  for (const [url, expected] of [
    ['https://ursb.me/immersive/example/?lang=en&utm_source=feed#chapter-3', '/en/immersive/example/?utm_source=feed#chapter-3'],
    ['https://ursb.me/en/immersive/example/?lang=zh#chapter-2', '/immersive/example/#chapter-2'],
    ['https://ursb.me/immersive/example/?lang=zh#chapter-1', '/immersive/example/#chapter-1'],
  ]) {
    let destination;
    // When the compatibility script runs in a browser-shaped URL environment.
    runInNewContext(immersiveLocaleRuntime('example'), {
      URL, location: { href: url, replace(value) { destination = value; } },
      document: { addEventListener() {} }, window: { addEventListener() {} },
    });
    // Then only the obsolete language parameter is removed.
    assert.equal(destination, expected);
  }
});

test('language-link clicks preserve the current chapter and bypass the old in-place toggle', async () => {
  // Given a chapter changed with history.replaceState (which does not fire hashchange).
  const { runInNewContext } = await import('node:vm');
  const { immersiveLocaleRuntime } = await import('../scripts/immersive-seo/runtime.mjs');
  const handlers = new Map();
  const link = { dataset: { immersiveLocale: 'zh' }, setAttribute(name, value) { this[name] = value; } };
  const location = { href: 'https://ursb.me/en/immersive/example/?ref=reading#latest-chapter' };
  runInNewContext(immersiveLocaleRuntime('example'), {
    URL, location, window: { addEventListener() {} },
    document: { addEventListener(name, handler) { handlers.set(name, handler); } },
  });
  let stopped = false;
  // When clicking the language link.
  handlers.get('click')({ target: { closest() { return link; } }, stopImmediatePropagation() { stopped = true; } });
  // Then normal anchor navigation has the up-to-date chapter and old toggle listeners cannot run.
  assert.equal(link.href, '/immersive/example/?ref=reading#latest-chapter');
  assert.equal(stopped, true);
});

test('all authored immersive articles retain their interactive IDs and expose both language routes', async () => {
  // Given the checked-in article collection, including React's English body without an English MDX teaser.
  const { loadImmersiveArticles } = await import('../scripts/immersive-seo/content.mjs');
  const articles = await loadImmersiveArticles();
  assert.equal(articles.length, 15);
  for (const original of articles) {
    const ids = nodes(original.source).map(node => attr(node, 'id')).filter(Boolean).sort();
    for (const locale of ['zh', 'en']) {
      // When rendering each real source in both locales.
      const html = transformer.transformImmersivePage(original, locale);
      const elements = nodes(html);
      // Then no demo/comment/TOC IDs are removed, and exactly two crawlable locale controls survive.
      assert.deepEqual(elements.map(node => attr(node, 'id')).filter(Boolean).sort(), ids, `${original.slug}/${locale} IDs`);
      assert.equal(elements.filter(node => attr(node, 'data-immersive-locale')).length, 2, `${original.slug}/${locale} language links`);
      assert.equal(elements.filter(node => attr(node, 'rel') === 'canonical').length, 1);
      assert.ok(html.indexOf('charset=') < 1024, `${original.slug}/${locale} charset remains early`);
    }
    assert.equal(await readFile(original.sourcePath, 'utf8'), original.source, 'source originals remain untouched');
  }
});

test('does not publish draft immersive articles and honors the public collection default', async () => {
  // Given one draft and one public-by-default note in an isolated content root.
  const { mkdtemp, mkdir, writeFile, rm } = await import('node:fs/promises');
  const { tmpdir } = await import('node:os');
  const { join } = await import('node:path');
  const { loadImmersiveArticles } = await import('../scripts/immersive-seo/content.mjs');
  const root = await mkdtemp(join(tmpdir(), 'immersive-metadata-'));
  try {
    await mkdir(join(root, 'src/content/notes/en'), { recursive: true });
    for (const slug of ['draft', 'published']) {
      await mkdir(join(root, `public/immersive/${slug}`), { recursive: true });
      await writeFile(join(root, `public/immersive/${slug}/index.html`), source);
      const note = `---\ntitle: Example\nsummary: Description\ndate: "2026-05-17"\n${slug === 'draft' ? 'public: true\ndraft: true\n' : ''}---\n`;
      await writeFile(join(root, `src/content/notes/${slug}.mdx`), note);
      await writeFile(join(root, `src/content/notes/en/${slug}.mdx`), note);
    }
    // When discovering generated routes.
    const articles = await loadImmersiveArticles(root);
    // Then only the non-draft note is public, even without explicit public: true.
    assert.deepEqual(articles.map(item => item.slug), ['published']);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('English article navigation localizes same-origin absolute and relative URLs while retaining chapter context', () => {
  // Given authored links in both URL forms, including an obsolete explicit Chinese preference.
  const linkedArticle = {
    ...article,
    source: source.replace('</body>', '<a id="absolute-next" href="https://ursb.me/immersive/quickjs/?ref=series&amp;lang=zh#bytecode">Next</a><a id="relative-next" href="/immersive/pi-agent/?ref=series&amp;lang=en#tools">Next</a><a id="external-next" href="https://example.com/immersive/quickjs/?lang=zh#bytecode">External</a><a id="chapter-link" href="#demo">Chapter</a></body>'),
  };
  // When rendering the English article.
  const elements = nodes(transformer.transformImmersivePage(linkedArticle, 'en'));
  const href = id => attr(elements.find(node => attr(node, 'id') === id), 'href');
  // Then same-site navigation stays English without losing tracking/anchors or touching external/chapter links.
  assert.equal(href('absolute-next'), 'https://ursb.me/en/immersive/quickjs/?ref=series#bytecode');
  assert.equal(href('relative-next'), '/en/immersive/pi-agent/?ref=series#tools');
  assert.equal(href('external-next'), 'https://example.com/immersive/quickjs/?lang=zh#bytecode');
  assert.equal(href('chapter-link'), '#demo');
});

test('English back-links use translated note destinations without rewriting note references in the article', () => {
  // Given list/detail back-links plus an ordinary reference to the same Chinese note.
  const linkedArticle = {
    ...article,
    locales: { ...article.locales, en: { ...article.locales.en, notePath: '/en/notes/example/' } },
    source: source.replace('</body>', '<a id="back-list" class="ursb-backlink" href="https://ursb.me/notes/?ref=article#recent">Back</a><a id="back-note" class="ursb-backlink" href="/notes/example/">Back</a><a id="note-reference" href="/notes/example/">Reference</a></body>'),
  };
  // When rendering with and without an available English teaser.
  const translated = nodes(transformer.transformImmersivePage(linkedArticle, 'en'));
  const untranslated = nodes(transformer.transformImmersivePage({ ...linkedArticle, locales: article.locales }, 'en'));
  const href = (elements, id) => attr(elements.find(node => attr(node, 'id') === id), 'href');
  // Then back navigation is English and unavailable teasers fall back to the English notes list.
  assert.equal(href(translated, 'back-list'), 'https://ursb.me/en/notes/?ref=article#recent');
  assert.equal(href(translated, 'back-note'), '/en/notes/example/');
  assert.equal(href(untranslated, 'back-note'), '/en/notes/');
  assert.equal(href(translated, 'note-reference'), '/notes/example/');
});
