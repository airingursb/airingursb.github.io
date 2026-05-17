/* Online presence client.
 *
 * Page sets `window.__ONLINE_CONFIG__` BEFORE this script loads:
 *   {
 *     pageId: 'note/helio' | null,        // null/undefined = site-wide page
 *     apiBase: 'https://chat.ursb.me',    // optional override
 *     tiers: [                            // optional; per-page tiered copy
 *       { max: 1,  html: '✦ alone' },
 *       { max: 9,  html: '● {n} reading' },
 *       ...                               // last tier covers everything above
 *     ]
 *   }
 *
 * Page provides one or more elements with [data-online] attribute:
 *   data-online="site" | "page"           // which count to render
 *   data-online-template="· ● {n} online" // {n} placeholder; ignored if tiers set
 *   data-online-min="1"                   // optional, hide if count below this
 *
 * Pages can call `window.__onlineRefresh()` to re-render (e.g. after lang change).
 *
 * Every tab heartbeats independently (no leader election) because the
 * backend tracks (client_id, page_id) composite keys. Same person on
 * different pages = separate entries; site count dedupes by client_id.
 */
(function () {
  var cfg = window.__ONLINE_CONFIG__ || {};
  var pageId = cfg.pageId || null;

  // Inject scene-specific CSS once on first script run.
  (function injectSceneCss() {
    if (typeof document === 'undefined' || !document.head || document.getElementById('vps-style')) return;
    var s = document.createElement('style');
    s.id = 'vps-style';
    s.textContent =
      '.online-country-popover .online-scene {' +
        'display: block;' +
        'width: 100%;' +
        'max-width: 320px;' +
        'height: auto;' +
        'aspect-ratio: 360 / 200;' +
        'margin: 10px auto 6px;' +
        'border-radius: 6px;' +
        'image-rendering: pixelated;' +
      '}' +
      '.online-country-popover .online-see-more {' +
        'display: block;' +
        'text-align: center;' +
        'margin-top: 6px;' +
        'padding: 6px 12px;' +
        'font-family: ui-monospace, monospace;' +
        'font-size: 11px;' +
        'letter-spacing: .1em;' +
        'color: var(--accent, #4ade80);' +
        'text-decoration: none;' +
        'border-top: 1px solid rgba(255,255,255,.08);' +
      '}' +
      '.online-country-popover .online-see-more:hover { color: #fff; }';
    document.head.appendChild(s);
  })();
  // Default to prod (chat.ursb.me CORS whitelists localhost:4321-4323 so
  // local dev "just works" without spinning up a blog-api locally).
  // To target a local blog-api, set window.__ONLINE_CONFIG__ = { apiBase: 'http://localhost:3001' }
  // before this script loads.
  var apiBase = cfg.apiBase || 'https://chat.ursb.me';

  var HEARTBEAT_MS = 30000;
  var POLL_MS = 30000;
  var isLocalDev = location.hostname === 'localhost' || location.hostname === '127.0.0.1';

  // ── Identity ─────────────────────────────────────────────────────────
  function uuid() {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
      var r = (Math.random() * 16) | 0;
      var v = c === 'x' ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  }

  var clientId;
  try {
    clientId = localStorage.getItem('online_client_id');
    if (!clientId) {
      clientId = uuid();
      localStorage.setItem('online_client_id', clientId);
    }
  } catch (e) {
    clientId = uuid();
  }

  // ── Heartbeat (every tab sends its own) ──────────────────────────────
  // Response carries current counts so first paint is instant (no 30s gap).
  function sendHeartbeat() {
    var body = JSON.stringify({ client_id: clientId, page_id: pageId });
    fetch(apiBase + '/api/online/heartbeat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: body,
      keepalive: true
    })
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (counts) {
        if (!counts) return;
        if (counts.country) {
          try { sessionStorage.setItem('vp_country', counts.country); } catch (_) {}
          try {
            window.dispatchEvent(new CustomEvent('visitor-country-ready', {
              detail: { country: counts.country }
            }));
          } catch (_) {}
        }
        render(counts);
      })
      .catch(function () {});
  }

  // ── Display polling ──────────────────────────────────────────────────
  var elements = document.querySelectorAll
    ? Array.prototype.slice.call(document.querySelectorAll('[data-online]'))
    : [];

  function pickTierTemplate(n) {
    var tiers = (window.__ONLINE_CONFIG__ || {}).tiers;
    if (!tiers || !tiers.length) return null;
    for (var i = 0; i < tiers.length; i++) {
      if (n <= tiers[i].max) return tiers[i].html;
    }
    return tiers[tiers.length - 1].html;
  }

  var lastCounts = null;
  var popoverBound = false;

  function isCountryCode(countryCode) {
    return /^[A-Z]{2}$/.test(String(countryCode || '').toUpperCase());
  }

  function getFlagEmoji(countryCode) {
    if (!isCountryCode(countryCode)) return '';
    var codePoints = String(countryCode)
      .toUpperCase()
      .split('')
      .map(function (char) { return 127397 + char.charCodeAt(0); });
    return String.fromCodePoint.apply(String, codePoints);
  }

  function getCountryName(countryCode, locale) {
    var cc = String(countryCode || '').toUpperCase();
    try {
      if (typeof Intl !== 'undefined' && Intl.DisplayNames) {
        return new Intl.DisplayNames([locale || 'en'], { type: 'region' }).of(cc) || cc;
      }
    } catch (e) {}
    return cc;
  }

  function escapeHtml(value) {
    return String(value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function getCountryRows(countries) {
    if (!countries) return [];
    return Object.entries(countries)
      .filter(function (entry) {
        var cc = String(entry[0] || '').toUpperCase();
        var count = Number(entry[1]) || 0;
        return isCountryCode(cc) && cc !== 'XX' && count > 0;
      })
      .sort(function (a, b) { return b[1] - a[1] || String(a[0]).localeCompare(String(b[0])); });
  }

  function applyLocalDemoCounts(counts) {
    var demoCountries = (window.__ONLINE_CONFIG__ || {}).demoCountries;
    if (!isLocalDev || !demoCountries) return counts;

    var rows = getCountryRows(counts && counts.countries);
    if (rows.length > 0) return counts;

    var demoRows = getCountryRows(demoCountries);
    if (demoRows.length === 0) return counts;

    var demoTotal = demoRows.reduce(function (sum, entry) {
      return sum + (Number(entry[1]) || 0);
    }, 0);

    return {
      site: Math.max(counts.site || 0, demoTotal),
      page: counts.page,
      countries: demoCountries
    };
  }

  // ─── Scene: pixel lobby (sub-project A) ───────────────────────────────
  // Mirrored from src/pages/index.astro:1894+ — keep in sync if mascot art changes.
  var BEAR_FRAME = [
    [0,0,1,1,0,0,0,0,0,1,1,0,0],
    [0,1,3,2,1,0,0,0,1,2,3,1,0],
    [0,1,2,2,1,1,1,1,1,2,2,1,0],
    [1,2,2,2,2,2,2,2,2,2,2,2,1],
    [1,2,2,4,2,2,2,2,2,4,2,2,1],
    [1,2,2,2,2,2,2,2,2,2,2,2,1],
    [1,2,2,6,2,2,4,2,2,6,2,2,1],
    [1,2,2,2,2,2,2,2,2,2,2,2,1],
    [0,1,2,2,2,2,2,2,2,2,2,1,0],
    [0,0,1,1,2,2,2,2,2,1,1,0,0],
    [0,0,1,2,2,3,3,3,2,2,1,0,0],
    [0,0,1,2,3,3,3,3,3,2,1,0,0],
    [0,0,1,2,2,2,2,2,2,2,1,0,0],
    [0,0,0,1,2,1,0,1,2,1,0,0,0],
    [0,0,0,1,1,0,0,0,1,1,0,0,0]
  ];

  var REGION_BY_CC = {
    CN:'asia',JP:'asia',KR:'asia',TW:'asia',HK:'asia',SG:'asia',IN:'asia',
    TH:'asia',VN:'asia',PH:'asia',ID:'asia',MY:'asia',AE:'asia',SA:'asia',
    IL:'asia',TR:'asia',PK:'asia',BD:'asia',
    US:'americas',CA:'americas',MX:'americas',BR:'americas',AR:'americas',
    CL:'americas',CO:'americas',PE:'americas',
    GB:'europe',DE:'europe',FR:'europe',NL:'europe',ES:'europe',IT:'europe',
    SE:'europe',NO:'europe',FI:'europe',DK:'europe',PL:'europe',CH:'europe',
    AT:'europe',BE:'europe',IE:'europe',PT:'europe',GR:'europe',CZ:'europe',
    RU:'europe',UA:'europe',
    AU:'oceania',NZ:'oceania',
    ZA:'africa',EG:'africa',NG:'africa',KE:'africa',MA:'africa'
  };
  var REGION_PALETTE = {
    asia:    { outline:'#6B4C30', body:'#A07850', belly:'#D4B896' },
    americas:{ outline:'#B5601A', body:'#E89B4B', belly:'#F8D9A8' },
    europe:  { outline:'#5A3E7E', body:'#9F7CC8', belly:'#DFD0F0' },
    oceania: { outline:'#2E5E8C', body:'#6FA3D9', belly:'#B8D9F0' },
    africa:  { outline:'#B58E1A', body:'#E8C24B', belly:'#F8E8A8' },
    unknown: { outline:'#3a3a3a', body:'#888888', belly:'#bbbbbb' }
  };

  // 7 fixed bear slots in the scene: [x, y, scale, flip]
  var BEAR_SLOTS = [
    [50,  116, 1.5, false],
    [75,  116, 1.5, true],
    [115, 130, 1.4, false],
    [174, 116, 1.5, false],
    [196, 116, 1.5, true],
    [305, 116, 1.5, false],
    [100, 76,  1.3, false]
  ];

  function renderBearSVG(palette, slot, isYou) {
    var x = slot[0], y = slot[1], scale = slot[2], flip = slot[3];
    var inner = '';
    for (var yi = 0; yi < BEAR_FRAME.length; yi++) {
      for (var xi = 0; xi < BEAR_FRAME[yi].length; xi++) {
        var v = BEAR_FRAME[yi][xi];
        if (v === 0) continue;
        var fill;
        if (v === 1) fill = palette.outline;
        else if (v === 2) fill = palette.body;
        else if (v === 3) fill = palette.belly;
        else if (v === 4) fill = '#1a1a1a';
        else if (v === 5) fill = '#fff';
        else if (v === 6) fill = '#FF9EAD';
        inner += '<rect x="' + xi + '" y="' + yi + '" width="1" height="1" fill="' + fill + '"/>';
      }
    }
    var transform = flip
      ? 'translate(' + x + ',' + y + ') scale(' + (-scale) + ' ' + scale + ') translate(-13,0)'
      : 'translate(' + x + ',' + y + ') scale(' + scale + ')';
    var ring = isYou
      ? '<rect x="-1" y="-1" width="15" height="17" fill="none" stroke="#4ade80" stroke-width="0.6" opacity="0.95"><animate attributeName="opacity" values="0.95;0.5;0.95" dur="1.6s" repeatCount="indefinite"/></rect>'
      : '';
    return '<g class="vps-bear" data-body="' + palette.body + '" transform="' + transform + '">' + ring + inner + '</g>';
  }

  // Furniture markup helpers (each returns a string; composed into FURNITURE_SVG below).
  function posterMarkup(x, y, color) {
    return '<g transform="translate(' + x + ',' + y + ')">' +
      '<rect width="18" height="22" fill="' + color + '" stroke="#000" stroke-width="0.5"/>' +
      '<rect x="2" y="2" width="14" height="12" fill="rgba(255,255,255,.2)"/>' +
      '<rect x="2" y="16" width="10" height="2" fill="rgba(255,255,255,.4)"/>' +
      '<rect x="2" y="19" width="6" height="1.5" fill="rgba(255,255,255,.3)"/>' +
    '</g>';
  }
  function pictureFrameMarkup(x, y, color) {
    return '<g transform="translate(' + x + ',' + y + ')">' +
      '<rect width="14" height="12" fill="#6b4226" stroke="#3a2412" stroke-width="0.5"/>' +
      '<rect x="1" y="1" width="12" height="10" fill="' + color + '"/>' +
    '</g>';
  }
  function plantMarkup(x, y) {
    return '<g transform="translate(' + x + ',' + y + ')">' +
      '<rect x="6" y="20" width="12" height="6" fill="#6B4226"/>' +
      '<rect x="7" y="22" width="10" height="4" fill="#8A5A36"/>' +
      '<path d="M10 20 Q4 10 8 0 Q14 8 12 18 Z" fill="#3a7a3a"/>' +
      '<path d="M14 20 Q22 12 18 2 Q12 10 16 18 Z" fill="#4a9a4a"/>' +
      '<path d="M12 20 Q12 4 14 0 Q16 10 14 18 Z" fill="#5aaa5a"/>' +
    '</g>';
  }
  function bookshelfMarkup(x, y) {
    return '<g transform="translate(' + x + ',' + y + ')">' +
      '<rect x="0" y="0" width="32" height="60" fill="#3a2412" stroke="#1a0a04" stroke-width="1"/>' +
      '<rect x="2" y="2" width="28" height="14" fill="#6b4226"/>' +
      '<rect x="2" y="18" width="28" height="14" fill="#6b4226"/>' +
      '<rect x="2" y="34" width="28" height="14" fill="#6b4226"/>' +
      '<rect x="3" y="4" width="4" height="10" fill="#e89b4b"/>' +
      '<rect x="8" y="3" width="3" height="11" fill="#9f7cc8"/>' +
      '<rect x="12" y="5" width="4" height="9" fill="#7dba7d"/>' +
      '<rect x="17" y="4" width="3" height="10" fill="#f590b0"/>' +
      '<rect x="21" y="6" width="5" height="8" fill="#6fa3d9"/>' +
      '<rect x="27" y="3" width="3" height="11" fill="#e8c24b"/>' +
      '<rect x="3" y="20" width="3" height="11" fill="#a07850"/>' +
      '<rect x="7" y="22" width="4" height="9" fill="#4ade80"/>' +
      '<rect x="12" y="19" width="3" height="12" fill="#fbbf24"/>' +
      '<rect x="16" y="21" width="5" height="10" fill="#c44e70"/>' +
      '<rect x="22" y="20" width="3" height="11" fill="#60a5fa"/>' +
      '<rect x="26" y="22" width="4" height="9" fill="#a78bfa"/>' +
      '<rect x="3" y="38" width="4" height="9" fill="#7dba7d"/>' +
      '<rect x="8" y="36" width="3" height="11" fill="#e89b4b"/>' +
      '<rect x="22" y="36" width="3" height="11" fill="#6b4226"/>' +
      '<circle cx="16" cy="42" r="4" fill="#3a7a3a"/>' +
      '<rect x="14" y="44" width="4" height="3" fill="#6b4226"/>' +
      '<rect x="26" y="38" width="4" height="9" fill="#9f7cc8"/>' +
      '<rect x="0" y="50" width="32" height="10" fill="#1a0a04"/>' +
    '</g>';
  }
  function jukeboxMarkup(x, y) {
    return '<g transform="translate(' + x + ',' + y + ')">' +
      '<rect x="0" y="8" width="24" height="40" fill="#7c3aed" stroke="#3a1a5a" stroke-width="1"/>' +
      '<path d="M0 8 Q12 -2 24 8" fill="#9f7cc8" stroke="#3a1a5a" stroke-width="1"/>' +
      '<rect x="3" y="14" width="18" height="10" fill="#1a1a1a"/>' +
      '<circle cx="7" cy="19" r="1.5" fill="#4ade80"/>' +
      '<circle cx="12" cy="19" r="1.5" fill="#fbbf24"/>' +
      '<circle cx="17" cy="19" r="1.5" fill="#e11d48"/>' +
      '<rect x="3" y="28" width="18" height="4" fill="#2a1a3a"/>' +
      '<rect x="4" y="36" width="6" height="6" fill="#fbbf24"/>' +
      '<rect x="14" y="36" width="6" height="6" fill="#fbbf24"/>' +
    '</g>';
  }
  function djboothMarkup(x, y) {
    return '<g transform="translate(' + x + ',' + y + ')">' +
      '<rect width="44" height="20" fill="#1a1a1a" stroke="#000" stroke-width="1"/>' +
      '<rect x="2" y="2" width="40" height="6" fill="#7c3aed"/>' +
      '<text x="4" y="7" font-family="ui-monospace,monospace" font-size="4" fill="#fff">DJ AIRING</text>' +
      '<circle cx="12" cy="14" r="4" fill="#fbbf24"/>' +
      '<circle cx="12" cy="14" r="2" fill="#1a1a1a"/>' +
      '<circle cx="22" cy="14" r="2" fill="#4ade80"/>' +
      '<circle cx="28" cy="14" r="2" fill="#e11d48"/>' +
      '<circle cx="34" cy="14" r="4" fill="#fbbf24"/>' +
      '<circle cx="34" cy="14" r="2" fill="#1a1a1a"/>' +
    '</g>';
  }
  function whiteboardMarkup(x, y) {
    return '<g transform="translate(' + x + ',' + y + ')">' +
      '<rect width="34" height="22" fill="#fff" stroke="#3a3a3a" stroke-width="0.5"/>' +
      '<line x1="3" y1="5" x2="20" y2="5" stroke="#4ade80" stroke-width="1"/>' +
      '<line x1="3" y1="9" x2="28" y2="9" stroke="#60a5fa" stroke-width="1"/>' +
      '<line x1="3" y1="13" x2="15" y2="13" stroke="#e11d48" stroke-width="1"/>' +
      '<rect x="24" y="13" width="6" height="5" fill="#fbbf24"/>' +
      '<rect x="3" y="16" width="5" height="4" fill="#f590b0"/>' +
    '</g>';
  }
  function vendingMarkup(x, y) {
    return '<g transform="translate(' + x + ',' + y + ')">' +
      '<rect width="26" height="52" fill="#e11d48" stroke="#7a0d2a" stroke-width="1"/>' +
      '<rect x="2" y="3" width="22" height="22" fill="#1a1a1a"/>' +
      '<rect x="4" y="5" width="4" height="6" fill="#fbbf24"/>' +
      '<rect x="10" y="5" width="4" height="6" fill="#4ade80"/>' +
      '<rect x="16" y="5" width="4" height="6" fill="#60a5fa"/>' +
      '<rect x="4" y="13" width="4" height="6" fill="#f590b0"/>' +
      '<rect x="10" y="13" width="4" height="6" fill="#a78bfa"/>' +
      '<rect x="16" y="13" width="4" height="6" fill="#e89b4b"/>' +
      '<rect x="6" y="28" width="14" height="14" fill="#1a1a1a"/>' +
      '<rect x="9" y="32" width="8" height="1.5" fill="#fbbf24"/>' +
      '<rect x="4" y="44" width="18" height="5" fill="#1a1a1a"/>' +
    '</g>';
  }
  function tvMarkup(x, y) {
    return '<g transform="translate(' + x + ',' + y + ')">' +
      '<rect x="0" y="6" width="36" height="22" fill="#1a1a1a" stroke="#000" stroke-width="1"/>' +
      '<rect x="2" y="8" width="32" height="18" fill="#7fc6ee"/>' +
      '<rect x="2" y="8" width="32" height="6" fill="#5b9bdb"/>' +
      '<circle cx="14" cy="18" r="3" fill="#fbbf24"/>' +
      '<rect x="4" y="22" width="6" height="3" fill="#fff" opacity="0.6"/>' +
      '<rect x="16" y="28" width="4" height="6" fill="#3a2412"/>' +
      '<rect x="10" y="34" width="16" height="2" fill="#6b4226"/>' +
    '</g>';
  }
  function coatrackMarkup(x, y) {
    return '<g transform="translate(' + x + ',' + y + ')">' +
      '<rect x="6" y="0" width="2" height="40" fill="#3a2412"/>' +
      '<ellipse cx="7" cy="42" rx="6" ry="2" fill="#6b4226"/>' +
      '<rect x="2" y="6" width="4" height="2" fill="#6b4226"/>' +
      '<rect x="8" y="6" width="4" height="2" fill="#6b4226"/>' +
      '<rect x="0" y="2" width="3" height="3" fill="#3a2412"/>' +
      '<rect x="11" y="2" width="3" height="3" fill="#3a2412"/>' +
      '<ellipse cx="0" cy="10" rx="4" ry="1.5" fill="#fbbf24"/>' +
      '<rect x="-1.5" y="6" width="3" height="4" fill="#fbbf24"/>' +
      '<rect x="10" y="7" width="3" height="14" fill="#e11d48"/>' +
    '</g>';
  }
  function couchMarkup(x, y, color, lighter) {
    return '<g transform="translate(' + x + ',' + y + ')">' +
      '<rect x="0" y="12" width="60" height="18" rx="3" fill="' + color + '" stroke="#3a1a5a" stroke-width="1"/>' +
      '<rect x="0" y="4" width="60" height="12" rx="2" fill="' + lighter + '" stroke="#3a1a5a" stroke-width="1"/>' +
      '<rect x="0" y="8" width="6" height="22" rx="2" fill="' + color + '" stroke="#3a1a5a" stroke-width="1"/>' +
      '<rect x="54" y="8" width="6" height="22" rx="2" fill="' + color + '" stroke="#3a1a5a" stroke-width="1"/>' +
    '</g>';
  }
  function coffeeTableMarkup(x, y) {
    return '<g transform="translate(' + x + ',' + y + ')">' +
      '<ellipse cx="22" cy="8" rx="22" ry="5" fill="#6b4226" stroke="#3a2412" stroke-width="1"/>' +
      '<ellipse cx="22" cy="6" rx="22" ry="5" fill="#a07850"/>' +
      '<rect x="6" y="10" width="2" height="8" fill="#3a2412"/>' +
      '<rect x="36" y="10" width="2" height="8" fill="#3a2412"/>' +
      '<rect x="10" y="2" width="4" height="5" fill="#e89b4b"/>' +
      '<rect x="20" y="1" width="4" height="6" fill="#fff"/>' +
      '<rect x="30" y="2" width="4" height="5" fill="#6fa3d9"/>' +
    '</g>';
  }
  function beanbagMarkup(x, y, color) {
    return '<g transform="translate(' + x + ',' + y + ')">' +
      '<ellipse cx="14" cy="14" rx="14" ry="8" fill="' + color + '" stroke="#7a3a0a" stroke-width="1"/>' +
      '<ellipse cx="14" cy="9" rx="10" ry="5" fill="' + color + '" opacity="0.7"/>' +
    '</g>';
  }
  function dogMarkup(x, y) {
    return '<g transform="translate(' + x + ',' + y + ')">' +
      '<rect x="0" y="3" width="10" height="6" fill="#d4b896" stroke="#6b4226" stroke-width="0.5"/>' +
      '<rect x="8" y="1" width="6" height="6" fill="#d4b896" stroke="#6b4226" stroke-width="0.5"/>' +
      '<rect x="11" y="3" width="2" height="2" fill="#1a1a1a"/>' +
      '<rect x="8" y="0" width="2" height="3" fill="#a07850"/>' +
      '<rect x="0" y="9" width="2" height="2" fill="#6b4226"/>' +
      '<rect x="3" y="9" width="2" height="2" fill="#6b4226"/>' +
      '<rect x="6" y="9" width="2" height="2" fill="#6b4226"/>' +
      '<rect x="9" y="9" width="2" height="2" fill="#6b4226"/>' +
      '<rect x="-2" y="4" width="3" height="1" fill="#6b4226"/>' +
    '</g>';
  }

  // Static furniture markup (everything except bears). Assembled lazily once.
  var FURNITURE_SVG = null;
  function buildFurnitureSvg() {
    if (FURNITURE_SVG) return FURNITURE_SVG;
    FURNITURE_SVG = [
      '<defs>',
        '<pattern id="vpsTile" x="0" y="0" width="32" height="32" patternUnits="userSpaceOnUse">',
          '<rect width="32" height="32" fill="#26304a"/>',
          '<rect x="0" y="0" width="16" height="16" fill="#2e3852"/>',
          '<rect x="16" y="16" width="16" height="16" fill="#2e3852"/>',
        '</pattern>',
        '<radialGradient id="vpsDisco">',
          '<stop offset="0%" stop-color="#fff"/>',
          '<stop offset="60%" stop-color="#a78bfa"/>',
          '<stop offset="100%" stop-color="#5a3e7e"/>',
        '</radialGradient>',
      '</defs>',
      '<rect width="360" height="200" fill="url(#vpsTile)"/>',
      '<rect width="360" height="50" fill="#1f2a40"/>',
      '<line x1="0" y1="50" x2="360" y2="50" stroke="#3a4868" stroke-width="1"/>',
      '<g transform="translate(140,6)">',
        '<rect width="32" height="14" rx="2" fill="#1a1a1a" stroke="#e11d48" stroke-width="1.5"/>',
        '<text x="16" y="10" font-family="ui-monospace,monospace" font-size="7" font-weight="700" fill="#e11d48" text-anchor="middle">AIRING\'S</text>',
      '</g>',
      '<path d="M 0 28 Q 180 36 360 28" stroke="#3a3a3a" stroke-width="0.5" fill="none"/>',
      '<g class="vps-bulbs">',
        '<circle cx="12"  cy="32" r="2" fill="#fbbf24"/>',
        '<circle cx="34"  cy="33" r="2" fill="#4ade80"/>',
        '<circle cx="56"  cy="34" r="2" fill="#60a5fa"/>',
        '<circle cx="78"  cy="34" r="2" fill="#f590b0"/>',
        '<circle cx="100" cy="35" r="2" fill="#fff"/>',
        '<circle cx="122" cy="35" r="2" fill="#fbbf24"/>',
        '<circle cx="144" cy="35" r="2" fill="#4ade80"/>',
        '<circle cx="166" cy="35" r="2" fill="#60a5fa"/>',
        '<circle cx="188" cy="35" r="2" fill="#f590b0"/>',
        '<circle cx="210" cy="35" r="2" fill="#fff"/>',
        '<circle cx="232" cy="34" r="2" fill="#fbbf24"/>',
        '<circle cx="254" cy="34" r="2" fill="#4ade80"/>',
        '<circle cx="276" cy="33" r="2" fill="#60a5fa"/>',
        '<circle cx="298" cy="32" r="2" fill="#f590b0"/>',
        '<circle cx="320" cy="31" r="2" fill="#fff"/>',
        '<circle cx="342" cy="30" r="2" fill="#fbbf24"/>',
      '</g>',
      '<g transform="translate(180,40)" class="vps-disco">',
        '<line x1="0" y1="-30" x2="0" y2="-8" stroke="#3a3a3a" stroke-width="0.5"/>',
        '<circle r="6" fill="url(#vpsDisco)" stroke="#5a3e7e" stroke-width="0.5"/>',
        '<circle cx="-1" cy="-1" r="1" fill="#fff" opacity="0.8"/>',
      '</g>',
      posterMarkup(8,   28, '#4ade80'),
      posterMarkup(30,  28, '#e89b4b'),
      posterMarkup(60,  28, '#6fa3d9'),
      posterMarkup(90,  28, '#f590b0'),
      pictureFrameMarkup(252, 30, '#fbbf24'),
      pictureFrameMarkup(268, 30, '#6fa3d9'),
      pictureFrameMarkup(284, 30, '#a78bfa'),
      posterMarkup(308, 28, '#e89b4b'),
      posterMarkup(330, 28, '#9f7cc8'),
      '<g transform="translate(225,38)">',
        '<circle r="6" fill="#fff" stroke="#1a1a1a" stroke-width="1"/>',
        '<line x1="0" y1="-3" x2="0" y2="0" stroke="#000" stroke-width="1"/>',
        '<line x1="0" y1="0" x2="3" y2="0" stroke="#000" stroke-width="0.8"/>',
      '</g>',
      plantMarkup(2,   60),
      bookshelfMarkup(28, 60),
      jukeboxMarkup(64, 75),
      djboothMarkup(94, 70),
      whiteboardMarkup(150, 58),
      vendingMarkup(192, 70),
      plantMarkup(225, 60),
      tvMarkup(252, 60),
      plantMarkup(296, 60),
      coatrackMarkup(330, 60),
      couchMarkup(40,  130, '#7c3aed', '#a78bfa'),
      coffeeTableMarkup(108, 145),
      couchMarkup(166, 130, '#3a7a3a', '#7dba7d'),
      coffeeTableMarkup(234, 145),
      couchMarkup(292, 130, '#e11d48', '#f590b0'),
      '<ellipse cx="180" cy="190" rx="170" ry="10" fill="#7c3aed" opacity="0.15"/>',
      beanbagMarkup(8,   175, '#fbbf24'),
      beanbagMarkup(326, 175, '#4ade80'),
      dogMarkup(140, 178),
      '<rect x="118" y="139" width="3" height="4" fill="#e11d48"/>',
      '<rect x="245" y="139" width="3" height="4" fill="#fbbf24"/>'
    ].join('');
    return FURNITURE_SVG;
  }

  // CSS animations injected inside the scene SVG itself for self-containment.
  var SCENE_STYLE = '<style>' +
    '.vps-bulbs circle { animation: vps-bulb 5s ease-in-out infinite; }' +
    '.vps-bulbs circle:nth-child(odd) { animation-delay: 1.7s; }' +
    '.vps-bulbs circle:nth-child(3n) { animation-delay: 3.1s; }' +
    '@keyframes vps-bulb { 0%,100% { opacity: 1; } 50% { opacity: 0.55; } }' +
    '.vps-disco circle:first-of-type { animation: vps-disco 4s ease-in-out infinite; }' +
    '@keyframes vps-disco { 0%,100% { opacity: 1; } 50% { opacity: 0.7; } }' +
    '@media (prefers-reduced-motion: reduce) {' +
      '.vps-bulbs circle, .vps-disco circle:first-of-type { animation: none !important; }' +
    '}' +
  '</style>';

  function getSelfCountry() {
    try { return sessionStorage.getItem('vp_country') || null; } catch (_) { return null; }
  }

  function assignBearsToSlots(countries, total, selfCountry) {
    var slots = [];
    var remaining = {};
    Object.keys(countries || {}).forEach(function (cc) {
      remaining[cc.toUpperCase()] = Number(countries[cc]) || 0;
    });

    var self = selfCountry ? selfCountry.toUpperCase() : null;
    if (self && remaining[self] > 0) {
      var selfRegion = REGION_BY_CC[self] || 'unknown';
      slots.push({ palette: REGION_PALETTE[selfRegion], isYou: true });
      remaining[self] -= 1;
    }

    var entries = Object.keys(remaining)
      .filter(function (cc) { return remaining[cc] > 0; })
      .map(function (cc) { return [cc, remaining[cc]]; });
    entries.sort(function (a, b) {
      if (b[1] !== a[1]) return b[1] - a[1];
      return a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0;
    });

    for (var i = 0; i < entries.length && slots.length < 7; i++) {
      var cc = entries[i][0];
      var n = entries[i][1];
      var region = REGION_BY_CC[cc] || 'unknown';
      for (var k = 0; k < n && slots.length < 7; k++) {
        slots.push({ palette: REGION_PALETTE[region], isYou: false });
      }
    }
    while (slots.length < Math.min(total, 7)) {
      slots.push({ palette: REGION_PALETTE.unknown, isYou: false });
    }
    return slots;
  }

  function renderLobbyScene(counts) {
    var total = Number(counts && counts.site) || 0;
    if (total < 1) return '';

    var slots = assignBearsToSlots(counts.countries || {}, total, getSelfCountry());
    var bears = '';
    for (var i = 0; i < slots.length; i++) {
      bears += renderBearSVG(slots[i].palette, BEAR_SLOTS[i], slots[i].isYou);
    }
    var overflow = total - slots.length;
    var overflowText = overflow > 0
      ? '<text x="340" y="14" font-family="ui-monospace,monospace" font-size="10" font-weight="700" fill="#fff" text-anchor="end" opacity="0.85">+' + overflow + '</text>'
      : '';

    return '<svg class="online-scene" viewBox="0 0 360 200" xmlns="http://www.w3.org/2000/svg" shape-rendering="crispEdges" preserveAspectRatio="xMidYMid meet">' +
      SCENE_STYLE +
      buildFurnitureSvg() +
      bears +
      overflowText +
    '</svg>';
  }

  // Blink one random visible bear every 6-10s while popover is open.
  function startSceneBlinks(trigger) {
    stopSceneBlinks(trigger);
    var svg = trigger.querySelector('.online-scene');
    if (!svg) return;
    var bears = svg.querySelectorAll('.vps-bear');
    if (!bears || bears.length === 0) return;

    var mql = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)');
    if (mql && mql.matches) return;

    function tick() {
      var pick = bears[Math.floor(Math.random() * bears.length)];
      if (pick.querySelector('.vps-blink-eye')) return;
      var ns = 'http://www.w3.org/2000/svg';
      var overlay = document.createElementNS(ns, 'rect');
      overlay.setAttribute('class', 'vps-blink-eye');
      overlay.setAttribute('x', '3');
      overlay.setAttribute('y', '4');
      overlay.setAttribute('width', '7');
      overlay.setAttribute('height', '1');
      overlay.setAttribute('fill', pick.getAttribute('data-body') || '#A07850');
      pick.appendChild(overlay);
      setTimeout(function () {
        if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
      }, 140);
    }

    trigger._vpsBlinkTimer = setInterval(tick, 6000 + Math.floor(Math.random() * 4000));
  }
  function stopSceneBlinks(trigger) {
    if (trigger && trigger._vpsBlinkTimer) {
      clearInterval(trigger._vpsBlinkTimer);
      trigger._vpsBlinkTimer = null;
    }
  }

  function renderCountryPopover(el, rows, n) {
    var min = parseInt(el.getAttribute('data-online-region-min') || '2', 10);
    if (rows.length < min || el.getAttribute('data-online-countries') !== 'popover') return '';

    var locale = el.getAttribute('data-online-locale') || document.documentElement.lang || 'en';
    var regionLabel = el.getAttribute('data-online-region-label') || 'regions';
    var title = el.getAttribute('data-online-popover-title') || 'Readers by region';
    var totalTemplate = el.getAttribute('data-online-total-template') || '{n} readers online';
    var regionText = '<span class="online-region"><span class="online-region-sep">·</span>' +
      '<span class="online-region-count">' + rows.length + '</span> ' + escapeHtml(regionLabel) + '</span>';

    var list = rows.map(function (entry) {
      var cc = String(entry[0]).toUpperCase();
      var count = Number(entry[1]) || 0;
      return '<div class="online-country-row">' +
        '<span class="online-country-name"><span class="online-country-flag">' + getFlagEmoji(cc) + '</span>' +
        escapeHtml(getCountryName(cc, locale)) + '</span>' +
        '<span class="online-country-count">' + count + '</span>' +
      '</div>';
    }).join('');

    var sceneHtml = '';
    try { sceneHtml = renderLobbyScene(lastCounts); } catch (_) { /* defensive */ }

    return regionText +
      '<span class="online-country-popover" role="status">' +
        '<span class="online-country-title">' + escapeHtml(title) + '</span>' +
        '<span class="online-country-list">' + list + '</span>' +
        sceneHtml +
        '<span class="online-country-total">' + escapeHtml(totalTemplate.replace('{n}', String(n))) + '</span>' +
        '<a class="online-see-more" href="/lounge">See more →</a>' +
      '</span>';
  }

  function bindPopoverInteractions() {
    if (popoverBound || !document.addEventListener) return;
    popoverBound = true;

    document.addEventListener('click', function (event) {
      var target = event.target;
      var trigger = target && target.closest
        ? target.closest('[data-online-countries="popover"]')
        : null;

      var openEls = document.querySelectorAll
        ? document.querySelectorAll('[data-online-countries="popover"].online-popover-open')
        : [];

      if (!trigger || !trigger.querySelector('.online-country-popover')) {
        for (var i = 0; i < openEls.length; i++) {
          openEls[i].classList.remove('online-popover-open');
          openEls[i].setAttribute('aria-expanded', 'false');
          stopSceneBlinks(openEls[i]);
        }
        return;
      }

      event.preventDefault();
      event.stopPropagation();
      var willOpen = !trigger.classList.contains('online-popover-open');
      for (var j = 0; j < openEls.length; j++) {
        openEls[j].classList.remove('online-popover-open');
        openEls[j].setAttribute('aria-expanded', 'false');
        stopSceneBlinks(openEls[j]);
      }
      trigger.classList.toggle('online-popover-open', willOpen);
      trigger.setAttribute('aria-expanded', willOpen ? 'true' : 'false');
      if (willOpen) startSceneBlinks(trigger);
      else stopSceneBlinks(trigger);
    });

    document.addEventListener('keydown', function (event) {
      if (event.key !== 'Escape' || !document.querySelectorAll) return;
      var openEls = document.querySelectorAll('[data-online-countries="popover"].online-popover-open');
      for (var i = 0; i < openEls.length; i++) {
        openEls[i].classList.remove('online-popover-open');
        openEls[i].setAttribute('aria-expanded', 'false');
        stopSceneBlinks(openEls[i]);
      }
    });
  }

  function render(counts) {
    counts = applyLocalDemoCounts(counts || {});
    lastCounts = counts;
    for (var i = 0; i < elements.length; i++) {
      var el = elements[i];
      var mode = el.getAttribute('data-online') || 'site';
      var n = mode === 'page' ? (counts.page || 0) : (counts.site || 0);
      var min = parseInt(el.getAttribute('data-online-min') || '1', 10);
      if (n < min) {
        el.style.display = 'none';
        continue;
      }
      var template = pickTierTemplate(n) || el.getAttribute('data-online-template') || '{n}';
      var rows = getCountryRows(counts.countries);
      var wasOpen = el.classList.contains('online-popover-open');
      el.innerHTML = template.replace('{n}', String(n)) + renderCountryPopover(el, rows, n);
      el.style.display = '';
      el.classList.add('loaded');

      // ── Country summary fallback ───────────────────────────────────────
      var countryMode = el.getAttribute('data-online-countries');
      var regionMin = parseInt(el.getAttribute('data-online-region-min') || '2', 10);
      var shouldShowCountrySummary = countryMode === 'popover' ? rows.length >= regionMin : rows.length > 0;
      if (shouldShowCountrySummary) {
        el.style.cursor = 'pointer';
        el.setAttribute('tabindex', '0');
        el.setAttribute('role', 'button');
        el.setAttribute('aria-haspopup', 'dialog');
        el.setAttribute('aria-expanded', wasOpen ? 'true' : 'false');
        el.classList.toggle('online-popover-open', wasOpen);
        el.title = rows
          .map(function (entry) {
            var cc = String(entry[0]).toUpperCase();
            return getFlagEmoji(cc) + ' ' + getCountryName(cc, el.getAttribute('data-online-locale')) + ': ' + entry[1];
          })
          .join('\n');
      } else {
        el.style.cursor = '';
        el.classList.remove('online-popover-open');
        el.removeAttribute('tabindex');
        el.removeAttribute('title');
        el.removeAttribute('role');
        el.removeAttribute('aria-haspopup');
        el.removeAttribute('aria-expanded');
      }
    }
    bindPopoverInteractions();
  }

  // Pages can call this after mutating templates / tiers to re-render with last counts.
  window.__onlineRefresh = function () {
    if (lastCounts) render(lastCounts);
  };

  function fetchCounts() {
    var qs = pageId ? ('?page_id=' + encodeURIComponent(pageId)) : '';
    fetch(apiBase + '/api/online/count' + qs, { cache: 'no-store' })
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (data) { if (data) render(data); })
      .catch(function () {});
  }

  // ── Boot ─────────────────────────────────────────────────────────────
  sendHeartbeat();
  setInterval(sendHeartbeat, HEARTBEAT_MS);

  if (elements.length > 0) {
    fetchCounts();
    setInterval(fetchCounts, POLL_MS);
  }
})();
