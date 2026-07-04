import { getCollection } from 'astro:content';
import type { APIContext } from 'astro';

/**
 * llms.txt — a machine-readable map of the site for AI agents & crawlers.
 * Spec: https://llmstxt.org/
 */
export async function GET(context: APIContext) {
  const site = context.site!.href.replace(/\/$/, '');

  const posts = (await getCollection('posts', ({ data }) => !data.draft))
    .sort((a, b) => b.data.date.valueOf() - a.data.date.valueOf());
  const enPosts = (await getCollection('postsEn', ({ data }) => !data.draft))
    .sort((a, b) => b.data.date.valueOf() - a.data.date.valueOf());
  const notes = (await getCollection('notes', ({ data }) => data.public && !data.draft))
    .sort((a, b) => b.data.date.localeCompare(a.data.date));

  const postLine = (p: (typeof posts)[number]) =>
    `- [${p.data.title}](${site}/posts/${p.id}/)${p.data.description ? `: ${p.data.description}` : ''}`;
  const enPostLine = (p: (typeof enPosts)[number]) =>
    `- [${p.data.title}](${site}/en/posts/${p.id}/)${p.data.description ? `: ${p.data.description}` : ''}`;
  const noteLine = (n: (typeof notes)[number]) =>
    `- [${n.data.title}](${site}/notes/${n.id}/)${n.data.summary ? `: ${n.data.summary}` : ''}`;

  const body = `# Airing's Blog (ursb.me)

> Personal homepage and blog of Airing — software engineer based in Singapore.
> Long-form essays (Chinese, many with English translations) on software engineering,
> AI, philosophy, and life, plus technical notes, a monthly newsletter series, photos,
> and yearly reviews. Full-text RSS: ${site}/blog/feed.xml (ZH) and ${site}/en/blog/feed.xml (EN).

## Blog Posts (Chinese)

${posts.map(postLine).join('\n')}

## Blog Posts (English translations)

${enPosts.map(enPostLine).join('\n')}

## Notes

${notes.map(noteLine).join('\n')}

## Other

- [Blog index](${site}/blog/): all posts by date
- [Archive](${site}/archive/): posts grouped by year
- [Moments](${site}/moments/): short-form updates
- [Sitemap](${site}/sitemap.xml)
`;

  return new Response(body, {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
}
