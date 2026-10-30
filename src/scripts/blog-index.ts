// Reads the post index rendered by src/components/blog/BlogIndex.astro.
import type { ArchivePost, BlogLang } from '../lib/blog-archive';

export interface BlogIndex { lang: BlogLang; posts: ArchivePost[] }

let cache: BlogIndex | null = null;
export function readBlogIndex(): BlogIndex | null {
  if (cache) return cache;
  const el = document.getElementById('blog-index');
  if (!el) return null;
  try { cache = JSON.parse(el.textContent || '') as BlogIndex; } catch { return null; }
  return cache;
}

/** Shrink a text cover's phrase until it fits its box: never clipped, never "…". */
export function fitText(root: ParentNode = document) {
  root.querySelectorAll<HTMLElement>('[data-fit]').forEach((el) => {
    if (!el.getClientRects().length) return;
    const box = el.parentElement!;
    let size = parseFloat(getComputedStyle(el).getPropertyValue('--fit-max')) || 18;
    el.style.fontSize = size + 'px';
    const over = () => {
      const r = document.createRange();
      r.selectNodeContents(el);
      return r.getBoundingClientRect().height > el.clientHeight + 1 || el.scrollWidth > el.clientWidth + 1 || box.scrollHeight > box.clientHeight + 1;
    };
    let guard = 40;
    while (guard-- > 0 && size > 7 && over()) { size -= 1; el.style.fontSize = size + 'px'; }
    el.dataset.fitted = '1';
  });
  // The kicker line stays on one line: shrink it rather than clip it.
  root.querySelectorAll<HTMLElement>('.tc-k').forEach((k) => {
    if (!k.getClientRects().length) return;
    k.style.fontSize = '';
    let size = parseFloat(getComputedStyle(k).fontSize);
    let guard = 12;
    while (guard-- > 0 && size > 5 && k.scrollWidth > k.clientWidth + 1) { size -= 0.5; k.style.fontSize = size + 'px'; }
  });
}

export function pickRandom<T extends { slug: string }>(list: T[], prev?: string): T {
  let p: T;
  do { p = list[Math.floor(Math.random() * list.length)]; } while (prev && p.slug === prev && list.length > 1);
  return p;
}
