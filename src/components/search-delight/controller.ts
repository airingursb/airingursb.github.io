import { createEditorialActor } from '../../lib/editorial-actor';
import { SearchQueryState } from './query-state';
import type { QueryTicket } from './query-state';

export function mountSearchDelight(): void {
  const host = document.querySelector<HTMLElement>('[data-search-delight]');
  const search = document.querySelector<HTMLElement>('#search');
  if (!host || !search || host.dataset.searchMounted) return;
  host.dataset.searchMounted = 'true';
  const actor = createEditorialActor(host);
  const state = new SearchQueryState();
  const listeners = new AbortController();
  let timer = 0;
  let composing = false;
  let startedQuery = '';
  let loadingObserved = false;
  let pending: QueryTicket | null = null;

  const respond = () => {
    if (!pending) return;
    const reaction = state.reaction(pending);
    if (!reaction) return;
    const ticket = pending;
    pending = null;
    host.dataset.searchReaction = reaction;
    void actor.play(reaction).then(() => {
      if (state.current(ticket)) actor.stop();
    });
  };
  const confirm = () => {
    window.clearTimeout(timer);
    if (composing) return;
    const ticket = state.confirm();
    if (!ticket) return;
    host.dataset.searchReaction = 'search';
    void actor.play('search').then(played => {
      if (!state.current(ticket)) return;
      if (!played) { actor.stop(); return; }
      actor.stop();
      pending = ticket;
      respond();
    });
  };
  const changed = () => {
    const input = search.querySelector<HTMLInputElement>('input');
    if (!input || !state.input(input.value)) return;
    actor.stop();
    pending = null;
    startedQuery = '';
    loadingObserved = false;
    host.dataset.searchReaction = 'idle';
    window.clearTimeout(timer);
    if (state.query && !composing) timer = window.setTimeout(confirm, 600);
  };
  const inspect = () => {
    changed();
    if (!startedQuery || startedQuery !== state.query) return;
    const area = search.querySelector('.pagefind-ui__results-area');
    const list = area?.querySelector('.pagefind-ui__results');
    if (area && !list) loadingObserved = true;
    if (list && loadingObserved) {
      state.complete(startedQuery, list.children.length);
      respond();
    }
  };
  search.addEventListener('input', changed, { signal: listeners.signal });
  search.addEventListener('compositionstart', () => { composing = true; window.clearTimeout(timer); }, { signal: listeners.signal });
  search.addEventListener('compositionend', () => {
    composing = false;
    changed();
    if (state.query) timer = window.setTimeout(confirm, 600);
  }, { signal: listeners.signal });
  search.addEventListener('keydown', event => {
    if (event instanceof KeyboardEvent && event.key === 'Enter' && !event.isComposing) confirm();
  }, { signal: listeners.signal });
  search.addEventListener('search-delight-query', event => {
    if (!(event instanceof CustomEvent) || typeof event.detail !== 'string') return;
    changed();
    if (!state.start(event.detail)) return;
    startedQuery = state.query;
    loadingObserved = false;
  }, { signal: listeners.signal });
  const observer = new MutationObserver(inspect);
  observer.observe(search, { subtree: true, childList: true, attributes: true, attributeFilter: ['class'] });
  window.addEventListener('pagehide', () => {
    window.clearTimeout(timer);
    observer.disconnect();
    listeners.abort();
    actor.dispose();
    delete host.dataset.searchMounted;
  }, { once: true });
  inspect();
}
