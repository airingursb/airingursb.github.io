import { createEditorialActor } from '../../lib/editorial-actor.ts';

export function mountFooterTide(host: HTMLElement): () => void {
  const artwork = host.querySelector<HTMLElement>('[data-editorial-actor]');
  const shell = host.querySelector<HTMLButtonElement>('[data-tide-shell]');
  const poster = host.querySelector<HTMLImageElement>('[data-actor-poster]');
  if (!artwork || !shell || !poster) return () => {};
  const actor = createEditorialActor(artwork);
  const motion = matchMedia('(prefers-reduced-motion: reduce)');
  const events = new AbortController();
  let visible = false;
  let arrived = false;
  let busy = false;
  let disposed = false;
  let elapsed = 0;
  let previous: number | null = null;
  let request = 0;
  let stillTimer = 0;

  const ready = () => {
    if (disposed) return;
    busy = false;
    shell.hidden = false;
    shell.removeAttribute('aria-disabled');
    host.dataset.tideState = 'ready';
  };
  const still = () => {
    actor.stop();
    poster.src = '/blog-delights/tide/listening.webp';
    stillTimer = window.setTimeout(() => {
      poster.src = '/blog-delights/tide/poster.webp';
      ready();
    }, 1500);
  };
  const listen = async () => {
    if (!arrived || busy || disposed) return;
    busy = true;
    shell.setAttribute('aria-disabled', 'true');
    host.dataset.tideState = 'listening';
    if (motion.matches) { still(); return; }
    const played = await actor.play('listen');
    if (disposed) return;
    if (played) ready();
    else still();
  };
  const arrive = async () => {
    arrived = true;
    host.dataset.tideState = 'wave';
    await actor.play('wave');
    ready();
  };
  const tick = (now: number) => {
    if (!visible || document.hidden || arrived || disposed) return;
    if (previous !== null) elapsed += now - previous;
    previous = now;
    if (elapsed >= 1800) { void arrive(); return; }
    request = requestAnimationFrame(tick);
  };
  const resume = () => {
    cancelAnimationFrame(request);
    previous = null;
    if (disposed || arrived) return;
    if (motion.matches) { arrived = true; ready(); return; }
    if (visible && !document.hidden) request = requestAnimationFrame(tick);
  };
  const reducedMotion = () => {
    window.clearTimeout(stillTimer);
    if (motion.matches) {
      arrived = true;
      poster.src = '/blog-delights/tide/poster.webp';
      ready();
    }
    resume();
  };
  const observer = new IntersectionObserver(([entry]) => {
    visible = entry?.isIntersecting ?? false;
    resume();
  }, { threshold: .5 });
  observer.observe(host);
  shell.addEventListener('click', () => { void listen(); }, { signal: events.signal });
  document.addEventListener('visibilitychange', resume, { signal: events.signal });
  motion.addEventListener('change', reducedMotion, { signal: events.signal });
  resume();
  return () => {
    disposed = true;
    cancelAnimationFrame(request);
    window.clearTimeout(stillTimer);
    observer.disconnect();
    events.abort();
    actor.dispose();
  };
}
