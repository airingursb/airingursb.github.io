import { workshopCopy } from './content';

const motion = { fps: 12, frames: 181, columns: 10, width: 384, height: 216 } as const;
type Copy = typeof workshopCopy.zh | typeof workshopCopy.en;

class BearWorkshop extends HTMLElement {
  private abort = new AbortController();
  private observer: IntersectionObserver | null = null;
  private preference = matchMedia('(prefers-reduced-motion: reduce)');
  private atlas: HTMLImageElement | null = null;
  private loading: Promise<boolean> | null = null;
  private visible = false;
  private started = false;
  private working = false;
  private frame = -1;
  private elapsed = 0;
  private previous = 0;
  private request = 0;
  private copy: Copy = workshopCopy.zh;

  connectedCallback() {
    this.abort = new AbortController();
    const { signal } = this.abort;
    this.copy = this.dataset.lang === 'en' ? workshopCopy.en : workshopCopy.zh;
    this.dataset.ready = '';
    this.querySelectorAll<HTMLButtonElement>('button').forEach(button => { button.disabled = false; });
    this.addEventListener('click', event => {
      if (!(event.target instanceof Element)) return;
      if (event.target.closest('button[data-replay]')) { void this.play(); return; }
      const button = event.target.closest<HTMLButtonElement>('button[data-project]');
      const key = button?.dataset.project;
      if (key !== 'living-scenes' && key !== 'reading-companion') return;
      this.dataset.project = key;
      this.querySelectorAll<HTMLButtonElement>('button[data-project]').forEach(choice => {
        choice.setAttribute('aria-pressed', String(choice.dataset.project === key));
      });
      this.querySelectorAll<HTMLElement>('[data-result]').forEach(result => { result.hidden = result.dataset.result !== key; });
      void this.play();
    }, { signal });
    this.preference.addEventListener('change', () => {
      if (this.preference.matches && this.working) this.settle(true);
    }, { signal });
    document.addEventListener('visibilitychange', () => this.resume(), { signal });
    this.observer = new IntersectionObserver(([entry]) => {
      this.visible = entry?.isIntersecting ?? false;
      this.resume();
    }, { threshold: .15 });
    const stage = this.querySelector('.bw-stage');
    if (stage) this.observer.observe(stage);
  }

  disconnectedCallback() {
    cancelAnimationFrame(this.request);
    this.working = false;
    this.abort.abort();
    this.observer?.disconnect();
    this.atlas = null;
    this.loading = null;
  }

  private announce(text: string) {
    const status = this.querySelector('[data-status]');
    if (status) status.textContent = text;
  }

  private load(): Promise<boolean> {
    if (this.loading) return this.loading;
    this.loading = new Promise(resolve => {
      const atlas = new Image();
      const timeout = window.setTimeout(() => {
        atlas.onload = null; atlas.onerror = null; this.loading = null; resolve(false);
      }, 15000);
      atlas.onload = () => {
        clearTimeout(timeout);
        this.atlas = atlas;
        resolve(true);
      };
      atlas.onerror = () => { clearTimeout(timeout); this.loading = null; resolve(false); };
      this.abort.signal.addEventListener('abort', () => {
        clearTimeout(timeout); atlas.onload = null; atlas.onerror = null; atlas.src = ''; resolve(false);
      }, { once: true });
      atlas.src = '/bear-stories/workshop/workshop-atlas.webp';
    });
    return this.loading;
  }

  private async play() {
    if (this.working) return;
    this.started = true;
    if (this.preference.matches) { this.settle(true); return; }
    this.working = true;
    this.dataset.phase = 'loading';
    this.announce(this.copy.loading);
    const loaded = await this.load();
    if (!this.isConnected || !this.working) return;
    if (!loaded) {
      this.working = false;
      this.dataset.phase = 'failure';
      this.announce(this.copy.failure);
      return;
    }
    if (this.preference.matches) { this.settle(true); return; }
    this.elapsed = 0;
    this.frame = -1;
    this.dataset.phase = 'working';
    this.resume();
  }

  private resume() {
    cancelAnimationFrame(this.request);
    this.previous = 0;
    if (!this.visible || document.hidden) return;
    if (!this.started) { void this.play(); return; }
    if (this.working && this.atlas && !this.preference.matches) {
      this.request = requestAnimationFrame(this.tick);
    }
  }

  private tick = (now: number) => {
    if (!this.working || !this.visible || document.hidden) return;
    if (this.previous) this.elapsed += now - this.previous;
    this.previous = now;
    const frame = Math.min(motion.frames - 1, Math.floor(this.elapsed * motion.fps / 1000));
    if (frame !== this.frame) {
      this.frame = frame;
      const canvas = this.querySelector('canvas');
      const context = canvas?.getContext('2d');
      if (!canvas || !context || !this.atlas) { this.settle(true); return; }
      context.imageSmoothingEnabled = false;
      context.clearRect(0, 0, motion.width, motion.height);
      context.drawImage(this.atlas, frame % motion.columns * motion.width, Math.floor(frame / motion.columns) * motion.height,
        motion.width, motion.height, 0, 0, motion.width, motion.height);
      canvas.hidden = false;
      const poster = this.querySelector<HTMLImageElement>('.bw-poster');
      if (poster) poster.style.visibility = 'hidden';
      this.dataset.frame = String(frame);
      const phase = frame < 44 ? 'tightening' : frame < 90 ? 'smoke' : frame < 132 ? 'adjusting' : 'complete';
      if (this.dataset.beat !== phase) { this.dataset.beat = phase; this.announce(this.copy[phase]); }
    }
    if (frame === motion.frames - 1) { this.settle(false); return; }
    this.request = requestAnimationFrame(this.tick);
  };

  private settle(still: boolean) {
    this.working = false;
    cancelAnimationFrame(this.request);
    this.dataset.phase = still ? 'static' : 'settled';
    this.announce(still ? this.copy.static : this.copy.complete);
    if (still) {
      const canvas = this.querySelector('canvas');
      const poster = this.querySelector<HTMLImageElement>('.bw-poster');
      if (canvas) canvas.hidden = true;
      if (poster) { poster.src = '/bear-stories/workshop/settled.png'; poster.style.visibility = ''; }
    }
  }
}

if (!customElements.get('bear-workshop')) customElements.define('bear-workshop', BearWorkshop);
