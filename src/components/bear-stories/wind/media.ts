import type { WindClip, WindSnapshot } from './timeline';

const WIDTH = 320;
const HEIGHT = 192;
const COLUMNS = 12;

export class WindMedia {
  private readonly atlases = new Map<WindClip, Promise<HTMLImageElement | null>>();
  private readonly decoded = new Map<WindClip, HTMLImageElement>();
  private readonly canvas: HTMLCanvasElement;
  private readonly poster: HTMLImageElement;
  private readonly context: CanvasRenderingContext2D;

  constructor(root: HTMLElement) {
    const canvas = root.querySelector('canvas');
    const poster = root.querySelector('img');
    const context = canvas?.getContext('2d');
    if (!canvas || !poster || !context) throw new WindMarkupError();
    this.canvas = canvas;
    this.poster = poster;
    this.context = context;
  }

  async load(clip: WindClip): Promise<boolean> {
    let pending = this.atlases.get(clip);
    if (!pending) {
      const image = new Image();
      image.src = `/bear-stories/wind/${clip}-atlas.webp`;
      let timer = 0;
      const timeout = new Promise<null>(resolve => { timer = window.setTimeout(() => resolve(null), 8000); });
      const decoded = image.decode().then(() => image, (error: unknown) => {
        if (error instanceof DOMException || error instanceof Error) return null;
        throw error;
      });
      pending = Promise.race([decoded, timeout]).then(loaded => {
        if (loaded) this.decoded.set(clip, loaded);
        else image.src = '';
        return loaded;
      }).finally(() => clearTimeout(timer));
      this.atlases.set(clip, pending);
    }
    return await pending !== null;
  }

  draw(snapshot: WindSnapshot): boolean {
    const atlas = this.decoded.get(snapshot.clip);
    if (!atlas) return false;
    this.context.imageSmoothingEnabled = false;
    this.context.clearRect(0, 0, WIDTH, HEIGHT);
    this.context.drawImage(atlas, snapshot.frame % COLUMNS * WIDTH, Math.floor(snapshot.frame / COLUMNS) * HEIGHT, WIDTH, HEIGHT, 0, 0, WIDTH, HEIGHT);
    this.canvas.hidden = false;
    this.poster.hidden = true;
    return true;
  }

  still(clip: WindClip, resting = false) {
    this.poster.src = `/bear-stories/wind/${clip}-${resting ? 'rest' : 'poster'}.png`;
    this.poster.hidden = false;
    this.canvas.hidden = true;
  }
}

class WindMarkupError extends Error {
  constructor() { super('Wind scene requires a poster and 2D canvas.'); }
}
