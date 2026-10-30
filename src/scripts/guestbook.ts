// Homepage guestbook drawn as `git log --graph` — see GuestbookCard.astro.
//
// Reads GET /api/comments/recent (first page 100, then 50 per cursor page;
// the card shows 7 commits and 7 more per "--skip"), posts to
// POST /api/comments with post_slug "guestbook". A sent message is kept in
// localStorage as a pending commit until the feed carries the same id.
import {
  GUESTBOOK_SLUG,
  PENDING_KEY,
  commitHash,
  layoutGraph,
  prunePending,
  replyHash,
  type FeedItem,
  type Layout,
  type PendingCommit,
} from '../lib/guestbook-graph';
import { trackEvent } from '../lounge/umami';

type Lang = 'zh' | 'en';
type Titles = Record<string, { zh?: string; en?: string }>;
declare global {
  interface Window {
    __GB_TITLES__?: Titles;
    currentLang?: string;
    t?: (key: string) => string;
    _i18nReady?: Promise<unknown>;
  }
}

const FIRST_SHOWN = 7;
const SHOW_STEP = 7;
const FIRST_LIMIT = 100;
const MORE_LIMIT = 50;
const USER_KEY = 'blog-user-identity'; // shared with the post / note comment forms
const RATE_KEY = 'gb_timestamps';
const RATE_LIMIT = 5;
const RATE_WINDOW = 10 * 60 * 1000;
const ORIGIN_LABEL = 'https://chat.ursb.me/';
const LANE_C = ['var(--accent)', 'var(--g1)', 'var(--g2)', 'var(--g3)', 'var(--g4)', 'var(--g5)', 'var(--g6)'];

// Shown until /i18n/*.json arrives (and if a key is ever missing there).
const COPY: Record<Lang, Record<string, string>> = {
  zh: {
    gb_scope: '全站最新', gb_anonymous: '匿名', gb_main: '留言板', gb_expand: '展开', gb_collapse: '收起',
    gb_skip: '--skip 往前 {n} 个 commit', gb_name_placeholder: '匿名', gb_email_placeholder_git: '邮箱（选填，不公开）',
    gb_msg_placeholder: '写下你想说的...', gb_send: '发送留言', gb_message: '留言内容', gb_email_label: '邮箱',
    gb_need_text: '请先写下留言内容。', gb_bad_email: '邮箱格式不正确。', gb_sending: '发送中…',
    gb_out_pending: '1 comment changed · waiting for AI review', gb_out_pushed: '1 comment changed · pushed to origin/main，所有人可见',
    gb_rejected: 'fatal: 留言被拒绝（疑似垃圾内容）', gb_empty_hint: 'hint: 在下面 git commit 第一条留言 ↓',
    gb_too_many: '消息发送太频繁，请稍后再试。', gb_send_fail: '发送失败，请重试。', gb_load_more_fail: '加载更早的留言失败，请重试。',
    time_just_now: '刚刚', time_min_ago: '分钟前', time_h_ago: '小时前', time_d_ago: '天前',
  },
  en: {
    gb_scope: 'latest across the site', gb_anonymous: 'anonymous', gb_main: 'Guestbook', gb_expand: 'more', gb_collapse: 'less',
    gb_skip: '--skip {n} older commits', gb_name_placeholder: 'anonymous', gb_email_placeholder_git: 'email (optional, never shown)',
    gb_msg_placeholder: 'Type your message here...', gb_send: 'Send message', gb_message: 'Message', gb_email_label: 'Email',
    gb_need_text: 'Please write a message first.', gb_bad_email: 'Please enter a valid email address.', gb_sending: 'Sending…',
    gb_out_pending: '1 comment changed · waiting for AI review', gb_out_pushed: '1 comment changed · pushed to origin/main, visible to everyone',
    gb_rejected: 'fatal: message rejected as spam', gb_empty_hint: 'hint: git commit the first message below ↓',
    gb_too_many: 'Too many messages. Please try again later.', gb_send_fail: 'Failed to send message. Please try again.',
    gb_load_more_fail: 'Could not load older messages. Please try again.',
    time_just_now: 'just now', time_min_ago: 'min ago', time_h_ago: 'h ago', time_d_ago: 'd ago',
  },
};

function lang(): Lang { return window.currentLang === 'en' ? 'en' : 'zh'; }
function tr(key: string, vars?: Record<string, string | number>): string {
  let v = typeof window.t === 'function' ? window.t(key) : key;
  if (!v || v === key) v = COPY[lang()][key] ?? key;
  return vars ? v.replace(/\{(\w+)\}/g, (_, k) => (vars[k] != null ? String(vars[k]) : '')) : v;
}
function esc(s: unknown): string {
  return String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] as string));
}
function pad2(n: number) { return (n < 10 ? '0' : '') + n; }
function md(at: string) { const d = new Date(at); return pad2(d.getMonth() + 1) + '/' + pad2(d.getDate()); }
function ago(at: string): string {
  const s = Math.floor((Date.now() - new Date(at).getTime()) / 1000);
  if (s < 60) return tr('time_just_now');
  const m = Math.floor(s / 60); if (m < 60) return m + ' ' + tr('time_min_ago');
  const h = Math.floor(m / 60); if (h < 24) return h + ' ' + tr('time_h_ago');
  const d = Math.floor(h / 24); if (d < 30) return d + ' ' + tr('time_d_ago');
  return md(at);
}
function reducedMotion() { return matchMedia('(prefers-reduced-motion: reduce)').matches; }

function title(slug: string): string {
  if (slug === GUESTBOOK_SLUG) return tr('gb_main');
  const x = (window.__GB_TITLES__ || {})[slug];
  return x ? (x[lang()] || x.zh || x.en || slug) : slug.replace(/^note\//, '');
}
function srcLabel(m: FeedItem) { return m.post_slug === GUESTBOOK_SLUG ? tr('gb_main') : '«' + title(m.post_slug) + '»'; }
// Notes store `note/<slug>` and live under /notes/; inline comments deep-link
// to their highlight (#inline-<id>). Trailing slash = canonical URL.
function srcUrl(m: FeedItem): string {
  if (m.post_slug === GUESTBOOK_SLUG) return '#guestbook';
  const isNote = m.post_slug.indexOf('note/') === 0;
  const bare = isNote ? m.post_slug.slice(5) : m.post_slug;
  const en = lang() === 'en';
  const base = isNote ? (en ? '/en/notes/' : '/notes/') : (en ? '/en/posts/' : '/posts/');
  return base + encodeURIComponent(bare) + '/' + (m.type === 'inline' ? '#inline-' + m.id : '');
}
function srcHtml(m: FeedItem, cls = ''): string {
  return '<a class="src ' + cls + '" href="' + esc(srcUrl(m)) + '" title="' + esc(srcLabel(m)) + '" data-umami-event="guestbook-source-open" data-umami-event-type="' + m.type + '">→ <span class="t">' + esc(srcLabel(m)) + '</span></a>';
}

function readJSON<T>(key: string, fallback: T): T {
  try { const v = JSON.parse(localStorage.getItem(key) || 'null'); return v == null ? fallback : v; } catch { return fallback; }
}
function writeJSON(key: string, v: unknown) { try { localStorage.setItem(key, JSON.stringify(v)); } catch { /* private mode */ } }

export function initGuestbook(): void {
  const card = document.querySelector<HTMLElement>('[data-gb]');
  if (!card) return;
  const API = card.dataset.api || 'https://chat.ursb.me';
  const list = card.querySelector<HTMLElement>('[data-gb-list]')!;
  const totalEl = card.querySelector<HTMLElement>('[data-gb-total]')!;
  const form = card.querySelector<HTMLFormElement>('[data-gb-form]')!;
  const msgInput = form.querySelector<HTMLInputElement>('#gbMessage')!;
  const nameInput = form.querySelector<HTMLInputElement>('#gbName')!;
  const emailInput = form.querySelector<HTMLInputElement>('#gbEmail')!;
  const submitBtn = form.querySelector<HTMLButtonElement>('[data-gb-submit]')!;
  const statusEl = form.querySelector<HTMLElement>('#gbStatus')!;
  const outEl = form.querySelector<HTMLElement>('[data-gb-out]')!;

  let state: 'loading' | 'ok' | 'error' = 'loading';
  let errText = '';
  let items: FeedItem[] = [];
  let cursor: string | null = null;
  let total: number | null = null;
  let branches: number | null = null;
  let shown = FIRST_SHOWN;
  let loading = false;
  let layout: Layout | null = null;
  const open = new Set<string>();
  const fresh = new Set<number>(); // pending ids to fade in once
  let pending: PendingCommit[] = prunePending(readJSON<PendingCommit[]>(PENDING_KEY, []), [], Date.now());
  writeJSON(PENDING_KEY, pending);

  // ── copy that depends on the language ───────────────────────────────────
  function applyCopy() {
    msgInput.placeholder = tr('gb_msg_placeholder');
    msgInput.setAttribute('aria-label', tr('gb_message'));
    submitBtn.setAttribute('aria-label', tr('gb_send'));
    nameInput.placeholder = tr('gb_name_placeholder');
    emailInput.placeholder = tr('gb_email_placeholder_git');
    emailInput.setAttribute('aria-label', tr('gb_email_label'));
    const scope = card!.querySelector('.gb-scope');
    if (scope) scope.textContent = tr('gb_scope');
  }

  // ── identity, shared with post / note comment forms ─────────────────────
  const identity = readJSON<Record<string, string>>(USER_KEY, {});
  if (identity.nickname) nameInput.value = identity.nickname;
  if (identity.email) emailInput.value = identity.email;
  function saveIdentity(nickname: string, email: string) {
    const cur = readJSON<Record<string, string>>(USER_KEY, {});
    cur.nickname = nickname;
    cur.email = email;
    writeJSON(USER_KEY, cur); // merge: a website saved by a post comment survives
  }

  // ── rendering ───────────────────────────────────────────────────────────
  function totalsHtml(): string {
    if (state !== 'ok' && !items.length) return '<strong>—</strong> commits';
    const waiting = pending.filter((p) => p.status === 'pending').length;
    const n = (total ?? items.length) + waiting;
    const br = branches ?? new Set(items.map((m) => m.post_slug)).size;
    return '<strong>' + n + (total == null && cursor ? '+' : '') + '</strong> commits · <strong>' + br + '</strong> branches';
  }

  function rowHtml(r: Layout['rows'][number], i: number, hasPending: boolean): string {
    const c = LANE_C[r.lane % LANE_C.length];
    if (r.kind === 'pend') {
      const p = r.pend;
      const f = fresh.has(p.id) && !reducedMotion();
      fresh.delete(p.id);
      const phase = p.status === 'pending' ? 'review' : 'push';
      return '<div class="gg-row mine' + (f ? ' fresh' : '') + '" role="listitem" data-lane="0" data-pend="1" style="--lc:' + c + '">' +
        '<div class="gg-l1"><span class="gg-hash">' + esc(p.hash) + '</span>' + (i === 0 ? '<span class="gg-deco">(<b>HEAD -&gt; pending</b>)</span>' : '') +
        '<span class="gg-fill"></span><span class="gg-time gg-pend">' + phase + '<span class="dots"></span></span></div>' +
        '<p class="gg-msg"><span class="au">' + esc(p.nickname) + ':</span> ' + esc(p.content) + '</p></div>';
    }
    if (r.kind === 'reply') {
      const rp = r.reply;
      return '<div class="gg-row reply" role="listitem" data-lane="' + r.lane + '" data-reply="1" style="--lc:var(--accent)">' +
        '<div class="gg-l1"><span class="gg-hash">' + replyHash(r.item) + '</span><span class="gg-deco dim">Re: ' + commitHash(r.item.type, r.item.id) + '</span>' +
        '<span class="gg-fill"></span><time class="gg-time" datetime="' + esc(rp.created_at) + '">' + esc(ago(rp.created_at)) + '</time></div>' +
        '<p class="gg-msg"><span class="au">' + esc(rp.nickname || tr('gb_anonymous')) + ':</span> ' + esc(rp.content) + '</p></div>';
    }
    const m = r.item;
    const key = m.type + ':' + m.id;
    let deco = '';
    const named = m.post_slug !== GUESTBOOK_SLUG ? ', ' + esc(title(m.post_slug)) : '';
    if (r.head && !hasPending) deco = '(<b>HEAD -&gt; main</b>' + named + ')';
    else if (r.head) deco = '(main' + named + ')';
    else if (r.deco === 'first') deco = '(' + esc(m.post_slug === GUESTBOOK_SLUG ? 'main' : title(m.post_slug)) + ')';
    const isOpen = open.has(key);
    return '<div class="gg-row' + (r.head && !hasPending ? ' head' : '') + '" role="listitem" tabindex="-1" data-lane="' + r.lane + '" data-head="' + (r.head ? 1 : 0) + '" style="--lc:' + c + '">' +
      '<div class="gg-l1"><span class="gg-hash">' + commitHash(m.type, m.id) + '</span>' + (deco ? '<span class="gg-deco">' + deco + '</span>' : '') +
      '<span class="gg-fill"></span>' + srcHtml(m, 'gg-src') + '<time class="gg-time" datetime="' + esc(m.created_at) + '">' + esc(ago(m.created_at)) + '</time></div>' +
      (m.type === 'inline' && m.selected_text ? '<div class="gg-q">' + esc(m.selected_text) + '</div>' : '') +
      '<p class="gg-msg' + (isOpen ? ' open' : '') + '" id="gb-msg-' + m.type + '-' + m.id + '" data-key="' + key + '"><span class="au">' + esc(m.nickname || tr('gb_anonymous')) + ':</span> ' + esc(m.content) + '</p>' +
      '<div class="gg-sub">' + srcHtml(m) + '</div></div>';
  }

  function graphHtml(shownItems: FeedItem[], hasMore: boolean): string {
    layout = layoutGraph(shownItems, pending, hasMore);
    if (!layout.rows.length) { layout = null; return ''; }
    const hasPending = pending.length > 0;
    return '<div class="gg" role="list" data-lanes="' + layout.lanes + '"><svg class="gg-lines" aria-hidden="true"></svg>' +
      layout.rows.map((r, i) => rowHtml(r, i, hasPending)).join('') + '</div>';
  }

  function termLoading() {
    return '<div class="gg-term" role="status"><span class="prompt">$</span> git fetch origin<br>' +
      '<span class="m">remote: Counting objects: <span class="dots"></span></span><br>' +
      '<span class="m">Receiving objects: <span class="gg-bar"><i></i></span></span></div>';
  }
  function termError() {
    return '<div class="gg-term" role="status"><span class="prompt">$</span> git fetch origin<br>' +
      '<span class="bad">fatal:</span> <span class="m">unable to access \'' + ORIGIN_LABEL + '\': ' + esc(errText) + '</span><br>' +
      '<button type="button" class="txtbtn" data-act="retry">$ git fetch --retry ↻</button></div>';
  }
  function termEmpty() {
    return '<div class="gg-term" role="status"><span class="prompt">$</span> git log --graph<br>' +
      '<span class="bad">fatal:</span> <span class="m">your current branch \'main\' does not have any commits yet</span><br>' +
      '<span class="m">' + esc(tr('gb_empty_hint')) + '</span></div>';
  }

  function render() {
    totalEl.innerHTML = totalsHtml();
    let html: string;
    layout = null;
    if (state === 'loading' && !items.length) html = termLoading() + graphHtml([], false);
    else if (state === 'error' && !items.length) html = termError() + graphHtml([], false);
    else if (!items.length && !pending.length) html = termEmpty();
    else {
      const hasMore = items.length > shown || !!cursor;
      html = graphHtml(items.slice(0, shown), hasMore);
      if (hasMore) {
        const n = Math.min(SHOW_STEP, items.length > shown ? items.length - shown : SHOW_STEP);
        html += '<button type="button" class="gg-more" data-act="more"' + (loading ? ' disabled' : '') + '><span class="prompt">$</span> git log ' + esc(tr('gb_skip', { n })) + ' ↓</button>';
      }
    }
    list.innerHTML = html;
    list.setAttribute('aria-busy', state === 'loading' ? 'true' : 'false');
    addToggles();
    drawGraph();
  }

  // "more ↓" under messages clamped to two lines.
  function addToggles() {
    list.querySelectorAll<HTMLElement>('.gg-msg[data-key]').forEach((p) => {
      const key = p.dataset.key!;
      if (!open.has(key) && p.scrollHeight <= p.clientHeight + 2) return;
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'more';
      b.dataset.act = 'toggle';
      b.dataset.key = key;
      b.setAttribute('aria-controls', p.id);
      b.setAttribute('aria-expanded', String(open.has(key)));
      b.textContent = open.has(key) ? tr('gb_collapse') : tr('gb_expand') + ' ↓';
      p.after(b);
    });
  }

  function drawGraph() {
    const g = list.querySelector<HTMLElement>('.gg');
    if (!g || !layout) return;
    const svg = g.querySelector('svg')!;
    const rowsEl = Array.from(g.querySelectorAll<HTMLElement>('.gg-row'));
    if (!rowsEl.length) return;
    const LS = g.clientWidth < 400 ? 9 : 14;
    g.style.setProperty('--gw', (10 + layout.lanes * LS + 8) + 'px');
    const X = (l: number) => 8 + l * LS;
    const gr = g.getBoundingClientRect();
    const ys = rowsEl.map((r) => r.getBoundingClientRect().top - gr.top + 15);
    const H = gr.height;
    const W = 10 + layout.lanes * LS + 8;
    svg.setAttribute('width', String(W));
    svg.setAttribute('height', String(H));
    svg.setAttribute('viewBox', '0 0 ' + W + ' ' + H);
    let p = '';
    const line = (d: string, c: string, dash?: boolean) => {
      p += '<path d="' + d + '" fill="none" stroke="' + c + '" stroke-width="1.6" stroke-linecap="round"' + (dash ? ' stroke-dasharray="3 3"' : '') + '/>';
    };
    const hasMore = !!list.querySelector('.gg-more');
    const lastMainY = ys.reduce((acc, y, i) => (layout!.rows[i].lane === 0 ? y : acc), ys[0]);
    const mainTop = ys[0];
    const mainEnd = hasMore ? H - 2 : Math.max(lastMainY, ...layout.segments.filter((s) => !s.open).map((s) => Math.min(H - 2, ys[s.to] + 22)));
    line('M' + X(0) + ' ' + mainTop + ' V' + mainEnd, LANE_C[0]);
    // Post branches: fork out of main above their newest commit, run down to
    // their oldest one, then merge back (or keep going if older ones exist).
    layout.segments.forEach((s) => {
      const x = X(s.lane);
      const c = LANE_C[s.lane % LANE_C.length];
      const y1 = ys[s.from];
      const y2 = ys[s.to];
      const top = Math.max(mainTop, y1 - 22);
      let d = 'M' + X(0) + ' ' + top + ' C' + X(0) + ' ' + (top + 12) + ' ' + x + ' ' + (y1 - 12) + ' ' + x + ' ' + y1;
      if (s.open) d += ' V' + (H - 2);
      else {
        const back = Math.min(H - 2, y2 + 22);
        d += ' V' + y2 + ' C' + x + ' ' + (y2 + 12) + ' ' + X(0) + ' ' + (back - 10) + ' ' + X(0) + ' ' + back;
      }
      line(d, c);
    });
    // Latest reply: a dashed side commit off its parent, merged back below.
    layout.rows.forEach((r, i) => {
      if (r.kind !== 'reply') return;
      let pi = i - 1;
      while (pi >= 0 && layout!.rows[pi].kind === 'reply') pi--;
      if (pi < 0) return;
      const px = X(layout!.rows[pi].lane);
      const py = ys[pi];
      const x = X(r.lane);
      const y = ys[i];
      const back = Math.min(H - 2, y + 18);
      line('M' + px + ' ' + py + ' C' + px + ' ' + (py + 10) + ' ' + x + ' ' + (y - 10) + ' ' + x + ' ' + y +
        ' C' + x + ' ' + (y + 10) + ' ' + px + ' ' + (back - 4) + ' ' + px + ' ' + back, 'var(--accent)', true);
    });
    layout.rows.forEach((r, i) => {
      const x = X(r.lane);
      const y = ys[i];
      if (r.kind === 'pend') {
        p += '<circle cx="' + x + '" cy="' + y + '" r="5" fill="var(--c-bg)" stroke="var(--accent)" stroke-width="1.6" stroke-dasharray="2 2"/>';
        return;
      }
      const c = r.kind === 'reply' ? 'var(--accent)' : LANE_C[r.lane % LANE_C.length];
      const big = r.kind === 'commit' && r.head && !pending.length;
      p += '<circle cx="' + x + '" cy="' + y + '" r="' + (big ? 5 : 3.6) + '" fill="' + c + '"' + (big ? ' stroke="var(--c-bg)" stroke-width="2"' : '') + '/>';
    });
    svg.innerHTML = p;
  }

  // ── data ────────────────────────────────────────────────────────────────
  function syncPending() {
    pending = prunePending(pending, items, Date.now());
    writeJSON(PENDING_KEY, pending);
  }

  function load(reset: boolean, focusIndex?: number) {
    if (loading) return;
    loading = true;
    if (reset) { state = items.length ? state : 'loading'; if (!items.length) render(); }
    else render();
    let url = API + '/api/comments/recent?limit=' + (reset ? FIRST_LIMIT : MORE_LIMIT);
    if (!reset && cursor) url += '&cursor=' + encodeURIComponent(cursor);
    fetch(url, { headers: { Accept: 'application/json' } })
      .then((r) => {
        if (!r.ok) { const e = new Error('HTTP ' + r.status) as Error & { status?: number }; e.status = r.status; throw e; }
        return r.json();
      })
      .then((data) => {
        const got: FeedItem[] = (Array.isArray(data.comments) ? data.comments : []).map((m: FeedItem) => (
          // Blank lines would waste the two-line clamp.
          { ...m, content: String(m.content || '').replace(/\n\s*\n+/g, '\n') }));
        items = reset ? got : items.concat(got);
        cursor = data.nextCursor || null;
        if (typeof data.total === 'number') total = data.total;
        if (typeof data.branches === 'number') branches = data.branches;
        state = 'ok';
        syncPending();
        loading = false;
        render();
        if (focusIndex != null) focusCommit(focusIndex);
      })
      .catch((err: Error & { status?: number }) => {
        loading = false;
        if (reset && !items.length) {
          state = 'error';
          errText = err && err.status ? 'The requested URL returned error: ' + err.status : 'Failed to connect to ' + ORIGIN_LABEL.replace(/^https:\/\/|\/$/g, '');
          // Wait for translations so nothing renders as a raw key.
          Promise.resolve(window._i18nReady).catch(() => {}).then(render);
        } else {
          shown = Math.max(FIRST_SHOWN, Math.min(shown, items.length));
          render();
          setStatus(tr('gb_load_more_fail'), true);
        }
      });
  }

  function focusCommit(index: number) {
    const rows = list.querySelectorAll<HTMLElement>('.gg-row[tabindex]');
    const target = rows[index];
    if (target) target.focus({ preventScroll: false });
  }

  // ── interactions ────────────────────────────────────────────────────────
  list.addEventListener('click', (ev) => {
    const b = (ev.target as Element).closest<HTMLElement>('[data-act]');
    if (!b) return;
    const act = b.dataset.act;
    if (act === 'more') {
      const firstNew = Math.min(shown, items.length);
      shown += SHOW_STEP;
      trackEvent('guestbook-more', { shown });
      if (items.length < shown && cursor) load(false, firstNew);
      else { render(); focusCommit(firstNew); }
    } else if (act === 'toggle') {
      const key = b.dataset.key!;
      if (open.has(key)) open.delete(key); else open.add(key);
      const p = list.querySelector<HTMLElement>('.gg-msg[data-key="' + key + '"]');
      if (p) p.classList.toggle('open', open.has(key));
      b.setAttribute('aria-expanded', String(open.has(key)));
      b.textContent = open.has(key) ? tr('gb_collapse') : tr('gb_expand') + ' ↓';
      drawGraph();
    } else if (act === 'retry') {
      trackEvent('guestbook-retry');
      state = 'loading';
      load(true);
    }
  });

  function setStatus(msg: string, err = false) {
    statusEl.textContent = msg || '';
    statusEl.classList.toggle('err', !!err);
  }
  function setInvalid(el: HTMLInputElement, on: boolean) {
    if (on) el.setAttribute('aria-invalid', 'true'); else el.removeAttribute('aria-invalid');
  }
  [msgInput, emailInput].forEach((el) => el.addEventListener('input', () => setInvalid(el, false)));

  function rateOk(): boolean {
    const now = Date.now();
    const ts = readJSON<number[]>(RATE_KEY, []).filter((t) => now - t < RATE_WINDOW);
    if (ts.length >= RATE_LIMIT) return false;
    ts.push(now);
    writeJSON(RATE_KEY, ts);
    return true;
  }

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    if (submitBtn.disabled) return;
    const text = msgInput.value.trim();
    const email = emailInput.value.trim();
    const nickname = nameInput.value.trim() || 'anonymous';
    if (!text) { setInvalid(msgInput, true); setStatus(tr('gb_need_text'), true); msgInput.focus(); return; }
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { setInvalid(emailInput, true); setStatus(tr('gb_bad_email'), true); emailInput.focus(); return; }
    setInvalid(msgInput, false);
    setInvalid(emailInput, false);
    if (!rateOk()) { setStatus(tr('gb_too_many'), true); return; }

    submitBtn.disabled = true;
    submitBtn.textContent = '…';
    setStatus(tr('gb_sending'));
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    // The owner's name is reserved server-side; /admin's token proves it's him.
    try { const t = localStorage.getItem('admin-token'); if (t) headers.Authorization = 'Bearer ' + t; } catch { /* ignore */ }
    fetch(API + '/api/comments', {
      method: 'POST',
      headers,
      body: JSON.stringify({ post_slug: GUESTBOOK_SLUG, nickname, email: email || undefined, content: text }),
    })
      .then((r) => r.json().catch(() => ({})).then((data) => {
        if (!r.ok) throw Object.assign(new Error('HTTP ' + r.status), { status: r.status, data });
        return data;
      }))
      .then((res) => {
        const c = res && res.comment;
        if (!c || typeof c.id !== 'number') throw new Error('No comment returned');
        // An API without `status` publishes at once.
        const status: 'pending' | 'approved' = (res.status || c.status) === 'pending' ? 'pending' : 'approved';
        saveIdentity(nickname, email);
        msgInput.value = '';
        setStatus('');
        const pend: PendingCommit = {
          id: c.id, hash: commitHash('post', c.id), nickname, content: text,
          created_at: c.created_at || new Date().toISOString(), status, at: Date.now(),
        };
        pending = [pend].concat(pending.filter((p) => p.id !== pend.id));
        writeJSON(PENDING_KEY, pending);
        fresh.add(pend.id);
        outEl.innerHTML = '<span class="acc">$</span> git commit -m "' + esc(text) + '"\n' +
          '[' + (status === 'pending' ? 'pending' : 'main') + ' <span class="h">' + esc(pend.hash) + '</span>] ' + esc(text) + '\n ' +
          esc(tr(status === 'pending' ? 'gb_out_pending' : 'gb_out_pushed'));
        trackEvent('guestbook-submit', { status });
        render();
        // Published right away: refetch so it moves from pending to HEAD.
        if (status === 'approved') load(true);
      })
      .catch((err: Error & { status?: number; data?: { code?: string } }) => {
        // Keep the draft in the input and say what happened.
        const code = err && err.data && err.data.code;
        const spam = err && err.status === 403 && code === 'SPAM_DETECTED';
        const reserved = code === 'RESERVED_NAME';
        if (reserved) { setInvalid(nameInput, true); nameInput.focus(); }
        setStatus(reserved ? tr('gb_reserved_name') : spam ? tr('gb_rejected') : err && err.status === 429 ? tr('gb_too_many') : tr('gb_send_fail'), true);
        trackEvent('guestbook-submit', { status: reserved ? 'reserved' : spam ? 'spam' : 'error' });
      })
      .finally(() => {
        submitBtn.disabled = false;
        submitBtn.textContent = '↵';
      });
  });

  // Re-render in place on language switch (titles, times, copy), no refetch.
  window.addEventListener('langchange', () => { applyCopy(); setStatus(''); render(); });
  Promise.resolve(window._i18nReady).catch(() => {}).then(() => { applyCopy(); if (state !== 'loading') render(); });
  // Row heights change with width and web fonts: redraw the lines.
  if ('ResizeObserver' in window) new ResizeObserver(() => drawGraph()).observe(list);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => drawGraph()).catch(() => {});

  applyCopy();
  load(true);
}
