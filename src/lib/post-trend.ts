// Article sidebar: one short line under "Views" picked from the windowed reads
// of GET /api/posts/trending (posts[slug].w / .m). Only says something when
// there is something to say — otherwise null and the line never renders.
// Pure (no DOM) so the node tests can import it; the browser glue lives in
// src/scripts/post-reading.ts.

import { formatCount, type Lang } from './blog-trending.ts';

export interface WindowStat { reads: number; rank: number | null; prevRank: number | null }
export interface PostTrendEntry { views?: number; w?: WindowStat; m?: WindowStat }
export interface TrendLine {
  /** Plain part of the line. */
  text: string;
  /** Accent part after it (▲15 / 新上榜), or null. */
  mark: string | null;
  /** Full numbers for the title tooltip. */
  tip: string;
  /** Which rule fired (tests / debugging). */
  rule: 'week-new' | 'week-climb' | 'read-again' | 'month-climb' | 'week-top' | 'month-top';
}

/** Ranked within the list the /blog leaderboard keeps (TOP_N in blog-api). */
export const TREND_TOP = 10;
/** Rank gain that counts as climbing. */
export const TREND_CLIMB = 3;
/** Previous rank missing or worse than this = newly entered (blog-api NEW_IF_PREV_ABOVE). */
export const TREND_NEW_ABOVE = 30;
/** Posts at least this old (years) that climb this month are "being read again". */
export const TREND_OLD_YEARS = 2;

const T = {
  zh: {
    week: (n: number) => `本周第 ${n}`,
    month: (n: number) => `本月第 ${n}`,
    fresh: '新上榜',
    again: '最近又有人在读',
    tipW: (r: string, rank: string, prev: string) => `近 7 天 ${r} 次阅读${rank}${prev}`,
    tipM: (r: string, rank: string, prev: string) => `近 30 天 ${r} 次阅读${rank}${prev}`,
    rankW: (n: number) => `，本周第 ${n}`,
    rankM: (n: number) => `，本月第 ${n}`,
    prevW: (n: number) => `（上周第 ${n}）`,
    prevM: (n: number) => `（上月第 ${n}）`,
    sep: ' · ',
    old: (y: number) => `${y} 年的文章 · `,
  },
  en: {
    week: (n: number) => `#${n} this week`,
    month: (n: number) => `#${n} this month`,
    fresh: 'new',
    again: 'Being read again',
    tipW: (r: string, rank: string, prev: string) => `${r} reads in 7 days${rank}${prev}`,
    tipM: (r: string, rank: string, prev: string) => `${r} reads in 30 days${rank}${prev}`,
    rankW: (n: number) => `, #${n} this week`,
    rankM: (n: number) => `, #${n} this month`,
    prevW: (n: number) => ` (#${n} last week)`,
    prevM: (n: number) => ` (#${n} last month)`,
    sep: ' · ',
    old: (y: number) => `Published ${y} · `,
  },
};

const num = (x: unknown): number | null => (typeof x === 'number' && Number.isFinite(x) ? x : null);
function stat(x: unknown): WindowStat | null {
  if (!x || typeof x !== 'object') return null;
  const o = x as Record<string, unknown>;
  const reads = num(o.reads);
  if (reads == null) return null;
  return { reads, rank: num(o.rank), prevRank: num(o.prevRank) };
}

/** posts[slug] from a trending payload, validated; null when absent / malformed. */
export function trendEntry(payload: unknown, slug: string): PostTrendEntry | null {
  const posts = payload && typeof payload === 'object' ? (payload as { posts?: unknown }).posts : null;
  if (!posts || typeof posts !== 'object') return null;
  const e = (posts as Record<string, unknown>)[slug];
  if (!e || typeof e !== 'object') return null;
  const w = stat((e as Record<string, unknown>).w);
  const m = stat((e as Record<string, unknown>).m);
  if (!w && !m) return null;
  return { w: w ?? undefined, m: m ?? undefined };
}

/**
 * The one line, in priority order:
 *   1. this week's top 10, newly entered           → 本周第 6 · 新上榜
 *   2. this week's top 10, up ≥ 3                    → 本周第 6 ▲15
 *   3. ≥ 2 years old, this month's top 10 and rising → 最近又有人在读
 *   4. this month's top 10, up ≥ 3                   → 本月第 4 ▲11
 *   5. this week's top 10                            → 本周第 2
 *   6. this month's top 10                           → 本月第 9
 * otherwise null.
 */
export function pickTrend(entry: PostTrendEntry | null, opts: { pubDate?: Date | string | null; now?: Date; lang?: Lang }): TrendLine | null {
  if (!entry) return null;
  const t = T[opts.lang === 'en' ? 'en' : 'zh'];
  const w = entry.w ?? { reads: 0, rank: null, prevRank: null };
  const m = entry.m ?? { reads: 0, rank: null, prevRank: null };
  const top = (x: WindowStat) => x.rank != null && x.rank >= 1 && x.rank <= TREND_TOP;
  const gain = (x: WindowStat) => (x.rank != null && x.prevRank != null ? x.prevRank - x.rank : 0);
  const fresh = (x: WindowStat) => x.prevRank == null || x.prevRank > TREND_NEW_ABOVE;
  const pub = opts.pubDate ? new Date(opts.pubDate) : null;
  const now = opts.now ?? new Date();
  const age = pub && !isNaN(+pub) ? (+now - +pub) / (365.25 * 864e5) : 0;

  const tip = [
    entry.w && t.tipW(formatCount(w.reads), w.rank ? t.rankW(w.rank) : '', w.prevRank ? t.prevW(w.prevRank) : ''),
    entry.m && t.tipM(formatCount(m.reads), m.rank ? t.rankM(m.rank) : '', m.prevRank ? t.prevM(m.prevRank) : ''),
  ].filter(Boolean).join(t.sep);

  if (top(w) && fresh(w)) return { text: t.week(w.rank!) + ' ·', mark: t.fresh, tip, rule: 'week-new' };
  if (top(w) && gain(w) >= TREND_CLIMB) return { text: t.week(w.rank!), mark: `▲${gain(w)}`, tip, rule: 'week-climb' };
  if (age >= TREND_OLD_YEARS && top(m) && (fresh(m) || gain(m) > 0)) return { text: t.again, mark: null, tip: t.old(pub!.getFullYear()) + tip, rule: 'read-again' };
  if (top(m) && gain(m) >= TREND_CLIMB) return { text: t.month(m.rank!), mark: `▲${gain(m)}`, tip, rule: 'month-climb' };
  if (top(w)) return { text: t.week(w.rank!), mark: null, tip, rule: 'week-top' };
  if (top(m)) return { text: t.month(m.rank!), mark: null, tip, rule: 'month-top' };
  return null;
}
