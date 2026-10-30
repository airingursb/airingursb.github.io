// Article page: minutes per section and "time left", shared by the desktop
// sidebar TOC (src/scripts/post-reading.ts) and the mobile contents sheet
// (MobileToc). Words are counted like the /blog list (blog-archive countWords:
// CJK characters + Latin words, no code blocks / images / link targets) and
// converted at the site's reading speed (post-meta readingMinutes). The
// article's own reading time is then split across sections by those weights,
// so the sections always add up to the minutes shown in the sidebar.
//
// The pure half (allocateMinutes, sectionWeight) is unit-tested; the DOM half
// only runs in the browser.

import { textCounts } from './blog-archive.ts';
import { CJK_PER_MIN, WORDS_PER_MIN } from './post-meta.ts';

export interface Counts { cjk: number; latin: number }

/** Reading weight of a section, in raw minutes at the site's speed. */
export function sectionWeight(c: Counts): number {
  return (c.cjk || 0) / CJK_PER_MIN + (c.latin || 0) / WORDS_PER_MIN;
}

/**
 * Split `total` minutes across sections by weight.
 * - `share`: exact fractions (sum === total), for "time left";
 * - `whole`: integers by largest remainder (sum === total), for the labels.
 * All-zero weights split evenly.
 */
export function allocateMinutes(weights: number[], total: number): { share: number[]; whole: number[] } {
  const n = weights.length;
  if (!n) return { share: [], whole: [] };
  const t = Math.max(0, Math.round(Number(total) || 0));
  const w = weights.map((x) => (Number.isFinite(x) && x > 0 ? x : 0));
  const sum = w.reduce((a, b) => a + b, 0);
  const share = sum > 0 ? w.map((x) => (x / sum) * t) : w.map(() => t / n);
  const whole = share.map(Math.floor);
  let rest = t - whole.reduce((a, b) => a + b, 0);
  const order = share.map((s, i) => [s - Math.floor(s), i] as const).sort((a, b) => b[0] - a[0] || a[1] - b[1]);
  for (let k = 0; rest > 0 && k < order.length; k++, rest--) whole[order[k][1]]++;
  return { share, whole };
}

/** Label for a whole-minute count: 0 reads as "<1". */
export const minuteLabel = (m: number) => (m > 0 ? String(m) : '<1');

// ───────────────────────── DOM (browser only) ─────────────────────────

/** Not prose: code, scripts, UI chrome, the closing date stamp. */
const SKIP = 'pre, script, style, svg, noscript, template, textarea, button, figcaption, .code-bar, .article-coda, .article-reading-dock';

/**
 * Counts per heading, one pass over the article's text nodes. Text before the
 * first heading (the lede) is folded into the first section, so the TOC rows
 * account for the whole article.
 */
export function countSections(content: HTMLElement, headings: HTMLElement[]): Counts[] {
  const idx = new Map(headings.map((h, i) => [h as Node, i]));
  const out: Counts[] = headings.map(() => ({ cjk: 0, latin: 0 }));
  if (!out.length) return out;
  let cur = 0;
  const walker = document.createTreeWalker(content, NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT, {
    acceptNode(n) {
      if (n.nodeType === 1) {
        if (idx.has(n)) return NodeFilter.FILTER_ACCEPT;
        return (n as Element).matches(SKIP) ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_SKIP;
      }
      return NodeFilter.FILTER_ACCEPT;
    },
  });
  for (let n = walker.nextNode(); n; n = walker.nextNode()) {
    if (n.nodeType === 1) { cur = idx.get(n)!; continue; }
    const c = textCounts(n.nodeValue || '');
    out[cur].cjk += c.cjk;
    out[cur].latin += c.latin;
  }
  return out;
}

export interface SectionMinutes { share: number[]; whole: number[] }
const cache = new WeakMap<HTMLElement, { key: string; value: SectionMinutes }>();

/** Minutes per heading (cached per article + heading list). */
export function sectionMinutes(content: HTMLElement, headings: HTMLElement[], total: number): SectionMinutes {
  const key = headings.length + ':' + total;
  const hit = cache.get(content);
  if (hit && hit.key === key) return hit.value;
  const value = allocateMinutes(countSections(content, headings).map(sectionWeight), total);
  cache.set(content, { key, value });
  return value;
}

/**
 * Where the reader is. The reading line starts at 96px from the top (the TOC
 * highlight line) and slides to the bottom of the viewport as the article
 * progresses, so at the end every section counts as read.
 * Returns article progress p (0..1), per-heading read fraction f and minutes left.
 */
export function readingState(content: HTMLElement, headings: HTMLElement[], share: number[]): { p: number; f: number[]; left: number } {
  const r = content.getBoundingClientRect();
  const vh = window.innerHeight;
  const p = Math.min(1, Math.max(0, -r.top / Math.max(1, r.height - vh)));
  const line = 96 + p * (vh - 96);
  const coda = content.querySelector('.article-coda');
  const end = coda ? coda.getBoundingClientRect().top : r.bottom;
  const tops = headings.map((h) => h.getBoundingClientRect().top);
  let left = 0;
  const f = tops.map((t, i) => {
    // The first section also holds the lede, so it starts at the article top.
    const a = i === 0 ? Math.min(r.top, t) : t;
    const b = i + 1 < tops.length ? tops[i + 1] : end;
    const v = Math.min(1, Math.max(0, (line - a) / Math.max(1, b - a)));
    left += (1 - v) * (share[i] || 0);
    return v;
  });
  return { p, f, left };
}

/** Index of the heading the TOC highlights (last one whose top passed 96px), or -1. */
export function activeHeading(headings: HTMLElement[]): number {
  for (let i = headings.length - 1; i >= 0; i--) if (headings[i].getBoundingClientRect().top <= 96) return i;
  return -1;
}
