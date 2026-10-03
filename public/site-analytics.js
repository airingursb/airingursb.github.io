(() => {
  'use strict';
  if (window.siteAnalytics) return;
  const key = 'ursb:analytics:pending:v1';
  const production = ['ursb.me', 'www.ursb.me', 'airingursb.github.io'].includes(location.hostname);
  let pending = [], timer = 0;
  const read = () => {
    try {
      const saved = JSON.parse(sessionStorage.getItem(key) || '[]');
      if (Array.isArray(saved)) return saved.filter(event => event && /^(friend|echo|moment)-/.test(event.name) && event.data && typeof event.data === 'object' && Date.now() - event.at < 20 * 60 * 1000).slice(-50);
    } catch {}
    return pending;
  };
  pending = read();
  const save = () => { try { if (pending.length) sessionStorage.setItem(key, JSON.stringify(pending)); else sessionStorage.removeItem(key); } catch {} };
  const flush = () => {
    if (!window.umami?.track || !production) return false;
    pending = read();
    const batch = pending.splice(0);save();
    for (const event of batch) window.umami.track(event.name, { ...event.data, ...(event.path !== location.pathname ? { originPath: event.path } : {}) });
    clearInterval(timer);timer = 0;
    return true;
  };
  const wait = () => {
    if (timer || !production || !pending.length || flush()) return;
    timer = setInterval(() => {
      pending = read();
      if (!pending.length) { save();clearInterval(timer);timer = 0; }
      else flush();
    }, 1000);
  };
  window.siteAnalytics = {
    track(name, data) {
      if (!production) return;
      if (window.umami?.track) { flush();window.umami.track(name, data); }
      else {
        pending = read();
        pending.push({ name, data, at: Date.now(), path: location.pathname });
        if (pending.length > 50) pending.shift();save();wait();
      }
    },
    flush,
  };
  document.addEventListener('load', event => {
    if (event.target instanceof HTMLScriptElement && event.target.dataset.websiteId === 'aa8d5a16-df21-4058-a0a8-0191cdd3798d') flush();
  }, true);
  wait();
})();
