// Blog list page data, computed at build time from the posts collection:
// word counts, the month-by-month heat grid, the `tree ~/blog` year folders,
// the `wc -w` totals, and the compact index the ⌘K search and `shuf` read.
// Pure functions only (no astro:content import) so the browser bundle and the
// node tests can import it too.

export type BlogLang = 'zh' | 'en';

export interface ArchiveSource {
  id: string;
  body?: string;
  data: { title: string; date: Date; tags?: string[]; description?: string; cover?: string };
}

/** One post as the list page needs it (also the shape of the search index). */
export interface ArchivePost {
  slug: string;
  href: string;
  title: string;
  /** Chinese title (search also matches it on the English page). */
  zh: string;
  desc: string;
  date: string; // YYYY-MM-DD (UTC, like the post page)
  year: number;
  month: number; // 1-12
  tag: string; // tech | essays | annually | weekly
  words: number;
  cover: string;
  issue: number | null;
  /** True when the English page links to the Chinese original. */
  cn?: boolean;
}

export const TAGS = ['tech', 'essays', 'annually', 'weekly'] as const;
export const TAG_LABEL: Record<BlogLang, Record<string, string>> = {
  zh: { tech: '技术', essays: '随笔', annually: '年度', weekly: '月刊' },
  en: { tech: 'tech', essays: 'essays', annually: 'annual', weekly: 'monthly' },
};
/** Words `tag:` accepts for each tag, in both languages. */
export const TAG_ALIASES: Record<string, string[]> = {
  tech: ['tech', '技术'],
  essays: ['essays', 'essay', '随笔'],
  annually: ['annually', 'annual', 'yearly', '年度', '年终'],
  weekly: ['weekly', 'monthly', '月刊', '周刊'],
};

const CJK = /[㐀-鿿豈-﫿]/g;

/**
 * Words in a markdown body: CJK characters + Latin words, after removing fenced
 * code, images, link targets, HTML tags and bare URLs (same rule as the v9
 * design's extract script, so the numbers match the design).
 */
export function countWords(body: string): number {
  const text = String(body || '')
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/!\[[^\]]*\]\([^)]*\)/g, ' ')
    .replace(/\]\([^)]*\)/g, ']')
    .replace(/<[^>]+>/g, ' ')
    .replace(/https?:\/\/\S+/g, ' ');
  const { cjk, latin } = textCounts(text);
  return cjk + latin;
}

/**
 * CJK characters and Latin words in already-plain text (the counting half of
 * countWords). The article page counts its sections from the DOM with it.
 */
export function textCounts(text: string): { cjk: number; latin: number } {
  const t = String(text || '');
  const cjk = (t.match(CJK) || []).length;
  const latin = (t.replace(CJK, ' ').match(/[A-Za-z0-9][A-Za-z0-9'’\-.]*/g) || []).length;
  return { cjk, latin };
}

/** `月刊（第36期）：伊始` → 36; anything else → null. */
export function issueOf(title: string): number | null {
  const m = String(title).match(/^(?:月刊|周刊)（第(\d+)期）/);
  return m ? +m[1] : null;
}

const iso = (d: Date) => d.toISOString().slice(0, 10);

export function toArchivePosts(
  posts: ArchiveSource[],
  opts: { lang?: BlogLang; title?: (p: ArchiveSource) => string; desc?: (p: ArchiveSource) => string; href?: (p: ArchiveSource) => string; cn?: (p: ArchiveSource) => boolean } = {},
): ArchivePost[] {
  return posts
    .map((p) => {
      const d = p.data.date;
      const tag = (p.data.tags || []).find((t) => (TAGS as readonly string[]).includes(t)) || 'essays';
      const out: ArchivePost = {
        slug: p.id,
        href: opts.href ? opts.href(p) : `/posts/${p.id}/`,
        title: opts.title ? opts.title(p) : p.data.title,
        zh: p.data.title,
        desc: (opts.desc ? opts.desc(p) : p.data.description) || '',
        date: iso(d),
        year: d.getUTCFullYear(),
        month: d.getUTCMonth() + 1,
        tag,
        words: countWords(p.body || ''),
        cover: p.data.cover || '',
        issue: issueOf(p.data.title),
      };
      if (opts.cn && opts.cn(p)) out.cn = true;
      return out;
    })
    .sort((a, b) => b.date.localeCompare(a.date));
}

export interface YearFolder {
  year: number;
  posts: ArchivePost[];
  words: number;
  /** Posts per month, Jan..Dec. */
  months: number[];
}

export function yearFolders(posts: ArchivePost[]): YearFolder[] {
  const by = new Map<number, ArchivePost[]>();
  posts.forEach((p) => {
    if (!by.has(p.year)) by.set(p.year, []);
    by.get(p.year)!.push(p);
  });
  return [...by.keys()].sort((a, b) => b - a).map((year) => {
    const list = by.get(year)!;
    const months = new Array(12).fill(0);
    list.forEach((p) => months[p.month - 1]++);
    return { year, posts: list, words: list.reduce((a, p) => a + p.words, 0), months };
  });
}

export interface HeatCell { year: number; month: number; count: number; monthly: boolean; future: boolean; now: boolean }
export interface HeatRow { year: number; total: number; cells: HeatCell[] }

/** Rows from `to` down to `from`, 12 cells each. `now` decides future / current months. */
export function heatGrid(posts: ArchivePost[], from: number, now: Date): HeatRow[] {
  const to = now.getUTCFullYear();
  const curM = now.getUTCMonth() + 1;
  const key = (y: number, m: number) => y * 100 + m;
  const cnt = new Map<number, number>();
  const mon = new Set<number>();
  posts.forEach((p) => {
    const k = key(p.year, p.month);
    cnt.set(k, (cnt.get(k) || 0) + 1);
    if (p.issue) mon.add(k);
  });
  const rows: HeatRow[] = [];
  for (let y = Math.max(to, ...posts.map((p) => p.year)); y >= from; y--) {
    const cells: HeatCell[] = [];
    let total = 0;
    for (let m = 1; m <= 12; m++) {
      const c = cnt.get(key(y, m)) || 0;
      total += c;
      cells.push({ year: y, month: m, count: c, monthly: mon.has(key(y, m)), future: y > to || (y === to && m > curM), now: y === to && m === curM });
    }
    rows.push({ year: y, total, cells });
  }
  return rows;
}

export const heatLevel = (c: number) => Math.min(4, c);

export interface ArchiveStats {
  posts: number;
  words: number;
  avg: number;
  issues: number;
  busiest: { year: number; count: number };
  longest: ArchivePost;
  tagCounts: Record<string, number>;
}

export function archiveStats(posts: ArchivePost[]): ArchiveStats {
  const words = posts.reduce((a, p) => a + p.words, 0);
  const perYear = new Map<number, number>();
  posts.forEach((p) => perYear.set(p.year, (perYear.get(p.year) || 0) + 1));
  let busiest = { year: 0, count: 0 };
  perYear.forEach((count, year) => {
    if (count > busiest.count || (count === busiest.count && year > busiest.year)) busiest = { year, count };
  });
  const tagCounts: Record<string, number> = {};
  posts.forEach((p) => (tagCounts[p.tag] = (tagCounts[p.tag] || 0) + 1));
  return {
    posts: posts.length,
    words,
    avg: posts.length ? Math.round(words / posts.length) : 0,
    issues: posts.filter((p) => p.issue).length,
    busiest,
    longest: posts.reduce((a, p) => (p.words > a.words ? p : a), posts[0]),
    tagCounts,
  };
}

// ── formatting ──
export const fmtInt = (n: number) => Number(n || 0).toLocaleString('en-US');
const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
export const dateEn = (p: Pick<ArchivePost, 'date'>) => {
  const [y, m, d] = p.date.split('-');
  return `${MON[+m - 1]} ${+d}, ${y}`;
};
export function fmtWords(n: number, lang: BlogLang): string {
  if (lang === 'en') return n >= 10000 ? `${(n / 1000).toFixed(0)}k words` : `${fmtInt(n)} words`;
  return n >= 10000 ? `${(n / 10000).toFixed(1).replace(/\.0$/, '')} 万字` : `${fmtInt(n)} 字`;
}

const escMap: Record<string, string> = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' };
export const esc = (s: unknown) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => escMap[c]);

// ── text covers for posts without artwork ──
// The tag picks the pattern (tech = blueprint grid, weekly = newsprint,
// annually = tree rings, essays = manuscript grid); the phrase is short enough
// to be fitted, never truncated.
export function coverPhrase(p: Pick<ArchivePost, 'zh' | 'title' | 'tag' | 'year' | 'issue'>): { kicker: string; big: string; sub?: string } {
  // English page with a translated title: English kicker, English phrase.
  if (p.title && p.title !== p.zh) {
    const kind = TAG_LABEL.en[p.tag];
    // A cover phrase, not the title (the title sits right next to it): the head
    // before `:` / `—` / `(`, cut to whole words that fit a thumbnail.
    const short = (text: string) => {
      const head = text.split(/\s*[:：—–(]\s*/)[0] || text;
      let out = '';
      for (const w of head.split(/\s+/)) { if (out && (out + ' ' + w).length > 22) break; out = out ? out + ' ' + w : w; }
      return { out, whole: out === head };
    };
    const m = p.title.match(/^(.+?)\s*[:：]\s*(.+)$/);
    if (p.issue) return { kicker: `${kind} · No.${p.issue}`, big: short(m ? m[2] : p.title).out };
    if (p.tag === 'annually') {
      const y = p.title.match(/^(\d{4})[,:：]\s*(.+)$/);
      if (y) return { kicker: `${kind} · ${y[1]}`, big: short(y[2]).out };
    }
    const h = short(p.title);
    const sub = m && h.whole && m[2].length <= 24 ? m[2] : undefined;
    return { kicker: `${kind} · ${p.year}`, big: h.out, sub };
  }
  const t = p.zh;
  if (p.issue) {
    const m = t.match(/^(月刊|周刊)（第(\d+)期）[：:]\s*(.*)$/);
    if (m) return { kicker: `${m[1]} · No.${m[2]}`, big: m[3] || m[1] };
  }
  if (p.tag === 'annually') {
    const m = t.match(/^(\d{4})[，,]\s*(.+)$/);
    if (m) return { kicker: `年度 · ${m[1]}`, big: m[2] };
    return { kicker: `年度 · ${p.year}`, big: t };
  }
  if (p.tag === 'tech') {
    const parts = t.split(/\s*[|｜]\s*/);
    if (parts.length > 1) return { kicker: parts[0], big: parts[1].replace(/\s*的.*$/, '') };
    const lat = t.match(/[A-Za-z][A-Za-z0-9.+#]*(?:\s+[A-Za-z][A-Za-z0-9.+#]*)*/);
    if (lat && lat[0].length >= 3) {
      const rest = t.replace(lat[0], '').replace(/^[\s：:—\-]+/, '').split(/[：:—]/)[0].trim();
      return { kicker: `技术 · ${p.year}`, big: lat[0], sub: rest || undefined };
    }
    return { kicker: `技术 · ${p.year}`, big: t.split(/[：:—]/)[0] };
  }
  return { kicker: `随笔 · ${p.year}`, big: t.replace(/^[「『“"]|[」』”"]$/g, '').split(/[：:—]/)[0] };
}

export function textCoverHTML(p: ArchivePost, cls = ''): string {
  const c = coverPhrase(p);
  return `<span class="tc tc--${p.tag}${cls ? ' ' + cls : ''}" aria-hidden="true"><span class="tc-k">${esc(c.kicker)}</span>` +
    `<span class="tc-b" data-fit>${esc(c.big)}${c.sub ? `<small>${esc(c.sub)}</small>` : ''}</span></span>`;
}

/** Cover image if the post has one, otherwise a text cover. */
export function thumbHTML(p: ArchivePost, cls = '', attrs = ''): string {
  if (p.cover) return `<span class="tc-img ${cls}" ${attrs} style="background-image:url(&quot;${esc(p.cover)}&quot;)" aria-hidden="true"></span>`;
  return textCoverHTML(p, cls);
}

// ── search ──
export interface Query { terms: string[]; tags: string[]; years: number[]; shuf: boolean }

export function parseQuery(q: string): Query {
  const out: Query = { terms: [], tags: [], years: [], shuf: false };
  const words = String(q || '').trim().toLowerCase().split(/\s+/).filter(Boolean);
  if (words.length === 1 && /^(shuf|random|随机)$/.test(words[0])) { out.shuf = true; return out; }
  words.forEach((w) => {
    const m = w.match(/^(?:tag:|#|--tag=)(.+)$/);
    if (m) {
      const k = Object.keys(TAG_ALIASES).find((t) => TAG_ALIASES[t].includes(m[1]));
      if (k) { out.tags.push(k); return; }
    }
    const y = w.match(/^(?:--year=)?((?:19|20)\d\d)$/);
    if (y) { out.years.push(+y[1]); return; }
    out.terms.push(w);
  });
  return out;
}

export const haystack = (p: ArchivePost) =>
  [p.title, p.zh, p.desc, p.year, p.slug, ...(TAG_ALIASES[p.tag] || [])].join(' ').toLowerCase();

export function searchPosts(posts: ArchivePost[], q: string, hay: (p: ArchivePost) => string = haystack): ArchivePost[] {
  const { terms, tags, years } = parseQuery(q);
  return posts.filter((p) =>
    (!tags.length || tags.includes(p.tag)) &&
    (!years.length || years.includes(p.year)) &&
    terms.every((t) => hay(p).includes(t)));
}

/** Escape + wrap each query term in <mark>. */
export function highlight(text: string, q: string): string {
  const { terms } = parseQuery(q);
  let out = esc(text);
  terms.filter(Boolean).sort((a, b) => b.length - a.length).forEach((t) => {
    const re = new RegExp('(' + esc(t).replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + ')', 'ig');
    out = out.replace(/(<[^>]+>)|([^<]+)/g, (_m, tag, txt) => tag || txt.replace(re, '<mark>$1</mark>'));
  });
  return out;
}
