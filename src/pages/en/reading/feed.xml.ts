import rss from '@astrojs/rss';
import type { APIContext } from 'astro';
import { optimizedReadingRssItems } from '../../../lib/reading-feed-images';
import { fetchReadingItems } from '../../../lib/reading';

export async function GET(context: APIContext) {
  const items = await fetchReadingItems(50);

  return rss({
    title: "Airing's Reading Stream",
    description: 'Things I read and chose to keep.',
    site: context.site ?? 'https://ursb.me',
    stylesheet: '/feed.xsl',
    items: await optimizedReadingRssItems(items, 'en', context.site ?? 'https://ursb.me'),
    customData: '<language>en</language>',
  });
}
