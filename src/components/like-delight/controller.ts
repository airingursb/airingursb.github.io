import { loadEditorialAtlas, loadEditorialManifest } from '../../lib/editorial-actor-assets';
import { BLOG_PET_DISMISSED, isBlogPetDismissed } from '../../lib/blog-pet-preference';
import { heartPosition, rectangleVisible } from './geometry';

const BASE = '/blog-delights/like/';
const LIKE_EVENT = 'article:liked';
const PLAYBACK_RATE = 1.6;
const FLIGHT_MS = 520;

export function mountLikeDelight(marker: HTMLElement): () => void {
  const listeners = new AbortController();
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  let generation = 0;
  let active = false;
  let performed = false;
  let disposed = false;
  let frameRequest = 0;
  let target: HTMLElement | null = null;
  let originalOpacity = '';
  let stage: HTMLCanvasElement | null = null;
  let heart: HTMLElement | null = null;
  marker.dataset.state = 'idle';

  const visible = (element: HTMLElement) => {
    if (!element.isConnected || element.hidden || getComputedStyle(element).visibility === 'hidden') return false;
    return rectangleVisible(element.getBoundingClientRect(), innerWidth, innerHeight);
  };
  const recipient = () => {
    const dock = document.querySelector<HTMLElement>('[data-article-pet-dock][data-dock-state="docked"]');
    const dockActor = dock?.querySelector<HTMLElement>('[data-editorial-actor]');
    if (dock && !dock.hidden && dockActor && visible(dockActor)) return dockActor;
    const floating = document.getElementById('blog-pet');
    if (innerWidth > 800 && floating && !floating.dataset.petDocked && !floating.dataset.petTravelling && visible(floating)) return floating;
    return null;
  };
  const reset = () => {
    generation++;
    cancelAnimationFrame(frameRequest);
    if (target && target.style.opacity === '0') target.style.opacity = originalOpacity;
    stage?.remove();
    heart?.remove();
    stage = null;
    heart = null;
    target = null;
    active = false;
    marker.dataset.state = performed ? 'received' : 'idle';
  };
  const eligible = () => !disposed && !document.hidden && !reduced.matches && !isBlogPetDismissed();

  const receive = async (source: HTMLButtonElement) => {
    if (active || performed || !eligible() || !visible(source)) return;
    const chosen = recipient();
    if (!chosen) return;
    active = true;
    marker.dataset.state = 'loading';
    const ticket = ++generation;
    const manifest = await loadEditorialManifest(`${BASE}manifest.json`);
    if (ticket !== generation || !eligible()) return;
    const withBook = chosen.id !== 'blog-pet';
    const clip = manifest?.clips[withBook ? 'receive-book' : 'receive'];
    if (!manifest || !clip) { reset(); return; }
    const atlas = await loadEditorialAtlas(`${BASE}${clip.asset}`);
    if (ticket !== generation || !eligible()) return;
    if (!atlas || recipient() !== chosen || !visible(source)) { reset(); return; }
    if (atlas.naturalWidth !== manifest.width * manifest.columns || atlas.naturalHeight < Math.ceil(clip.frames / manifest.columns) * manifest.height) { reset(); return; }

    target = chosen;
    originalOpacity = chosen.style.opacity;
    stage = document.createElement('canvas');
    stage.width = manifest.width;
    stage.height = manifest.height;
    stage.setAttribute('aria-hidden', 'true');
    stage.dataset.likeReception = 'true';
    stage.style.cssText = 'position:fixed;pointer-events:none;z-index:81;';
    const context = stage.getContext('2d');
    if (!context) { reset(); return; }
    heart = document.createElement('span');
    heart.setAttribute('aria-hidden', 'true');
    heart.style.cssText = 'position:fixed;left:0;top:0;width:14px;height:14px;pointer-events:none;z-index:82;color:#d89987;opacity:0;';
    heart.innerHTML = '<svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor"><path d="M12 21s-9-5.7-9-12a5 5 0 0 1 9-3 5 5 0 0 1 9 3c0 6.3-9 12-9 12Z"/></svg>';
    document.body.append(stage, heart);
    chosen.style.opacity = '0';
    performed = true;
    const start = performance.now();
    const firstFrame = withBook ? 14 : 9;
    marker.dataset.state = 'receiving';
    const draw = (now: number) => {
      if (!stage || !heart || ticket !== generation) return;
      if (!eligible() || !visible(chosen) || recipient() !== chosen) { reset(); return; }
      const elapsed = now - start;
      const frame = firstFrame + Math.floor(elapsed * manifest.fps * PLAYBACK_RATE / 1000);
      if (frame >= clip.frames) { reset(); return; }
      const rect = chosen.getBoundingClientRect();
      stage.style.left = `${rect.left}px`;
      stage.style.top = `${rect.top}px`;
      stage.style.width = `${rect.width}px`;
      stage.style.height = `${rect.height}px`;
      context.clearRect(0, 0, manifest.width, manifest.height);
      context.drawImage(atlas, frame % manifest.columns * manifest.width, Math.floor(frame / manifest.columns) * manifest.height, manifest.width, manifest.height, 0, 0, manifest.width, manifest.height);
      marker.dataset.frame = String(frame);
      // H3 owns the final drop: the first attached-heart frames are 32 and 25.
      const handoff = ((withBook ? 32 : 25) - firstFrame) * 1000 / (manifest.fps * PLAYBACK_RATE);
      const approach = (elapsed - handoff + FLIGHT_MS) / FLIGHT_MS;
      heart.style.opacity = approach >= 0 && approach < 1 ? '1' : '0';
      if (approach >= 0 && approach < 1) {
        const button = (source.querySelector('.al-icon') || source).getBoundingClientRect();
        const point = heartPosition({ x: button.left + button.width / 2, y: button.top + button.height / 2 }, { x: rect.left + rect.width * .272, y: rect.top + rect.height * (withBook ? .288 : .247) }, approach);
        const scale = 1 + (rect.width * .14 / 14 - 1) * approach;
        heart.style.transform = `translate(${point.x - 7}px,${point.y - 7}px) rotate(${Math.sin(approach * Math.PI) * -16}deg) scale(${scale})`;
      }
      frameRequest = requestAnimationFrame(draw);
    };
    frameRequest = requestAnimationFrame(draw);
  };

  const onLike = (event: Event) => {
    if (!(event.target instanceof HTMLButtonElement) || event.target.id !== 'articleLikeBtn') return;
    void receive(event.target);
  };
  const onVisibility = () => { if (document.hidden) reset(); };
  const onStorage = (event: StorageEvent) => { if (event.key === BLOG_PET_DISMISSED && event.newValue === '1') reset(); };
  document.addEventListener(LIKE_EVENT, onLike, { signal: listeners.signal });
  document.addEventListener('visibilitychange', onVisibility, { signal: listeners.signal });
  window.addEventListener(BLOG_PET_DISMISSED, reset, { signal: listeners.signal });
  window.addEventListener('storage', onStorage, { signal: listeners.signal });
  reduced.addEventListener('change', reset, { signal: listeners.signal });
  window.addEventListener('resize', reset, { signal: listeners.signal });
  return () => { disposed = true; reset(); listeners.abort(); };
}
