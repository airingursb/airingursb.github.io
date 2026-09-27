const contents = document.querySelector<HTMLDetailsElement>('.contents');
const compactLayout = matchMedia('(max-width: 1024px)');

function syncContents() {
  if (contents) {
    contents.open = !compactLayout.matches;
    const summary = contents.querySelector('summary');
    if (summary) summary.tabIndex = compactLayout.matches ? 0 : -1;
  }
}

syncContents();
compactLayout.addEventListener('change', syncContents);
contents?.querySelector('summary')?.addEventListener('click', event => {
  if (!compactLayout.matches) event.preventDefault();
});

const links = Array.from(document.querySelectorAll<HTMLAnchorElement>('[data-chapter]'));
const passages = Array.from(document.querySelectorAll<HTMLElement>('.passage'));

function updateChapter() {
  let current: string | undefined = passages[0]?.id;
  for (const passage of passages) {
    if (passage.getBoundingClientRect().top <= 180) current = passage.id;
  }
  if (innerHeight + scrollY >= document.documentElement.scrollHeight - 4) current = passages.at(-1)?.id;
  for (const link of links) {
    if (link.dataset.chapter === current) link.setAttribute('aria-current', 'location');
    else link.removeAttribute('aria-current');
  }
}

let scheduled = false;
window.addEventListener('scroll', () => {
  if (scheduled) return;
  scheduled = true;
  requestAnimationFrame(() => { updateChapter(); scheduled = false; });
}, { passive: true });
links.forEach(link => link.addEventListener('click', () => {
  if (contents && compactLayout.matches) contents.open = false;
}));
updateChapter();
export {};
