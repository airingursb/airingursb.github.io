import type { createDiorama } from './scene';

export function mountDioramaPreview(link: HTMLAnchorElement) {
  const host = link.querySelector<HTMLElement>('[data-preview-stage]');
  const note = link.querySelector<HTMLElement>('[data-preview-note]');
  if (!host || !note) return;
  const desktop = matchMedia('(min-width: 1200px)');
  const events = new AbortController();
  let runtime: ReturnType<typeof createDiorama> | undefined;
  let inView = false, loading = false, disposed = false, failed = false;
  const kind = link.dataset.kind === 'marina' ? 'marina' : 'busan';

  function updateMotion() {
    runtime?.setPaused(!inView || !(link.matches(':hover') || link.matches(':focus-within')));
  }
  async function sync() {
    if (!host || !note || disposed) return;
    if (!desktop.matches) {
      runtime?.dispose(); runtime = undefined;
      link.classList.remove('is-ready');
      return;
    }
    updateMotion();
    if (!inView || runtime || loading || failed) return;
    loading = true;
    note.textContent = note.dataset.loading ?? '';
    try {
      const { createDiorama } = await import('./scene');
      if (disposed || !desktop.matches || !inView) return;
      const scene = createDiorama(host, kind, 'preview');
      runtime = scene;
      await scene.ready;
      if (disposed || runtime !== scene) return;
      link.classList.add('is-ready');
      note.textContent = note.dataset.idle ?? '';
      updateMotion();
    } catch (error) {
      if (disposed) return;
      runtime?.dispose(); runtime = undefined;
      failed = true;
      note.textContent = note.dataset.fallback ?? '';
      link.classList.remove('is-ready');
      console.warn('Diorama preview unavailable', error instanceof Error ? error.message : 'Unknown rendering error');
    } finally {
      loading = false;
      if (!disposed && desktop.matches && inView && !runtime && !failed) void sync();
    }
  }
  const visibility = new IntersectionObserver(entries => {
    inView = entries.some(entry => entry.isIntersecting);
    void sync();
  });
  visibility.observe(link);
  desktop.addEventListener('change', () => { void sync(); }, {signal: events.signal});
  for (const event of ['pointerenter', 'pointerleave', 'focusin']) {
    link.addEventListener(event, updateMotion, {signal: events.signal});
  }
  link.addEventListener('focusout', () => { requestAnimationFrame(updateMotion); }, {signal: events.signal});
  window.addEventListener('pagehide', event => {
    if (event.persisted) return;
    disposed = true;
    events.abort(); visibility.disconnect(); runtime?.dispose();
  }, {signal: events.signal});
}
