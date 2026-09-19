export const manifest = {
  version: 1, width: 16, height: 16, columns: 2, fps: 10,
  poster: 'poster.png', clips: { arrival: { asset: 'arrival.webp', frames: 4 } },
};
let serial = 0;

export function fixture(options = {}) {
  const observers = [];
  const frames = new Map();
  const requests = [];
  const draws = [];
  const decoded = [];
  const motion = Object.assign(new EventTarget(), { matches: options.reduced ?? false });
  const document = Object.assign(new EventTarget(), { hidden: false, baseURI: 'https://example.test/' });
  let nextFrame = 0;
  let canvasWidth = 0;
  let canvasHeight = 0;
  let canvasResizes = 0;
  const canvas = {
    hidden: true,
    get width() { return canvasWidth; },
    set width(value) { canvasWidth = value; canvasResizes++; },
    get height() { return canvasHeight; },
    set height(value) { canvasHeight = value; canvasResizes++; },
    getContext: () => ({ clearRect() {}, drawImage(...args) { draws.push(args); } }),
  };
  const poster = { style: { visibility: '' } };
  const host = Object.assign(new EventTarget(), {
    dataset: { editorialActor: `/actor-${serial++}/manifest.json` },
    style: { aspectRatio: '208 / 128' },
    querySelector: selector => selector.includes('canvas') ? canvas : poster,
  });
  Object.assign(globalThis, {
    document, window: globalThis,
    matchMedia: () => motion,
    requestAnimationFrame: callback => { frames.set(++nextFrame, callback); return nextFrame; },
    cancelAnimationFrame: id => frames.delete(id),
    IntersectionObserver: class {
      constructor(callback, settings) { this.callback = callback; this.settings = settings; observers.push(this); }
      observe() {}
      disconnect() {}
    },
    Image: class {
      naturalWidth = 32;
      naturalHeight = 32;
      async decode() {
        decoded.push(this.src);
        if (options.imageFails) throw new Error('decode failed');
        await options.decode?.(this.src);
      }
    },
    fetch: async url => {
      requests.push(url);
      return { ok: !options.manifestFails, json: async () => options.manifest ?? manifest };
    },
  });
  return {
    host, motion, document, canvas, poster, requests, draws, decoded,
    get canvasResizes() { return canvasResizes; },
    intersect(visible, nearby = false) {
      observers.filter(observer => Boolean(observer.settings.rootMargin) === nearby)
        .forEach(observer => observer.callback([{ isIntersecting: visible }]));
    },
    step(time) {
      const pending = [...frames.values()];
      frames.clear();
      pending.forEach(callback => callback(time));
    },
  };
}

export async function settle() {
  for (let i = 0; i < 8; i++) await new Promise(resolve => setImmediate(resolve));
}
