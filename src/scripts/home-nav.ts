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
import { createTermWindow, esc, type TermWindow } from './term-window';

type Flat = { id: string; ch: string; el: HTMLElement };
type State = { chapter: string; active: string[]; pastIntro: boolean };

const lang = () => ((document.documentElement.lang || '').toLowerCase().startsWith('en') ? 'en' : 'zh');
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

// ── the prompt + the ls window (chrome: src/scripts/term-window.ts) ──
let tw: TermWindow;
let rows: { t: string }[] = [];
let preselect = false;

const chPath = () => { const ch = chOf(state.active[0]); return ch.id === 'home' ? '~' : ch.path; };

function hi(text: string, q: string) {
  const t = esc(text);
  if (!q) return t;
  const i = text.toLowerCase().indexOf(q);
  if (i < 0) return t;
  return esc(text.slice(0, i)) + '<mark>' + esc(text.slice(i, i + q.length)) + '</mark>' + esc(text.slice(i + q.length));
}

function build(w: TermWindow) {
  const q = w.input.value.trim().toLowerCase().replace(/^cd\s+/, '').replace(/^~\//, '').replace(/\/$/, '');
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
      h += '<button type="button" class="tw-row dir" data-i="' + (rows.length - 1) + '"><span class="m">drwxr-xr-x</span><span class="nm">' +
        hi(ch.path + '/', q) + '</span><span class="cm"># ' + hi(chName(ch), q) + '<span class="dd"> · ' + esc(chDesc(ch)) +
        '</span></span><span class="r">' + present.length + '</span></button>';
    }
    files.forEach((id) => {
      rows.push({ t: id });
      const here = state.active.includes(id);
      const fname = cardFile(id);
      h += '<button type="button" class="tw-row file' + (here ? ' here' : '') + '" data-i="' + (rows.length - 1) + '"><span class="m">' +
        (/\/$/.test(fname) ? 'drwxr-xr-x' : '-rw-r--r--') + '</span><span class="nm">' + hi(cardName(id), q) + '</span><span class="fx">' +
        hi(fname, q) + '</span><span class="r">' + (here ? (L === 'en' ? '● you are here' : '● 当前位置') : '') + '</span></button>';
    });
  });
  w.list.innerHTML = h || '<div class="tw-empty">ls: ' + esc(w.input.value) + ': No such file or directory</div>';
  // on open, pre-select the card you are on
  if (preselect) {
    preselect = false;
    for (let i = 0; i < rows.length; i++) if (rows[i].t === state.active[0]) { w.sel = i; break; }
  }
  const cnt = rows.filter((r) => !r.t.startsWith('ch:')).length;
  w.setCount(L === 'en' ? cnt + ' items' : cnt + ' 项');
  return rows.length;
}

function update() {
  tw.showPrompt(state.pastIntro);
  document.documentElement.classList.toggle('nc-shown', state.pastIntro);
  tw.setPath(chPath());
  if (tw.isOpen()) tw.refresh();
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

  tw = createTermWindow({
    name: 'nc',
    titles: () => ['airing@ursb.me — ls -la ~ — 80×24', 'airing@ursb.me — ls -la ~', 'ls -la ~'],
    ariaLabel: () => (lang() === 'en' ? 'Jump to a card' : '跳转到卡片'),
    promptAria: () => (lang() === 'en' ? 'Jump to a section (⌘K)' : '跳转到任意卡片（⌘K）'),
    placeholder: () => (lang() === 'en' ? 'filter: music / life / books' : '过滤：音乐 / life / 书'),
    cmd: () => 'cd',
    path: chPath,
    footer: () => {
      const L = lang();
      return '<span><b>↑↓</b> ' + (L === 'en' ? 'select' : '选择') + '</span><span><b>↵</b> cd</span><span class="k"><b>esc</b> ' +
        (L === 'en' ? 'close' : '关闭') + '</span>';
    },
    build,
    go: (i, w) => { const r = rows[i]; if (!r) return; w.close(false); jump(r.t); },
    onOpen: () => { preselect = true; },
    // with a query, select the first matching card (a directory only if nothing else matched)
    onInput: (w) => {
      if (w.input.value.trim()) for (let i = 0; i < rows.length; i++) if (!rows[i].t.startsWith('ch:')) { w.sel = i; break; }
    },
  });

  addEventListener('scroll', onScroll, { passive: true });
  addEventListener('resize', onScroll);
  addEventListener('wheel', unlock, { passive: true });
  addEventListener('touchstart', unlock, { passive: true });
  addEventListener('keydown', (e) => { if (!tw.isOpen() && /^(Arrow|Page|Home|End| )/.test(e.key)) unlock(); });

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
  new MutationObserver(() => { tw.render(); update(); })
    .observe(document.documentElement, { attributes: true, attributeFilter: ['lang'] });

  state.chapter = ''; // force the first update
  spy();
  setTimeout(spy, 800);
  setTimeout(spy, 2500);
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
else init();
