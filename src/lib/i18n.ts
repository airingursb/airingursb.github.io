export type Lang = 'zh' | 'en';

// ============================================================
// Site-wide namespaced strings (new — used by all non-blog modules)
// ============================================================

export const siteStrings = {
  zh: {
    common: {
      home: 'Home',
      blog: 'Blog',
      archive: 'Archive',
      moments: 'Moment',
      notes: 'Notes',
      friends: 'Friends',
      search: 'Search',
      admin: 'Admin',
      rss: 'RSS',
      brand: "Airing's Blog",
      copyright: '© 2026 Airing',
    },
    notes: {
      siteTitle: '思考的痕迹',
      siteDesc: '记录关于前端、数学、设计、哲学和一切让我好奇的事物',
      countSuffix: '篇笔记',
      allTag: '全部',
      searchPlaceholder: '搜索笔记标题或摘要…',
      emptyState: '没有找到匹配的笔记',
      backToList: '← 全部笔记',
      toc: '目录',
      tagsLabel: '标签',
      relatedNotes: '相关笔记',
      readingTime: (n: number) => `约 ${n} 分钟`,
      weekTooltip: (m: number, d: number, count?: number) =>
        `${m}/${d} 周` + (count ? ` (${count} 篇)` : ''),
      feedTitle: "Airing's Notes",
      feedDesc: '思考的痕迹：记录关于前端、数学、设计、哲学和一切让我好奇的事物。',
      feedLang: 'zh-cn',
    },
    archive: {
      title: 'Archive',
      desc: (n: number) => `全部 ${n} 篇文章，按年份排序。`,
      dateLocale: 'zh-CN',
    },
    search: {
      title: 'Search',
      desc: '全文搜索所有文章。',
    },
    tags: {
      title: (tag: string) => `#${tag}`,
      desc: (n: number) => `该标签下共 ${n} 篇文章。`,
      backToBlog: '← 返回博客',
    },
    friends: {
      title: 'Friends',
      desc: '朋友们的博客，以及留言板。',
      lastChecked: (d: string) => `上次检测：${d}`,
      guestbook: '留言板',
    },
    moments: {
      title: 'Moments',
      desc: '碎片想法、日常记录。',
      dateLocale: 'zh-CN',
    },
    admin: {
      title: 'Admin',
      desc: '管理入口。',
    },
  },
  en: {
    common: {
      home: 'Home',
      blog: 'Blog',
      archive: 'Archive',
      moments: 'Moment',
      notes: 'Notes',
      friends: 'Friends',
      search: 'Search',
      admin: 'Admin',
      rss: 'RSS',
      brand: "Airing's Blog",
      copyright: '© 2026 Airing',
    },
    notes: {
      siteTitle: 'Traces of Thought',
      siteDesc: 'Notes on frontend, math, design, philosophy, and everything that sparks my curiosity.',
      countSuffix: 'notes',
      allTag: 'All',
      searchPlaceholder: 'Search notes by title or summary…',
      emptyState: 'No notes match your filter',
      backToList: '← All Notes',
      toc: 'Contents',
      tagsLabel: 'Tags',
      relatedNotes: 'Related',
      readingTime: (n: number) => `${n} min read`,
      weekTooltip: (m: number, d: number, count?: number) =>
        `Week of ${m}/${d}` + (count ? ` (${count})` : ''),
      feedTitle: "Airing's Notes",
      feedDesc: 'Notes on frontend, math, design, philosophy, and everything that sparks my curiosity.',
      feedLang: 'en',
    },
    archive: {
      title: 'Archive',
      desc: (n: number) => `All ${n} posts, sorted by year.`,
      dateLocale: 'en-US',
    },
    search: {
      title: 'Search',
      desc: 'Full-text search across all posts.',
    },
    tags: {
      title: (tag: string) => `#${tag}`,
      desc: (n: number) => `${n} posts tagged.`,
      backToBlog: '← Back to Blog',
    },
    friends: {
      title: 'Friends',
      desc: "Friends' blogs and guestbook.",
      lastChecked: (d: string) => `Last checked: ${d}`,
      guestbook: 'Guestbook',
    },
    moments: {
      title: 'Moments',
      desc: 'Fragments of thought and daily notes.',
      dateLocale: 'en-US',
    },
    admin: {
      title: 'Admin',
      desc: 'Admin panel.',
    },
  },
} as const;

export function tSite(lang: Lang) {
  return siteStrings[lang];
}

// ============================================================
// Blog strings (existing — backward compat for blog module only)
// ============================================================

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

export function t(lang: Lang) {
  return blogStrings[lang];
}

// ============================================================
// Post slug helpers (existing)
// ============================================================

/**
 * Build a Set of post IDs that have English translations.
 * English posts live in src/content/posts/en/, so their IDs match
 * the Chinese post IDs directly.
 */
export function buildTranslationMap(enPostIds: string[]): Set<string> {
  return new Set(enPostIds.map(id => enPostSlug(id)));
}

/**
 * Get the slug for linking. English post ID is already the correct slug.
 */
export function enPostSlug(enPostId: string): string {
  return enPostId;
}
