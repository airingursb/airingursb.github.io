// Homepage navigation: a shell prompt pinned to the bottom of the screen
// (`airing@ursb.me:~/life$ ▍`) that follows the chapter you are reading, and a
// `ls -la ~` window (click / ⌘K / Ctrl+K / "/") that filters and jumps to any card.
// The chapters and the card order are rendered by index.astro; this script only
// reads them from src/data/home-chapters.ts and the DOM ids.
import {
  HOME_CHAPTERS as CH,
  HOME_CARDS as CARD,
  HOME_CARD_ALIASES as KW,
  HOME_CARD_PAIRS as PAIR,
  type HomeChapter,
} from '../data/home-chapters';

type Flat = { id: string; ch: string; el: HTMLElement };
type State = { chapter: string; active: string[]; pastIntro: boolean };

const lang = () => ((document.documentElement.lang || '').toLowerCase().startsWith('en') ? 'en' : 'zh');
const esc = (s: string) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]!));
const reduceMotion = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
const cardName = (id: string) => (CARD[id] ? (lang() === 'en' ? CARD[id][1] : CARD[id][0]) : id);
const cardFile = (id: string) => (CARD[id] ? CARD[id][2] : '');
const chName = (ch: HomeChapter) => (lang() === 'en' ? ch.en : ch.zh);
const chDesc = (ch: HomeChapter) => ch.desc[lang()] || ch.desc.zh;
const chOf = (id: string) => CH.find((c) => c.cards.includes(id)) || CH[0];
const chEl = (ch: HomeChapter) => document.getElementById(ch.id === 'home' ? 'intro' : `ch-${ch.id}`);

let flat: Flat[] = [];
const idx = (id: string) => flat.findIndex((f) => f.id === id) + 1;
const state: State = { chapter: '', active: ['intro'], pastIntro: false };
let lock: { ids: string[] } | null = null;

// ── scroll spy: which card(s) sit at the reading line ──
const anchorLine = () => Math.max(110, innerHeight * 0.32);
function spy() {
  const line = anchorLine();
  let best = -Infinity;
  const tops = flat.map((f) => {
    const t = f.el.getBoundingClientRect().top;
    if (t <= line && t > best + 2) best = t;
    return t;
  });
  let act: string[] = [];
  if (best === -Infinity) act = ['intro'];
  else flat.forEach((f, j) => { if (Math.abs(tops[j] - best) <= 2) act.push(f.id); });
  const maxY = document.documentElement.scrollHeight - innerHeight;
  const gb = document.getElementById('guestbook');
  if (scrollY >= maxY - 4 && gb && gb.getBoundingClientRect().top < innerHeight) act = ['guestbook'];
  if (lock) act = lock.ids;
  const ch = chOf(act[0]);
  const intro = document.getElementById('intro');
  // Past the Intro card: its IRC input box is out of view, the prompt may appear.
  const past = intro ? intro.getBoundingClientRect().bottom < 70 : scrollY > 400;
  const changed = ch.id !== state.chapter || act.join() !== state.active.join() || past !== state.pastIntro;
  state.chapter = ch.id; state.active = act; state.pastIntro = past;
  if (changed) update();
}

// ── jump: smooth-scroll to a card or a chapter heading ──
const OFFSET = 24;
function jump(target: string) {
  let el: HTMLElement | null = null;
  let ids: string[];
  let pad = OFFSET;
  if (target.startsWith('ch:')) {
    const ch = CH.find((c) => c.id === target.slice(3));
    if (!ch) return;
    el = chEl(ch);
    if (ch.id === 'home') { ids = ['intro']; pad = 140; }
    else { ids = [ch.cards[0]]; if (PAIR[ch.cards[0]]) ids.push(PAIR[ch.cards[0]]); }
  } else {
    el = document.getElementById(target);
    ids = [target];
    if (PAIR[target]) ids = idx(target) < idx(PAIR[target]) ? [target, PAIR[target]] : [PAIR[target], target];
  }
  if (!el) return;
  const node = el;
  const myLock = (lock = { ids });
  const y = () => Math.max(0, node.getBoundingClientRect().top + scrollY - pad);
  spy();
  const behavior: ScrollBehavior = reduceMotion() ? 'auto' : 'smooth';
  window.scrollTo({ top: y(), behavior });
  // Lazy cards have reserved heights, but images / late data can still nudge
  // the page while it scrolls: once it settles, correct (at most 5 times).
  let last = -1, still = 0, fixes = 0;
  const t0 = performance.now();
  (function tick() {
    if (lock !== myLock) return;
    if (Math.abs(scrollY - last) < 0.5) still++; else { still = 0; last = scrollY; }
    if (still > 6 || performance.now() - t0 > 6000) {
      const maxY = document.documentElement.scrollHeight - innerHeight;
      const d = Math.abs(Math.min(y(), maxY) - scrollY);
      if (d > 4 && fixes < 5 && performance.now() - t0 < 6000) {
        fixes++; still = 0;
        window.scrollTo({ top: y(), behavior: d > 600 ? behavior : 'auto' });
        requestAnimationFrame(tick);
        return;
      }
      lock = null; spy(); return;
    }
    requestAnimationFrame(tick);
  })();
}
function unlock() { if (lock) { lock = null; onScroll(); } }

// ── the prompt + the ls window ──
const isMac = /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent);
let ps: HTMLButtonElement, scrim: HTMLDivElement, win: HTMLDivElement;
let input: HTMLInputElement, list: HTMLDivElement, ft: HTMLDivElement;
let rows: { t: string }[] = [];
let sel = 0, shownPath = '~', typing = 0;

const userHTML = () => '<span class="nc-u">airing<span class="nc-u-host">@ursb.me</span></span><span class="nc-c">:</span>';
const chPath = () => { const ch = chOf(state.active[0]); return ch.id === 'home' ? '~' : ch.path; };
const isOpen = () => document.documentElement.classList.contains('nc-open');

function psHTML(path: string) {
  return '<span class="nc-lights" aria-hidden="true"><i></i><i></i><i></i></span><span class="nc-line">' + userHTML() +
    '<span class="nc-p">' + esc(path) + '</span><span class="nc-d">$</span><span class="nc-cur" aria-hidden="true"></span></span>' +
    '<span class="nc-kbd" aria-hidden="true"><kbd>' + (isMac ? '⌘' : 'Ctrl') + '</kbd><kbd>K</kbd></span>';
}

// Backspace the differing tail, then type the new path one char at a time.
function typeTo(path: string) {
  const el = ps.querySelector('.nc-p') as HTMLElement;
  const my = ++typing;
  const from = el.textContent || '';
  shownPath = path;
  if (from === path) return;
  if (reduceMotion()) { el.textContent = path; ps.classList.remove('typing'); return; }
  let k = 0;
  while (k < from.length && k < path.length && from[k] === path[k]) k++;
  let cur = from, phase: 'del' | 'type' = 'del';
  ps.classList.add('typing');
  (function step() {
    if (my !== typing) return;
    if (phase === 'del') { if (cur.length > k) cur = cur.slice(0, -1); else phase = 'type'; }
    if (phase === 'type' && cur.length < path.length) cur = path.slice(0, cur.length + 1);
    el.textContent = cur;
    if (cur !== path) setTimeout(step, phase === 'del' ? 16 : 30);
    else ps.classList.remove('typing');
  })();
}

function hi(text: string, q: string) {
  const t = esc(text);
  if (!q) return t;
  const i = text.toLowerCase().indexOf(q);
  if (i < 0) return t;
  return esc(text.slice(0, i)) + '<mark>' + esc(text.slice(i, i + q.length)) + '</mark>' + esc(text.slice(i + q.length));
}

function build() {
  const q = input.value.trim().toLowerCase().replace(/^cd\s+/, '').replace(/^~\//, '').replace(/\/$/, '');
  const L = lang();
  let h = '';
  rows = [];
  CH.forEach((ch) => {
    const present = ch.cards.filter((id) => document.getElementById(id));
    const chHit = !q || (ch.path + ' ' + ch.id + ' ' + ch.zh + ' ' + ch.en).toLowerCase().includes(q);
    const files = present.filter((id) => chHit ||
      (CARD[id].join(' ') + ' ' + id + ' ' + (KW[id] || '')).toLowerCase().includes(q));
    if (!chHit && !files.length) return;
    if (ch.id !== 'home') {
      rows.push({ t: 'ch:' + ch.id });
      h += '<button type="button" class="nc-row dir" data-i="' + (rows.length - 1) + '"><span class="m">drwxr-xr-x</span><span class="nm">' +
        hi(ch.path + '/', q) + '</span><span class="cm"># ' + hi(chName(ch), q) + '<span class="dd"> · ' + esc(chDesc(ch)) +
        '</span></span><span class="r">' + present.length + '</span></button>';
    }
    files.forEach((id) => {
      rows.push({ t: id });
      const here = state.active.includes(id);
      const fname = cardFile(id);
      h += '<button type="button" class="nc-row file' + (here ? ' here' : '') + '" data-i="' + (rows.length - 1) + '"><span class="m">' +
        (/\/$/.test(fname) ? 'drwxr-xr-x' : '-rw-r--r--') + '</span><span class="nm">' + hi(cardName(id), q) + '</span><span class="fx">' +
        hi(fname, q) + '</span><span class="r">' + (here ? (L === 'en' ? '● you are here' : '● 当前位置') : '') + '</span></button>';
    });
  });
  list.innerHTML = h || '<div class="nc-empty">ls: ' + esc(input.value) + ': No such file or directory</div>';
  if (sel >= rows.length) sel = rows.length - 1;
  if (sel < 0) sel = 0;
  paint();
  const cnt = rows.filter((r) => !r.t.startsWith('ch:')).length;
  (ft.querySelector('.n') as HTMLElement).textContent = L === 'en' ? cnt + ' items' : cnt + ' 项';
}

function paint(scroll?: boolean | 'center') {
  list.querySelectorAll<HTMLElement>('.nc-row').forEach((r) => {
    const on = +r.dataset.i! === sel;
    r.classList.toggle('sel', on);
    r.setAttribute('aria-selected', on ? 'true' : 'false');
  });
  const s = list.querySelector('.nc-row.sel');
  if (s && scroll) s.scrollIntoView({ block: scroll === 'center' ? 'center' : 'nearest' });
}

let lastFocus: Element | null = null;
function open() {
  lastFocus = document.activeElement;
  document.documentElement.classList.add('nc-open');
  input.value = '';
  build();
  // pre-select the card you are on
  for (let i = 0; i < rows.length; i++) if (rows[i].t === state.active[0]) { sel = i; break; }
  paint('center');
  (win.querySelector('.nc-in label') as HTMLElement).innerHTML = userHTML() + '<span class="nc-p">' + esc(chPath()) +
    '</span><span class="nc-d">$</span> <span class="nc-c">cd</span>';
  if (matchMedia('(pointer:fine)').matches) setTimeout(() => input.focus(), 30);
  else win.focus();
}
function close(restore = true) {
  document.documentElement.classList.remove('nc-open');
  input.blur();
  if (restore && lastFocus instanceof HTMLElement && lastFocus !== document.body) lastFocus.focus({ preventScroll: true });
}
function go(i: number) { const r = rows[i]; if (!r) return; close(false); jump(r.t); }

function render() {
  const L = lang();
  ps.innerHTML = psHTML(shownPath);
  ps.setAttribute('aria-label', L === 'en' ? 'Jump to a section (⌘K)' : '跳转到任意卡片（⌘K）');
  win.setAttribute('aria-label', L === 'en' ? 'Jump to a card' : '跳转到卡片');
  win.innerHTML = '<div class="nc-tb"><span class="nc-lights" aria-hidden="true"><i></i><i></i><i></i></span><span class="t">airing@ursb.me — ls -la ~ — 80×24</span></div>' +
    '<div class="nc-in"><label for="nc-q"></label><input id="nc-q" type="text" autocomplete="off" spellcheck="false" role="combobox" aria-controls="nc-list" aria-expanded="true" placeholder="' +
    (L === 'en' ? 'filter: music / life / books' : '过滤：音乐 / life / 书') + '"></div>' +
    '<div class="nc-list" id="nc-list" role="listbox"></div>' +
    '<div class="nc-ft"><span><b>↑↓</b> ' + (L === 'en' ? 'select' : '选择') + '</span><span><b>↵</b> cd</span><span class="k"><b>esc</b> ' +
    (L === 'en' ? 'close' : '关闭') + '</span><span class="n"></span></div>';
  input = win.querySelector('input')!;
  list = win.querySelector('.nc-list')!;
  ft = win.querySelector('.nc-ft')!;
  input.addEventListener('input', () => {
    sel = 0; build();
    // with a query, select the first matching card (a directory only if nothing else matched)
    if (input.value.trim()) for (let i = 0; i < rows.length; i++) if (!rows[i].t.startsWith('ch:')) { sel = i; break; }
    paint(true);
  });
  input.addEventListener('keydown', (e) => {
    if (e.isComposing) return;
    if (e.key === 'ArrowDown') { e.preventDefault(); sel = Math.min(rows.length - 1, sel + 1); paint(true); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); sel = Math.max(0, sel - 1); paint(true); }
    else if (e.key === 'Enter') { e.preventDefault(); go(sel); }
    else if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); close(); }
  });
  list.addEventListener('click', (e) => { const r = (e.target as Element).closest<HTMLElement>('.nc-row'); if (r) go(+r.dataset.i!); });
  list.addEventListener('mousemove', (e) => {
    const r = (e.target as Element).closest<HTMLElement>('.nc-row');
    if (r && +r.dataset.i! !== sel) { sel = +r.dataset.i!; paint(); }
  });
}

function update() {
  ps.classList.toggle('show', state.pastIntro);
  document.documentElement.classList.toggle('nc-shown', state.pastIntro);
  typeTo(chPath());
  if (isOpen()) build();
}

let raf = 0;
function onScroll() {
  if (raf) return;
  raf = requestAnimationFrame(() => { raf = 0; spy(); });
}

function init() {
  flat = [];
  CH.forEach((ch) => ch.cards.forEach((id) => {
    const el = document.getElementById(id);
    if (el) flat.push({ id, ch: ch.id, el });
  }));
  if (!flat.length) return;

  ps = document.createElement('button');
  ps.className = 'nc-ps'; ps.type = 'button';
  scrim = document.createElement('div');
  scrim.className = 'nc-scrim';
  win = document.createElement('div');
  win.className = 'nc-win'; win.tabIndex = -1;
  win.setAttribute('role', 'dialog'); win.setAttribute('aria-modal', 'true');
  document.body.append(ps, scrim, win);
  render();
  ps.addEventListener('click', open);
  scrim.addEventListener('click', () => close());
  addEventListener('keydown', (e) => {
    const openNow = isOpen();
    const ae = document.activeElement as HTMLElement | null;
    const typingInField = !!ae && (/INPUT|TEXTAREA|SELECT/.test(ae.tagName) || ae.isContentEditable);
    if ((e.metaKey || e.ctrlKey) && !e.altKey && !e.shiftKey && (e.key === 'k' || e.key === 'K')) {
      e.preventDefault(); e.stopPropagation(); openNow ? close() : open();
    } else if (e.key === 'Escape' && openNow) close();
    else if (e.key === '/' && !openNow && !typingInField && !e.metaKey && !e.ctrlKey && !e.altKey) { e.preventDefault(); open(); }
  }, true);

  addEventListener('scroll', onScroll, { passive: true });
  addEventListener('resize', onScroll);
  addEventListener('wheel', unlock, { passive: true });
  addEventListener('touchstart', unlock, { passive: true });
  addEventListener('keydown', (e) => { if (!isOpen() && /^(Arrow|Page|Home|End| )/.test(e.key)) unlock(); });

  // In-page #anchors (e.g. the IRC card's #留言) scroll smoothly to the card.
  document.addEventListener('click', (e) => {
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    const a = (e.target as Element).closest?.('a[href^="#"]');
    if (!a) return;
    const id = decodeURIComponent((a.getAttribute('href') || '').slice(1));
    if (!id || !document.getElementById(id)) return;
    e.preventDefault();
    jump(id);
    history.replaceState(null, '', '#' + id);
  });

  // language switch (applyTranslations flips <html lang>): re-render labels
  new MutationObserver(() => { render(); update(); })
    .observe(document.documentElement, { attributes: true, attributeFilter: ['lang'] });

  state.chapter = ''; // force the first update
  spy();
  setTimeout(spy, 800);
  setTimeout(spy, 2500);
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
else init();
