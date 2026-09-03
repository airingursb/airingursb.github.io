import rss from '@astrojs/rss';
import type { APIContext } from 'astro';
import { tSite } from '../../lib/i18n';
import { loadReads, enclosureType, RSS_TRACK_BASE } from '../../lib/reads';

export async function GET(context: APIContext) {
  const s = tSite('zh').reads;
  const reads = loadReads();

  return rss({
    title: s.feedTitle,
    description: s.feedDesc,
    site: context.site!,
    stylesheet: '/feed.xsl',
    items: reads.map((item) => {
      const pixel = `<img src="${RSS_TRACK_BASE}?post=${encodeURIComponent(item.slug)}" width="1" height="1" alt="" />`;
      return {
        title: item.title,
        pubDate: item.publishedAt ? new Date(item.publishedAt) : new Date(0),
        description: item.summary || '',
        content: `${item.summary || ''}${pixel}`,
        link: `/reads/${item.slug}/`,
        categories: item.tags,
        ...(item.cover
          ? {
              enclosure: {
                url: item.cover,
                type: enclosureType(item.cover),
                length: 0,
              },
            }
          : {}),
      };
    }),
    customData: `<language>${s.feedLang}</language>`,
  });
}
