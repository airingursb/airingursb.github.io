export function mountLikeButton(button: HTMLButtonElement): () => void {
  const listeners = new AbortController();
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const animations = new Set<Animation>();
  const decorations = new Set<HTMLElement>();
  const easing = 'cubic-bezier(.22,1,.36,1)';
  button.classList.add('like-enhanced');

  const clear = () => {
    for (const animation of animations) animation.cancel();
    for (const decoration of decorations) decoration.remove();
    animations.clear();
    decorations.clear();
    button.classList.remove('like-pressing');
  };
  const animate = (element: Element, frames: Keyframe[], duration: number, decoration = false) => {
    const animation = element.animate(frames, { duration, easing });
    animations.add(animation);
    animation.onfinish = () => {
      animations.delete(animation);
      if (decoration && element instanceof HTMLElement) {
        decorations.delete(element);
        element.remove();
      }
    };
  };
  const decorate = (className: string) => {
    const element = document.createElement('span');
    element.className = className;
    element.setAttribute('aria-hidden', 'true');
    button.append(element);
    decorations.add(element);
    return element;
  };
  const press = () => {
    if (!reduced.matches && !document.hidden && !button.disabled) button.classList.add('like-pressing');
  };
  const release = () => {
    if (!button.classList.contains('like-pressing')) return;
    button.classList.remove('like-pressing');
    animate(button, [{ transform: 'scale(.96)' }, { transform: 'scale(1.025)', offset: .6 }, { transform: 'scale(1)' }], 320);
  };
  const celebrate = () => {
    clear();
    if (reduced.matches || document.hidden) return;
    const icon = button.querySelector<SVGElement>('.al-icon');
    const count = button.querySelector<HTMLElement>('.al-count');
    if (!icon || !count) return;
    animate(button, [{ transform: 'scale(.96)' }, { transform: 'scale(1.025)', offset: .6 }, { transform: 'scale(1)' }], 320);
    const wash = decorate('like-wash');
    animate(wash, [{ opacity: 0, transform: 'scale(.75)' }, { opacity: .16, offset: .18 }, { opacity: 0, transform: 'scale(1)' }], 620, true);
    animate(icon, [{ transform: 'scale(.72)' }, { transform: 'scale(1.32)', offset: .45 }, { transform: 'scale(1.08)', offset: .78 }, { transform: 'scale(1.15)' }], 460);
    animate(count, [{ opacity: .5, transform: 'translateY(6px)' }, { opacity: 1, transform: 'translateY(-3px)', offset: .55 }, { opacity: 1, transform: 'translateY(0)' }], 420);
    const bounds = button.getBoundingClientRect();
    const heart = icon.getBoundingClientRect();
    const x = heart.left - bounds.left + heart.width / 2;
    const y = heart.top - bounds.top + heart.height / 2;
    for (let index = 0; index < 6; index++) {
      const angle = (index * 60 - 110) * Math.PI / 180;
      const distance = index % 2 ? 29 : 24;
      const glint = decorate(`like-glint${index % 2 ? ' like-glint-round' : ''}`);
      glint.style.left = `${x - 2}px`;
      glint.style.top = `${y - 2}px`;
      animate(glint, [
        { opacity: 0, transform: `translate(${Math.cos(angle) * 8}px,${Math.sin(angle) * 8}px) rotate(45deg) scale(.3)` },
        { opacity: .9, offset: .12 },
        { opacity: 0, transform: `translate(${Math.cos(angle) * distance}px,${Math.sin(angle) * distance}px) rotate(100deg) scale(.45)` },
      ], 540 + index * 12, true);
    }
  };
  const options = { signal: listeners.signal };
  button.addEventListener('pointerdown', event => { if (event.button === 0) press(); }, options);
  window.addEventListener('pointerup', release, options);
  window.addEventListener('pointercancel', clear, options);
  window.addEventListener('blur', clear, options);
  button.addEventListener('keydown', event => { if (!event.repeat && (event.key === ' ' || event.key === 'Enter')) press(); }, options);
  button.addEventListener('keyup', event => { if (event.key === ' ' || event.key === 'Enter') release(); }, options);
  button.addEventListener('blur', clear, options);
  button.addEventListener('click', () => {
    if (button.classList.contains('liked') || button.getAttribute('aria-pressed') === 'true') clear();
  }, { ...options, capture: true });
  button.addEventListener('article:liked', celebrate, options);
  document.addEventListener('visibilitychange', () => { if (document.hidden) clear(); }, options);
  reduced.addEventListener('change', clear, options);
  return () => { clear(); listeners.abort(); button.classList.remove('like-enhanced'); };
}
