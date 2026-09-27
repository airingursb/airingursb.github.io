import { READING_BATCH_SIZE, readingWindow } from '../lib/reading-window';
import { trackEvent } from '../lounge/umami';

const lang = document.documentElement.lang.startsWith('en') ? 'en' : 'zh';
const filters = { source: 'all', month: 'all', limit: READING_BATCH_SIZE };
const cards = Array.from(document.querySelectorAll<HTMLElement>('[data-reading-card]'))
  .map((element) => ({ element, source: element.dataset.source || '', month: element.dataset.month || '' }));
const count = document.querySelector('[data-visible-count]');
const empty = document.querySelector('[data-reading-empty]');
const pager = document.querySelector<HTMLElement>('[data-reading-pager]');
const progress = document.querySelector('[data-reading-progress]');
const more = document.querySelector<HTMLButtonElement>('[data-reading-more]');

function applyFilters() {
  const result = readingWindow(cards, filters);
  const visible = new Set(result.visible);
  for (const card of cards) card.element.hidden = !visible.has(card);
  if (count) count.textContent = String(result.total);
  if (empty) empty.toggleAttribute('hidden', result.total !== 0);
  if (pager) pager.hidden = result.total === 0;
  if (progress) progress.textContent = lang === 'en'
    ? `${result.visible.length} of ${result.total} reads`
    : `已展示 ${result.visible.length} / ${result.total} 篇`;
  if (more) more.hidden = result.visible.length >= result.total;
  return result;
}

document.querySelectorAll('[data-filter-group]').forEach((group) => {
  group.addEventListener('click', (event) => {
    if (!(event.target instanceof Element)) return;
    const button = event.target.closest('[data-filter]');
    if (!button) return;
    const type = group.getAttribute('data-filter-group');
    if (type !== 'source' && type !== 'month') return;
    filters[type] = button.getAttribute('data-filter') || 'all';
    filters.limit = READING_BATCH_SIZE;
    group.querySelectorAll('[data-filter]').forEach((item) => {
      item.classList.toggle('active', item === button);
      item.setAttribute('aria-pressed', String(item === button));
    });
    const result = applyFilters();
    trackEvent('reading-filter', { kind: type, value: filters[type], visible_count: result.total, lang });
  });
});

more?.addEventListener('click', () => {
  const previousLimit = filters.limit;
  filters.limit += READING_BATCH_SIZE;
  const result = applyFilters();
  result.visible[previousLimit]?.element.querySelector<HTMLAnchorElement>('a')?.focus();
});

applyFilters();
