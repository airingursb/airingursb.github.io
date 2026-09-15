import type {} from '../../lounge/umami';
import { BearAnalyticsState, canTrackBearPage } from './analytics-state';
import type { BearEvent, BearObject, BearPlacement } from './analytics-state';

const controls = '[data-action], [data-book], [data-keepsake], [data-footer-bear], [data-footer-subscribe], bear-window button, bear-bird button';

function objectFor(control: HTMLElement): BearObject | undefined {
  if (control.closest('bear-bird')) return 'bird';
  if (control.closest('bear-window')) return 'curtain';
  if (control.hasAttribute('data-footer-bear')) return 'bear';
  if (control.hasAttribute('data-footer-subscribe')) return 'mailbox';
  if (control.hasAttribute('data-book')) return 'book';
  if (control.dataset.keepsake === 'letter' || control.dataset.keepsake === 'camera') return control.dataset.keepsake;
  switch (control.dataset.action) {
    case 'head': return 'bear';
    case 'drink': return 'mug';
    case 'typing': return 'laptop';
    case 'water': return 'plant';
    case 'lamp': return 'lamp';
    default: return undefined;
  }
}

function observeScene(root: HTMLElement, placement: BearPlacement) {
  const state = new BearAnalyticsState(placement);
  const abort = new AbortController();
  let visible = false, timer = 0;
  // Keep early input until the deferred tracker loads. Never persist analytics IDs/data.
  const pending: BearEvent[] = [];
  let sending = false;
  const flush = async () => { // no-excuse-ok: catch — analytics is an optional network boundary
    if (sending || !window.umami?.track) return;
    sending = true;
    try {
      while (pending.length && window.umami?.track) {
        const event = pending.shift();
        if (event) await window.umami.track(event.name, event.data);
      }
    } catch {
      // Tracker blocking or network failure must never affect scene interaction.
      pending.length = 0;
    } finally { sending = false; }
  };
  const emit = (events: readonly BearEvent[]) => {
    pending.push(...events.slice(0, Math.max(0, 100 - pending.length)));
    void flush();
  };
  const update = () => {
    clearTimeout(timer);
    if (visible && !document.hidden) timer = window.setTimeout(() => emit(state.view()), 1000);
  };
  const observer = new IntersectionObserver(entries => {
    visible = entries.some(entry => entry.isIntersecting && entry.intersectionRatio >= .5);
    update();
  }, { threshold: [0, .5] });
  observer.observe(root);
  const interaction = (event: MouseEvent | KeyboardEvent) => {
    if (!event.isTrusted || document.hidden || !(event.target instanceof Element)) return;
    const control = event.target.closest<HTMLElement>(controls);
    if (!control || !root.contains(control) || control.matches(':disabled') || !control.getClientRects().length) return;
    if (event instanceof KeyboardEvent && (event.key !== ' ' || !(control instanceof HTMLAnchorElement) || event.repeat)) return;
    if (event instanceof MouseEvent && event.button !== 0) return;
    const object = objectFor(control);
    if (object) emit(state.click(object, event instanceof KeyboardEvent || event.detail === 0 ? 'keyboard' : 'pointer'));
  };
  root.addEventListener('click', interaction, { capture: true, signal: abort.signal });
  root.addEventListener('keydown', interaction, { capture: true, signal: abort.signal });
  document.addEventListener('visibilitychange', update, { signal: abort.signal });
  document.querySelector('script[data-website-id]')?.addEventListener('load', () => { void flush(); }, { once: true, signal: abort.signal });
  window.addEventListener('pageshow', update, { signal: abort.signal });
  window.addEventListener('pagehide', event => {
    clearTimeout(timer);
    if (!event.persisted) { observer.disconnect(); abort.abort(); pending.length = 0; }
  }, { signal: abort.signal });
}

if (canTrackBearPage(new URL(location.href))) {
  for (const root of document.querySelectorAll<HTMLElement>('bear-home-study, bear-footer-scene')) {
    if (root.closest('[data-showcase="true"]')) continue;
    observeScene(root, root.matches('bear-home-study') ? 'header' : 'footer');
  }
}
