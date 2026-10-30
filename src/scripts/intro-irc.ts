// Homepage Intro card (IRC channel). Markup: src/components/IntroCard.astro.
//
// Live data, all of it shared with the rest of the page instead of polled twice:
//   - Airing coding:   GET {AGENT_API}/presence every 60s → {coding, last_seen}
//   - Airing listening: the Now Playing card's Last.fm poll (event `lastfm-nowplaying`)
//   - otherwise:        the bear's schedule (bear-study/life.ts + the weather badge)
//   - readers online:   online-presence.js (event `online-counts`, `visitor-country-ready`)
// Chat goes to Airing(Bot): POST {AGENT_API}/chat (SSE), /handoff, GET /messages.
import { freshWeather, lifeActivity, parseWeather, singaporeTime } from '../components/bear-study/life';

// chat.ursb.me forwards /api/agent/* to the Supabase Edge Function `airing-agent`
// and /api/agent/presence to the `presence` function.
const AGENT_API = 'https://chat.ursb.me/api/agent';
const PRESENCE_URL = `${AGENT_API}/presence`;

const PRESENCE_MS = 60_000;
const POLL_REPLY_MS = 30_000;
const POLL_REPLY_FOR_MS = 30 * 60_000;
const RESTORE_WINDOW_MS = 30 * 60_000;
const QSHOW = 3;
const AGENT_IMG = '/images/airing-agent-96.png';
const AIRING_IMG = '/images/airing-avatar-48.webp';

type Track = { name: string; artist: string; image: string; url: string };
type Counts = { site?: number; countries?: Record<string, number> };
type Live = { state: 'loading' | 'ok' | 'fail'; coding?: boolean; last_seen?: string | null };

declare global {
  interface Window {
    t?: (k: string) => string;
    currentLang?: string;
    _i18nReady?: Promise<unknown>;
    umami?: { track: (e: string, d?: unknown) => void };
    __lastfmNowPlaying?: Track | null;
    __onlineCounts?: Counts;
    __heroScramble?: (el: Element, text: string, opts?: Record<string, unknown>) => void;
  }
}

// Friends-tree animals (public/friends-tree, same ids as window.FRIEND_AVATARS).
const AV: [string, string, string, string][] = [
  ['fox', '小狐狸', 'Fox', '0b305aa87fa6864a'], ['rabbit', '小兔子', 'Rabbit', '21d1df65649a8913'], ['cat', '小橘猫', 'Cat', '2059805e54310092'],
  ['raccoon', '小浣熊', 'Raccoon', 'b804656c3089f8de'], ['panda', '熊猫', 'Panda', '4c1c9bca3c99834e'], ['deer', '小鹿', 'Deer', 'ff5f0ecaf31bd762'],
  ['dog', '小狗', 'Dog', '0894f7837fa1db99'], ['owl', '小猫头鹰', 'Owl', '82c5f0c0a04ac5b8'], ['koala', '考拉', 'Koala', '48e9c2805b1713ad'],
  ['red-panda', '小熊猫', 'Red panda', 'fadd8029fa4567cf'], ['penguin', '小企鹅', 'Penguin', '90442ab531103a56'], ['otter', '小水獭', 'Otter', 'c7d3e9e2137bb0e5'],
  ['squirrel', '小松鼠', 'Squirrel', '492bd5ca560591a8'], ['hedgehog', '小刺猬', 'Hedgehog', '2e24cefa420833f6'], ['polar-bear', '北极熊', 'Polar bear', 'b9c35b5f0a4b8c69'],
  ['capybara', '水豚', 'Capybara', 'd0c9f223f0b4367b'], ['tiger', '小老虎', 'Tiger', 'fbc4cb76f5917dc6'], ['lion', '小狮子', 'Lion', 'cb6a0adb3f547ab6'],
  ['wolf', '小灰狼', 'Wolf', '22e7374365865008'], ['leopard', '小花豹', 'Leopard', 'cf316049d74fc53e'], ['sheep', '小绵羊', 'Sheep', 'ba62aa7d83b9fe58'],
  ['elephant', '小象', 'Elephant', '8dec11ba373f767b'], ['pig', '小猪', 'Pig', '7cdbc021c207c0aa'], ['bat', '小蝙蝠', 'Bat', 'f91587f26ba202a8'],
  ['cow', '小奶牛', 'Cow', '47f42d3dec54b9bd'], ['horse', '小马', 'Horse', 'a3a613db33d707d6'], ['monkey', '小猴子', 'Monkey', 'f3dcecfd4edfad61'],
  ['frog', '小青蛙', 'Frog', 'af505140207cbbee'], ['duck', '小鸭子', 'Duck', 'b114222e2c276d72'], ['chick', '小鸡', 'Chick', '72f4d54b0b5a1dd1'],
  ['seal', '小海豹', 'Seal', 'b15f99f1f890bdd2'], ['axolotl', '六角恐龙', 'Axolotl', 'b2ffb7ad3a4050c5'],
];
// ISO2 → a representative point (capital or main city); the online API only knows countries.
const CC: Record<string, [number, number]> = { CN: [39.9, 116.4], HK: [22.3, 114.2], TW: [25.0, 121.5], MO: [22.2, 113.5], SG: [1.35, 103.8], JP: [35.7, 139.7], KR: [37.6, 127.0], MY: [3.1, 101.7], TH: [13.8, 100.5], VN: [21.0, 105.8], ID: [-6.2, 106.8], PH: [14.6, 121.0], IN: [28.6, 77.2], AU: [-33.9, 151.2], NZ: [-41.3, 174.8], US: [37.8, -122.4], CA: [43.7, -79.4], MX: [19.4, -99.1], BR: [-23.5, -46.6], AR: [-34.6, -58.4], GB: [51.5, -0.1], DE: [52.5, 13.4], FR: [48.9, 2.35], NL: [52.4, 4.9], ES: [40.4, -3.7], IT: [41.9, 12.5], RU: [55.8, 37.6], TR: [41.0, 29.0], AE: [25.2, 55.3], IL: [32.1, 34.8], SE: [59.3, 18.1], CH: [47.4, 8.5], PL: [52.2, 21.0], ZA: [-33.9, 18.4], EG: [30.0, 31.2], KE: [-1.3, 36.8], PK: [24.9, 67.0], BD: [23.8, 90.4] };
const RESERVED = /^(airing|airing[\s_-]*(\(ai\)|ai|bot|\(bot\))|艾琳|ursb|bear|admin|root|chanserv|nickserv|system)$/i;
const VISITOR_RE = /^[A-Za-z0-9_-]{16,64}$/;

const card = document.getElementById('intro');
if (card) init(card);

function init(card: HTMLElement) {
  const $ = <E extends Element = HTMLElement>(s: string) => card.querySelector(s) as E;
  const logw = $('.js-logw');
  const chatlog = $('.js-log');
  const input = $<HTMLInputElement>('.js-in');
  const idp = $('.js-idp');
  const stEl = $('.js-st');
  const memEl = $('.js-mem');
  const mapbox = $('.js-mapbox');
  const capEl = $('.js-cap');
  const clkEl = $('.js-clk');
  const countEl = $('.js-count');
  const quotaEl = $('.js-quota');
  const COLS = Number(card.dataset.cols), ROWS = Number(card.dataset.rows);
  const LON0 = Number(card.dataset.lon0), LAT0 = Number(card.dataset.lat0), STEP = Number(card.dataset.step);
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

  // ── helpers ──
  const T = (k: string) => (window.t ? window.t(k) : k);
  const fill = (s: string, o: Record<string, string | number>) => s.replace(/\{(\w+)\}/g, (m, k) => (k in o ? String(o[k]) : m));
  const en = () => window.currentLang === 'en';
  const esc = (s: unknown) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);
  const lsGet = (k: string): any => { try { return JSON.parse(localStorage.getItem(k) || 'null'); } catch { return null; } };
  const lsSet = (k: string, v: unknown) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* storage blocked */ } };
  const sgt = () => {
    const o: Record<string, string> = {};
    new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Singapore', hour: '2-digit', minute: '2-digit', hourCycle: 'h23', weekday: 'short' })
      .formatToParts(new Date()).forEach((p) => { o[p.type] = p.value; });
    return { hm: `${o.hour}:${o.minute}`, wd: o.weekday };
  };
  const sgDay = () => new Date(Date.now() + 8 * 3600_000).toISOString().slice(0, 10);
  const ago = (iso?: string | null) => {
    if (!iso) return T('intro_ago_now');
    const m = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60000));
    if (m < 1) return T('intro_ago_now');
    if (m < 60) return fill(T('intro_ago_m'), { n: m });
    if (m < 1440) return fill(T('intro_ago_h'), { n: Math.round(m / 60) });
    return fill(T('intro_ago_d'), { n: Math.round(m / 1440) });
  };
  const ccName = (cc: string) => { try { return new Intl.DisplayNames([en() ? 'en' : 'zh-CN'], { type: 'region' }).of(cc) || cc; } catch { return cc; } };
  const flag = (cc: string) => `<img class="flg" src="/flags/${cc.toLowerCase()}.svg" alt="" onerror="this.remove()">`;
  const avSrc = (id: string) => `/friends-tree/${(AV.find((a) => a[0] === id) || AV[0])[3]}.webp`;
  const avLabel = (id: string) => { const a = AV.find((x) => x[0] === id) || AV[0]; return en() ? a[2] : a[1]; };
  const swap = (el: Element | null, html: string) => { if (el && el.innerHTML !== html) el.innerHTML = html; };

  // ── visitor identity: only on this device; shared with the comment forms ──
  const IDK = 'blog-user-identity', GK = 'ursb:chat-guest';
  const ME = (() => {
    const shared = lsGet(IDK) || {}, g = lsGet(GK) || {};
    if (!g.nickname) {
      g.nickname = 'guest_' + (1000 + Math.floor(Math.random() * 9000));
      g.avatar_id = AV[Math.floor(Math.random() * AV.length)][0];
      lsSet(GK, g);
    }
    const av = shared.avatar_id || g.avatar_id;
    return { nickname: String(shared.nickname || g.nickname).slice(0, 20), avatar_id: AV.some((a) => a[0] === av) ? av : AV[0][0] };
  })();
  const mergeShared = (patch: Record<string, string>) => lsSet(IDK, { ...(lsGet(IDK) || {}), ...patch });

  // ── live state ──
  let LIVE: Live = { state: 'loading' };
  let MUSIC: Track | null = window.__lastfmNowPlaying || null;
  let COUNTS: Counts | null = window.__onlineCounts || null;
  let MYCC = (() => { try { return sessionStorage.getItem('vp_country') || ''; } catch { return ''; } })().toUpperCase();
  let ready = false;

  const coding = () => LIVE.state === 'ok' && !!LIVE.coding;
  function sched() {
    const now = Date.now();
    const badge = document.getElementById('weatherLine');
    const ctx = { now, weather: parseWeather({ kind: badge?.dataset.weather, observedAt: Number(badge?.dataset.observedAt) }) };
    const w = freshWeather(ctx.weather, now);
    return { act: lifeActivity(ctx), period: singaporeTime(now).dayPeriod, rain: !!w && (w.kind === 'rainy' || w.kind === 'thunder') };
  }
  // [status line, source tag, source is live, what Airing is doing]
  function st(): [string, string, boolean, string] {
    if (coding()) return [T('intro_st_coding_line'), 'Claude Code · ' + ago(LIVE.last_seen), true, T('intro_st_coding')];
    const k = sched();
    const tail = (LIVE.state === 'ok' && LIVE.last_seen ? fill(T('intro_last_coded'), { t: ago(LIVE.last_seen) }) : '') + (LIVE.state === 'fail' ? T('intro_api_fail') : '');
    switch (k.act) {
      case 'sleep': return [T('intro_sched_sleep_line'), T('intro_sched_sleep_src') + tail, false, T('intro_sched_sleep')];
      case 'coffee': return [T('intro_sched_coffee_line'), T('intro_sched_coffee_src') + tail, false, T('intro_sched_coffee')];
      case 'typing': return [T('intro_sched_typing_line'), T('intro_sched_typing_src') + tail, false, T('intro_sched_typing')];
      default: {
        const src = k.rain ? 'intro_sched_rain_src' : k.period === 'evening' ? 'intro_sched_evening_src' : 'intro_sched_afternoon_src';
        return [T('intro_sched_reading_line'), T(src) + tail, false, T('intro_sched_reading')];
      }
    }
  }

  // ── status line (phones only; desktop reads the member list) ──
  function statusHtml() {
    if (MUSIC && !coding()) {
      return `<span>${esc(T('intro_st_music_line'))}</span><span class="src live">${esc(MUSIC.artist + ' · ' + MUSIC.name)}</span>`;
    }
    const s = st();
    return `<span>${esc(s[0])}</span><span class="src${s[2] ? ' live' : ''}">${esc(s[1])}</span>`;
  }

  // ── member list ──
  function airingCard() {
    const s = st(), c = coding();
    const dot = c ? 'live' : MUSIC ? 'live listen' : 'idle';
    const doing = c ? s[3] : MUSIC ? T('intro_st_music') : s[3];
    const l2 = c ? `<span class="tm">&gt;_</span>Claude Code · ${esc(ago(LIVE.last_seen))}`
      : MUSIC ? `Last.fm · ${esc(T('intro_now_playing'))}` : esc(s[1]);
    const player = MUSIC
      ? `<a class="ac-player"${MUSIC.url ? ` href="${esc(MUSIC.url)}" target="_blank" rel="noopener"` : ''} title="${esc(MUSIC.artist + ' · ' + MUSIC.name)}">` +
        (MUSIC.image ? `<img src="${esc(MUSIC.image)}" alt="">` : '<span class="nocv">♪</span>') +
        `<span class="tx"><span class="t">${esc(MUSIC.name)}</span><span class="a">${esc(MUSIC.artist)}</span></span><span class="eq" aria-hidden="true"><i></i><i></i><i></i></span></a>`
      : '';
    return `<li class="ac"><div class="ac-who"><span class="ac-av"><img src="${AIRING_IMG}" alt="" width="30" height="30"><span class="dot ${dot}"></span></span>` +
      `<span class="ac-meta"><span class="l1"><span class="nm">Airing</span><span class="doing">${esc(doing)}</span></span><span class="l2">${l2}</span></span></div>${player}</li>`;
  }
  function online() {
    const c = (COUNTS && COUNTS.countries) || {};
    const n = COUNTS && typeof COUNTS.site === 'number' ? Math.max(1, COUNTS.site) : null;
    return { n, c, me: MYCC };
  }
  function usersHtml() {
    const o = online(), rest = o.n ? o.n - 2 : 0;
    return `<h4><span>${esc(T('intro_users'))}</span>${o.n ? `<b>${o.n}</b>` : ''}</h4><ul class="nicks">${airingCard()}` +
      `<li class="bot"><img src="${AGENT_IMG}" alt="" width="16" height="16"><span class="nm">Airing(Bot)</span><span class="s">AI</span></li>` +
      `<li class="me"><img class="js-me-a" src="${avSrc(ME.avatar_id)}" alt="" width="16" height="16"><span class="nm js-me-n">${esc(ME.nickname)}</span><span class="s">${esc(T('intro_you'))}</span></li>` +
      (rest > 0 ? `<li class="s more">${esc(fill(T('intro_guests'), { n: rest }))}</li>` : '') + '</ul>';
  }

  // ── /who map ──
  const proj = (lat: number, lon: number) => [((((lon - LON0) % 360) + 360) % 360) / STEP, (LAT0 - lat) / STEP];
  function sortedCC() { const c = online().c; return Object.keys(c).filter((k) => CC[k] && c[k] > 0).sort((a, b) => c[b] - c[a] || (a < b ? -1 : 1)); }
  function onlineText() {
    const n = online().n || 1;
    const tiers: [number, string][] = [[1, 'intro_tier_1'], [9, 'intro_tier_2'], [19, 'intro_tier_3'], [29, 'intro_tier_4'], [99, 'intro_tier_5'], [Infinity, 'intro_tier_6']];
    return fill(T(tiers.find((x) => n <= x[0])![1]), { n });
  }
  function regionsText() { const n = Object.keys(online().c).length; return n === 1 ? T('intro_region_one') : fill(T('intro_regions'), { n }); }
  function flagList(k: number) {
    const o = online(), ccs = sortedCC(), show = ccs.slice(0, k), rest = ccs.length - show.length;
    return show.map((cc, i) => (i ? '<span class="sp"> · </span>' : '') + `<span class="fl${cc === o.me ? ' me' : ''}" title="${esc(ccName(cc) + ' · ' + o.c[cc])}">${flag(cc)}${cc} <b>${o.c[cc]}</b></span>`).join('') +
      (rest > 0 ? `<span class="more"> · ${esc(fill(T('intro_more'), { n: rest }))}</span>` : '');
  }
  function renderMap() {
    const svg = mapbox.querySelector('svg')!;
    const o = online();
    svg.setAttribute('aria-label', o.n ? onlineText() : T('intro_map_label'));
    let dots = '';
    sortedCC().slice().reverse().forEach((cc) => {
      const xy = proj(CC[cc][0], CC[cc][1]), n = o.c[cc], rr = 0.95 + Math.min(1.6, Math.log2(n) * 0.38), me = cc === o.me;
      const x = xy[0].toFixed(1), y = xy[1].toFixed(1);
      dots += `<g class="rd${me ? ' me' : ''}"><circle class="pl" cx="${x}" cy="${y}" r="${rr.toFixed(2)}" stroke-width=".35"/><circle class="pt" cx="${x}" cy="${y}" r="${rr.toFixed(2)}"/>` +
        `<circle class="hit" data-cc="${cc}" data-x="${x}" data-y="${y}" cx="${x}" cy="${y}" r="3.4"/></g>`;
    });
    const labs = sortedCC().map((cc) => {
      const xy = proj(CC[cc][0], CC[cc][1]), n = o.c[cc], me = cc === o.me, sz = n >= 5 ? 3 : n >= 2 ? 2 : 1;
      return `<span class="ml s${sz}${me ? ' me' : ''}" tabindex="0" data-cc="${cc}" data-x="${xy[0].toFixed(1)}" data-y="${xy[1].toFixed(1)}" aria-label="${esc(ccName(cc) + ' ' + n)}">${flag(cc)}${cc} <b>${n}</b>${me ? `<span class="y">· ${esc(T('intro_you'))}</span>` : ''}</span>`;
    }).join('');
    const key = dots + labs;
    if (mapbox.dataset.key === key) return;
    mapbox.dataset.key = key;
    svg.querySelectorAll('.rd').forEach((g) => g.remove());
    svg.insertAdjacentHTML('beforeend', dots);
    mapbox.querySelectorAll('.ml').forEach((l) => l.remove());
    mapbox.querySelector('.mtip')!.insertAdjacentHTML('beforebegin', labs);
    layoutLabels();
  }
  function hits(a: any, list: any[]) { return list.some((b) => a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h); }
  function layoutLabels() {
    const rc0 = mapbox.querySelector('svg')!.getBoundingClientRect(), W = rc0.width, H = rc0.height;
    if (!W) return;
    const labs = Array.from(mapbox.querySelectorAll<HTMLElement>('.ml'));
    const dots = labs.map((l) => ({ l, x: +l.dataset.x! / COLS * W, y: +l.dataset.y! / ROWS * H }));
    const placed: any[] = [];
    dots.forEach((d) => {
      const w = d.l.offsetWidth, h = d.l.offsetHeight, g = 5;
      const obst = dots.filter((o) => o !== d).map((o) => ({ x: o.x - 4, y: o.y - 4, w: 8, h: 8 }));
      const C = [[g, -h / 2], [-w - g, -h / 2], [g - 1, -h - 1], [g - 1, 1], [-w - g + 1, -h - 1], [-w - g + 1, 1], [-w / 2, -h - g], [-w / 2, g]];
      let ok: any = null;
      for (const c of C) {
        const rc = { x: d.x + c[0], y: d.y + c[1], w, h };
        if (rc.x < 0 || rc.x + w > W || rc.y < -4 || rc.y + h > H + 4) continue;
        if (hits(rc, placed) || hits(rc, obst)) continue;
        ok = rc; break;
      }
      d.l.classList.toggle('on', !!ok);
      if (ok) { d.l.style.left = ok.x.toFixed(1) + 'px'; d.l.style.top = ok.y.toFixed(1) + 'px'; placed.push({ x: ok.x - 2, y: ok.y - 2, w: w + 4, h: h + 4 }); }
    });
  }
  function showTip(cc: string) {
    const tip = mapbox.querySelector<HTMLElement>('.mtip')!, o = online(), el = mapbox.querySelector<HTMLElement>(`.ml[data-cc="${cc}"]`);
    if (!el || !o.c[cc]) return;
    const rc0 = mapbox.querySelector('svg')!.getBoundingClientRect(), W = rc0.width;
    tip.innerHTML = flag(cc) + esc(ccName(cc)) + ' · <b>' + esc(fill(T('intro_tip'), { n: o.c[cc] })) + '</b>' + (cc === o.me ? esc(T('intro_tip_me')) : '');
    tip.hidden = false;
    const x = +el.dataset.x! / COLS * W, y = +el.dataset.y! / ROWS * rc0.height, tw = tip.offsetWidth, th = tip.offsetHeight;
    let top = y - th - 9;
    if (top < -th / 2) top = y + 9;
    tip.style.left = Math.max(0, Math.min(W - tw, x - tw / 2)) + 'px';
    tip.style.top = top + 'px';
  }
  const hideTip = () => { const tip = mapbox.querySelector<HTMLElement>('.mtip'); if (tip) tip.hidden = true; };
  mapbox.addEventListener('mouseover', (e) => { const el = (e.target as Element).closest('[data-cc]') as HTMLElement | null; if (el) showTip(el.dataset.cc!); else hideTip(); });
  mapbox.addEventListener('mouseleave', hideTip);
  mapbox.addEventListener('focusin', (e) => { const el = (e.target as Element).closest('[data-cc]') as HTMLElement | null; if (el) showTip(el.dataset.cc!); });
  mapbox.addEventListener('focusout', hideTip);
  if ('ResizeObserver' in window) new ResizeObserver(() => layoutLabels()).observe(mapbox);

  function capHtml() {
    const o = online();
    if (!o.n) return '<span>&nbsp;</span><span>&nbsp;</span>';
    return `<span class="fx-t" data-gf>${o.n > 1 ? '<b>●</b> ' : ''}${esc(onlineText())} · ${esc(regionsText())}</span><span class="fls">${flagList(4)}</span>`;
  }
  function clkHtml() {
    const n = sgt();
    const wd = en() ? n.wd : ({ Mon: '周一', Tue: '周二', Wed: '周三', Thu: '周四', Fri: '周五', Sat: '周六', Sun: '周日' } as Record<string, string>)[n.wd] || n.wd;
    return `${esc(T('intro_loc'))} · ${esc(wd)} ${n.hm} SGT`;
  }

  function render() {
    if (!ready) return;
    swap(stEl, statusHtml());
    stEl.hidden = false;
    swap(memEl, usersHtml());
    swap(capEl, capHtml());
    swap(clkEl, clkHtml());
    renderMap();
    const o = online();
    if (o.n) { countEl.textContent = String(o.n); countEl.hidden = false; }
  }

  // ── data sources ──
  function fetchPresence() {
    if (document.hidden) return;
    const ctl = new AbortController();
    const to = setTimeout(() => ctl.abort(), 6000);
    fetch(PRESENCE_URL, { cache: 'no-store', signal: ctl.signal })
      .then((r) => { if (!r.ok) throw new Error(String(r.status)); return r.json(); })
      .then((d) => { LIVE = { state: 'ok', coding: !!d.coding, last_seen: d.last_seen || null }; })
      .catch(() => { LIVE = { state: 'fail' }; })
      .finally(() => { clearTimeout(to); render(); });
  }
  window.addEventListener('lastfm-nowplaying', (e) => { MUSIC = (e as CustomEvent).detail || null; render(); });
  window.addEventListener('online-counts', (e) => { COUNTS = (e as CustomEvent).detail || null; render(); });
  window.addEventListener('visitor-country-ready', (e) => { MYCC = String((e as CustomEvent).detail?.country || '').toUpperCase(); render(); });
  window.addEventListener('pet-weather', () => render());
  document.addEventListener('visibilitychange', () => { if (!document.hidden) { fetchPresence(); pollReply(); } });

  // ── identity panel ──
  function idPanelHtml() {
    return `<div class="idh"><span id="introIdTitle">${esc(T('intro_id_title'))} <i>· ${esc(T('intro_id_sub'))}</i></span><button type="button" class="x js-idx" aria-label="${esc(T('intro_close'))}">×</button></div>` +
      `<div class="idme"><img class="big js-me-a" src="${avSrc(ME.avatar_id)}" alt="" width="40" height="40"><div><b class="js-me-n">${esc(ME.nickname)}</b><span class="js-idl">${esc(avLabel(ME.avatar_id))}</span></div></div>` +
      `<div class="idn"><span class="ps">/nick</span><input class="js-nick" placeholder="${esc(T('intro_nick_ph'))}" maxlength="20" autocomplete="off"><button type="button" class="js-nickok">${esc(T('intro_nick_btn'))}</button></div>` +
      `<div class="idg">${AV.map((a) => `<button type="button" class="js-av${a[0] === ME.avatar_id ? ' on' : ''}" data-av="${a[0]}" title="${esc(en() ? a[2] : a[1])}"><img src="/friends-tree/${a[3]}.webp" alt="${esc(en() ? a[2] : a[1])}" loading="lazy" width="36" height="36"></button>`).join('')}</div>` +
      `<div class="idf"># ${esc(T('intro_id_note'))}</div>`;
  }
  function syncId() {
    card.querySelectorAll('.js-me-n').forEach((e) => { e.textContent = e.classList.contains('nk') && !e.closest('.msg') ? `<${ME.nickname}>` : ME.nickname; });
    card.querySelectorAll<HTMLImageElement>('.js-me-a').forEach((e) => { e.src = avSrc(ME.avatar_id); e.hidden = false; });
    card.querySelectorAll('.js-av').forEach((b) => b.classList.toggle('on', (b as HTMLElement).dataset.av === ME.avatar_id));
    card.querySelectorAll('.js-idl').forEach((e) => { e.textContent = avLabel(ME.avatar_id); });
  }
  const tm = () => sgt().hm;
  const sv = (txt: string, cls = '') => `<div class="sv${cls ? ' ' + cls : ''}">${esc(txt)}</div>`;
  function setNick(n: string) {
    n = n.trim();
    if (!n || n.length > 20) return sv(T('intro_nick_bad'), 'err');
    if (RESERVED.test(n)) return sv(fill(T('intro_nick_reserved'), { n }), 'err');
    const old = ME.nickname;
    ME.nickname = n;
    mergeShared({ nickname: n });
    syncId();
    return sv(fill(T('intro_nick_now'), { a: old, b: n }));
  }
  function setAvatar(id: string) {
    if (!AV.some((a) => a[0] === id)) return '';
    ME.avatar_id = id;
    mergeShared({ avatar_id: id });
    syncId();
    return sv(fill(T('intro_av_now'), { a: ME.nickname, b: avLabel(id) }));
  }
  const openPanel = (on: boolean) => { idp.classList.toggle('on', on); if (on && !idp.innerHTML) idp.innerHTML = idPanelHtml(); };

  // ── chat ──
  const VK = 'ursb:agent-visitor', TK = 'ursb:agent-thread', QK = 'ursb:agent-quota';
  let visitorMem = '';
  function visitorId() {
    let v = '';
    try { v = localStorage.getItem(VK) || ''; } catch { v = visitorMem; }
    if (VISITOR_RE.test(v)) return v;
    const abc = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789_-';
    const bytes = new Uint8Array(24);
    crypto.getRandomValues(bytes);
    v = Array.from(bytes, (b) => abc[b & 63]).join('');
    visitorMem = v;
    try { localStorage.setItem(VK, v); } catch { /* keep it in memory for this visit */ }
    return v;
  }
  type ThreadRec = { id: string; at: number; handed?: boolean; handedAt?: number; last?: number };
  const thread = (): ThreadRec | null => { const t = lsGet(TK); return t && typeof t.id === 'string' ? t : null; };
  const saveThread = (patch: Partial<ThreadRec>) => { const t = { ...(thread() || {}), ...patch, at: Date.now() } as ThreadRec; lsSet(TK, t); return t; };
  function quotaLeft(): number | null { const q = lsGet(QK); return q && q.day === sgDay() && typeof q.left === 'number' ? q.left : null; }
  function setQuota(left: number) { lsSet(QK, { day: sgDay(), left: Math.max(0, left) }); renderQuota(); }
  function renderQuota() {
    const left = quotaLeft();
    swap(quotaEl, left !== null && left <= QSHOW ? `<span class="ql">${esc(fill(T('intro_left'), { n: left }))}</span><span class="qs">${esc(fill(T('intro_left_s'), { n: left }))}</span>` : '');
    input.placeholder = left === 0 ? T('intro_ph_limit') : T('intro_ph');
  }

  function msgHtml(av: string, nick: string, time: string, body: string, who: string) {
    return `<div class="msg ${who}">${av}<div class="mb"><div class="mh">${nick}<time>${esc(time)}</time></div><div class="mc">${body}</div></div></div>`;
  }
  const meMsg = (q: string, time: string, name?: string) =>
    msgHtml(`<img class="av va${name ? '' : ' js-me-a'}" src="${avSrc(ME.avatar_id)}" alt="">`, `<span class="nk me${name ? '' : ' js-me-n'}">${esc(name || ME.nickname)}</span>`, time, esc(q), 'me');
  const botMsg = (body: string, time: string) => msgHtml(`<img class="av ag" src="${AGENT_IMG}" alt="">`, '<span class="nk bot">Airing(Bot)</span>', time, body, 'bot');
  const humanMsg = (body: string, time: string) =>
    msgHtml(`<img class="av" src="${AIRING_IMG}" alt="">`, `<span class="nk ai">Airing</span><span class="bdg rl">${esc(T('intro_real'))}</span>`, time, `<div class="ans">${md(body)}</div>`, 'real');
  const mailForm = () => `<form class="mailf2 js-mailf" novalidate><input type="email" required placeholder="${esc(T('intro_mail_ph'))}" autocomplete="email" aria-label="${esc(T('intro_mail_ph'))}"><button type="submit">${esc(T('intro_mail_send'))}</button><span class="er" hidden></span></form>`;
  function add(html: string) {
    const w = document.createElement('div');
    w.innerHTML = html;
    chatlog.appendChild(w);
    chatlog.scrollTop = chatlog.scrollHeight;
    return w;
  }
  function startChat() {
    card.querySelectorAll('.js-sug').forEach((e) => e.remove());
    logw.classList.add('chatting');
  }

  // Answers come back as light Markdown: paragraphs, "- " lists, **bold**, `code`, [links](https://…).
  function inline(s: string) {
    let h = esc(s);
    h = h.replace(/`([^`]+)`/g, '<code>$1</code>');
    h = h.replace(/\*\*([^*]+)\*\*/g, '<b>$1</b>');
    h = h.replace(/\[([^\]]+)\]\(((?:https?:\/\/|\/)[^\s)]+)\)/g, (_m, t, u) => {
      const own = u.startsWith('/') || /^https:\/\/(www\.)?ursb\.me\//.test(u);
      return `<a href="${u}"${own ? '' : ' target="_blank" rel="noopener"'}>${t}</a>`;
    });
    h = h.replace(/(^|[\s(（])(https?:\/\/[^\s<)）]+)/g, (_m, p, u) => `${p}<a href="${u}" target="_blank" rel="noopener">${u}</a>`);
    return h;
  }
  function md(src: string) {
    const out: string[] = [];
    let para: string[] = [], list: string[] = [];
    const flushP = () => { if (para.length) out.push('<p>' + para.map(inline).join('<br>') + '</p>'); para = []; };
    const flushL = () => { if (list.length) out.push('<ul>' + list.map((x) => '<li>' + inline(x) + '</li>').join('') + '</ul>'); list = []; };
    src.replace(/\r/g, '').split('\n').forEach((line) => {
      const m = line.match(/^\s*(?:[-*•]|\d+[.)])\s+(.*)$/);
      if (m) { flushP(); list.push(m[1]); return; }
      if (!line.trim()) { flushP(); flushL(); return; }
      flushL();
      para.push(line.replace(/^#{1,6}\s+/, ''));
    });
    flushP(); flushL();
    return out.join('');
  }

  const ERR: Record<string, string> = {
    LIMIT_REACHED: 'intro_err_limit', RATE_LIMITED: 'intro_err_rate', MODERATED: 'intro_err_moderated', OFF_DUTY: 'intro_err_offduty',
    BUSY: 'intro_err_busy', GATEWAY_ERROR: 'intro_err_fail', UNAVAILABLE: 'intro_err_fail',
  };
  const errText = (code: string, fallback?: string) => (ERR[code] ? T(ERR[code]) : fallback || T('intro_err_fail'));

  let busy = false;
  async function ask(q: string) {
    q = q.trim();
    if (!q || busy) return;
    if (quotaLeft() === 0) { startChat(); add(sv(T('intro_err_limit'), 'err')); return; }
    if (q.length > 200) { add(sv(T('intro_err_long'), 'err')); return; }
    busy = true;
    startChat();
    const time = tm();
    const w = add(meMsg(q, time) + botMsg('<div class="ans typing"></div>', time));
    const ans = w.querySelector<HTMLElement>('.ans')!;
    let text = '', needsHuman = false, failed = '';
    const fail = (msg: string) => {
      failed = msg;
      if (!text) w.querySelector('.msg.bot')?.remove();
      add(sv(msg, 'err'));
    };
    const send = (threadId?: string) => fetch(`${AGENT_API}/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ visitor_id: visitorId(), message: q, nickname: ME.nickname, ...(threadId ? { thread_id: threadId } : {}) }),
    });
    try {
      const t0 = thread();
      let res = await send(t0?.id);
      if (res.status === 404 && t0) { lsSet(TK, null); res = await send(); }
      if (!res.ok || !res.body) {
        const j = await res.json().catch(() => ({} as any));
        if (j.code === 'LIMIT_REACHED') setQuota(0);
        if (j.code === 'RESERVED_NAME') fail(fill(T('intro_err_reserved'), { n: ME.nickname }));
        else if (res.status === 400 && /200/.test(j.message || '')) fail(T('intro_err_long'));
        else fail(errText(j.code, en() ? undefined : j.message));
        return;
      }
      const reader = res.body.getReader(), dec = new TextDecoder();
      let buf = '';
      const onEvent = (ev: any) => {
        if (ev.type === 'meta' && ev.thread_id) saveThread({ id: ev.thread_id });
        else if (ev.type === 'delta' && typeof ev.text === 'string') {
          text += ev.text;
          ans.innerHTML = md(text);
          const near = chatlog.scrollHeight - chatlog.scrollTop - chatlog.clientHeight < 80;
          if (near) chatlog.scrollTop = chatlog.scrollHeight;
        } else if (ev.type === 'needs_human') needsHuman = true;
        else if (ev.type === 'done') {
          if (ev.needs_human) needsHuman = true;
          if (typeof ev.round === 'number' && typeof ev.maxRounds === 'number') setQuota(ev.maxRounds - ev.round);
          if (typeof ev.last_message_id === 'number') saveThread({ last: ev.last_message_id });
        } else if (ev.type === 'error') fail(errText(ev.code, en() ? undefined : ev.message));
      };
      for (;;) {
        const { value, done } = await reader.read();
        if (done) break;
        buf += dec.decode(value, { stream: true });
        let i;
        while ((i = buf.indexOf('\n\n')) >= 0) {
          const chunk = buf.slice(0, i); buf = buf.slice(i + 2);
          const data = chunk.split('\n').filter((l) => l.startsWith('data:')).map((l) => l.slice(5).trim()).join('');
          if (data) { try { onEvent(JSON.parse(data)); } catch { /* ignore a bad frame */ } }
        }
      }
      if (!text && !failed) ans.textContent = T('intro_no_answer');
      if (needsHuman && !failed) ans.insertAdjacentHTML('afterend', mailForm());
    } catch {
      fail(T('intro_err_net'));
    } finally {
      ans.classList.remove('typing');
      busy = false;
      chatlog.scrollTop = chatlog.scrollHeight;
    }
  }

  async function handoff(f: HTMLFormElement) {
    const inp = f.querySelector('input')!, btn = f.querySelector('button')!, er = f.querySelector<HTMLElement>('.er')!;
    const email = inp.value.trim();
    const showErr = (m: string) => { er.textContent = m; er.hidden = false; };
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) { showErr(T('intro_mail_bad')); inp.focus(); return; }
    const t0 = thread();
    if (!t0) { showErr(T('intro_err_handoff')); return; }
    er.hidden = true;
    btn.disabled = true;
    const label = btn.textContent;
    btn.textContent = T('intro_mail_sending');
    try {
      const res = await fetch(`${AGENT_API}/handoff`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ visitor_id: visitorId(), thread_id: t0.id, email, nickname: ME.nickname }),
      });
      const j = await res.json().catch(() => ({} as any));
      if (!res.ok) {
        const m = j.code === 'INVALID_EMAIL' || j.code === 'EMAIL_REQUIRED' ? T('intro_mail_bad')
          : j.code === 'RESERVED_NAME' ? (j.field === 'email' ? T('intro_err_mail_reserved') : fill(T('intro_err_reserved'), { n: ME.nickname }))
          : j.code === 'RATE_LIMITED' ? T('intro_err_handoff_wait')
          : j.code === 'LIMIT_REACHED' ? T('intro_err_handoff_limit')
          : j.code === 'MODERATED' ? T('intro_err_moderated') : T('intro_err_handoff');
        showErr(m);
        return;
      }
      saveThread({ handed: true, handedAt: Date.now(), ...(typeof j.last_message_id === 'number' ? { last: j.last_message_id } : {}) });
      const d = document.createElement('div');
      d.innerHTML = sv(fill(T('intro_mail_sent'), { m: email }), 'ok');
      f.replaceWith(d.firstChild!);
      pollReply(true);
    } catch {
      showErr(T('intro_err_net'));
    } finally {
      btn.disabled = false;
      btn.textContent = label;
    }
  }

  // Airing answers hand-offs from Telegram; the reply lands in the thread.
  let pollTimer = 0;
  async function fetchMessages(after: number) {
    const t0 = thread();
    if (!t0) return null;
    const qs = new URLSearchParams({ visitor_id: visitorId(), thread_id: t0.id, after: String(after) });
    const res = await fetch(`${AGENT_API}/messages?${qs}`, { cache: 'no-store' });
    if (res.status === 404) { lsSet(TK, null); return null; }
    return res.ok ? res.json() : null;
  }
  function pollReply(schedule = false) {
    clearTimeout(pollTimer);
    const t0 = thread();
    if (!t0 || !t0.handed || Date.now() - (t0.handedAt || 0) > POLL_REPLY_FOR_MS) return;
    const tick = async () => {
      if (!document.hidden) {
        const j = await fetchMessages(thread()?.last || 0).catch(() => null);
        const rows: any[] = (j && j.messages) || [];
        rows.filter((m) => m.role === 'human').forEach((m) => add(humanMsg(m.content, hmOf(m.created_at))));
        if (rows.length) saveThread({ last: rows[rows.length - 1].id });
      }
      pollReply(true);
    };
    if (schedule) pollTimer = window.setTimeout(tick, POLL_REPLY_MS); else tick();
  }
  const hmOf = (iso: string) => {
    try { return new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Singapore', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(new Date(iso)); } catch { return tm(); }
  };
  // A visitor who comes back finds the conversation where they left it when
  // Airing was asked to reply, or when they were here in the last half hour.
  async function restore() {
    const t0 = thread();
    if (!t0 || !(t0.handed || Date.now() - t0.at < RESTORE_WINDOW_MS)) return;
    const j = await fetchMessages(0).catch(() => null);
    const rows: any[] = (j && j.messages) || [];
    if (!rows.length || chatlog.childElementCount) return;
    startChat();
    let html = '';
    rows.forEach((m) => {
      const time = hmOf(m.created_at);
      if (m.role === 'user') html += meMsg(m.content, time);
      else if (m.role === 'assistant') html += botMsg(`<div class="ans">${md(m.content)}</div>`, time);
      else if (m.role === 'human') html += humanMsg(m.content, time);
      else if (m.role === 'notice') html += sv(m.content, 'ok');
    });
    add(html);
    saveThread({ last: rows[rows.length - 1].id, ...(j.handed_off ? { handed: true } : {}) });
    if (j.handed_off) pollReply(true);
  }

  // ── events ──
  card.addEventListener('click', (e) => {
    const tg = e.target as HTMLElement;
    const chip = tg.closest('.js-ask');
    if (chip) {
      const q = chip.querySelector('[data-i18n]')?.textContent || '';
      window.umami?.track('chat-suggestion', { text: q });
      ask(q);
      return;
    }
    const mini = tg.closest('.js-mini');
    if (mini) { const on = logw.classList.toggle('peek'); mini.setAttribute('aria-expanded', String(on)); return; }
    if (tg.closest('.js-idb')) { openPanel(!idp.classList.contains('on')); return; }
    if (tg.closest('.js-idx')) { openPanel(false); return; }
    const av = tg.closest<HTMLElement>('.js-av');
    if (av) { const out = setAvatar(av.dataset.av!); if (out) { startChat(); add(out); } return; }
    if (tg.closest('.js-nickok')) {
      const ni = idp.querySelector<HTMLInputElement>('.js-nick')!;
      startChat(); add(setNick(ni.value)); ni.value = '';
      return;
    }
    const inpWrap = tg.closest('.inp');
    if (inpWrap && !tg.closest('button')) input.focus();
  });
  document.addEventListener('click', (e) => {
    const tg = e.target as HTMLElement;
    if (idp.classList.contains('on') && !tg.closest('.js-idp') && !tg.closest('.js-idb')) openPanel(false);
  });
  card.addEventListener('submit', (e) => {
    const f = (e.target as HTMLElement).closest<HTMLFormElement>('.js-mailf');
    if (!f) return;
    e.preventDefault();
    handoff(f);
  });
  card.addEventListener('keydown', (e) => {
    const el = e.target as HTMLInputElement;
    if (e.key === 'Escape') { openPanel(false); return; }
    if (e.key !== 'Enter' || e.isComposing) return;
    if (el.classList.contains('js-nick')) { e.preventDefault(); startChat(); add(setNick(el.value)); el.value = ''; return; }
    if (el !== input) return;
    e.preventDefault();
    const v = input.value.trim();
    if (!v) return;
    const mm = v.match(/^\/(nick|avatar)\b\s*(.*)$/i);
    input.value = '';
    if (!mm) { ask(v); return; }
    startChat();
    add(`<div class="ln"><time>${tm()}</time><img class="av va js-me-a" src="${avSrc(ME.avatar_id)}" alt=""><span class="nk me js-me-n">&lt;${esc(ME.nickname)}&gt;</span>${esc(v)}</div>`);
    if (mm[1].toLowerCase() === 'nick') { if (mm[2]) add(setNick(mm[2])); else openPanel(true); return; }
    const arg = mm[2].trim().toLowerCase();
    const hit = AV.find((a) => a[0] === arg || a[1] === arg || a[2].toLowerCase() === arg);
    if (hit) add(setAvatar(hit[0])); else openPanel(true);
  });

  // ── boot ──
  syncId();
  window.setTimeout(() => card.classList.remove('play'), 1600);
  const start = () => {
    ready = true;
    renderQuota();
    render();
    fetchPresence();
    window.setInterval(fetchPresence, PRESENCE_MS);
    window.setInterval(render, 30_000);
    restore();
    pollReply();
  };
  (window._i18nReady || Promise.resolve()).then(start, start);
  window.addEventListener('langchange', () => {
    renderQuota();
    render();
    if (idp.innerHTML) { const on = idp.classList.contains('on'); idp.innerHTML = idPanelHtml(); idp.classList.toggle('on', on); }
    card.querySelectorAll('.mailf2').forEach((f) => {
      (f.querySelector('input') as HTMLInputElement).placeholder = T('intro_mail_ph');
      const b = f.querySelector('button')!; if (!b.disabled) b.textContent = T('intro_mail_send');
    });
  });
}

export {};
