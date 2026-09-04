import rss from '@astrojs/rss';
import type { APIContext } from 'astro';
import { readingRssItems } from '../../../lib/reading-feed';
import { fetchReadingItems } from '../../../lib/reading';

export async function GET(context: APIContext) {
  const items = await fetchReadingItems(50);

  return rss({
    title: "Airing's Reading Stream",
    description: 'Things I read and chose to keep.',
    site: context.site ?? 'https://ursb.me',
    stylesheet: '/feed.xsl',
    items: readingRssItems(items, 'en'),
    customData: '<language>en</language>',
  });
}
