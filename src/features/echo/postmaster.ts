import { trackEcho } from './analytics';

for (const root of document.querySelectorAll<HTMLElement>('[data-postmaster]')) {
  const video = root.querySelector('video');
  const button = root.querySelector('button');
  if (!video || !button || !video.dataset.src) continue;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  let enabled = !reduced.matches;
  let visible = false;
  video.muted = true;
  button.hidden = false;

  function updateButton() {
    if (!button) return;
    button.setAttribute('aria-pressed', String(enabled));
    button.textContent = enabled ? button.dataset.pauseLabel ?? '' : button.dataset.playLabel ?? '';
  }

  async function syncPlayback() {
    if (!video) return;
    updateButton();
    if (!enabled || !visible || document.hidden) { video.pause(); return; }
    if (!video.hasAttribute('src')) video.src = video.dataset.src ?? '';
    try { await video.play(); }
    catch (error) {
      if (!(error instanceof DOMException)) throw error;
      if (error.name === 'AbortError') return;
      enabled = false;
      root.removeAttribute('data-ready');
      updateButton();
    }
  }

  video.addEventListener('playing', () => root.setAttribute('data-ready', ''));
  video.addEventListener('error', () => {
    root.removeAttribute('data-ready');
    button.hidden = true;
  });
  button.addEventListener('click', () => {
    enabled = !enabled;
    trackEcho('motion-toggle', { target: 'postmaster', action: enabled ? 'play' : 'pause' });
    void syncPlayback();
  });
  reduced.addEventListener('change', () => {
    enabled = !reduced.matches;
    if (reduced.matches) root.removeAttribute('data-ready');
    void syncPlayback();
  });
  document.addEventListener('visibilitychange', () => { void syncPlayback(); });
  const observer = new IntersectionObserver(entries => {
    visible = entries.some(entry => entry.isIntersecting);
    void syncPlayback();
  }, { threshold: 0.1 });
  observer.observe(root);
  updateButton();
}
