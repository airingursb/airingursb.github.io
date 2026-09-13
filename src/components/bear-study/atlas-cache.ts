import type { ClipId, Clips } from './timeline';

export class BearAtlasLoadError extends Error {
  constructor(readonly clip: ClipId) { super(`Could not decode bear atlas: ${clip}`); }
}

export class BearAtlasCache {
  private readonly images = new Map<ClipId, Promise<HTMLImageElement>>();
  constructor(private readonly clips: Clips) {}

  get(id: ClipId): Promise<HTMLImageElement> {
    const existing = this.images.get(id);
    if (existing) {
      this.images.delete(id);
      this.images.set(id, existing);
      return existing;
    }
    const image = new Image();
    image.src = `/bear-study/${this.clips[id].asset}`;
    const pending = image.decode().then(() => image, (error: unknown) => {
      this.images.delete(id);
      if (error instanceof DOMException) throw new BearAtlasLoadError(id);
      throw error;
    });
    this.images.set(id, pending);
    if (this.images.size > 2) {
      const oldest = this.images.keys().next().value;
      if (oldest) this.images.delete(oldest);
    }
    return pending;
  }
}
