import { createEditorialActor } from '../../lib/editorial-actor';
import { newspaperCopy } from './newspaper-subscription-copy';
import { subscribeToNewspaper } from './newspaper-subscription-service';

const initialized = new WeakSet<HTMLElement>();

export function initNewspaperSubscriptions(): void {
  for (const section of document.querySelectorAll<HTMLElement>('[data-newspaper-subscription]')) {
    if (initialized.has(section)) continue;
    const form = section.querySelector<HTMLFormElement>('[data-newspaper-form]');
    const email = section.querySelector<HTMLInputElement>('input[type="email"]');
    const button = section.querySelector<HTMLButtonElement>('button[type="submit"]');
    const buttonLabel = section.querySelector<HTMLElement>('[data-subscribe-label]');
    const status = section.querySelector<HTMLElement>('[data-newspaper-status]');
    const actorHost = section.querySelector<HTMLElement>('[data-editorial-actor]');
    if (!form || !email || !button || !buttonLabel || !status) continue;
    initialized.add(section);
    const lang = section.dataset['lang'] === 'en' ? 'en' : 'zh';
    const copy = newspaperCopy[lang];
    const actor = actorHost ? createEditorialActor(actorHost) : null;
    const lifetime = new AbortController();
    let pending = false;
    section.dataset['subscriptionState'] = 'idle';
    button.disabled = false;
    const motion = matchMedia('(prefers-reduced-motion: reduce)');
    let visible = false;
    let arrived = false;
    const greet = () => {
      if (arrived || !visible || document.hidden || motion.matches) return;
      arrived = true;
      void actor?.play('idle');
      arrival.disconnect();
    };
    const arrival = new IntersectionObserver(([entry]) => {
      visible = entry?.isIntersecting ?? false;
      greet();
    }, { threshold: 0.1 });
    arrival.observe(section);
    document.addEventListener('visibilitychange', greet, { signal: lifetime.signal });
    motion.addEventListener('change', greet, { signal: lifetime.signal });

    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      if (pending) return;
      email.value = email.value.trim();
      if (!form.reportValidity()) return;
      pending = true;
      button.disabled = true;
      email.readOnly = true;
      form.setAttribute('aria-busy', 'true');
      section.dataset['subscriptionState'] = 'submitting';
      buttonLabel.textContent = copy.submitting;
      status.textContent = copy.submitting;
      try {
        const result = await subscribeToNewspaper({ email: email.value, lang }, lifetime.signal);
        if (lifetime.signal.aborted) return;
        section.dataset['subscriptionState'] = result.status;
        status.textContent = result.status === 'error' ? copy[result.reason] : copy[result.status];
        if (result.status === 'confirmed') {
          email.value = '';
          arrived = true;
          arrival.disconnect();
          if (actorHost?.dataset['actorState'] === 'loading') actor?.stop();
          void actor?.play('subscribe');
        }
      } finally {
        pending = false;
        button.disabled = false;
        email.readOnly = false;
        form.removeAttribute('aria-busy');
        buttonLabel.textContent = copy.subscribe;
      }
    }, { signal: lifetime.signal });
    document.addEventListener('astro:before-swap', () => {
      lifetime.abort();
      arrival.disconnect();
      actor?.dispose();
    }, { once: true, signal: lifetime.signal });
  }
}
