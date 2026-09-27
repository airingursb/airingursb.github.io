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
