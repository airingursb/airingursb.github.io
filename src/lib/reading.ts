export interface ReadingItem {
  id: string;
  slug: string;
  title: string;
  title_en: string | null;
  author: string | null;
  source: string;
  item_type: string | null;
  original_url: string | null;
  cover_url: string;
  cover_url_en: string | null;
  summary: string | null;
  summary_en: string | null;
  topics: string[];
  saved_at: string;
  original_published_at: string | null;
  updated_at: string;
}

const SUPABASE_URL = import.meta.env.BLOG_SUPABASE_URL;
const SUPABASE_KEY = import.meta.env.BLOG_SUPABASE_SERVICE_KEY;
const SELECT = [
  'id',
  'slug',
  'title',
  'title_en',
  'author',
  'source',
  'item_type',
  'original_url',
  'cover_url',
  'cover_url_en',
  'summary',
  'summary_en',
  'topics',
  'saved_at',
  'original_published_at',
  'updated_at',
].join(',');

export async function fetchReadingItems(limit = 1000): Promise<ReadingItem[]> {
  if (!SUPABASE_URL || !SUPABASE_KEY) {
    console.warn('[reading] Supabase env not set, returning an empty list');
    return [];
  }

  const params = new URLSearchParams({
    select: SELECT,
    is_visible: 'eq.true',
    order: 'saved_at.desc,id.desc',
    limit: String(Math.min(1000, Math.max(1, limit))),
  });

  try {
    const response = await fetch(`${SUPABASE_URL}/rest/v1/reading_items?${params}`, {
      headers: {
        apikey: SUPABASE_KEY,
        Authorization: `Bearer ${SUPABASE_KEY}`,
      },
    });
    if (!response.ok) {
      console.error('[reading] Supabase fetch failed:', response.status, await response.text());
      return [];
    }
    return await response.json();
  } catch (error) {
    console.error('[reading] Supabase fetch threw:', error);
    return [];
  }
}

export interface ReadingStats {
  total: number;
  sources: [string, number][];
  savedAt: string[];
}

/** Every visible item's source + saved time, for counts (total, per source,
 *  per period). One light request instead of the full rows. */
export async function fetchReadingStats(): Promise<ReadingStats> {
  const empty: ReadingStats = { total: 0, sources: [], savedAt: [] };
  if (!SUPABASE_URL || !SUPABASE_KEY) return empty;
  const params = new URLSearchParams({ select: 'source,saved_at', is_visible: 'eq.true', limit: '10000' });
  try {
    const response = await fetch(`${SUPABASE_URL}/rest/v1/reading_items?${params}`, {
      headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` },
    });
    if (!response.ok) {
      console.error('[reading] Supabase stats fetch failed:', response.status, await response.text());
      return empty;
    }
    const rows: { source: string; saved_at: string }[] = await response.json();
    const counts = new Map<string, number>();
    for (const row of rows) counts.set(row.source, (counts.get(row.source) ?? 0) + 1);
    return {
      total: rows.length,
      sources: [...counts.entries()].sort((a, b) => b[1] - a[1]),
      savedAt: rows.map((row) => row.saved_at),
    };
  } catch (error) {
    console.error('[reading] Supabase stats fetch threw:', error);
    return empty;
  }
}

export function readingDate(value: string, locale = 'zh-CN') {
  return new Date(value).toLocaleDateString(locale, {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    timeZone: 'Asia/Shanghai',
  });
}

export function readingMonth(value: string) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    year: 'numeric',
    month: '2-digit',
    timeZone: 'Asia/Shanghai',
  }).formatToParts(new Date(value));
  const year = parts.find((part) => part.type === 'year')?.value;
  const month = parts.find((part) => part.type === 'month')?.value;
  return `${year}-${month}`;
}

export function localizeReadingItem(item: ReadingItem, lang: 'zh' | 'en'): ReadingItem {
  if (lang === 'zh') return item;
  return {
    ...item,
    title: item.title_en || item.title,
    summary: item.summary_en || item.summary,
    cover_url: item.cover_url_en || item.cover_url,
  };
}

const SOURCE_EN: Record<string, string> = {
  微信公众号: 'WeChat',
  小红书: 'Xiaohongshu',
  飞书: 'Feishu',
};

const TYPE_EN: Record<string, string> = {
  文本: 'Text',
  链接: 'Link',
  图片: 'Image',
  视频: 'Video',
  语音: 'Audio',
  文件: 'File',
  混合: 'Mixed',
  'X 帖子': 'X post',
  'GitHub 仓库': 'GitHub repository',
  网页: 'Web page',
};

export function readingSourceLabel(source: string, lang: 'zh' | 'en') {
  return lang === 'en' ? SOURCE_EN[source] || source : source;
}

export function readingTypeLabel(type: string | null, lang: 'zh' | 'en') {
  if (!type) return '';
  return lang === 'en' ? TYPE_EN[type] || type : type;
}
