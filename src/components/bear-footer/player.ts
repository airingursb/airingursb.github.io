import frames from './frames.json';
import type { FooterActivity } from './activity';

/** Plays the footer's extracted H3 character region over its frozen environment. */
export class BearFooterScene extends HTMLElement {
  private cleanup: (() => void) | undefined;
  private activityStart: ((activity: FooterActivity) => boolean) | undefined;
  private activityStop: (() => void) | undefined;
  private activityPrepare: (() => Promise<boolean>) | undefined;

  playActivity(activity: FooterActivity) { return this.activityStart?.(activity) ?? false; }
  stopActivity() { this.activityStop?.(); }
  prepareActivity() { return this.activityPrepare?.() ?? Promise.resolve(false); }

  connectedCallback() {
    this.cleanup?.();
    const canvas = this.querySelector('canvas');
    const poster = this.querySelector('img');
    const bear = this.querySelector<HTMLButtonElement>('[data-footer-bear]');
    if (!canvas || !poster || !bear) return;
    const context = canvas.getContext('2d');
    if (!context) return;
    const scope = this.closest<HTMLElement>('[data-bear-preview-scope]');
    const reduced = matchMedia('(prefers-reduced-motion: reduce)');
    let alive = true, visible = false, nearby = false, loading = false;
    let ready = false, greeting = false, time = 0, last = 0, raf = 0, painted = -1;
    const atlas = new Image();
    const background = new Image();
    const can = this.dataset.garden === 'true' ? new Image() : null;
    let activity: FooterActivity | null = null;
    atlas.decoding = 'async';
    background.decoding = 'async';
    const draw = () => {
      const part = activity ? { start: 0, count: activity.frameCount } : greeting ? frames.greet : frames.idle;
      const source = activity ?? frames;
      const position = reduced.matches ? (greeting ? frames.greetStill : frames.idle.start)
        : part.start + Math.min(part.count - 1, Math.floor(time * source.fps / 1000));
      if (position === painted) return;
      context.clearRect(0, 0, canvas.width, canvas.height);
      context.imageSmoothingEnabled = false;
      context.drawImage(background, 0, 0, canvas.width, canvas.height);
      context.drawImage(activity?.atlas ?? atlas,
        position % source.columns * source.cellWidth,
        Math.floor(position / source.columns) * source.cellHeight,
        source.cellWidth, source.cellHeight,
        source.left, source.top, source.cellWidth, source.cellHeight);
      if (can && !activity) context.drawImage(can, 0, 0);
      painted = position;
      this.dataset.frame = String(position);
      this.dataset.state = activity ? 'watering' : greeting ? 'greet' : 'reading';
    };
    const tick = (now: number) => {
      time += last ? Math.min(now - last, 100) : 0;
      last = now;
      const duration = activity ? activity.frameCount / activity.fps * 1000
        : (greeting ? frames.greet.count : frames.idle.count) / frames.fps * 1000;
      if (time >= duration) {
        time = 0;
        greeting = false;
        if (activity) {
          activity = null;
          painted = -1;
          this.dispatchEvent(new Event('bear-footer-activity-end'));
        }
      }
      draw();
      raf = requestAnimationFrame(tick);
    };
    const update = () => {
      cancelAnimationFrame(raf);
      last = 0;
      const playing = ready && visible && !document.hidden && !reduced.matches && scope?.dataset.demoPaused !== 'true' && !scope?.querySelector(':popover-open');
      this.dataset.playing = String(playing);
      if (ready) draw();
      if (playing) raf = requestAnimationFrame(tick);
    };
    const loaded = () => {
      if (!alive || !atlas.complete || !atlas.naturalWidth || !background.complete || !background.naturalWidth || (can && (!can.complete || !can.naturalWidth))) return;
      ready = true;
      loading = false;
      this.dataset.loaded = 'true';
      this.dispatchEvent(new Event('bear-footer-ready'));
      canvas.hidden = false;
      poster.hidden = true;
      update();
    };
    const failed = () => {
      loading = false;
      this.dataset.loaded = 'error';
      this.dispatchEvent(new Event('bear-footer-ready'));
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
      background.src = can ? '/bear-footer/garden-background.webp' : '/bear-footer/background.webp';
      if (can) can.src = '/bear-footer/garden-can.webp';
    };
    this.activityPrepare = () => {
      if (ready) return Promise.resolve(true);
      return new Promise(resolve => {
        const finish = () => {
          clearTimeout(timeout);
          this.removeEventListener('bear-footer-ready', finish);
          resolve(ready && alive);
        };
        const timeout = window.setTimeout(finish, 8000);
        this.addEventListener('bear-footer-ready', finish, { once: true });
        load();
      });
    };
    const greet = () => {
      if (activity) return;
      greeting = true;
      time = 0;
      painted = -1;
      load();
      update();
    };
    this.activityStop = () => {
      if (!activity) return;
      activity = null;
      greeting = false;
      time = 0;
      painted = -1;
      this.dispatchEvent(new Event('bear-footer-activity-end'));
      update();
    };
    this.activityStart = next => {
      if (!ready || activity || reduced.matches) return false;
      activity = next;
      greeting = false;
      time = 0;
      painted = -1;
      update();
      return true;
    };
    const preference = () => {
      if (reduced.matches) this.activityStop?.();
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
    can?.addEventListener('load', loaded);
    can?.addEventListener('error', failed);
    bear.addEventListener('click', greet);
    scope?.addEventListener('bear-letter-sent', greet);
    scope?.addEventListener('toggle', update, true);
    document.addEventListener('visibilitychange', update);
    reduced.addEventListener('change', preference);
    proximity.observe(this);
    visibility.observe(this);
    const demoObserver = new MutationObserver(update);
    if (scope?.dataset.showcase === 'true') demoObserver.observe(scope, { attributes: true, attributeFilter: ['data-demo-paused'] });
    this.dataset.playing = 'false';
    this.cleanup = () => {
      alive = false;
      this.activityStart = undefined;
      this.activityStop = undefined;
      this.activityPrepare = undefined;
      this.dispatchEvent(new Event('bear-footer-ready'));
      cancelAnimationFrame(raf);
      proximity.disconnect();
      visibility.disconnect();
      demoObserver.disconnect();
      atlas.removeEventListener('load', loaded);
      background.removeEventListener('load', loaded);
      atlas.removeEventListener('error', failed);
      background.removeEventListener('error', failed);
      can?.removeEventListener('load', loaded);
      can?.removeEventListener('error', failed);
      bear.removeEventListener('click', greet);
      scope?.removeEventListener('bear-letter-sent', greet);
      scope?.removeEventListener('toggle', update, true);
      document.removeEventListener('visibilitychange', update);
      reduced.removeEventListener('change', preference);
    };
  }

  disconnectedCallback() { this.cleanup?.(); }
}
