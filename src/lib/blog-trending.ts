// /blog "Most Popular" by window (scheme A): pure helpers shared by the
// browser script (src/scripts/blog-trending.ts) and the node tests.
// Data: GET {TRENDING_API_BASE}/api/posts/trending (blog-api, cached 1h).
// Until that answers with usable data the page keeps its build-time
// Most Popular untouched.

/**
 * The one place the API host lives. Local dev can point it at a local
 * blog-api / mock with PUBLIC_TRENDING_API_BASE=http://localhost:8790;
 * committed default is production.
 */
export const TRENDING_API_BASE: string =
  import.meta.env?.PUBLIC_TRENDING_API_BASE || 'https://chat.ursb.me';
export const TRENDING_PATH = '/api/posts/trending';
export const TRENDING_TIMEOUT_MS = 6000;
export const SHOWN = 4;

export type WindowKey = 'w' | 'm' | 'y' | 'a';
export const WINDOW_KEYS: WindowKey[] = ['w', 'm', 'y', 'a'];
export type Status = 'new' | 'up' | 'down' | 'same';

export interface TrendingEntry { slug: string; rank: number; reads: number; prevRank: number | null; delta: number | null; status: Status }
export interface TrendingWindow { churn: number; moved: number; entered: number; ranked?: number; top: TrendingEntry[] }
export interface TrendingStandby { slug: string; title?: string; pubDate: string; reads30d: number; views?: number; day?: string }
export interface TrendingPayload {
  generatedAt?: string;
  trackedSince?: string;
  defaultWindow: WindowKey;
  windows: Record<WindowKey, TrendingWindow>;
  standby?: TrendingStandby | null;
}
/** What the page knows about a post (subset of the #blog-index entries). */
export interface IndexPost { slug: string; href: string; title: string; cover: string; year: number; cn?: boolean }

export type Lang = 'zh' | 'en';

export const TEXT = {
  zh: {
    tabs: { w: '本周', m: '本月', y: '今年', a: '历年' } as Record<WindowKey, string>,
    tabTitle: { y: '阅读统计从 2026 年 3 月 29 日开始' } as Partial<Record<WindowKey, string>>,
    unit: { w: '近 7 天', m: '近 30 天', y: '今年', a: '累计' } as Record<WindowKey, string>,
    cmp: { w: '上周', m: '上月', y: '30 天前', a: '30 天前' } as Record<WindowKey, string>,
    auto: '自动',
    tablist: '统计窗口',
    reads: (unit: string, n: string) => `${unit} ${n} 次阅读`,
    prev: (cmp: string, r: number | null) => (r ? `${cmp}第 ${r}` : `${cmp}未上榜`),
    readsLine: (unit: string) => `${unit}阅读`,
    why: (entered: number, moved: number) =>
      [entered && `${entered} 篇新进`, moved && `${moved} 篇换位`].filter(Boolean).join('、') || '名次未变',
    status: { new: '新进', climb: '攀升', up: '上升', down: '回落', same: '平稳' },
    standbyKey: '候补 · 今日旧文',
    standbyMeta: (year: number, n: string) => `${year} · 近 30 天 ${n} 次阅读 · 每天换一篇`,
  },
  en: {
    tabs: { w: 'Week', m: 'Month', y: 'Year', a: 'All time' } as Record<WindowKey, string>,
    tabTitle: { y: 'Read counts start on Mar 29, 2026' } as Partial<Record<WindowKey, string>>,
    unit: { w: 'in 7 days', m: 'in 30 days', y: 'this year', a: 'all time' } as Record<WindowKey, string>,
    cmp: { w: 'last week', m: 'last month', y: '30 days ago', a: '30 days ago' } as Record<WindowKey, string>,
    auto: 'Auto',
    tablist: 'Time window',
    reads: (unit: string, n: string) => `${n} reads ${unit}`,
    prev: (cmp: string, r: number | null) => (r ? `#${r} ${cmp}` : `unranked ${cmp}`),
    readsLine: (unit: string) => `reads ${unit}`,
    why: (entered: number, moved: number) =>
      [entered && `${entered} new`, moved && `${moved} moved`].filter(Boolean).join(', ') || 'no change',
    status: { new: 'New', climb: 'Climbing', up: 'Up', down: 'Down', same: 'Steady' },
    standbyKey: 'Standby · old post of the day',
    standbyMeta: (year: number, n: string) => `${year} · ${n} reads in 30 days · a new one daily`,
  },
};

export const formatCount = (n: number) => Number(n || 0).toLocaleString('en-US');

/** ▲2 / ▼1 / NEW / – */
export function markOf(e: Pick<TrendingEntry, 'status' | 'delta'>): string {
  if (e.status === 'new') return 'NEW';
  if (e.delta && e.delta > 0) return `▲${e.delta}`;
  if (e.delta && e.delta < 0) return `▼${-e.delta}`;
  return '–';
}

/** [css class, label] — ▲3 or more reads as "climbing". */
export function statusOf(e: Pick<TrendingEntry, 'status' | 'delta'>, lang: Lang): [Status, string] {
  const s = TEXT[lang].status;
  if (e.status === 'new') return ['new', s.new];
  if (e.status === 'up') return ['up', (e.delta ?? 0) >= 3 ? s.climb : s.up];
  if (e.status === 'down') return ['down', s.down];
  return ['same', s.same];
}

/** "自动 · 近 30 天阅读 · 4 篇换位" (the 自动 part only on the auto window). */
export function headline(data: TrendingPayload, k: WindowKey, lang: Lang): { auto: boolean; text: string; why: string } {
  const t = TEXT[lang];
  const w = data.windows[k];
  return { auto: k === data.defaultWindow, text: t.readsLine(t.unit[k]), why: t.why(w.entered, w.moved) };
}

export interface CardModel {
  slug: string; href: string; title: string; cover: string; cn: boolean;
  rank: number; mark: string; statusClass: Status; statusLabel: string;
  reads: string; readsLabel: string;
  /** readsLabel split around the number, so the number alone can roll. */
  readsBefore: string; readsAfter: string;
  prevLabel: string;
}

/** The 4 cards for a window, joined with the page's own post titles/links/covers. */
export function cardsFor(data: TrendingPayload, k: WindowKey, posts: Map<string, IndexPost>, lang: Lang): CardModel[] {
  const t = TEXT[lang];
  return data.windows[k].top
    .filter((e) => posts.has(e.slug))
    .slice(0, SHOWN)
    .map((e) => {
      const p = posts.get(e.slug)!;
      const [statusClass, statusLabel] = statusOf(e, lang);
      const reads = formatCount(e.reads);
      const [readsBefore, readsAfter] = t.reads(t.unit[k], '\u0000').split('\u0000');
      return {
        slug: e.slug, href: p.href, title: p.title, cover: p.cover, cn: !!p.cn,
        rank: e.rank, mark: markOf(e), statusClass, statusLabel,
        reads, readsLabel: t.reads(t.unit[k], reads), readsBefore, readsAfter, prevLabel: t.prev(t.cmp[k], e.prevRank),
      };
    });
}

export function standbyFor(data: TrendingPayload, posts: Map<string, IndexPost>, lang: Lang) {
  const s = data.standby;
  const p = s && posts.get(s.slug);
  if (!s || !p) return null;
  return { href: p.href, title: p.title, cn: !!p.cn, key: TEXT[lang].standbyKey, meta: TEXT[lang].standbyMeta(p.year, formatCount(s.reads30d)) };
}

/**
 * Only switch away from the build-time Most Popular when the payload is
 * well-formed and every window can fill all 4 cards with posts this page
 * knows; windows that cannot are dropped, and if the default one is among
 * them we keep the fallback.
 */
export function usableWindows(data: unknown, posts: Map<string, IndexPost>): WindowKey[] {
  const d = data as TrendingPayload | null;
  if (!d || typeof d !== 'object' || !d.windows || typeof d.windows !== 'object') return [];
  const ok = WINDOW_KEYS.filter((k) => {
    const w = d.windows[k];
    return !!w && Array.isArray(w.top) && w.top.filter((e) => e && posts.has(e.slug) && Number.isFinite(e.reads)).length >= SHOWN;
  });
  return ok.includes(d.defaultWindow) ? ok : [];
}
