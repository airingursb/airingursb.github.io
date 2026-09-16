class BearSprite extends HTMLElement {
  private atlas: HTMLImageElement | null = null;
  private loading: Promise<boolean> | null = null;
  private abort = new AbortController();
  private observer: IntersectionObserver | null = null;
  private motion = matchMedia('(prefers-reduced-motion: reduce)');
  private visible = false;
  private playing = false;
  private elapsed = 0;
  private previous = 0;
  private request = 0;
  private generation = 0;

  connectedCallback() {
    this.abort = new AbortController();
    const { signal } = this.abort;
    this.addEventListener('bear:play', () => { void this.play(); }, { signal });
    this.addEventListener('bear:stop', () => this.stop(), { signal });
    document.addEventListener('visibilitychange', () => this.resume(), { signal });
    this.motion.addEventListener('change', () => {
      if (this.motion.matches) this.stop();
    }, { signal });
    let entered = false;
    this.observer = new IntersectionObserver(([entry]) => {
      this.visible = entry?.isIntersecting ?? false;
      if (this.visible && !entered && this.hasAttribute('data-autoplay')) {
        entered = true;
        void this.play();
      }
      this.resume();
    }, { threshold: 0.15 });
    this.observer.observe(this);
  }

  disconnectedCallback() {
    this.stop();
    this.abort.abort();
    this.observer?.disconnect();
  }

  private async load(): Promise<boolean> {
    if (this.loading) return this.loading;
    const atlas = new Image();
    atlas.src = `/bear-discovery/${this.dataset.kind}-atlas.webp`;
    this.loading = atlas.decode().then(() => {
      this.atlas = atlas;
      return true;
    }).catch(() => {
      this.loading = null;
      this.dataset.media = 'error';
      return false;
    });
    return this.loading;
  }

  private async play() {
    if (this.motion.matches) return;
    const generation = ++this.generation;
    if (!await this.load() || !this.isConnected || this.motion.matches || generation !== this.generation) return;
    this.playing = true;
    this.elapsed = 0;
    this.dataset.playing = '';
    this.resume();
  }

  private resume() {
    cancelAnimationFrame(this.request);
    this.previous = 0;
    if (this.playing && this.visible && !document.hidden) this.request = requestAnimationFrame(this.tick);
  }

  private tick = (now: number) => {
    if (!this.playing || !this.visible || document.hidden) return;
    if (this.previous) this.elapsed += now - this.previous;
    this.previous = now;
    const frame = Math.min(179, Math.floor(this.elapsed * 24 / 1000));
    const canvas = this.querySelector('canvas');
    const context = canvas?.getContext('2d');
    if (canvas && context && this.atlas) {
      context.imageSmoothingEnabled = false;
      context.clearRect(0, 0, 128, 144);
      context.drawImage(this.atlas, frame % 12 * 128, Math.floor(frame / 12) * 144, 128, 144, 0, 0, 128, 144);
      canvas.hidden = false;
      const poster = this.querySelector('img');
      if (poster) poster.style.visibility = 'hidden';
      this.dataset.frame = String(frame);
    }
    if (frame === 179) {
      this.playing = false;
      delete this.dataset.playing;
      return;
    }
    this.request = requestAnimationFrame(this.tick);
  };

  private stop() {
    this.generation++;
    this.playing = false;
    cancelAnimationFrame(this.request);
    delete this.dataset.playing;
    const canvas = this.querySelector('canvas');
    const poster = this.querySelector('img');
    if (canvas) canvas.hidden = true;
    if (poster) poster.style.visibility = '';
  }
}
if (!customElements.get('bear-sprite')) customElements.define('bear-sprite', BearSprite);
