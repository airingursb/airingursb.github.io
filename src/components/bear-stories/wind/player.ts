import { windCopy } from './copy';
import { WindMedia } from './media';
import { WindTimeline } from './timeline';
import type { WindChoice, WindClip } from './timeline';

export class BearWind extends HTMLElement {
  static get observedAttributes() { return ['data-lang']; }
  private readonly timeline = new WindTimeline();
  private readonly motion = matchMedia('(prefers-reduced-motion: reduce)');
  private abort = new AbortController();
  private observer: IntersectionObserver | null = null;
  private media: WindMedia | null = null;
  private visible = false;
  private loading = false;
  private failed = false;
  private previous = 0;
  private request = 0;
  private rendered = '';

  attributeChangedCallback() { this.sync(); }

  connectedCallback() {
    this.abort = new AbortController();
    this.media = new WindMedia(this);
    const { signal } = this.abort;
    this.addEventListener('click', this.handleClick, { signal });
    this.addEventListener('toggle', this.resume, { capture: true, signal });
    document.addEventListener('visibilitychange', this.resume, { signal });
    this.motion.addEventListener('change', this.resume, { signal });
    this.observer = new IntersectionObserver(([entry]) => {
      this.visible = entry?.isIntersecting ?? false;
      this.resume();
    }, { threshold: 0.1 });
    this.observer.observe(this);
    this.sync();
  }

  disconnectedCallback() {
    cancelAnimationFrame(this.request);
    this.abort.abort();
    this.observer?.disconnect();
  }

  private get copy() { return windCopy[this.dataset.lang === 'en' ? 'en' : 'zh']; }

  private handleClick = (event: MouseEvent) => {
    if (!(event.target instanceof Element)) return;
    const button = event.target.closest<HTMLButtonElement>('[data-wind-choice]');
    const choice = button?.dataset.windChoice;
    if (choice !== 'paperweight' && choice !== 'window') return;
    this.choose(choice);
  };

  private choose(choice: WindChoice) {
    const before = this.timeline.snapshot();
    const opening = before.resting && before.clip === 'window' && choice === 'window';
    this.timeline.choose(choice);
    if (this.motion.matches || this.failed) {
      if (!opening) {
        this.timeline.advance(15_000);
        this.timeline.advance(15_000);
      }
      const snapshot = this.timeline.snapshot();
      this.media?.still(snapshot.clip, snapshot.resting);
      this.sync();
      return;
    }
    void this.media?.load(choice);
    this.timeline.advance(0);
    this.resume();
  }

  private resume = () => {
    cancelAnimationFrame(this.request);
    this.previous = 0;
    this.dataset.motion = this.motion.matches ? 'still' : 'animated';
    const snapshot = this.timeline.snapshot();
    const active = this.visible && !document.hidden && !this.motion.matches && !this.failed && !this.querySelector(':popover-open');
    this.dataset.paused = String(!active);
    if (!active || this.loading) return;
    if (this.media?.draw(snapshot)) this.request = requestAnimationFrame(this.tick);
    else void this.load(snapshot.clip);
  };

  private async load(clip: WindClip) {
    if (!this.media || this.loading) return;
    this.loading = true;
    const ready = await this.media.load(clip);
    this.loading = false;
    if (!this.isConnected) return;
    if (!ready) {
      this.failed = true;
      this.dataset.media = 'failed';
      if (this.timeline.snapshot().clip !== 'gust') this.timeline.advance(15_000);
      const snapshot = this.timeline.snapshot();
      this.media.still(snapshot.clip, snapshot.resting);
      this.sync();
      this.announce(this.copy.failure);
      this.resume();
      return;
    }
    this.dataset.media = 'ready';
    this.resume();
  }

  private tick = (now: number) => {
    const elapsed = this.previous ? now - this.previous : 0;
    this.previous = now;
    this.timeline.advance(elapsed);
    const snapshot = this.timeline.snapshot();
    const key = `${snapshot.clip}:${snapshot.frame}:${snapshot.resting}`;
    if (key !== this.rendered) {
      if (!this.media?.draw(snapshot)) {
        this.previous = 0;
        void this.load(snapshot.clip);
        return;
      }
      this.rendered = key;
      this.sync();
    }
    this.request = requestAnimationFrame(this.tick);
  };

  private sync() {
    const snapshot = this.timeline.snapshot();
    this.dataset.clip = snapshot.clip;
    this.dataset.frame = String(snapshot.frame);
    this.dataset.resting = String(snapshot.resting);
    const closed = snapshot.clip === 'window' && snapshot.resting;
    const window = this.querySelector<HTMLButtonElement>('[data-wind-choice="window"]');
    if (window) {
      window.ariaLabel = closed ? this.copy.open : this.copy.close;
      window.setAttribute('aria-pressed', String(closed));
    }
    const paperweight = this.querySelector<HTMLButtonElement>('[data-wind-choice="paperweight"]');
    if (paperweight) paperweight.ariaLabel = this.copy.paperweight;
    if (snapshot.resting) {
      const outcomes = { gust: this.copy.gust, paperweight: this.copy.weighted, window: this.copy.closed };
      this.announce(outcomes[snapshot.clip]);
    }
  }

  private announce(message: string) {
    const live = this.querySelector('.wind-live');
    if (live && live.textContent !== message) live.textContent = message;
  }
}
