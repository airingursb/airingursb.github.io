import rss from '@astrojs/rss';
import type { APIContext } from 'astro';
import { readingRssItems } from '../../lib/reading-feed';
import { fetchReadingItems } from '../../lib/reading';

export async function GET(context: APIContext) {
  const items = await fetchReadingItems(50);

  return rss({
    title: "Airing's 阅读流",
    description: '我每天读过，并愿意留下的东西。',
    site: context.site ?? 'https://ursb.me',
    stylesheet: '/feed.xsl',
    items: readingRssItems(items, 'zh'),
    customData: '<language>zh-CN</language>',
  });
}
