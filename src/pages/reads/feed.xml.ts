import rss from '@astrojs/rss';
import type { APIContext } from 'astro';
import { tSite } from '../../lib/i18n';
import { loadReads, readToRssFields } from '../../lib/reads';

export async function GET(context: APIContext) {
  const s = tSite('zh').reads;
  const reads = loadReads();

  return rss({
    title: s.feedTitle,
    description: s.feedDesc,
    site: context.site!,
    stylesheet: '/feed.xsl',
    items: reads.map((item) => {
      const fields = readToRssFields(item);
      return {
        title: fields.title,
        pubDate: fields.pubDate,
        description: fields.description,
        content: fields.content,
        link: fields.link,
        categories: fields.categories,
        ...(fields.enclosure ? { enclosure: fields.enclosure } : {}),
      };
    }),
    customData: `<language>${s.feedLang}</language>`,
  });
}
