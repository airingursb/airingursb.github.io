class LivingCover extends HTMLElement {
  connectedCallback() {
    const slug = this.dataset.slug;
    const article = this.dataset.mode === 'article';
    const cards = article
      ? this.parentElement?.querySelectorAll<HTMLElement>('.article-cover-art') ?? []
      : document.querySelectorAll<HTMLAnchorElement>(`[data-article-card][data-slug="${slug}"]`);
    const reduced = matchMedia('(prefers-reduced-motion: reduce)');
    const coarse = matchMedia('(hover: none)');
    const connection = 'connection' in navigator && navigator.connection instanceof EventTarget
      ? navigator.connection : null;
    const savesData = () => connection !== null && 'saveData' in connection && connection.saveData === true;
    for (const card of cards) {
      const art = article ? card : card.querySelector<HTMLElement>('[data-article-cover]');
      if (!art) continue;
      const video = document.createElement('video');
      video.className = 'living-cover-video';
      video.muted = true;
      video.playsInline = true;
      video.preload = 'none';
      video.setAttribute('aria-hidden', 'true');
      video.tabIndex = -1;
      art.append(video);
      let visible = false;
      let playedOnTouch = false;
      let finished = false;
      let pending = 0;
      let version = 0;
      const stop = () => {
        version++;
        window.clearTimeout(pending);
        video.removeAttribute('data-playing');
        video.pause();
      };
      const start = async () => {
        if (finished || reduced.matches || savesData() || !visible || document.hidden) return;
        const current = ++version;
        video.hidden = false;
        if (!video.src) video.src = '/photo-motion/palace-clouds.mp4';
        if (!article) video.currentTime = 0;
        try {
          await video.play();
          if (current !== version || document.hidden || !visible || reduced.matches || savesData()) {
            if (current === version) video.pause();
            return;
          }
          video.setAttribute('data-playing', '');
        } catch (error) {
          if (!(error instanceof DOMException)) throw error;
          if (current === version) stop();
        }
      };
      const observer = new IntersectionObserver(entries => {
        const entry = entries[0];
        visible = entry !== undefined && entry.isIntersecting && entry.intersectionRatio >= .6;
        if (!visible) stop();
        else if (article) void start();
        else if (coarse.matches && !playedOnTouch && !reduced.matches && !savesData()) {
          pending = window.setTimeout(() => { playedOnTouch = true; void start(); }, 800);
        } else if (!coarse.matches && (card.matches(':hover') || document.activeElement === card)) {
          void start();
        }
      }, { threshold: [0, .6] });
      observer.observe(card);
      if (!article) {
        card.addEventListener('pointerenter', event => { if (event.pointerType !== 'touch') void start(); });
        card.addEventListener('pointerleave', event => { if (event.pointerType !== 'touch') stop(); });
        card.addEventListener('focus', () => void start());
        card.addEventListener('blur', stop);
        card.addEventListener('click', () => { stop(); video.hidden = true; });
      }
      video.addEventListener('ended', () => { finished = article; stop(); });
      video.addEventListener('error', stop);
      document.addEventListener('visibilitychange', () => {
        if (document.hidden) stop();
        else if (article) void start();
      });
      window.addEventListener('pagehide', stop);
      window.addEventListener('pageswap', () => { stop(); video.hidden = true; });
      window.addEventListener('pageshow', () => { if (article) void start(); });
      const preferenceChanged = () => {
        if (reduced.matches || savesData()) stop();
        else if (article) void start();
      };
      reduced.addEventListener('change', preferenceChanged);
      connection?.addEventListener('change', preferenceChanged);
    }
  }
}
if (!customElements.get('living-cover')) customElements.define('living-cover', LivingCover);
