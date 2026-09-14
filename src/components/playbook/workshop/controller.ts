import type { Station } from './renderer';
const isStation = (value: string | undefined): value is Station => value === 'living-scenes' || value === 'reading-companion';

class PlaybookWorkshop extends HTMLElement {
  private cleanup: (() => void) | undefined;
  connectedCallback() {
    this.cleanup?.();
    const canvas = this.querySelector('canvas');
    if (!canvas) return;
    const reduced = matchMedia('(prefers-reduced-motion: reduce)');
    const stage = this.querySelector<HTMLElement>('[data-stage]');
    const directory = this.querySelector<HTMLElement>('[data-directory]');
    const pauseButton = this.querySelector<HTMLButtonElement>('[data-pause]');
    const overview = this.querySelector<HTMLButtonElement>('[data-overview]');
    if (!stage || !directory || !pauseButton || !overview) return;
    const en = this.dataset.lang === 'en';
    const abort = new AbortController(); const { signal } = abort;
    let selected: Station | undefined, visible = true, paused = false, alive = true, previous = 0, raf = 0;
    let renderer: Awaited<ReturnType<typeof import('./renderer')['createWorkshop']>> | undefined;
    let storage: Storage | undefined;
    try { storage = sessionStorage; const value = storage.getItem('playbook-station'); if (value && isStation(value)) selected = value; }
    catch (error) { if (!(error instanceof DOMException)) throw error; }
    const paintSelection = () => {
      this.dataset.selected = selected ?? '';
      for (const button of this.querySelectorAll<HTMLButtonElement>('[data-station]')) button.setAttribute('aria-pressed', String(button.dataset.station === selected));
      for (const panel of this.querySelectorAll<HTMLElement>('[data-description]')) panel.hidden = panel.dataset.description !== selected;
      overview.hidden = !selected;
    };
    const select = (id: Station | undefined) => {
      selected = id; paintSelection(); renderer?.select(id, stage.clientWidth < 600);
      try { if (id) storage?.setItem('playbook-station', id); else storage?.removeItem('playbook-station'); }
      catch (error) { if (!(error instanceof DOMException)) throw error; storage = undefined; }
      wake();
    };
    const tick = (now: number) => {
      raf = 0; if (!renderer || !visible || document.hidden || !alive) return;
      const delta = previous ? Math.min((now - previous) / 1000, .05) : 1 / 60; previous = now;
      const state = renderer.render(delta, reduced.matches || paused);
      for (const el of this.querySelectorAll<HTMLElement>('[data-anchor]')) {
        const point = state.locations[el.dataset.anchor ?? ''];
        if (point) el.style.transform = `translate(${point.x}px, ${point.y}px) translate(-50%, -50%)`;
      }
      this.dataset.frame = String(state.frame?.bear ?? 0); this.dataset.panda = String(state.frame?.panda ?? 0);
      this.dataset.calls = String(state.calls); this.dataset.triangles = String(state.triangles);
      if (!paused && !reduced.matches) raf = requestAnimationFrame(tick);
    };
    const wake = () => { previous = 0; if (!raf && alive) raf = requestAnimationFrame(tick); };
    const resize = () => { renderer?.resize(stage.clientWidth, stage.clientHeight); renderer?.select(selected, stage.clientWidth < 600); wake(); };
    const theme = () => { renderer?.theme(document.documentElement.dataset.mode !== 'light'); wake(); };
    this.addEventListener('click', event => {
      const target = event.target;
      if (!(target instanceof Element)) return;
      const station = target.closest<HTMLElement>('[data-station]')?.dataset.station;
      if (isStation(station)) select(station);
      if (target.closest('[data-overview]')) select(undefined);
      if (target.closest('button[data-bird]')) { renderer?.bird(); this.dataset.bird = 'hop'; wake(); }
      if (target.closest('button[data-curtain]')) {
        const closed = renderer?.curtain(); this.dataset.curtain = closed ? 'closed' : 'open';
        target.closest('button')?.setAttribute('aria-pressed', String(closed)); wake();
      }
    }, { signal });
    this.addEventListener('keydown', event => { if (event.key === 'Escape') { select(undefined); this.querySelector<HTMLButtonElement>('[data-station]')?.focus(); } }, { signal });
    const highlight = (event: Event) => {
      const target = event.target;
      if (!(target instanceof Element)) return;
      const station = target.closest<HTMLElement>('[data-entry]')?.dataset.entry;
      this.dataset.highlight = isStation(station) ? station : ''; renderer?.highlight(isStation(station) ? station : undefined); wake();
    };
    directory.addEventListener('pointerover', highlight, { signal }); directory.addEventListener('focusin', highlight, { signal });
    const clear = () => { this.dataset.highlight = ''; renderer?.highlight(undefined); wake(); };
    directory.addEventListener('pointerleave', clear, { signal }); directory.addEventListener('focusout', clear, { signal });
    canvas.addEventListener('click', event => { const rect = canvas.getBoundingClientRect(); const hit = renderer?.pick((event.clientX - rect.left) / rect.width, (event.clientY - rect.top) / rect.height); if (isStation(hit)) select(hit); }, { signal });
    stage.addEventListener('pointermove', event => {
      if (event.pointerType !== 'mouse' || reduced.matches || paused) return;
      const rect = stage.getBoundingClientRect(); renderer?.point(event.clientX - rect.left - rect.width * .67, rect.height * .55 - event.clientY + rect.top); wake();
    }, { signal });
    pauseButton.addEventListener('click', () => { paused = !paused; this.dataset.paused = String(paused); pauseButton.setAttribute('aria-pressed', String(paused)); pauseButton.textContent = paused ? (en ? 'Resume motion' : '继续动态') : (en ? 'Pause motion' : '暂停动态'); wake(); }, { signal });
    document.addEventListener('visibilitychange', () => { if (document.hidden) { cancelAnimationFrame(raf); raf = 0; } else wake(); }, { signal });
    reduced.addEventListener('change', wake, { signal });
    const viewport = new IntersectionObserver(entries => { visible = entries.some(entry => entry.isIntersecting); if (visible) wake(); else { cancelAnimationFrame(raf); raf = 0; } }); viewport.observe(stage);
    const size = new ResizeObserver(resize); size.observe(stage);
    const appearance = new MutationObserver(theme); appearance.observe(document.documentElement, { attributes: true, attributeFilter: ['data-mode'] });
    paintSelection();
    const fail = (error: unknown) => {
      if (!alive) return;
      this.dataset.ready = 'false'; this.dataset.error = error instanceof Error ? error.name : 'RendererError';
      renderer?.dispose(); renderer = undefined; canvas.hidden = true;
    };
    canvas.addEventListener('webglcontextlost', event => { event.preventDefault(); fail(new DOMException('WebGL context lost', 'ContextLost')); }, { signal });
    void import('./renderer').then(async ({ createWorkshop }) => {
      if (!alive) return;
      renderer = createWorkshop(canvas); resize(); theme();
      await renderer.ready;
      if (!alive) return;
      this.dataset.ready = 'true'; canvas.hidden = false; wake();
    }).catch(fail);
    this.cleanup = () => { alive = false; abort.abort(); cancelAnimationFrame(raf); viewport.disconnect(); size.disconnect(); appearance.disconnect(); renderer?.dispose(); };
  }
  disconnectedCallback() { this.cleanup?.(); }
}
if (!customElements.get('playbook-workshop')) customElements.define('playbook-workshop', PlaybookWorkshop);
