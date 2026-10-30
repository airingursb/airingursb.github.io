// Blog list page interactions: the sidebar writing archive (heat-map month
// lists, `shuf`), the `tree ~/blog` folders (expand all, fit text covers when a
// folder opens) and the sticky sidebar offset.
import { dateEn, esc, fmtInt, TAG_LABEL, thumbHTML, type ArchivePost } from '../lib/blog-archive';
import { fitText, pickRandom, readBlogIndex } from './blog-index';

const MON_EN = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

function initArchive() {
  const root = document.querySelector<HTMLElement>('[data-writing-archive]');
  const D = readBlogIndex();
  if (!root || !D) return;
  const en = D.lang === 'en';
  const P = D.posts;
  const words = (n: number) => (en ? `${fmtInt(n)} words` : `${fmtInt(n)} 字`);

  // ── heat map: hover (fine pointers) previews, click pins that month's list ──
  const tip = root.querySelector<HTMLElement>('.wa-tip')!;
  let pinned: HTMLElement | null = null;
  function show(cell: HTMLElement) {
    const y = +cell.dataset.y!, m = +cell.dataset.m!;
    const list = P.filter((p) => p.year === y && p.month === m);
    const head = en
      ? `${MON_EN[m - 1]} ${y} · ${list.length ? `${list.length} ${list.length === 1 ? 'post' : 'posts'}` : 'no posts'}`
      : `${y} 年 ${m} 月 · ${list.length ? `${list.length} 篇` : '没有发文'}`;
    tip.innerHTML = `<div class="wa-tip-h">${head}</div>` +
      list.map((p) => `<a href="${esc(p.href)}">${esc(p.title)}<span>${p.date} · ${esc(TAG_LABEL[D!.lang][p.tag])} · ${words(p.words)}</span></a>`).join('');
    tip.hidden = false;
    const r = cell.getBoundingClientRect(), rr = root!.getBoundingClientRect();
    tip.style.top = `${r.bottom - rr.top + 6}px`;
    tip.style.left = `${Math.min(Math.max(8, r.left - rr.left - 90), rr.width - tip.offsetWidth - 8)}px`;
    root!.querySelectorAll('.wa-hm .c.on').forEach((c) => c.classList.remove('on'));
    cell.classList.add('on');
  }
  function hide() { tip.hidden = true; root!.querySelectorAll('.wa-hm .c.on').forEach((c) => c.classList.remove('on')); }
  const fine = matchMedia('(hover: hover) and (pointer: fine)');
  root.querySelectorAll<HTMLElement>('.wa-hm .c').forEach((c) => {
    c.addEventListener('mouseenter', () => { if (!pinned && fine.matches) show(c); });
    c.addEventListener('mouseleave', () => { if (!pinned && fine.matches) hide(); });
    c.addEventListener('click', (e) => {
      e.preventDefault();
      if (pinned === c) { pinned = null; hide(); return; }
      pinned = c; show(c);
    });
  });
  // A click anywhere but a heat cell or the list itself closes the pinned list.
  document.addEventListener('click', (e) => {
    const t = e.target as Element;
    if (pinned && !tip.contains(t) && !t.closest?.('.wa-hm .c')) { pinned = null; hide(); }
  });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !tip.hidden) { const c = pinned; pinned = null; hide(); c?.focus(); } });

  // ── shuf -n 1 ──
  const shuf = root.querySelector<HTMLAnchorElement>('.wa-shuf')!;
  let cur = P.find((p) => shuf.getAttribute('href') === p.href)?.slug;
  function roll(animate: boolean) {
    const p: ArchivePost = pickRandom(P, cur);
    cur = p.slug;
    shuf.href = p.href;
    shuf.innerHTML = thumbHTML(p, 'wa-st') + `<span class="sb"><span class="stt">${esc(p.title)}</span><span class="sm">${dateEn(p)} · ${esc(TAG_LABEL[D!.lang][p.tag])} · ${words(p.words)}</span></span>`;
    if (animate) { shuf.classList.remove('in'); void shuf.offsetWidth; shuf.classList.add('in'); }
    fitText(shuf);
  }
  root.querySelector('.wa-reroll')?.addEventListener('click', () => roll(true));
  roll(false);
}

function initTree() {
  const tree = document.querySelector<HTMLElement>('[data-blog-tree]');
  if (!tree) return;
  const dirs = [...tree.querySelectorAll<HTMLDetailsElement>('.bt-dir')];
  const openDefault = +(tree.dataset.openDefault || 2);
  const all = tree.querySelector<HTMLButtonElement>('.bt-all')!;
  all.hidden = false;
  const sync = () => { all.textContent = dirs.some((d) => !d.open) ? tree.dataset.labelAll! : tree.dataset.labelLess!; };
  all.addEventListener('click', () => {
    const anyClosed = dirs.some((d) => !d.open);
    dirs.forEach((d, i) => { d.open = anyClosed || i < openDefault; });
    sync();
  });
  dirs.forEach((d) => d.addEventListener('toggle', () => { if (d.open) fitText(d); sync(); }));
  sync();
}

// Sticky sidebar: stick at the top while it fits, otherwise let it scroll
// until its bottom is in view (no inner scrollbar, so popovers never clip).
function initSticky() {
  const sb = document.querySelector<HTMLElement>('.author-sidebar .sidebar-sticky');
  if (!sb || !('ResizeObserver' in window)) return;
  const set = () => {
    if (getComputedStyle(sb).position !== 'sticky') return;
    sb.style.top = `${Math.min(20, innerHeight - sb.offsetHeight - 16)}px`;
  };
  new ResizeObserver(set).observe(sb);
  addEventListener('resize', set);
  set();
}

function init() {
  initArchive();
  initTree();
  initSticky();
  fitText();
  if (document.fonts?.ready) document.fonts.ready.then(() => fitText());
  let raf = 0;
  addEventListener('resize', () => { cancelAnimationFrame(raf); raf = requestAnimationFrame(() => fitText()); });
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
else init();
