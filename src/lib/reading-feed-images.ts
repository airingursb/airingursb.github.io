import { getImage } from 'astro:assets';
import type { ReadingItem } from './reading';
import { readingRssItems } from './reading-feed';

export async function optimizedReadingRssItems(
  items: readonly ReadingItem[],
  lang: 'zh' | 'en',
  site: URL | string,
) {
  const covers = await Promise.all(items.map(async (item) => {
    const source = lang === 'en' ? item.cover_url_en || item.cover_url : item.cover_url;
    const original = await getImage({ src: source, inferSize: true });
    const originalWidth = Number(original.attributes.width);
    const originalHeight = Number(original.attributes.height);
    const width = Math.min(960, originalWidth);
    const height = Math.round(originalHeight * width / originalWidth);
    // JPEG keeps feed-reader compatibility; originals remain available on the detail page.
    const image = await getImage({ src: source, width, height, format: 'jpeg', quality: 80 });
    return [source, new URL(image.src, site).href] as const;
  }));
  return readingRssItems(items, lang, new Map(covers));
}
