import frames from '../../../public/bear-footer/lamp-manifest.json';
import type { BearFooterScene } from './player';

export function mountTreeLampMotion(scene: BearFooterScene): () => void {
  const abort = new AbortController();
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  let atlas: HTMLImageElement | null = null;
  let pending = false;
  let preparing = false;
  let running = false;
  let alive = true;

  const load = async (): Promise<boolean> => {
    if (atlas) return true;
    const image = new Image();
    image.decoding = 'async';
    image.src = '/bear-footer/lamp-actions.webp';
    let timeout = 0;
    try {
      const decoded = await Promise.race([
        image.decode().then(() => true),
        new Promise<boolean>(resolve => { timeout = window.setTimeout(() => resolve(false), 8000); }),
      ]);
      if (decoded) atlas = image;
      return decoded;
    } catch (error) {
      if (error instanceof DOMException) return false;
      throw error;
    } finally {
      clearTimeout(timeout);
    }
  };

  const begin = async () => {
    if (!pending || running || preparing || !alive || reduced.matches) return;
    preparing = true;
    const [loaded, ready] = await Promise.all([load(), scene.prepareActivity()]);
    preparing = false;
    if (!alive || !scene.isConnected || reduced.matches) { pending = false; return; }
    if (!loaded || !ready || !atlas) {
      pending = false;
      scene.dataset.lampMedia = 'error';
      return;
    }
    const started = scene.playActivity({ atlas, ...frames, kind: 'lighting', keepStaticProps: true });
    // An existing watering performance owns the stage until its end event.
    if (!started) return;
    pending = false;
    running = true;
    scene.dataset.lampMedia = 'ready';
  };
  const request = () => {
    if (reduced.matches || running) return;
    pending = true;
    void begin();
  };
  const frame = () => {
    if (scene.dataset.state !== 'lighting') return;
    const current = Number(scene.dataset.frame);
    scene.dataset.lampPull = String(current >= frames.pull.start && current <= frames.pull.end);
  };
  const end = () => {
    if (running) {
      running = false;
      scene.dataset.lampPull = 'false';
      scene.dispatchEvent(new Event('bear-footer-lamp-complete'));
    }
    void begin();
  };
  const preference = () => {
    if (reduced.matches) pending = false;
  };
  scene.addEventListener('bear-footer-lamp-request', request, { signal: abort.signal });
  scene.addEventListener('bear-footer-activity-frame', frame, { signal: abort.signal });
  scene.addEventListener('bear-footer-activity-end', end, { signal: abort.signal });
  reduced.addEventListener('change', preference, { signal: abort.signal });
  return () => {
    alive = false;
    pending = false;
    abort.abort();
    if (running) scene.stopActivity();
    scene.dataset.lampPull = 'false';
  };
}
