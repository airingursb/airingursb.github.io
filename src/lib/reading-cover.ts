export function readingCoverLabel(
  item: { title: string; title_en?: string | null; slug: string },
  lang: 'zh' | 'en' = 'zh',
): string {
  const title = lang === 'en' ? item.title_en || item.title : item.title;
  return `"${title}" (${item.slug})`;
}

export function warnMissingReadingCover(label: string, url: string, error: unknown): void {
  const detail = error instanceof Error ? error.message : String(error);
  console.warn(`[reading] skip missing cover for ${label}: ${url} (${detail})`);
}

export async function loadReadingCover<T>(
  label: string,
  url: string,
  load: () => Promise<T>,
): Promise<T | null> {
  try {
    return await load();
  } catch (error) {
    warnMissingReadingCover(label, url, error);
    return null;
  }
}
