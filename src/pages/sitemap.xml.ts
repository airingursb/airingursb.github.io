import type { APIContext } from 'astro';
import { getCollection } from 'astro:content';

export async function GET(context: APIContext) {
  const site = context.site!.origin;

  const posts = (await getCollection('posts', ({ data }) => !data.draft))
    .sort((a, b) => b.data.date.valueOf() - a.data.date.valueOf());
  const postsEn = (await getCollection('postsEn', ({ data }) => !data.draft));
  const enPostIds = new Set(postsEn.map(p => p.id));

  const notes = (await getCollection('notes', ({ data }) => data.public && !data.draft));
  const notesEn = (await getCollection('notesEn', ({ data }) => data.public && !data.draft));
  const enNoteIds = new Set(notesEn.map(n => n.id));
  const zhNoteIds = new Set(notes.map(n => n.id));

  const tagsSet = new Set<string>();
  posts.forEach(post => post.data.tags.forEach(tag => tagsSet.add(tag)));

  // Static pages with bilingual pairs
  const bilingualStaticPages = [
    { zh: '/blog', en: '/en/blog', changefreq: 'daily', priority: '0.9' },
    { zh: '/archive', en: '/en/archive', changefreq: 'weekly', priority: '0.7' },
    { zh: '/moments', en: '/en/moments', changefreq: 'daily', priority: '0.7' },
    { zh: '/friends', en: '/en/friends', changefreq: 'monthly', priority: '0.5' },
    { zh: '/search', en: '/en/search', changefreq: 'weekly', priority: '0.5' },
    { zh: '/notes', en: '/en/notes', changefreq: 'weekly', priority: '0.8' },
  ];

  // Home (no /en mirror yet)
  const homePage = { url: '/', changefreq: 'daily', priority: '1.0' };

  function bilingualUrl(zhPath: string, enPath: string, opts: { lastmod?: string; changefreq: string; priority: string }) {
    const zhLoc = `${site}${zhPath}`;
    const enLoc = `${site}${enPath}`;
    const lastmodXml = opts.lastmod ? `    <lastmod>${opts.lastmod}</lastmod>\n` : '';
    return `  <url>
    <loc>${zhLoc}</loc>
${lastmodXml}    <changefreq>${opts.changefreq}</changefreq>
    <priority>${opts.priority}</priority>
    <xhtml:link rel="alternate" hreflang="zh-CN" href="${zhLoc}"/>
    <xhtml:link rel="alternate" hreflang="en" href="${enLoc}"/>
    <xhtml:link rel="alternate" hreflang="x-default" href="${zhLoc}"/>
  </url>
  <url>
    <loc>${enLoc}</loc>
${lastmodXml}    <changefreq>${opts.changefreq}</changefreq>
    <priority>${opts.priority}</priority>
    <xhtml:link rel="alternate" hreflang="zh-CN" href="${zhLoc}"/>
    <xhtml:link rel="alternate" hreflang="en" href="${enLoc}"/>
    <xhtml:link rel="alternate" hreflang="x-default" href="${zhLoc}"/>
  </url>`;
  }

  function singleUrl(path: string, opts: { lastmod?: string; changefreq: string; priority: string }) {
    const lastmodXml = opts.lastmod ? `    <lastmod>${opts.lastmod}</lastmod>\n` : '';
    return `  <url>
    <loc>${site}${path}</loc>
${lastmodXml}    <changefreq>${opts.changefreq}</changefreq>
    <priority>${opts.priority}</priority>
  </url>`;
  }

  const urls: string[] = [];

  // Home (single lang for now)
  urls.push(singleUrl(homePage.url, { changefreq: homePage.changefreq, priority: homePage.priority }));

  // Static bilingual pages
  for (const p of bilingualStaticPages) {
    urls.push(bilingualUrl(p.zh, p.en, { changefreq: p.changefreq, priority: p.priority }));
  }

  // Blog posts: bilingual when EN exists, else single zh
  for (const post of posts) {
    const lastmod = post.data.date.toISOString().split('T')[0];
    if (enPostIds.has(post.id)) {
      urls.push(bilingualUrl(`/posts/${post.id}/`, `/en/posts/${post.id}/`, {
        lastmod, changefreq: 'monthly', priority: '0.8'
      }));
    } else {
      urls.push(singleUrl(`/posts/${post.id}/`, { lastmod, changefreq: 'monthly', priority: '0.8' }));
    }
  }

  // Notes: bilingual when EN exists, else single zh
  for (const note of notes) {
    const lastmod = new Date(note.data.date).toISOString().split('T')[0];
    if (enNoteIds.has(note.id)) {
      urls.push(bilingualUrl(`/notes/${note.id}/`, `/en/notes/${note.id}/`, {
        lastmod, changefreq: 'monthly', priority: '0.7'
      }));
    } else {
      urls.push(singleUrl(`/notes/${note.id}/`, { lastmod, changefreq: 'monthly', priority: '0.7' }));
    }
  }

  // Also include EN-only notes (unlikely but safe)
  for (const note of notesEn) {
    if (!zhNoteIds.has(note.id)) {
      const lastmod = new Date(note.data.date).toISOString().split('T')[0];
      urls.push(singleUrl(`/en/notes/${note.id}/`, { lastmod, changefreq: 'monthly', priority: '0.7' }));
    }
  }

  // Tags: bilingual (tag keys shared across languages)
  for (const tag of tagsSet) {
    urls.push(bilingualUrl(`/tags/${tag}/`, `/en/tags/${tag}/`, {
      changefreq: 'weekly', priority: '0.5'
    }));
  }

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:xhtml="http://www.w3.org/1999/xhtml">
${urls.join('\n')}
</urlset>`;

  return new Response(xml, {
    headers: { 'Content-Type': 'application/xml; charset=utf-8' },
  });
}
