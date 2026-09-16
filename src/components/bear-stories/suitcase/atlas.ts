export type Clip = 'open' | 'close';
export type PlaybackResult = 'finished' | 'cancelled' | 'failed';
type Playback = {
  readonly canvas: HTMLCanvasElement;
  readonly clip: Clip;
  readonly signal: AbortSignal;
  readonly onReady: () => void;
};

const cell = { width: 480, height: 270, columns: 6, frames: 48, fps: 18 } as const;

export async function playSuitcase(playback: Playback): Promise<PlaybackResult> {
  const { canvas, clip, signal, onReady } = playback;
  const context = canvas.getContext('2d');
  if (!context) return 'failed';
  context.imageSmoothingEnabled = false;
  // Two decoded sheets bound memory to the current chunk and its immediate successor.
  const images = new Map<number, Promise<HTMLImageElement | undefined>>();
  const count = clip === 'open' ? 180 : 120;
  const releaseChunk = (index: number) => {
    const pending = images.get(index);
    images.delete(index);
    if (pending) void pending.then(image => { if (image) image.src = ''; });
  };

  function loadChunk(index: number): Promise<HTMLImageElement | undefined> {
    const cached = images.get(index);
    if (cached) return cached;
    const pending = new Promise<HTMLImageElement | undefined>(resolve => {
      const image = new Image();
      const finish = (result: HTMLImageElement | undefined) => {
        clearTimeout(timeout);
        signal.removeEventListener('abort', cancel);
        image.onload = null;
        image.onerror = null;
        resolve(result);
      };
      const cancel = () => { image.src = ''; finish(undefined); };
      const timeout = window.setTimeout(() => finish(undefined), 8000);
      image.onload = () => finish(image);
      image.onerror = () => finish(undefined);
      signal.addEventListener('abort', cancel, { once: true });
      image.decoding = 'async';
      image.src = `/bear-stories/suitcase/${clip}-${index}.webp`;
      if (signal.aborted) cancel();
    });
    images.set(index, pending);
    for (const key of images.keys()) if (key < index - 1) releaseChunk(key);
    return pending;
  }

  try {
    for (let offset = 0; offset < count; offset += cell.frames) {
      const chunk = Math.floor(offset / cell.frames);
      const image = await loadChunk(chunk);
      if (signal.aborted) return 'cancelled';
      if (!image) return 'failed';
      if (offset + cell.frames < count) void loadChunk(chunk + 1);
      const frameCount = Math.min(cell.frames, count - offset);
      const complete = await new Promise<boolean>(resolve => {
        let elapsed = 0, previous = performance.now(), visible = true, frame = -1, handle = 0;
        let settled = false;
        const finish = (completed: boolean) => {
          if (settled) return;
          settled = true;
          cancelAnimationFrame(handle);
          observer.disconnect();
          document.removeEventListener('visibilitychange', resume);
          signal.removeEventListener('abort', cancel);
          resolve(completed);
        };
        const cancel = () => finish(false);
        const resume = () => {
          cancelAnimationFrame(handle);
          previous = performance.now();
          if (!settled && visible && !document.hidden) handle = requestAnimationFrame(tick);
        };
        const observer = new IntersectionObserver(entries => {
          visible = entries.some(entry => entry.isIntersecting);
          resume();
        });
        const tick = (time: number) => {
          if (signal.aborted) { finish(false); return; }
          if (!visible || document.hidden) return;
          elapsed += Math.min(100, Math.max(0, time - previous));
          previous = time;
          const next = Math.min(frameCount - 1, Math.floor(elapsed * cell.fps / 1000));
          if (frame !== next) {
            frame = next;
            context.clearRect(0, 0, cell.width, cell.height);
            context.drawImage(image, next % cell.columns * cell.width, Math.floor(next / cell.columns) * cell.height, cell.width, cell.height, 0, 0, cell.width, cell.height);
            onReady();
          }
          if (elapsed >= frameCount * 1000 / cell.fps) finish(true);
          else handle = requestAnimationFrame(tick);
        };
        observer.observe(canvas);
        document.addEventListener('visibilitychange', resume);
        signal.addEventListener('abort', cancel, { once: true });
        handle = requestAnimationFrame(tick);
      });
      if (!complete) return 'cancelled';
    }
    return 'finished';
  } finally {
    for (const key of images.keys()) releaseChunk(key);
  }
}
