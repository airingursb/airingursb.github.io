import type { APIContext } from 'astro';
import { getCollection } from 'astro:content';

export async function GET(context: APIContext) {
  const site = context.site!.origin;

  const posts = (await getCollection('posts', ({ data }) => !data.draft))
    .sort((a, b) => b.data.date.valueOf() - a.data.date.valueOf());

  // Static pages
  const staticPages = [
    { url: '/', changefreq: 'daily', priority: '1.0' },
    { url: '/blog', changefreq: 'daily', priority: '0.9' },
    { url: '/archive', changefreq: 'weekly', priority: '0.7' },
    { url: '/moments', changefreq: 'daily', priority: '0.7' },
    { url: '/friends', changefreq: 'monthly', priority: '0.5' },
    { url: '/search', changefreq: 'weekly', priority: '0.5' },
  ];

  // Collect all tags
  const tagsSet = new Set<string>();
  posts.forEach(post => post.data.tags.forEach(tag => tagsSet.add(tag)));

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${staticPages
  .map(
    page => `  <url>
    <loc>${site}${page.url}</loc>
    <changefreq>${page.changefreq}</changefreq>
    <priority>${page.priority}</priority>
  </url>`
  )
  .join('\n')}
${posts
  .map(
    post => `  <url>
    <loc>${site}/posts/${post.id}/</loc>
    <lastmod>${post.data.date.toISOString().split('T')[0]}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.8</priority>
  </url>`
  )
  .join('\n')}
${[...tagsSet]
  .map(
    tag => `  <url>
    <loc>${site}/tags/${tag}/</loc>
    <changefreq>weekly</changefreq>
    <priority>0.5</priority>
  </url>`
  )
  .join('\n')}
</urlset>`;

  return new Response(xml, {
    headers: { 'Content-Type': 'application/xml; charset=utf-8' },
  });
}
