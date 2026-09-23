import { createEditorialActor } from './editorial-actor.ts';

const mishaps = ['bookmark', 'bird', 'tumble', 'reverse'] as const;
type ArchiveBook = { readonly year: string; readonly shelf: 'upper' | 'lower' };

export function mountArchiveBookcart(host: HTMLElement): () => void {
  const actorHost = host.querySelector<HTMLElement>('[data-editorial-actor]');
  if (!actorHost) return () => {};
  const actor = createEditorialActor(actorHost);
  const listeners = new AbortController();
  const motion = matchMedia('(prefers-reduced-motion: reduce)');
  const years = Array.from(host.querySelectorAll<HTMLDetailsElement>('[data-cart-year]'));
  const marker = host.querySelector<HTMLElement>('[data-cart-selection]');
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
  let requested: ArchiveBook | null = null;
  let held: ArchiveBook | null = null;
  let changing = false;
  let replaySelection = false;
  let disposed = false;
  let motionRevision = 0;

  const busy = () => actorHost.dataset.actorState === 'loading'
    || actorHost.dataset.actorState === 'playing'
    || (actorHost.dataset.actorState === 'paused' && actorHost.dataset.actorLoop !== 'true');

  async function selectBook(): Promise<void> {
    if (disposed || changing || motion.matches || busy() || (held?.year === requested?.year && !replaySelection)) return;
    changing = true;
    idle = false;
    resume();
    const revision = motionRevision;
    let completed = false;
    try {
      if (held) {
        if (!await actor.play(`return-${held.shelf}`) || disposed || revision !== motionRevision) return;
        held = null;
        delete host.dataset.cartHeldYear;
      }
      replaySelection = false;
      const target = requested;
      if (target) {
        if (!await actor.play(`retrieve-${target.shelf}`) || disposed || revision !== motionRevision) return;
        held = target;
        host.dataset.cartHeldYear = target.year;
      }
      completed = true;
    } finally {
      changing = false;
      idle = true;
      resume();
      if ((completed || revision !== motionRevision) && !disposed) void selectBook();
    }
  }

  const selectYear = () => {
    const selected = years.find(detail => detail.open);
    const year = selected?.dataset.cartYear;
    const shelf = selected?.dataset.cartShelf;
    const next: ArchiveBook | null = year && (shelf === 'upper' || shelf === 'lower') ? { year, shelf } : null;
    if (requested?.year === next?.year) return;
    requested = next;
    if (marker) {
      marker.hidden = requested === null;
      marker.textContent = requested?.year ?? '';
    }
    if (requested) arrived = true;
    actor.finishSoon();
    resume();
    void selectBook();
  };

  const tick = (now: number) => {
    if (!visible || document.hidden || !idle || motion.matches || !surprise || requested || held || changing) return;
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
    if (!disposed && visible && !document.hidden && idle && surprise && !motion.matches && !requested && !held && !changing) frame = requestAnimationFrame(tick);
  };
  const enter = () => {
    if (visible && !document.hidden && !arrived && !motion.matches) {
      arrived = true;
      void actor.play('arrival').then(played => { idle = played; resume(); });
    }
    void selectBook();
    resume();
  };
  const observer = new IntersectionObserver(([entry]) => {
    visible = entry?.isIntersecting ?? false;
    enter();
  }, { threshold: 0.25 });
  observer.observe(actorHost);
  years.forEach(detail => detail.addEventListener('toggle', selectYear, { signal: listeners.signal }));
  host.querySelector('[data-cart-replay]')?.addEventListener('click', () => {
    if (busy() || changing) return;
    arrived = true;
    if (requested) {
      replaySelection = true;
      void selectBook();
      return;
    }
    void actor.play(mishaps[cycle++ % mishaps.length] ?? 'bookmark');
  }, { signal: listeners.signal });
  actorHost.addEventListener('editorial-actor-start', () => {
    idle = actorHost.dataset.actorLoop === 'true';
    void selectBook();
    resume();
  }, { signal: listeners.signal });
  actorHost.addEventListener('editorial-actor-end', () => { idle = true; void selectBook(); resume(); }, { signal: listeners.signal });
  actorHost.addEventListener('editorial-actor-unavailable', () => { void selectBook(); }, { signal: listeners.signal });
  document.addEventListener('visibilitychange', enter, { signal: listeners.signal });
  motion.addEventListener('change', () => {
    motionRevision++;
    if (motion.matches) {
      held = null;
      replaySelection = false;
      delete host.dataset.cartHeldYear;
    }
    enter();
  }, { signal: listeners.signal });
  selectYear();
  return () => {
    disposed = true;
    cancelAnimationFrame(frame);
    observer.disconnect();
    listeners.abort();
    actor.dispose();
  };
}
