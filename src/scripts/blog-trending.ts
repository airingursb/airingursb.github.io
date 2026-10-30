// /blog Most Popular by window (scheme A). Fetches /api/posts/trending at
// runtime; on success adds the window tabs + auto hint to the existing
// header and swaps the build-time 4 cards for the windowed ones (plus the
// standby row). On any failure / timeout / unusable payload nothing changes:
// the build-time Most Popular stays as the fallback.
import {
  TRENDING_API_BASE, TRENDING_PATH, TRENDING_TIMEOUT_MS, TEXT,
  cardsFor, headline, standbyFor, usableWindows,
  type IndexPost, type Lang, type TrendingPayload, type WindowKey, type CardModel,
} from '../lib/blog-trending';

const esc = (s: string) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);
const roll = (s: string, i: number) => `<span class="rk-roll" style="--i:${i}"><span>${esc(s)}</span></span>`;
const cn = (on: boolean) => (on ? '<span class="cn-badge">CN</span>' : '');

function readIndex(): { lang: Lang; posts: Map<string, IndexPost> } | null {
  try {
    const raw = JSON.parse(document.getElementById('blog-index')?.textContent || 'null');
    if (!raw || !Array.isArray(raw.posts)) return null;
    return { lang: raw.lang === 'en' ? 'en' : 'zh', posts: new Map(raw.posts.map((p: IndexPost) => [p.slug, p])) };
  } catch {
    return null;
  }
}

async function fetchTrending(): Promise<unknown> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), TRENDING_TIMEOUT_MS);
  try {
    const res = await fetch(TRENDING_API_BASE + TRENDING_PATH, { signal: ctrl.signal, credentials: 'omit' });
    if (!res.ok) throw new Error(`trending ${res.status}`);
    return await res.json();
  } finally {
    clearTimeout(timer);
  }
}

function cardHtml(c: CardModel, i: number) {
  return `<a class="popular-card rk-card" href="${esc(c.href)}" data-article-card data-slug="${esc(c.slug)}">`
    + `<span class="rk-body"><span class="rk-no">${roll(`No.${c.rank}`, i)}<em class="rk-mk ${c.statusClass}">${esc(c.mark)}</em><small class="rk-st ${c.statusClass}">${esc(c.statusLabel)}</small></span>`
    + `<span class="rk-t" data-article-title>${esc(c.title)}${cn(c.cn)}</span>`
    + `<span class="rk-m"><span class="nw">${esc(c.readsBefore)}${roll(c.reads, i)}${esc(c.readsAfter)}</span> · <span class="nw">${esc(c.prevLabel)}</span></span></span>`
    + (c.cover ? `<span class="rk-th" data-article-cover style="background-image:url(&quot;${esc(c.cover)}&quot;)" aria-hidden="true"></span>` : '')
    + '</a>';
}

function mount(data: TrendingPayload, wins: WindowKey[], lang: Lang, posts: Map<string, IndexPost>) {
  const inner = document.querySelector<HTMLElement>('.popular-section .popular-inner');
  const header = inner?.querySelector<HTMLElement>('.popular-header');
  const heading = header?.querySelector('.popular-heading');
  const grid = inner?.querySelector<HTMLElement>('.popular-grid');
  if (!inner || !header || !heading || !grid || inner.classList.contains('rk')) return;
  const t = TEXT[lang];
  let cur: WindowKey = data.defaultWindow;

  heading.insertAdjacentHTML('afterend',
    `<span class="rk-tabs" role="tablist" aria-label="${esc(t.tablist)}">`
    + wins.map((k) => `<button type="button" role="tab" id="rk-tab-${k}" data-w="${k}" aria-controls="rk-panel" aria-selected="${k === cur}" tabindex="${k === cur ? 0 : -1}"${t.tabTitle[k] ? ` title="${esc(t.tabTitle[k]!)}"` : ''}>${esc(t.tabs[k])}</button>`).join('')
    + '<span class="rk-ind" aria-hidden="true"></span></span>'
    + '<span class="rk-auto" aria-live="polite"><i aria-hidden="true"></i><span class="rk-why"></span></span>');
  const tabs = header.querySelector<HTMLElement>('.rk-tabs')!;
  const ind = tabs.querySelector<HTMLElement>('.rk-ind')!;
  const auto = header.querySelector<HTMLElement>('.rk-auto')!;

  const panel = document.createElement('div');
  panel.className = 'rk-panel';
  panel.id = 'rk-panel';
  panel.setAttribute('role', 'tabpanel');
  const sb = standbyFor(data, posts, lang);
  panel.innerHTML = '<div class="rk-grid"></div>'
    + (sb ? `<a class="rk-sb" href="${esc(sb.href)}"><span class="rk-sb-k">${esc(sb.key)}</span><span class="rk-sb-t">${esc(sb.title)}${cn(sb.cn)}</span><span class="rk-sb-m">${esc(sb.meta)}</span></a>` : '');
  const list = panel.querySelector<HTMLElement>('.rk-grid')!;

  // New cards go before the build-time ones (which stay in the DOM, hidden),
  // so ArticleTransition finds the visible card first.
  grid.before(panel);
  grid.style.display = 'none';
  header.classList.add('rk-head');
  inner.classList.add('rk');

  const place = () => {
    const b = tabs.querySelector<HTMLElement>(`button[data-w="${cur}"]`);
    if (!b) return;
    ind.style.setProperty('--x', `${b.offsetLeft}px`);
    ind.style.setProperty('--w', `${b.offsetWidth}px`);
  };
  const setHead = () => {
    const h = headline(data, cur, lang);
    auto.classList.toggle('on', h.auto);
    auto.querySelector('.rk-why')!.innerHTML = (h.auto ? esc(t.auto) + ' · ' : '') + esc(h.text) + ' · <b>' + esc(h.why) + '</b>';
    tabs.querySelectorAll<HTMLButtonElement>('button').forEach((b) => {
      const on = b.dataset.w === cur;
      b.setAttribute('aria-selected', String(on));
      b.tabIndex = on ? 0 : -1;
    });
    panel.setAttribute('aria-labelledby', `rk-tab-${cur}`);
    place();
  };
  const render = (anim: boolean) => {
    const html = cardsFor(data, cur, posts, lang).map(cardHtml).join('');
    if (!anim) { list.innerHTML = html; return; }
    list.classList.remove('in');
    list.classList.add('out');
    setTimeout(() => {
      list.innerHTML = html;
      list.classList.remove('out');
      void list.offsetWidth; // restart the fade/roll animations
      list.classList.add('in');
      setTimeout(() => list.classList.remove('in'), 800);
    }, 160);
  };
  const select = (k: WindowKey, focus = false) => {
    if (k === cur) return;
    cur = k;
    setHead();
    render(true);
    if (focus) tabs.querySelector<HTMLElement>(`button[data-w="${k}"]`)?.focus();
  };

  tabs.addEventListener('click', (e) => {
    const b = (e.target as Element).closest<HTMLButtonElement>('button[data-w]');
    if (b) select(b.dataset.w as WindowKey);
  });
  tabs.addEventListener('keydown', (e) => {
    const i = wins.indexOf(cur);
    const next = e.key === 'ArrowRight' ? wins[(i + 1) % wins.length]
      : e.key === 'ArrowLeft' ? wins[(i - 1 + wins.length) % wins.length]
      : e.key === 'Home' ? wins[0] : e.key === 'End' ? wins[wins.length - 1] : null;
    if (next) { e.preventDefault(); select(next, true); }
  });
  addEventListener('resize', place, { passive: true });
  document.fonts?.ready.then(place).catch(() => {});

  setHead();
  render(false);
  // First appearance: the swapped-in block fades in with the numbers rolling.
  list.classList.add('in');
  panel.classList.add('rk-fresh');
  tabs.classList.add('rk-fresh');
  auto.classList.add('rk-fresh');
  setTimeout(() => { list.classList.remove('in'); }, 800);
}

async function boot() {
  const idx = readIndex();
  if (!idx || !document.querySelector('.popular-section .popular-grid')) return;
  try {
    const data = await fetchTrending();
    const wins = usableWindows(data, idx.posts);
    if (wins.length === 0) return; // keep the build-time Most Popular
    mount(data as TrendingPayload, wins, idx.lang, idx.posts);
  } catch {
    /* network error, timeout, 503 before the RPC exists: keep the fallback */
  }
}

boot();
