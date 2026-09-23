import type { EditorialManifest } from './editorial-actor-assets.ts';

export interface EditorialActorController {
  readonly play: (name: string) => Promise<boolean>;
  readonly finishSoon: () => void;
  readonly stop: () => void;
  readonly dispose: () => void;
}

type Performance = {
  readonly name: string;
  readonly atlas: HTMLImageElement;
  readonly manifest: EditorialManifest;
  readonly frames: number;
  readonly loop: boolean;
  readonly complete: (played: boolean) => void;
  elapsed: number;
};

const controllers = new WeakMap<HTMLElement, EditorialActorController>();

export function createEditorialActor(host: HTMLElement): EditorialActorController {
  const existing = controllers.get(host);
  if (existing) return existing;
  const canvas = host.querySelector<HTMLCanvasElement>('[data-actor-canvas]');
  const poster = host.querySelector<HTMLImageElement>('[data-actor-poster]');
  const context = canvas?.getContext('2d');
  const motion = matchMedia('(prefers-reduced-motion: reduce)');
  const listeners = new AbortController();
  const manifestURL = new URL(host.dataset.editorialActor || '', document.baseURI).href;
  let manifestPromise: Promise<EditorialManifest | null> | undefined;
  let performance: Performance | null = null;
  let generation = 0;
  let busy = false;
  let disposed = false;
  let visible = false;
  let frameRequest = 0;
  let previousTime: number | null = null;
  let playbackRate = 1;
  host.dataset.actorState = 'poster';

  const manifest = () => {
    manifestPromise ??= import('./editorial-actor-assets.ts').then(assets => assets.loadEditorialManifest(manifestURL));
    return manifestPromise;
  };
  const restorePoster = () => {
    if (canvas) canvas.hidden = true;
    if (poster) poster.style.visibility = '';
  };
  const finish = (played: boolean, preserveCanvas = played) => {
    cancelAnimationFrame(frameRequest);
    const completed = performance;
    performance = null;
    busy = false;
    previousTime = null;
    playbackRate = 1;
    if (!preserveCanvas) restorePoster();
    host.dataset.actorLoop = 'false';
    host.dataset.actorState = preserveCanvas ? 'quiet' : 'poster';
    if (completed) {
      host.dispatchEvent(new CustomEvent('editorial-actor-end', { detail: { clip: completed.name } }));
      completed.complete(played);
    }
  };
  const stop = () => { generation++; finish(false); };
  const tick = (now: number) => {
    if (!performance || !visible || document.hidden || motion.matches || !canvas || !context) return;
    if (previousTime !== null) performance.elapsed += (now - previousTime) * playbackRate;
    previousTime = now;
    const current = performance;
    const { width, height, columns, fps } = current.manifest;
    const position = Math.floor(current.elapsed * fps / 1000);
    const frame = current.loop ? position % current.frames : Math.min(position, current.frames - 1);
    context.clearRect(0, 0, width, height);
    context.drawImage(current.atlas, frame % columns * width, Math.floor(frame / columns) * height, width, height, 0, 0, width, height);
    canvas.hidden = false;
    if (poster) poster.style.visibility = 'hidden';
    host.dataset.actorFrame = String(frame);
    host.dataset.actorState = current.loop ? 'quiet' : 'playing';
    if (position >= current.frames && !current.loop) {
      const rest = current.manifest.clips[current.name]?.rest ?? 'idle';
      const finishedGeneration = generation;
      finish(true);
      if (generation === finishedGeneration && current.manifest.clips[rest]?.loop) void play(rest);
      return;
    }
    frameRequest = requestAnimationFrame(tick);
  };
  const resume = () => {
    cancelAnimationFrame(frameRequest);
    previousTime = null;
    if (!performance) return;
    if (visible && !document.hidden && !motion.matches) frameRequest = requestAnimationFrame(tick);
    else host.dataset.actorState = 'paused';
  };
  const unavailable = (name: string) => {
    busy = false;
    host.dataset.actorState = 'unavailable';
    host.dispatchEvent(new CustomEvent('editorial-actor-unavailable', { detail: { clip: name } }));
  };
  async function play(name: string): Promise<boolean> {
    if (disposed || motion.matches || !canvas || !context || (busy && performance?.loop !== true)) return false;
    if (performance?.loop) finish(false, true);
    playbackRate = 1;
    busy = true;
    const request = ++generation;
    host.dataset.actorState = 'loading';
    try {
      const data = await manifest();
      if (request !== generation || disposed || motion.matches) return false;
      const clip = data?.clips[name];
      if (!data || !clip) { unavailable(name); return false; }
      const assets = await import('./editorial-actor-assets.ts');
      const atlas = await assets.loadEditorialAtlas(new URL(clip.asset, manifestURL).href);
      if (request !== generation || disposed || motion.matches) return false;
      if (!atlas || atlas.naturalWidth < data.width * data.columns || atlas.naturalHeight < data.height * Math.ceil(clip.frames / data.columns)) {
        unavailable(name); return false;
      }
      if (canvas.width !== data.width) canvas.width = data.width;
      if (canvas.height !== data.height) canvas.height = data.height;
      context.imageSmoothingEnabled = host.dataset.actorRendering === 'smooth';
      return await new Promise<boolean>(complete => {
        performance = { name, atlas, manifest: data, frames: clip.frames, loop: clip.loop === true, complete, elapsed: 0 };
        if (performance.loop) playbackRate = 1;
        host.dataset.actorLoop = String(performance.loop);
        host.dataset.actorState = performance.loop ? 'quiet' : 'playing';
        host.dispatchEvent(new CustomEvent('editorial-actor-start', { detail: { clip: name } }));
        resume();
      });
    } catch (error) {
      if (!(error instanceof Error)) throw error;
      if (request === generation) unavailable(name);
      return false;
    }
  }
  const viewport = new IntersectionObserver(([entry]) => { visible = entry?.isIntersecting ?? false; resume(); }, { threshold: 0.05 });
  const nearby = new IntersectionObserver(([entry]) => {
    if (entry?.isIntersecting && !motion.matches && !document.hidden) {
      void manifest().catch(error => { if (error instanceof Error) host.dataset.actorState = 'unavailable'; });
      nearby.disconnect();
    }
  }, { rootMargin: '200px' });
  viewport.observe(host);
  nearby.observe(host);
  document.addEventListener('visibilitychange', resume, { signal: listeners.signal });
  motion.addEventListener('change', () => { if (motion.matches) stop(); }, { signal: listeners.signal });
  const controller: EditorialActorController = {
    play,
    finishSoon() { if (busy && performance?.loop !== true) playbackRate = 3; },
    stop,
    dispose() {
      disposed = true;
      stop();
      listeners.abort();
      viewport.disconnect();
      nearby.disconnect();
      controllers.delete(host);
    },
  };
  controllers.set(host, controller);
  return controller;
}
