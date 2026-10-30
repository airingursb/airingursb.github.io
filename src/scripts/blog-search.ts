// Blog ⌘K search, in the shared terminal window (src/scripts/term-window.ts):
// `airing@ursb.me:~/blog/2025$ grep -i ▍` over every post's title, tags, year
// and summary. `tag:技术` / `#tech` filters by tag, a year filters by year,
// `shuf` picks one at random; ↵ opens the post. The bottom prompt's path
// follows the year you are reading.
//
// Views and likes in the preview use the same endpoints as the post page
// (/api/posts/:slug/views and /likes), fetched only for the selected row and
// cached; the list-wide /api/posts/ranking counts are not used here.
import {
  TAG_ALIASES, TAG_LABEL, archiveStats, dateEn, esc, fmtInt, haystack, highlight, parseQuery, searchPosts, thumbHTML,
  type ArchivePost,
} from '../lib/blog-archive';
import { createTermWindow, isMac, type TermWindow } from './term-window';
import { fitText, pickRandom, readBlogIndex } from './blog-index';

const API = 'https://chat.ursb.me/api/posts/';

function init() {
  const D = readBlogIndex();
  const entry = document.querySelector<HTMLAnchorElement>('[data-blog-search]');
  if (!D || !entry) return;
  const en = D.lang === 'en';
  const P = D.posts;
  const L = TAG_LABEL[D.lang];
  const H = new Map(P.map((p) => [p.slug, haystack(p)]));
  const hay = (p: ArchivePost) => H.get(p.slug)!;
  const stats = archiveStats(P);
  const words = (n: number) => (en ? `${fmtInt(n)} words` : `${fmtInt(n)} 字`);
  entry.querySelectorAll('[data-mod]').forEach((k) => (k.textContent = isMac ? '⌘' : 'Ctrl'));

  // `tag:` chips use the page language's label; Tab completes them.
  const TAG_CHIPS = ['tech', 'essays', 'annually', 'weekly'].map((t) => ({ q: `tag:${L[t]}`, n: stats.tagCounts[t] || 0 }));
  const CHIPS = [...TAG_CHIPS, { q: String(stats.busiest.year), n: stats.busiest.count }];

  // ── where am I reading? (the prompt's path) ──
  function readingPath() {
    const line = innerHeight * 0.35;
    let best: { t: number; y: string } | null = null;
    document.querySelectorAll<HTMLElement>('.article-list [data-year]').forEach((el) => {
      if (!el.offsetParent) return;
      const t = el.getBoundingClientRect().top;
      if (t <= line && (!best || t > best.t)) best = { t, y: el.dataset.year! };
    });
    return best ? `~/blog/${(best as { y: string }).y}` : '~/blog';
  }

  // ── stats for the preview, on demand, cached ──
  type Stat = { pv: number; likes: number };
  const statCache = new Map<string, Stat | 'pending' | 'error'>();
  try {
    const raw = sessionStorage.getItem('blog-search-stats');
    if (raw) Object.entries(JSON.parse(raw) as Record<string, Stat>).forEach(([k, v]) => statCache.set(k, v));
  } catch { /* storage unavailable */ }
  function saveStats() {
    try {
      const o: Record<string, Stat> = {};
      statCache.forEach((v, k) => { if (typeof v === 'object') o[k] = v; });
      sessionStorage.setItem('blog-search-stats', JSON.stringify(o));
    } catch { /* ignore */ }
  }
  let statTimer = 0;
  function wantStats(slug: string) {
    clearTimeout(statTimer);
    if (statCache.has(slug)) return;
    statTimer = window.setTimeout(() => {
      statCache.set(slug, 'pending');
      const get = (path: string) => fetch(API + encodeURIComponent(slug) + path).then((r) => (r.ok ? r.json() : Promise.reject(r.status)));
      Promise.all([get('/views'), get('/likes')])
        .then(([v, l]) => { statCache.set(slug, { pv: +v.pv || 0, likes: +l.count || 0 }); saveStats(); })
        .catch(() => statCache.set(slug, 'error'))
        .finally(() => { const p = rows[tw.sel]; if (p && p.slug === slug) preview(tw); });
    }, 220);
  }
  const statLine = (slug: string) => {
    const s = statCache.get(slug);
    if (!s || typeof s !== 'object') return '';
    const parts: string[] = [];
    if (s.pv) parts.push(en ? `${fmtInt(s.pv)} views` : `${fmtInt(s.pv)} 次阅读`);
    if (s.likes) parts.push(en ? `${fmtInt(s.likes)} likes` : `${fmtInt(s.likes)} 赞`);
    return parts.length ? ' · ' + parts.join(' · ') : '';
  };

  let rows: ArchivePost[] = [];
  let shufPick: ArchivePost | null = null;

  function build(w: TermWindow) {
    const q = w.input.value;
    const pq = parseQuery(q);
    let res: ArchivePost[];
    if (pq.shuf) { shufPick = pickRandom(P, shufPick?.slug); res = [shufPick]; }
    else res = searchPosts(P, q, hay);
    let h = '';
    let lastY = 0;
    rows = [];
    res.forEach((p) => {
      if (p.year !== lastY) {
        const cnt = res.filter((x) => x.year === p.year).length;
        h += `<div class="tw-row dir" aria-hidden="true"><span class="m">drwxr-xr-x</span><span class="nm">${p.year}/</span><span class="cm"># ${en ? `${cnt} ${cnt === 1 ? 'post' : 'posts'}` : `${cnt} 篇`}</span></div>`;
        lastY = p.year;
      }
      rows.push(p);
      const descHit = pq.terms.some((t) => p.desc.toLowerCase().includes(t) && !p.title.toLowerCase().includes(t));
      h += `<button type="button" class="tw-row file" role="option" data-i="${rows.length - 1}"><span class="m">${p.date.slice(5)}</span>` +
        `<span class="nm">${highlight(p.title, q)}</span><span class="fx">${p.tag}.md</span><span class="r">${words(p.words)}</span>` +
        (descHit ? `<span class="sn"># ${highlight(p.desc, q)}</span>` : '') + '</button>';
    });
    w.list.innerHTML = h || `<div class="tw-empty">grep: ${esc(q)}: ${en ? 'no matching posts · try' : '没有匹配的文章 · 试试'} <b>${esc(TAG_CHIPS[0].q)}</b> ${en ? 'or a year' : '或年份'}</div>`;
    w.setCount(en ? `${rows.length} / ${P.length} posts` : `${rows.length} / ${P.length} 篇`);
    return rows.length;
  }

  function preview(w: TermWindow) {
    const pv = w.win.querySelector<HTMLElement>('.bs-pv');
    if (!pv) return;
    const p = rows[w.sel];
    if (!p) { pv.innerHTML = ''; return; }
    pv.innerHTML = thumbHTML(p, 'bs-pvth') + `<div class="bs-pvb"><div class="bs-pvt">${esc(p.title)}</div>` +
      `<div class="bs-pvd">${highlight(p.desc || (en ? '(no summary)' : '（这篇没有摘要）'), w.input.value)}</div>` +
      `<div class="bs-pvm">${dateEn(p)} · ${esc(L[p.tag])} · ${words(p.words)}${statLine(p.slug)}</div></div>`;
    fitText(pv);
    wantStats(p.slug);
  }

  const tw = createTermWindow({
    name: 'bs',
    wide: true,
    focusOnTouch: true,
    titles: () => ['airing@ursb.me — ls -la ~/blog | grep — 96×28', 'airing@ursb.me — ls ~/blog | grep', 'ls ~/blog | grep'],
    ariaLabel: () => (en ? 'Search posts' : '搜索文章'),
    promptAria: () => (en ? 'Search all posts (⌘K)' : '搜索全部文章（⌘K）'),
    placeholder: () => (en ? 'render / flutter / tag:essays / 2019 / shuf' : '渲染 / flutter / tag:随笔 / 2019 / shuf'),
    cmd: () => 'grep -i',
    path: readingPath,
    above: () => `<div class="bs-hints">${CHIPS.map((c) => `<button type="button" data-q="${esc(c.q)} ">${esc(c.q)} <span>${c.n}</span></button>`).join('')}` +
      `<button type="button" data-q="shuf">shuf <span>↻</span></button></div>`,
    below: () => '<div class="bs-pv" aria-live="polite"></div>',
    footer: () => `<span><b>↑↓</b> ${en ? 'select' : '选择'}</span><span><b>↵</b> ${en ? 'open' : '打开'}</span>` +
      `<span><b>tab</b> ${en ? 'complete tag' : '补全标签'}</span><span class="k"><b>esc</b> ${en ? 'close' : '关闭'}</span>`,
    build,
    go: (i) => { const p = rows[i]; if (p) location.href = p.href; },
    onSelect: (_i, w) => preview(w),
    onKey: (e, w) => {
      if (e.key !== 'Tab' || e.shiftKey) return false;
      const last = w.input.value.split(/\s+/).pop() || '';
      if (!last) return false; // nothing to complete: Tab moves focus as usual
      // `tag:te` / `te` / `tag:技` → the tag's chip label (aliases in either language count)
      const part = last.replace(/^(?:tag:|#)/, '').toLowerCase();
      const t = ['tech', 'essays', 'annually', 'weekly'].find((k) => [L[k], ...TAG_ALIASES[k]].some((a) => a.toLowerCase().startsWith(part)));
      const hit = t ? `tag:${L[t]}` : '';
      if (!hit) return false;
      e.preventDefault();
      w.input.value = w.input.value.replace(/\S*$/, hit + ' ');
      w.sel = 0;
      w.refresh();
      w.paint(true);
      return true;
    },
    onRender: (w) => {
      w.win.querySelectorAll<HTMLButtonElement>('.bs-hints button').forEach((b) => b.addEventListener('click', () => {
        w.input.value = b.dataset.q!;
        w.sel = 0;
        w.refresh();
        w.paint(true);
        w.input.focus({ preventScroll: true });
      }));
    },
  });

  // Entry, sidebar magnifier: open the window instead of /search.
  document.addEventListener('click', (e) => {
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    const a = (e.target as Element).closest?.('a[href="/search"], a[href="/search/"], a[href="/en/search"], a[href="/en/search/"]');
    if (!a) return;
    e.preventDefault();
    tw.open();
  }, true);

  // Bottom prompt: shows once the hero is behind you; path follows the year.
  let raf = 0;
  const sync = () => {
    raf = 0;
    tw.showPrompt(scrollY > 520);
    tw.setPath(readingPath());
  };
  addEventListener('scroll', () => { if (!raf) raf = requestAnimationFrame(sync); }, { passive: true });
  document.querySelectorAll('.bt-dir').forEach((d) => d.addEventListener('toggle', () => { if (!raf) raf = requestAnimationFrame(sync); }));
  sync();
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
else init();
