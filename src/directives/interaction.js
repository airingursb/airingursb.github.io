// client:interaction — hydrate a decorative island only once it is on screen
// AND the page has settled: on the visitor's first interaction, or after a
// grace period following window load, whichever comes first. Keeps heavy
// bundles (three.js for the homepage island pet) out of the first paint
// while still mounting them without requiring a click.
//
// Usage: <Widget client:interaction />  or  client:interaction={4000}
// (number = fallback delay in ms after load; default 4000).
const EVENTS = ['pointerdown', 'pointermove', 'keydown', 'wheel', 'touchstart', 'scroll'];

export default (load, opts, el) => {
  const delay = typeof opts.value === 'number' ? opts.value : 4000;
  let visible = false;
  let settled = false;
  let done = false;

  const go = () => {
    if (done || !visible || !settled) return;
    done = true;
    cleanup();
    io.disconnect();
    el.dispatchEvent(new CustomEvent('island:hydrating', { bubbles: true }));
    load().then((hydrate) => hydrate());
  };

  const settle = () => {
    if (settled) return;
    settled = true;
    cleanup();
    go();
  };
  let timer = 0;
  const cleanup = () => {
    clearTimeout(timer);
    EVENTS.forEach((e) => window.removeEventListener(e, settle, true));
  };
  EVENTS.forEach((e) => window.addEventListener(e, settle, { capture: true, passive: true, once: true }));
  const arm = () => { timer = setTimeout(settle, delay); };
  if (document.readyState === 'complete') arm();
  else window.addEventListener('load', arm, { once: true });

  // Same visibility gate as client:visible — elements hidden by CSS
  // (e.g. the pet below its desktop breakpoint) never intersect, so they
  // never download anything.
  const io = new IntersectionObserver((entries) => {
    if (entries.some((e) => e.isIntersecting)) {
      visible = true;
      go();
    }
  });
  for (const child of el.children) io.observe(child);
};
