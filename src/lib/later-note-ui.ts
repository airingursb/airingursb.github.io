export function mountLaterNotes(): void {
  document.querySelectorAll<HTMLDetailsElement>('[data-later-note]').forEach(details => {
    if (details.dataset['enhanced']) return;
    const summary = details.querySelector('summary');
    const sheet = details.querySelector<HTMLElement>('.later-note-sheet');
    const close = details.querySelector<HTMLButtonElement>('[data-later-close]');
    if (!summary || !sheet || !close) return;
    details.dataset['enhanced'] = 'true';
    const motion = matchMedia('(prefers-reduced-motion: reduce)');
    let animation: Animation | undefined;
    let closing = false;

    const setOpen = (open: boolean, restoreFocus = false): void => {
      const inFlight = animation?.playState === 'running';
      const current = inFlight ? getComputedStyle(sheet) : undefined;
      const interrupted = current ? { opacity: current.opacity, transform: current.transform } : undefined;
      animation?.cancel();
      closing = !open;
      if (open) details.open = true;
      const finish = (): void => {
        if (!open) details.open = false;
        closing = false;
        if (restoreFocus) summary.focus({ preventScroll: true });
      };
      if (motion.matches) { finish(); return; }
      const folded = { opacity: 0, transform: 'translateY(-8px) scaleY(.97)' };
      const unfolded = { opacity: 1, transform: 'translateY(0) scaleY(1)' };
      const style = getComputedStyle(details);
      const cssDuration = style.getPropertyValue(open ? '--later-reveal' : '--later-fold-back').trim();
      const duration = parseFloat(cssDuration) * (cssDuration.endsWith('ms') ? 1 : 1000);
      animation = sheet.animate([interrupted ?? (open ? folded : unfolded), open ? unfolded : folded], {
        duration,
        easing: style.getPropertyValue('--later-ease').trim(),
      });
      animation.onfinish = finish;
    };

    summary.addEventListener('click', event => {
      event.preventDefault();
      setOpen(!details.open || closing);
    });
    close.addEventListener('click', () => setOpen(false, true));
    details.addEventListener('keydown', event => {
      if (event.key !== 'Escape' || !details.open) return;
      event.preventDefault();
      setOpen(false, true);
    });
    const settleMotion = (): void => {
      if (!motion.matches) return;
      if (animation?.playState === 'running') animation.finish();
    };
    motion.addEventListener('change', settleMotion);
    document.addEventListener('astro:before-swap', () => {
      animation?.cancel();
      motion.removeEventListener('change', settleMotion);
    }, { once: true });
  });
}
