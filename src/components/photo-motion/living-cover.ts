class LivingCover extends HTMLElement {
  connectedCallback() {
    const slug = this.dataset.slug;
    const cards = document.querySelectorAll<HTMLAnchorElement>(`[data-article-card][data-slug="${slug}"]`);
    const reduced = matchMedia('(prefers-reduced-motion: reduce)');
    const coarse = matchMedia('(hover: none)');
    for (const card of cards) {
      const art = card.querySelector<HTMLElement>('[data-article-cover]');
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
      let pending = 0;
      let version = 0;
      const stop = () => {
        version++;
        window.clearTimeout(pending);
        video.removeAttribute('data-playing');
        video.pause();
      };
      const start = async () => {
        if (reduced.matches || !visible || document.hidden) return;
        const current = ++version;
        video.hidden = false;
        if (!video.src) video.src = '/photo-motion/palace-clouds.mp4';
        video.currentTime = 0;
        try {
          await video.play();
          if (current !== version || document.hidden || !visible || reduced.matches) {
            if (current === version) video.pause();
            return;
          }
          video.setAttribute('data-playing', '');
        } catch { if (current === version) video.removeAttribute('data-playing'); }
      };
      const observer = new IntersectionObserver(entries => {
        visible = entries[0].isIntersecting && entries[0].intersectionRatio >= .6;
        if (!visible) stop();
        else if (coarse.matches && !playedOnTouch && !reduced.matches) {
          pending = window.setTimeout(() => { playedOnTouch = true; void start(); }, 800);
        } else if (!coarse.matches && (card.matches(':hover') || document.activeElement === card)) {
          void start();
        }
      }, { threshold: [0, .6] });
      observer.observe(card);
      card.addEventListener('pointerenter', event => { if (event.pointerType !== 'touch') void start(); });
      card.addEventListener('pointerleave', event => { if (event.pointerType !== 'touch') stop(); });
      card.addEventListener('focus', () => void start());
      card.addEventListener('blur', stop);
      card.addEventListener('click', () => { stop(); video.hidden = true; });
      video.addEventListener('ended', stop);
      video.addEventListener('error', stop);
      document.addEventListener('visibilitychange', () => { if (document.hidden) stop(); });
      window.addEventListener('pagehide', stop);
      reduced.addEventListener('change', () => { if (reduced.matches) stop(); });
    }
  }
}
if (!customElements.get('living-cover')) customElements.define('living-cover', LivingCover);
