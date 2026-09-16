import type { BearFooterScene } from '../../bear-footer/player';
import type { GardenStage } from './copy';
import frames from './frames.json';

export class GardenMotion {
  private atlas: HTMLImageElement | null = null;
  private loading: Promise<boolean> | null = null;
  private readonly abort = new AbortController();
  private readonly observer: IntersectionObserver;
  private readonly reduced = matchMedia('(prefers-reduced-motion: reduce)');
  private running = false;
  private visible = false;
  private pendingStage: GardenStage = 'seed';

  constructor(
    private readonly scene: BearFooterScene,
    private readonly plant: HTMLImageElement,
    private readonly onFailure: () => void,
  ) {
    this.scene.addEventListener('bear-footer-activity-end', () => this.rest(), { signal: this.abort.signal });
    this.observer = new IntersectionObserver(([entry]) => {
      this.visible = entry?.isIntersecting ?? false;
    }, { threshold: .1 });
    this.observer.observe(scene);
  }

  get active() { return this.running; }
  get inView() { return this.visible; }

  setStage(stage: GardenStage) {
    this.pendingStage = stage;
    if (this.running) return;
    this.plant.src = `/bear-stories/garden/${stage === 'seed' ? 'sprout' : stage}.png`;
    this.plant.hidden = stage === 'seed';
  }

  private load(): Promise<boolean> {
    if (this.atlas) return Promise.resolve(true);
    if (this.loading) return this.loading;
    const atlas = new Image();
    atlas.src = '/bear-footer/garden-actions.webp';
    let timeout = 0;
    this.loading = Promise.race([
      atlas.decode().then(() => true),
      new Promise<boolean>(resolve => { timeout = window.setTimeout(() => resolve(false), 8000); }),
    ]).then(loaded => {
      if (loaded) this.atlas = atlas;
      return loaded;
    }).catch(error => {
      if (error instanceof DOMException) return false;
      throw error;
    }).finally(() => { clearTimeout(timeout); this.loading = null; });
    return this.loading;
  }

  async play() {
    if (this.running || this.reduced.matches) return;
    this.running = true;
    this.scene.dataset.motion = 'loading';
    const [loaded, ready] = await Promise.all([this.load(), this.scene.prepareActivity()]);
    if (!loaded || !ready || !this.atlas) {
      this.scene.dataset.media = 'error';
      this.rest();
      this.onFailure();
      return;
    }
    if (!this.scene.isConnected || !this.running || this.reduced.matches) { this.rest(); return; }
    const started = this.scene.playActivity({ atlas: this.atlas, ...frames });
    if (!started) {
      this.rest();
      this.onFailure();
      return;
    }
    this.scene.dataset.motion = 'watering';
    this.scene.dataset.media = 'ready';
  }

  private rest() {
    this.running = false;
    this.scene.dataset.motion = 'resting';
    this.setStage(this.pendingStage);
  }

  stop() {
    this.scene.stopActivity();
    this.rest();
  }

  destroy() {
    this.stop();
    this.abort.abort();
    this.observer.disconnect();
  }
}
