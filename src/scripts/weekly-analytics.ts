import { trackEvent } from '../lounge/umami.ts';

type WeeklyDestination = {
  readonly kind: 'issue' | 'archive' | 'rss';
  readonly issue: string;
  readonly lang: 'en' | 'zh';
  readonly target: string;
};

export function weeklyDestination(href: string): WeeklyDestination | null {
  const url = new URL(href);
  if (url.hostname !== 'ursb.me' && url.origin !== (typeof location === 'undefined' ? '' : location.origin)) return null;
  const match = url.pathname.match(/^\/(en\/)?reading\/weekly\/(?:(\d{3,})\/|(feed\.xml))?$/);
  if (!match) return null;
  const anchor = url.hash.slice(1);
  return {
    kind: match[2] ? 'issue' : match[3] ? 'rss' : 'archive',
    issue: match[2] || '', lang: match[1] ? 'en' : 'zh',
    target: /^(column-\d+|agents|creation|science|life|issue-guide|top)$/.test(anchor) ? anchor : '',
  };
}

export function initWeeklyAnalytics() {
  const edition = weeklyDestination(location.href);
  const issue = edition?.issue || '';
  const language = () => document.documentElement.lang.startsWith('en') ? 'en' : 'zh';
  document.addEventListener('click', (event) => {
    if (!(event.target instanceof Element)) return;
    const control = event.target.closest<HTMLElement>('a, button');
    if (!control) return;
    const surface = control.closest<HTMLElement>('[data-weekly-surface]')?.dataset.weeklySurface;
    if (!surface) return;
    const column = control.closest<HTMLElement>('.column-article')?.id || '';
    const context = { issue, lang: language(), surface, column };
    if (control.matches('.share-trigger')) trackEvent('weekly-share-open', context);
    if (control.matches('.figure-open')) trackEvent('weekly-image-open', context);
    if (!(control instanceof HTMLAnchorElement)) return;
    if (control.matches('.save-cover, #share-x, #share-threads')) {
      trackEvent('weekly-share', { ...context, action: control.matches('.save-cover') ? 'cover-download' : control.id.replace('share-', ''), result: 'click' });
      return;
    }
    const destination = weeklyDestination(control.href);
    if (destination) {
      const name = destination.kind === 'rss' ? 'weekly-rss-open'
        : destination.kind === 'archive' ? 'weekly-archive-open'
        : destination.issue === issue && destination.lang === language() ? 'weekly-toc-click' : 'weekly-issue-open';
      trackEvent(name, { ...context, issue: destination.issue || issue, target_lang: destination.lang, target: destination.target });
    } else if (column || control.id === 'viewer-source') {
      const url = new URL(control.href);
      trackEvent('weekly-source-open', { ...context, domain: url.hostname, kind: url.hostname === 'ursb.me' ? 'reading' : 'original' });
    }
  });
  document.addEventListener('toggle', (event) => {
    const detail = event.target;
    if (!(detail instanceof HTMLDetailsElement) || !detail.open || !issue) return;
    if (!detail.matches('.article-sources, .issue-index')) return;
    trackEvent('weekly-details-open', { issue, lang: language(), kind: detail.matches('.article-sources') ? 'sources' : 'contents', column: detail.closest('.column-article')?.id || '' });
  }, true);
  if (!issue) return;
  const seen = new Set<string>();
  const observer = new IntersectionObserver((entries) => {
    for (const entry of entries) {
      if (!entry.isIntersecting || document.visibilityState !== 'visible') continue;
      const column = entry.target.closest('.column-article')?.id;
      if (!column || seen.has(column) || !window.umami) continue;
      seen.add(column);
      trackEvent('weekly-column-view', { issue, lang: language(), column });
    }
  }, { threshold: 0.5 });
  document.querySelectorAll('.column-article h3').forEach((heading) => observer.observe(heading));
  const depths = new Set<number>();
  let frame = 0;
  window.addEventListener('scroll', () => {
    if (frame) return;
    frame = requestAnimationFrame(() => {
      frame = 0;
      if (document.visibilityState !== 'visible' || !window.umami) return;
      const range = document.documentElement.scrollHeight - innerHeight;
      if (range <= 0) return;
      const depth = Math.min(100, Math.floor(((scrollY + 2) / range) * 100));
      for (const milestone of [25, 50, 75, 100]) {
        if (depth < milestone || depths.has(milestone)) continue;
        depths.add(milestone);
        trackEvent('weekly-scroll-depth', { issue, lang: language(), depth: milestone });
      }
    });
  }, { passive: true });
}
