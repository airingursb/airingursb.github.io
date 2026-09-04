import type { RSSFeedItem } from '@astrojs/rss';
import type { ReadingItem } from './reading';

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

export function readingRssItems(items: readonly ReadingItem[], lang: 'zh' | 'en'): RSSFeedItem[] {
  return items.map((item) => {
    const title = lang === 'en' ? item.title_en || item.title : item.title;
    const summary = lang === 'en' ? item.summary_en || item.summary : item.summary;
    const coverUrl = lang === 'en' ? item.cover_url_en || item.cover_url : item.cover_url;
    const sourceLink = item.original_url
      ? `<p><a href="${escapeHtml(item.original_url)}">${lang === 'en' ? 'Read the source' : '阅读原文'} →</a></p>`
      : '';

    return {
      title,
      pubDate: new Date(item.saved_at),
      description: summary || title,
      content: `${summary ? `<p>${escapeHtml(summary)}</p>` : ''}<p><img src="${escapeHtml(coverUrl)}" alt="${escapeHtml(title)}" /></p>${sourceLink}`,
      link: `${lang === 'en' ? '/en' : ''}/reading/${encodeURIComponent(item.slug)}/`,
      categories: item.topics,
    };
  });
}
