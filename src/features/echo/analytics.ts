import { editionRoutes } from './data/routes';
type EventValue = string | number | boolean;
type EventData = Readonly<Record<string, EventValue>>;
type AnalyticsWindow = Window & {
  umami?: { track: (name: string, data: EventData) => void };
  siteAnalytics?: { track: (name: string, data: EventData) => void };
};
const host = window as AnalyticsWindow;
const production = ['ursb.me', 'www.ursb.me', 'airingursb.github.io'].includes(location.hostname);
const lang = document.documentElement.lang.startsWith('en') ? 'en' : 'zh';
const path = location.pathname.replace(/^\/(?:en\/)?echo/, '');
const surface = path === '/postage/' || path === '/previews/postage/' ? 'postage' : path.includes('/letters/') ? 'letter' : /\/issues\/\d+\//.test(path) ? 'issue' : path === '/blog/' ? 'blog' : 'archive';
const requestedIssue = new URLSearchParams(location.search).get('issue');
const origin = editionRoutes.find(edition => edition.number === requestedIssue && edition.letters.some(id => id === document.body.dataset.letter));
const base: EventData = { lang, surface, issue: document.body.dataset.issue ?? '', letter: document.body.dataset.letter ?? '', ...(origin ? { originIssue: origin.number } : {}) };
const pending: { name: string; data: EventData }[] = [];
export function trackEcho(action: string, detail: EventData = {}) {
  const name = 'echo-' + action;
  const data = { ...base, ...detail };
  window.dispatchEvent(new CustomEvent('echo:analytics', { detail: { name, data } }));
  if (!production) return;
  if (host.siteAnalytics) { host.siteAnalytics.track(name, data); return; }
  if (host.umami) host.umami.track(name, data);
  else if (pending.length < 50) pending.push({ name, data });
}
if (production && !host.umami && !document.querySelector('script[data-website-id="aa8d5a16-df21-4058-a0a8-0191cdd3798d"]')) {
  const script = document.createElement('script');
  script.src = 'https://analytics.ursb.me/script.js';
  script.dataset.websiteId = 'aa8d5a16-df21-4058-a0a8-0191cdd3798d';
  script.defer = true;
  script.addEventListener('load', () => { for (const event of pending.splice(0)) host.umami?.track(event.name, event.data); });
  document.head.append(script);
}
trackEcho('page-view');
const letterIds = new Set<string>(editionRoutes.flatMap(edition => [...edition.letters]));
const issueNumbers = new Set<string>(editionRoutes.map(edition => edition.number));
document.addEventListener('click', event => {
  const target = event.target;
  if (!(target instanceof Element)) return;
  const summary = target.closest('details.contents > summary');
  if (summary) { trackEcho('contents-toggle', { open: !summary.parentElement?.hasAttribute('open') }); return; }
  const link = target.closest<HTMLAnchorElement>('a[href]');
  if (!link) return;
  if (link.closest('#echo-share')) return;
  if (link.dataset.langSwitch) { trackEcho('language-switch', { target: link.dataset.langSwitch }); return; }
  if (link.protocol === 'mailto:') { trackEcho('write-open'); return; }
  if (link.closest('.letter-attachment')) { trackEcho('attachment-open'); return; }
  if (link.dataset.readingChapter) { trackEcho('letter-section-open', { chapter: link.dataset.readingChapter }); return; }
  if (link.dataset.chapter) { trackEcho('chapter-open', { chapter: link.dataset.chapter }); return; }
  if (/^\/(?:en\/)?echo\/postage\/$/.test(link.pathname)) { trackEcho('postage-open', { entry: link.dataset.postageEntry === 'archive' ? 'archive' : surface }); return; }
  const letter = link.pathname.match(/\/letters\/([^/]+)\//)?.[1];
  if (letter && letterIds.has(letter)) { trackEcho('letter-open', { target: letter, chapter: link.hash === '#reply' ? 'reply' : 'incoming' }); return; }
  if (link.hash && link.pathname === location.pathname) { trackEcho('chapter-open', { chapter: link.hash.slice(1) }); return; }
  const issue = link.pathname.match(/\/issues\/(\d+)\//)?.[1];
  if (issue && issueNumbers.has(issue)) { trackEcho('issue-open', { target: issue, chapter: link.hash.slice(1) }); return; }
  if (/^\/(?:en\/)?echo\/(?:issues\/)?$/.test(link.pathname)) { trackEcho(surface === 'blog' ? 'entry-open' : 'archive-open'); return; }
});
const thresholds = new Set<number>();
let scheduled = false;
function recordDepth() {
  scheduled = false;
  const distance = document.documentElement.scrollHeight - innerHeight;
  if (distance <= 0 || scrollY <= 0) return;
  const depth = Math.min(100, (scrollY / distance) * 100);
  for (const threshold of [25, 50, 75, 100]) {
    if (depth + 0.1 >= threshold && !thresholds.has(threshold)) { thresholds.add(threshold); trackEcho('read-depth', { depth: threshold }); }
  }
}
window.addEventListener('scroll', () => { if (!scheduled && !document.querySelector('dialog[open]')) { scheduled = true; requestAnimationFrame(recordDepth); } }, { passive: true });
let visibleSince = performance.now();
let visibleTime = 0;
let engaged = false;
const timer = window.setInterval(() => {
  const now = performance.now();
  if (document.visibilityState === 'visible') visibleTime += now - visibleSince;
  visibleSince = now;
  if (visibleTime >= 30_000 && !engaged) { engaged = true; trackEcho('read-engaged', { seconds: 30 }); clearInterval(timer); }
}, 1000);
document.addEventListener('visibilitychange', () => { visibleSince = performance.now(); });

const seenSections = new Set<string>();
const sectionObserver = new IntersectionObserver(entries => {
  for (const entry of entries) if (entry.isIntersecting && !seenSections.has(entry.target.id)) {
    seenSections.add(entry.target.id);
    trackEcho('letter-section-view', { chapter: entry.target.id.replace('-heading', '') });
  }
}, { threshold: 0.5 });
document.querySelectorAll('.letter-sheet h2').forEach(heading => sectionObserver.observe(heading));
