// Article sidebar additions (desktop, > 1100px):
//  ① a line under "Views" from GET /api/posts/trending (pickTrend), loaded
//     after the page settles; any failure / no data / no rule → nothing shows;
//  ② minutes per TOC row (right-aligned column), read rows dimmed, and
//     "N min left" / "Finished" on the Progress label.
// The TOC links themselves are built by the inline script in PostLayout.
import { TRENDING_API_BASE, TRENDING_PATH, TRENDING_TIMEOUT_MS } from '../lib/blog-trending';
import { pickTrend, trendEntry } from '../lib/post-trend';
import { activeHeading, minuteLabel, readingState, sectionMinutes } from '../lib/post-sections';

const root = document.getElementById('contentGrid');
const content = document.querySelector<HTMLElement>('.post-content');
const desktop = window.matchMedia('(min-width: 1101px)');
const idle = (fn: () => void, timeout = 2000) =>
  'requestIdleCallback' in window ? (window as any).requestIdleCallback(fn, { timeout }) : setTimeout(fn, 300);

if (root && content) {
  const lang = root.dataset.lang === 'en' ? 'en' : 'zh';
  idle(() => { loadTrend(root, lang).catch(() => {}); }, 4000);
  initMinutes(root, content);
}

// ───────────────────────── ① trend line ─────────────────────────
async function loadTrend(root: HTMLElement, lang: 'zh' | 'en') {
  const el = document.getElementById('postTrend');
  const slug = root.dataset.slug;
  if (!el || !slug) return;
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), TRENDING_TIMEOUT_MS);
  let payload: unknown;
  try {
    const res = await fetch(TRENDING_API_BASE + TRENDING_PATH, { signal: ctrl.signal, credentials: 'omit' });
    if (!res.ok) return;
    payload = await res.json();
  } finally {
    clearTimeout(timer);
  }
  const line = pickTrend(trendEntry(payload, slug), { pubDate: root.dataset.date, lang });
  if (!line) return;
  el.textContent = line.text;
  if (line.mark) {
    const b = document.createElement('b');
    b.className = 'sb-trend-up';
    b.textContent = line.mark;
    el.append(' ', b);
  }
  el.title = line.tip;
  el.hidden = false;
}

// ───────────────────────── ② minutes + time left ─────────────────────────
function initMinutes(root: HTMLElement, content: HTMLElement) {
  const nav = document.getElementById('tocNav');
  const leftEl = document.getElementById('readProgressLeft');
  const colEl = document.getElementById('tocMinCol');
  const total = Number(root.dataset.minutes) || 0;
  const L = { left: root.dataset.leftLabel || '还剩 {n} 分钟', done: root.dataset.doneLabel || '已读完', aria: root.dataset.minLabel || '{t}，约 {n} 分钟' };
  if (!nav || !total) return;
  // Same heading list as the TOC script (one link per h2/h3, in order).
  const headings = Array.from(content.querySelectorAll<HTMLElement>('h2, h3'));
  const links = Array.from(nav.querySelectorAll<HTMLAnchorElement>('.toc-link'));
  if (headings.length < 2 || links.length !== headings.length) return;

  let share: number[] = [];
  let ready = false;
  let raf = 0;

  function build() {
    if (ready || !desktop.matches) return;
    ready = true;
    const mins = sectionMinutes(content, headings, total);
    share = mins.share;
    // With h3s present, an h2 row shows its whole chapter (itself + its h3s).
    const level = headings.map((h) => (h.tagName === 'H2' ? 2 : 3));
    const hasH3 = level.includes(3);
    links.forEach((a, i) => {
      let m = mins.whole[i];
      if (hasH3 && level[i] === 2) for (let j = i + 1; j < headings.length && level[j] === 3; j++) m += mins.whole[j];
      const text = a.textContent || '';
      const t = document.createElement('span');
      t.className = 'toc-t';
      t.textContent = text;
      const n = document.createElement('span');
      n.className = 'toc-min';
      n.setAttribute('aria-hidden', 'true');
      n.textContent = minuteLabel(m);
      a.textContent = '';
      a.append(t, n);
      a.classList.add('has-min');
      a.setAttribute('aria-label', L.aria.replace('{t}', text).replace('{n}', minuteLabel(m)));
    });
    if (colEl) colEl.hidden = false;
    if (leftEl) leftEl.hidden = false;
    paint();
  }

  function paint() {
    raf = 0;
    if (!ready || !desktop.matches) return;
    const s = readingState(content, headings, share);
    if (leftEl) {
      const text = s.p >= 0.995 || s.left < 0.25 ? L.done : L.left.replace('{n}', String(Math.max(1, Math.round(s.left))));
      if (leftEl.textContent !== text) leftEl.textContent = text;
    }
    // A row is read once its section — or, for a chapter row, the chapter — is done.
    const act = activeHeading(headings);
    const level = headings.map((h) => (h.tagName === 'H2' ? 2 : 3));
    links.forEach((a, i) => {
      let done = s.f[i] >= 0.98;
      if (done && level[i] === 2) for (let j = i + 1; j < headings.length && level[j] === 3; j++) if (s.f[j] < 0.98) { done = false; break; }
      a.classList.toggle('is-read', done && i !== act);
    });
  }

  const onScroll = () => { if (!raf) raf = requestAnimationFrame(paint); };
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', () => { build(); onScroll(); });
  desktop.addEventListener('change', () => { build(); onScroll(); });
  // Counting is one pass over the article's text: do it when the main thread is idle.
  idle(build, 1500);
}
