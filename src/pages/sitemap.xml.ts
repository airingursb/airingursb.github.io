import type { APIContext } from 'astro';
import { getCollection } from 'astro:content';
import { z } from 'astro/zod';
import { existsSync, readFileSync } from 'node:fs';
import { loadImmersiveArticles } from '../../scripts/immersive-seo/content.mjs';
import photosData from '../data/photos.json' with { type: 'json' };
import publicWorkouts from '../data/workouts-public.json' with { type: 'json' };
import { fetchComics } from '../lib/comics';
import { slugify } from '../lib/photos-slug';
import { fetchReadingItems } from '../lib/reading';
import { getGitLastModified } from '../lib/seo';

type UrlOptions = {
  readonly lastmod?: string;
  readonly enLastmod?: string;
  readonly changefreq: string;
  readonly priority: string;
};
type Photo = {
  readonly slug: string;
  readonly albums?: readonly string[];
  readonly tags?: readonly string[];
  readonly place?: { readonly city?: string };
  readonly exif?: { readonly camera?: string | null };
};

export async function GET(context: APIContext) {
  const site = context.site?.origin ?? 'https://ursb.me';
  const [posts, postsEn, notes, notesEn, workoutEntries, readingItems, comics, immersiveArticles] = await Promise.all([
    getCollection('posts', ({ data }) => !data.draft),
    getCollection('postsEn', ({ data }) => !data.draft),
    getCollection('notes', ({ data }) => data.public && !data.draft),
    getCollection('notesEn', ({ data }) => data.public && !data.draft),
    getCollection('workouts'),
    fetchReadingItems(),
    fetchComics(),
    loadImmersiveArticles(),
  ]);

  const bilingualStaticPages = [
    { zh: '/blog/', en: '/en/blog/', changefreq: 'daily', priority: '0.9' },
    { zh: '/archive/', en: '/en/archive/', changefreq: 'weekly', priority: '0.7' },
    { zh: '/moments/', en: '/en/moments/', changefreq: 'daily', priority: '0.7' },
    { zh: '/friends/', en: '/en/friends/', changefreq: 'monthly', priority: '0.5' },
    { zh: '/notes/', en: '/en/notes/', changefreq: 'weekly', priority: '0.8' },
    { zh: '/playbook/', en: '/en/playbook/', changefreq: 'monthly', priority: '0.7' },
    { zh: '/playbook/living-scenes/', en: '/en/playbook/living-scenes/', changefreq: 'monthly', priority: '0.6' },
    { zh: '/playbook/reading-companion/', en: '/en/playbook/reading-companion/', changefreq: 'monthly', priority: '0.6' },
    ...['/playbook/bear-stories/', '/playbook/desk-wind/', '/playbook/workshop/', '/playbook/shared-garden/', '/photos/suitcase/'].map(route => ({ zh: route, en: `/en${route}`, changefreq: 'monthly', priority: '0.5' })),
    { zh: '/reading/', en: '/en/reading/', changefreq: 'daily', priority: '0.8' },
    { zh: '/workouts/', en: '/en/workouts/', changefreq: 'weekly', priority: '0.6' },
    { zh: '/comics/', en: '/en/comics/', changefreq: 'weekly', priority: '0.7' },
  ];

  const escapeXml = (value: string) => value.replaceAll('&', '&amp;').replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&apos;');
  const location = (pathname: string) => escapeXml(new URL(`${pathname.replace(/\/+$/, '')}/`, site).href);
  const lastModified = (sourcePath: string, published: Date | string) =>
    (getGitLastModified(sourcePath) ?? new Date(published)).toISOString().slice(0, 10);

  function alternates(zhPath: string, enPath: string) {
    return `    <xhtml:link rel="alternate" hreflang="zh-CN" href="${location(zhPath)}"/>
    <xhtml:link rel="alternate" hreflang="en" href="${location(enPath)}"/>
    <xhtml:link rel="alternate" hreflang="x-default" href="${location(zhPath)}"/>`;
  }

  function singleUrl(pathname: string, opts: UrlOptions, links = '') {
    return `  <url>
    <loc>${location(pathname)}</loc>
${opts.lastmod ? `    <lastmod>${escapeXml(opts.lastmod)}</lastmod>\n` : ''}    <changefreq>${opts.changefreq}</changefreq>
    <priority>${opts.priority}</priority>
${links ? `${links}\n` : ''}  </url>`;
  }

  function bilingualUrl(zhPath: string, enPath: string, opts: UrlOptions) {
    const links = alternates(zhPath, enPath);
    return `${singleUrl(zhPath, opts, links)}\n${singleUrl(enPath, { ...opts, lastmod: opts.enLastmod ?? opts.lastmod }, links)}`;
  }

  const urls = [
    singleUrl('/', { changefreq: 'daily', priority: '1.0' }),
    singleUrl('/world/', { changefreq: 'monthly', priority: '0.6' }),
    ...bilingualStaticPages.map(page => bilingualUrl(page.zh, page.en, page)),
  ];

  for (const group of [
    { route: 'posts', zh: posts, en: postsEn, extension: 'md', priority: '0.8' },
    { route: 'notes', zh: notes, en: notesEn, extension: 'mdx', priority: '0.7' },
  ]) {
    const enEntries = new Map(group.en.map(entry => [entry.id, entry] as const));
    const zhIds = new Set(group.zh.map(entry => entry.id));
    for (const entry of group.zh) {
      const opts = {
        lastmod: lastModified(entry.filePath ?? `src/content/${group.route}/${entry.id}.${group.extension}`, entry.data.date),
        changefreq: 'monthly', priority: group.priority,
      };
      const translation = enEntries.get(entry.id);
      const zhPath = `/${group.route}/${entry.id}/`;
      const enPath = `/en${zhPath}`;
      urls.push(translation ? bilingualUrl(zhPath, enPath, {
        ...opts,
        enLastmod: lastModified(translation.filePath ?? `src/content/${group.route}/en/${translation.id}.${group.extension}`, translation.data.date),
      }) : singleUrl(zhPath, opts));
    }
    for (const entry of group.en) {
      if (zhIds.has(entry.id)) continue;
      urls.push(singleUrl(`/en/${group.route}/${entry.id}/`, {
        lastmod: lastModified(entry.filePath ?? `src/content/${group.route}/en/${entry.id}.${group.extension}`, entry.data.date),
        changefreq: 'monthly', priority: group.priority,
      }));
    }
  }

  for (const item of readingItems) {
    urls.push(bilingualUrl(`/reading/${item.slug}/`, `/en/reading/${item.slug}/`, {
      lastmod: new Date(item.updated_at).toISOString().slice(0, 10),
      changefreq: 'monthly', priority: '0.6',
    }));
  }

  for (const article of immersiveArticles) {
    urls.push(bilingualUrl(`/immersive/${article.slug}/`, `/en/immersive/${article.slug}/`, {
      lastmod: lastModified(article.sourcePath, article.datePublished),
      changefreq: 'monthly', priority: '0.9',
    }));
  }

  const zhTags = new Set(posts.flatMap(post => post.data.tags));
  const enTags = new Set(postsEn.flatMap(post => post.data.tags));
  for (const tag of new Set([...zhTags, ...enTags])) {
    const opts = { changefreq: 'weekly', priority: '0.5' };
    urls.push(zhTags.has(tag) && enTags.has(tag)
      ? bilingualUrl(`/tags/${tag}/`, `/en/tags/${tag}/`, opts)
      : singleUrl(`${zhTags.has(tag) ? '' : '/en'}/tags/${tag}/`, opts));
  }

  const photos: readonly Photo[] = photosData;
  const photoPaths = new Set(['/photos/', '/photos/calendar/', '/photos/albums/', '/photos/world/']);
  for (const photo of photos) {
    photoPaths.add(`/photos/${photo.slug}/`);
    const facets = [
      ...((photo.albums ?? []).map(name => ['albums', name])),
      ...((photo.tags ?? []).map(name => ['tags', name])),
      ['places', photo.place?.city], ['cameras', photo.exif?.camera],
    ];
    for (const [facet, name] of facets) {
      if (name && slugify(name)) photoPaths.add(`/photos/${facet}/${slugify(name)}/`);
    }
  }
  for (const pathname of photoPaths) {
    urls.push(singleUrl(pathname, { changefreq: 'monthly', priority: '0.5' }));
  }

  const localWorkoutIds = existsSync('src/data/workouts.json')
    ? new Set(z.array(z.object({ id: z.string() })).parse(
      JSON.parse(readFileSync('src/data/workouts.json', 'utf8')),
    ).map(workout => workout.id))
    : undefined;
  for (const workout of publicWorkouts) {
    if (localWorkoutIds && !localWorkoutIds.has(workout.id)) continue;
    const entry = workoutEntries.find(item => item.id.toLowerCase() === workout.id.toLowerCase());
    if (entry && (!entry.data.public || entry.data.draft)) continue;
    if (!existsSync(`src/data/workouts-public/${workout.id}.json`)) continue;
    urls.push(bilingualUrl(`/workouts/${workout.id}/`, `/en/workouts/${workout.id}/`, {
      changefreq: 'monthly', priority: '0.5',
    }));
  }

  for (const comic of comics) {
    urls.push(bilingualUrl(`/comics/${comic.issue_number}/`, `/en/comics/${comic.issue_number}/`, {
      changefreq: 'monthly', priority: '0.6',
    }));
  }

  return new Response(`<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:xhtml="http://www.w3.org/1999/xhtml">
${urls.join('\n')}
</urlset>`, {
    headers: { 'Content-Type': 'application/xml; charset=utf-8' },
  });
}
