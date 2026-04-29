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
  var apiBase = cfg.apiBase ||
    ((location.hostname === 'localhost' || location.hostname === '127.0.0.1')
      ? 'http://localhost:3000'
      : 'https://chat.ursb.me');

  var HEARTBEAT_MS = 30000;
  var POLL_MS = 30000;

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
      .then(function (counts) { if (counts) render(counts); })
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

  function render(counts) {
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
      el.innerHTML = template.replace('{n}', String(n));
      el.style.display = '';
      el.classList.add('loaded');
    }
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
