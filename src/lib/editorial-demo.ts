import { createEditorialActor } from './editorial-actor';

export function mountEditorialDemos(): void {
  for (const section of document.querySelectorAll<HTMLElement>('[data-editorial-demo]')) {
    if (section.dataset.demoReady) continue;
    const host = section.querySelector<HTMLElement>('[data-editorial-actor]');
    const status = section.querySelector<HTMLElement>('[data-demo-status]');
    if (!host || !status) continue;
    section.dataset.demoReady = 'true';
    const actor = createEditorialActor(host);
    const listeners = new AbortController();
    const buttons = [...section.querySelectorAll<HTMLButtonElement>('[data-demo-clip]')];
    for (const button of buttons) button.addEventListener('click', async () => {
      buttons.forEach(control => { control.disabled = true; });
      status.textContent = status.dataset.playing ?? '';
      const played = await actor.play(button.dataset.demoClip ?? '');
      status.textContent = played ? '' : (status.dataset.failed ?? '');
      buttons.forEach(control => { control.disabled = false; });
    }, { signal: listeners.signal });
    document.addEventListener('astro:before-swap', () => {
      listeners.abort();
      actor.dispose();
    }, { once: true });
  }
}
