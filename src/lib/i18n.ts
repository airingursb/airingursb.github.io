export const blogStrings = {
  zh: {
    motto: '应无所住而生其心',
    posts_count: (n: number) => `${n} 篇文章`,
    popular: '热门文章',
    latest: '最新文章',
    read_more: '阅读更多',
    min_read: (n: number) => `${n} 分钟阅读`,
    series_names: { weekly: '月刊', annually: '年报' } as Record<string, string>,
    cn_only_badge: '',
    related_posts: '相关文章',
    prev_post: '上一篇',
    next_post: '下一篇',
  },
  en: {
    motto: 'Act without attachment',
    posts_count: (n: number) => `${n} posts`,
    popular: 'Popular',
    latest: 'Latest',
    read_more: 'Read more',
    min_read: (n: number) => `${n} min read`,
    series_names: { weekly: 'Weekly', annually: 'Annual' } as Record<string, string>,
    cn_only_badge: 'CN',
    related_posts: 'Related Posts',
    prev_post: 'Previous',
    next_post: 'Next',
  },
} as const;

export type Lang = 'zh' | 'en';

export function t(lang: Lang) {
  return blogStrings[lang];
}

/**
 * Build a map of Chinese post IDs that have English translations.
 * English posts now live in src/content/posts/en/, so their IDs match
 * the Chinese post IDs directly (e.g., "weekly-4").
 */
export function buildTranslationMap(enPostIds: string[]): Set<string> {
  return new Set(enPostIds.map(id => enPostSlug(id)));
}

/**
 * Get the slug for linking. With English posts in their own directory,
 * the ID is already the correct slug (e.g., "weekly-4").
 */
export function enPostSlug(enPostId: string): string {
  return enPostId;
}
