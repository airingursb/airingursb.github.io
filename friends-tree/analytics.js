(() => {
  'use strict';
  const production = ['ursb.me', 'www.ursb.me', 'airingursb.github.io'].includes(location.hostname);
  const pending = [];
  let timer = 0, attempts = 0;
  const flush = () => {
    if (!window.umami?.track) return false;
    for (const event of pending.splice(0)) window.umami.track(event.name, event.data);
    clearInterval(timer);timer = 0;
    return true;
  };
  const track = (name, detail = {}) => {
    const data = { module: 'friends', mode: document.documentElement.dataset.mode, ...detail };
    window.dispatchEvent(new CustomEvent('friend:analytics', { detail: { name, data } }));
    if (!production) return;
    if (window.umami?.track) window.umami.track(name, data);
    else {
      if (pending.length < 50) pending.push({ name, data });
      if (!timer) timer = setInterval(() => { if (!flush() && ++attempts >= 60) { clearInterval(timer);timer = 0; } }, 1000);
    }
  };
  window.friendTreeAnalytics = { track };
  document.querySelector('script[data-website-id="aa8d5a16-df21-4058-a0a8-0191cdd3798d"]')?.addEventListener('load', flush);
  track('friend-page-view');
  document.addEventListener('click', event => {
    if (!(event.target instanceof Element)) return;
    const target = event.target.closest('button,a');
    if (!target) return;
    if (target.matches('[data-tree]')) track('friend-tree-open', { tree: Number(target.dataset.tree) + 1 });
    else if (target.matches('.bell[data-friend]')) track('friend-bell-select', { friend: Number(target.dataset.friend) + 1, source: 'bell' });
    else if (target.matches('#directory-list [data-index]')) track('friend-bell-select', { friend: Number(target.dataset.index) + 1, source: 'directory' });
    else if (target.id === 'random-friend') track('friend-bell-select', { friend: Number(window.friendTreeModes?.getState().selected) + 1, source: 'random' });
    else if (target.id === 'open-directory' || target.id === 'open-archive') track('friend-directory-open', { scope: target.id === 'open-archive' ? 'archive' : 'all' });
    else if (target.id === 'branch-prev' || target.id === 'branch-next') track('friend-tree-open', { tree: Number(window.friendTreeModes?.getState().branch) + 1 });
    else if (target.id === 'wind-button' || target.id === 'wind-menu') track('friend-wind');
    else if (target.id === 'bear-touch') track('friend-bear-greet');
    else if (target.id === 'motion-toggle') track('friend-motion-toggle', { paused: window.friendTreeModes?.getState().paused });
    else if (target.id === 'modeToggle') track('friend-theme-toggle');
    else if (target.matches('.gb-avatar-option[data-avatar]')) track('friend-avatar-select', { avatar: target.dataset.avatar, kind: 'default' });
    else if (target.matches('[data-comment-id]')) track('friend-reply-open');
  });
  window.addEventListener('friend-draft-preview', event => track('friend-guestbook-preview', { kind: event.detail.mode === 'site' ? 'application' : 'message' }));
  document.getElementById('gb-avatar-url')?.addEventListener('change', event => {
    if (event.target.value.trim() && event.target.checkValidity()) track('friend-avatar-select', { kind: 'custom' });
  });
  let searchTimer = 0;
  document.getElementById('directory-search')?.addEventListener('input', event => {
    clearTimeout(searchTimer);
    if (!event.target.value.trim()) return;
    searchTimer = setTimeout(() => track('friend-search', { matches: document.querySelectorAll('#directory-list [data-index]').length }), 400);
  });
})();
