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
      ? (location.protocol + '//' + location.hostname + ':3001')
      : 'https://chat.ursb.me');

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

    return regionText +
      '<span class="online-country-popover" role="status">' +
        '<span class="online-country-title">' + escapeHtml(title) + '</span>' +
        '<span class="online-country-list">' + list + '</span>' +
        '<span class="online-country-total">' + escapeHtml(totalTemplate.replace('{n}', String(n))) + '</span>' +
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
        }
        return;
      }

      event.preventDefault();
      event.stopPropagation();
      var willOpen = !trigger.classList.contains('online-popover-open');
      for (var j = 0; j < openEls.length; j++) {
        openEls[j].classList.remove('online-popover-open');
        openEls[j].setAttribute('aria-expanded', 'false');
      }
      trigger.classList.toggle('online-popover-open', willOpen);
      trigger.setAttribute('aria-expanded', willOpen ? 'true' : 'false');
    });

    document.addEventListener('keydown', function (event) {
      if (event.key !== 'Escape' || !document.querySelectorAll) return;
      var openEls = document.querySelectorAll('[data-online-countries="popover"].online-popover-open');
      for (var i = 0; i < openEls.length; i++) {
        openEls[i].classList.remove('online-popover-open');
        openEls[i].setAttribute('aria-expanded', 'false');
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
