import { createEditorialActor } from './editorial-actor.ts';

const mishaps = ['bookmark', 'bird', 'tumble', 'reverse'] as const;

export function mountArchiveBookcart(host: HTMLElement): () => void {
  const actorHost = host.querySelector<HTMLElement>('[data-editorial-actor]');
  if (!actorHost) return () => {};
  const actor = createEditorialActor(actorHost);
  const listeners = new AbortController();
  const motion = matchMedia('(prefers-reduced-motion: reduce)');
  const idleWait = 18000 + Math.random() * 17000;
  let surprise = Math.random() < 0.25;
  const storageKey = 'editorial-bookcart-surprise-v1';
  const remember = (state: string) => {
    try { sessionStorage.setItem(storageKey, state); }
    catch (error) {
      if (!(error instanceof Error)) throw error;
      host.dataset.cartStorage = 'unavailable';
    }
  };
  try {
    const saved = sessionStorage.getItem(storageKey);
    if (saved) surprise = saved === 'pending';
    else remember(surprise ? 'pending' : 'skip');
  } catch (error) {
    if (!(error instanceof Error)) throw error;
    host.dataset.cartStorage = 'unavailable';
  }
  let visible = false;
  let arrived = false;
  let idle = false;
  let cycle = 0;
  let elapsed = 0;
  let previous: number | null = null;
  let frame = 0;

  const tick = (now: number) => {
    if (!visible || document.hidden || !idle || motion.matches || !surprise) return;
    if (actorHost.dataset.actorState === 'loading') {
      previous = null;
      frame = requestAnimationFrame(tick);
      return;
    }
    if (previous !== null) elapsed += now - previous;
    previous = now;
    if (elapsed >= idleWait) {
      surprise = false;
      remember('used');
      void actor.play(mishaps[Math.floor(Math.random() * mishaps.length)] ?? 'bookmark');
      return;
    }
    frame = requestAnimationFrame(tick);
  };
  const resume = () => {
    cancelAnimationFrame(frame);
    previous = null;
    if (visible && !document.hidden && idle && surprise && !motion.matches) frame = requestAnimationFrame(tick);
  };
  const enter = () => {
    if (visible && !document.hidden && !arrived && !motion.matches) {
      arrived = true;
      void actor.play('arrival').then(played => { idle = played; resume(); });
    }
    resume();
  };
  const observer = new IntersectionObserver(([entry]) => {
    visible = entry?.isIntersecting ?? false;
    enter();
  }, { threshold: 0.25 });
  observer.observe(actorHost);
  host.querySelector('[data-cart-replay]')?.addEventListener('click', () => {
    if (actorHost.dataset.actorState === 'playing' || actorHost.dataset.actorState === 'loading') return;
    arrived = true;
    void actor.play(mishaps[cycle++ % mishaps.length] ?? 'bookmark');
  }, { signal: listeners.signal });
  actorHost.addEventListener('editorial-actor-start', () => {
    idle = actorHost.dataset.actorLoop === 'true';
    resume();
  }, { signal: listeners.signal });
  actorHost.addEventListener('editorial-actor-end', () => { idle = true; resume(); }, { signal: listeners.signal });
  document.addEventListener('visibilitychange', enter, { signal: listeners.signal });
  motion.addEventListener('change', enter, { signal: listeners.signal });
  return () => {
    cancelAnimationFrame(frame);
    observer.disconnect();
    listeners.abort();
    actor.dispose();
  };
}
