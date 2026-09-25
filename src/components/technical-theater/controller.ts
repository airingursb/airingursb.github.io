import { createEditorialActor } from '../../lib/editorial-actor';
import { theaterCopy } from './copy';
import { heap, reachableObjects, sweepObjects } from './state';
import type { ObjectId, Phase } from './state';

function setupTheater(host: HTMLElement): (() => void) | undefined {
  const mark = host.querySelector<HTMLButtonElement>('[data-mark]');
  const sweep = host.querySelector<HTMLButtonElement>('[data-sweep]');
  const connect = host.querySelector<HTMLButtonElement>('[data-connect]');
  const reset = host.querySelector<HTMLButtonElement>('[data-reset]');
  const status = host.querySelector<HTMLElement>('[data-status]');
  const hint = host.querySelector<HTMLElement>('[data-hint]');
  const actorHost = host.querySelector<HTMLElement>('[data-editorial-actor]');
  if (!mark || !sweep || !connect || !reset || !status || !hint || !actorHost) return;
  const copy = theaterCopy[host.dataset.lang === 'en' ? 'en' : 'zh'];
  const actor = createEditorialActor(actorHost);
  const listeners = new AbortController();
  let phase: Phase = 'allocated';
  let connected = false;
  let marked: readonly ObjectId[] = [];
  let pending: 'point' | 'sweep' | null = null;
  let performing = false;
  let disposed = false;

  async function perform(action: 'point' | 'sweep') {
    pending = action;
    if (performing) { actor.finishSoon(); return; }
    performing = true;
    while (pending && !disposed) {
      const next = pending;
      pending = null;
      await actor.play(next);
    }
    performing = false;
  }
  const render = () => {
    host.dataset.phase = phase;
    const reclaimed = phase === 'swept' ? sweepObjects(heap, marked) : [];
    for (const object of heap) {
      const element = host.querySelector<HTMLElement>(`[data-object="${object.id}"]`);
      const badge = element?.querySelector<HTMLElement>('[data-mark-label]');
      if (!element || !badge) continue;
      element.dataset.marked = String(marked.includes(object.id));
      element.dataset.free = String(reclaimed.includes(object.id));
      badge.textContent = reclaimed.includes(object.id) ? copy.free : marked.includes(object.id) ? '✓' : '';
    }
    const cycle = host.querySelector<HTMLElement>('.gc-wire-cycle');
    if (cycle) cycle.style.opacity = reclaimed.includes('C') ? '0' : '';
    const optional = host.querySelector<HTMLElement>('.gc-wire-optional');
    if (optional) optional.hidden = !connected;
    connect.setAttribute('aria-pressed', String(connected));
    connect.disabled = phase !== 'allocated';
    mark.disabled = phase !== 'allocated';
    sweep.disabled = phase !== 'marked';
    reset.hidden = phase === 'allocated' && !connected;
    hint.style.visibility = phase === 'allocated' ? '' : 'hidden';
    status.textContent = phase === 'allocated' ? (connected ? copy.connected : copy.allocated)
      : phase === 'marked' ? (connected ? copy.markedAll : copy.marked)
      : connected ? copy.sweptAll : copy.swept;
  };
  mark.addEventListener('click', () => {
    marked = reachableObjects(heap, connected ? ['A', 'C'] : ['A']);
    phase = 'marked';
    render();
    void perform('point');
  }, { signal: listeners.signal });
  sweep.addEventListener('click', () => {
    phase = 'swept';
    render();
    void perform('sweep');
  }, { signal: listeners.signal });
  connect.addEventListener('click', () => { connected = !connected; render(); }, { signal: listeners.signal });
  reset.addEventListener('click', () => {
    pending = null;
    actor.stop();
    phase = 'allocated';
    connected = false;
    marked = [];
    render();
    mark.focus();
  }, { signal: listeners.signal });
  render();
  return () => { disposed = true; pending = null; listeners.abort(); actor.dispose(); };
}

let dispose: readonly (() => void)[] = [];
function initialize() {
  dispose.forEach(cleanup => cleanup());
  dispose = Array.from(document.querySelectorAll<HTMLElement>('gc-theater'))
    .map(setupTheater).filter((cleanup): cleanup is () => void => cleanup !== undefined);
}
initialize();
document.addEventListener('astro:page-load', initialize);
document.addEventListener('astro:before-swap', () => { dispose.forEach(cleanup => cleanup()); dispose = []; });
