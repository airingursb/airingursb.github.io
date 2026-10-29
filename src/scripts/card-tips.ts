// src/scripts/card-tips.ts
//
// One floating tooltip for the homepage cards: any element under `root` with
// a data-tip attribute shows that text next to the pointer. Shares the
// .hm-tip element (styled in global.css) with the Vibe Coding / Mood cards.
function tipEl(): HTMLElement {
  let el = document.querySelector<HTMLElement>('.hm-tip');
  if (!el) {
    el = document.createElement('div');
    el.className = 'hm-tip';
    document.body.appendChild(el);
  }
  return el;
}

export function bindTips(root: ParentNode | null) {
  if (!root) return;
  root.querySelectorAll<HTMLElement | SVGElement>('[data-tip]').forEach((node) => {
    node.addEventListener('mousemove', (e) => {
      const tip = tipEl();
      tip.textContent = node.getAttribute('data-tip');
      const ev = e as MouseEvent;
      tip.style.left = Math.min(ev.clientX + 12, window.innerWidth - tip.offsetWidth - 8) + 'px';
      tip.style.top = (ev.clientY - 30) + 'px';
      tip.classList.add('on');
    });
    node.addEventListener('mouseleave', () => tipEl().classList.remove('on'));
  });
}

/** Run `fn` once when `node` scrolls into view; skipped with reduced motion. */
export function onView(node: Element | null, fn: () => void) {
  if (!node || !('IntersectionObserver' in window)) return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const io = new IntersectionObserver((es) => {
    if (es[0].isIntersecting) { fn(); io.disconnect(); }
  }, { threshold: 0.3 });
  io.observe(node);
}
