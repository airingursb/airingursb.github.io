import frames from './frames.json';

/** Plays the footer's extracted H3 character region over its frozen environment. */
export class BearFooterScene extends HTMLElement {
  private cleanup: (() => void) | undefined;

  connectedCallback() {
    this.cleanup?.();
    const canvas = this.querySelector('canvas');
    const poster = this.querySelector('img');
    const bear = this.querySelector<HTMLButtonElement>('[data-footer-bear]');
    if (!canvas || !poster || !bear) return;
    const context = canvas.getContext('2d');
    if (!context) return;
    const scope = this.closest('[data-bear-preview-scope]');
    const reduced = matchMedia('(prefers-reduced-motion: reduce)');
    let alive = true, visible = false, nearby = false, loading = false;
    let ready = false, greeting = false, time = 0, last = 0, raf = 0, painted = -1;
    const atlas = new Image();
    const background = new Image();
    atlas.decoding = 'async';
    background.decoding = 'async';
    const draw = () => {
      const part = greeting ? frames.greet : frames.idle;
      const position = reduced.matches ? (greeting ? frames.greetStill : frames.idle.start)
        : part.start + Math.min(part.count - 1, Math.floor(time * frames.fps / 1000));
      if (position === painted) return;
      context.clearRect(0, 0, canvas.width, canvas.height);
      context.imageSmoothingEnabled = false;
      context.drawImage(background, 0, 0, canvas.width, canvas.height);
      context.drawImage(atlas,
        position % frames.columns * frames.cellWidth,
        Math.floor(position / frames.columns) * frames.cellHeight,
        frames.cellWidth, frames.cellHeight,
        frames.left, frames.top, frames.cellWidth, frames.cellHeight);
      painted = position;
      this.dataset.frame = String(position);
      this.dataset.state = greeting ? 'greet' : 'reading';
    };
    const tick = (now: number) => {
      time += last ? Math.min(now - last, 100) : 0;
      last = now;
      const duration = (greeting ? frames.greet.count : frames.idle.count) / frames.fps * 1000;
      if (time >= duration) { time = 0; greeting = false; }
      draw();
      raf = requestAnimationFrame(tick);
    };
    const update = () => {
      cancelAnimationFrame(raf);
      last = 0;
      const playing = ready && visible && !document.hidden && !reduced.matches && !scope?.querySelector(':popover-open');
      this.dataset.playing = String(playing);
      if (ready) draw();
      if (playing) raf = requestAnimationFrame(tick);
    };
    const loaded = () => {
      if (!alive || !atlas.complete || !atlas.naturalWidth || !background.complete || !background.naturalWidth) return;
      ready = true;
      loading = false;
      this.dataset.loaded = 'true';
      canvas.hidden = false;
      poster.hidden = true;
      update();
    };
    const failed = () => {
      loading = false;
      this.dataset.loaded = 'error';
      // Keep the complete still scene usable when an optional animation asset fails.
      canvas.hidden = true;
      poster.hidden = false;
      ready = false;
      update();
    };
    const load = () => {
      if (ready || loading || !alive) return;
      loading = true;
      this.dataset.loaded = 'loading';
      atlas.src = '/bear-footer/actions.webp';
      background.src = '/bear-footer/background.webp';
    };
    const greet = () => {
      greeting = true;
      time = 0;
      painted = -1;
      load();
      update();
    };
    const preference = () => {
      greeting = false;
      time = 0;
      painted = -1;
      if (nearby && !reduced.matches) load();
      update();
    };
    const proximity = new IntersectionObserver(entries => {
      nearby = entries.some(entry => entry.isIntersecting);
      if (nearby && !reduced.matches) load();
    }, { rootMargin: '200px' });
    const visibility = new IntersectionObserver(entries => {
      visible = entries.some(entry => entry.isIntersecting);
      update();
    });
    atlas.addEventListener('load', loaded);
    background.addEventListener('load', loaded);
    atlas.addEventListener('error', failed);
    background.addEventListener('error', failed);
    bear.addEventListener('click', greet);
    scope?.addEventListener('bear-letter-sent', greet);
    scope?.addEventListener('toggle', update, true);
    document.addEventListener('visibilitychange', update);
    reduced.addEventListener('change', preference);
    proximity.observe(this);
    visibility.observe(this);
    this.dataset.playing = 'false';
    this.cleanup = () => {
      alive = false;
      cancelAnimationFrame(raf);
      proximity.disconnect();
      visibility.disconnect();
      atlas.removeEventListener('load', loaded);
      background.removeEventListener('load', loaded);
      atlas.removeEventListener('error', failed);
      background.removeEventListener('error', failed);
      bear.removeEventListener('click', greet);
      scope?.removeEventListener('bear-letter-sent', greet);
      scope?.removeEventListener('toggle', update, true);
      document.removeEventListener('visibilitychange', update);
      reduced.removeEventListener('change', preference);
    };
  }

  disconnectedCallback() { this.cleanup?.(); }
}
