const origin = new URL(location.href).searchParams.get('issue');
const originLink = Array.from(document.querySelectorAll<HTMLAnchorElement>('[data-origin-issue]')).find(link => link.dataset.originIssue === origin);
if (originLink) {
  for (const link of document.querySelectorAll<HTMLAnchorElement>('[data-origin-back]')) link.href = originLink.href;
  const nextLink = document.querySelector<HTMLAnchorElement>('[data-origin-next]');
  if (nextLink) {
    const nextPath = originLink.dataset.originNextPath;
    nextLink.href = nextPath ?? originLink.href;
    nextLink.textContent = document.documentElement.lang.startsWith('en') ? (nextPath ? 'Next exchange in this issue →' : 'Back to this issue ↗') : (nextPath ? '本期下一组往返 →' : '返回本期专题 ↗');
  }
  for (const link of document.querySelectorAll<HTMLAnchorElement>('[data-lang-switch]')) {
    const url = new URL(link.href);
    url.searchParams.set('issue', originLink.dataset.originIssue ?? '');
    link.href = url.href;
  }
}
const chapters = Array.from(document.querySelectorAll<HTMLAnchorElement>('[data-reading-chapter]'));
const sheets = Array.from(document.querySelectorAll<HTMLElement>('.letter-sheet'));
let scheduled = false;

function updateCurrentLetter() {
  let current = sheets[0]?.id;
  for (const sheet of sheets) if (sheet.getBoundingClientRect().top <= 160) current = sheet.id;
  for (const link of chapters) {
    if (link.dataset.readingChapter === current) link.setAttribute('aria-current', 'location');
    else link.removeAttribute('aria-current');
  }
}
window.addEventListener('scroll', () => {
  if (scheduled) return;
  scheduled = true;
  requestAnimationFrame(() => { updateCurrentLetter(); scheduled = false; });
}, { passive: true });
updateCurrentLetter();
export {};
