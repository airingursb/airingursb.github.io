import { playSuitcase } from './atlas';

type SceneState = 'closed' | 'opening' | 'open' | 'closing';

export function initialiseSuitcase(root: HTMLElement): void {
  const entry = root.querySelector<HTMLButtonElement>('[data-case-open]');
  const dialog = root.querySelector<HTMLDialogElement>('[data-case-dialog]');
  const dismiss = root.querySelector<HTMLButtonElement>('[data-case-dismiss]');
  const pack = root.querySelector<HTMLButtonElement>('[data-case-pack]');
  const canvas = root.querySelector<HTMLCanvasElement>('[data-case-canvas]');
  const still = root.querySelector<HTMLImageElement>('[data-case-still]');
  const objects = root.querySelector<HTMLElement>('[data-case-objects]');
  const status = root.querySelector<HTMLElement>('[data-case-status]');
  if (!entry || !dialog || !dismiss || !pack || !canvas || !still || !objects || !status) return;
  const memories = Array.from(root.querySelectorAll<HTMLElement>('[data-photo]'));
  const targets = Array.from(root.querySelectorAll<HTMLButtonElement>('[data-memory]'));
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  const openPoster = new Image();
  const english = root.dataset.lang === 'en';
  const text = {
    opening: english ? 'The bear is opening the suitcase.' : '小熊正在打开旅行箱。',
    ready: english ? 'The town is open. Choose the roofs, shore or autumn tree to see a photograph.' : '小城展开了，可以选择屋顶、岸边和秋树查看照片。',
    closing: english ? 'The bear is packing the suitcase.' : '小熊正在收好旅行箱。',
    closed: english ? 'The suitcase is packed away.' : '旅行箱已经收好。',
    fallback: english ? 'The animation is unavailable. The complete scene, photographs and album remain available.' : '动画暂时不可用，已打开完整场景。照片和相册仍可查看。',
    selected: english ? 'Photograph opened: ' : '已展开照片：',
  };
  let active = new AbortController();
  let state: SceneState = 'closed';
  let overflow = '';

  const setState = (next: SceneState): void => {
    state = next;
    root.dataset.state = next;
    const open = next === 'open';
    objects.hidden = !open;
    pack.hidden = !open;
  };

  const resetMemories = (): void => {
    memories.forEach(memory => { memory.hidden = true; });
    targets.forEach(target => target.setAttribute('aria-pressed', 'false'));
  };

  const finishOpen = (failed = false): void => {
    still.src = '/bear-stories/suitcase/open-poster.png';
    delete root.dataset.playing;
    setState('open');
    status.textContent = failed ? text.fallback : text.ready;
  };

  const closeImmediately = (): void => {
    active.abort();
    delete root.dataset.playing;
    setState('closed');
    resetMemories();
    still.src = '/bear-stories/suitcase/closed-poster.png';
    status.textContent = text.closed;
    entry.setAttribute('aria-expanded', 'false');
    if (dialog.open) dialog.close();
    document.body.style.overflow = overflow;
    entry.focus({ preventScroll: true });
  };

  entry.addEventListener('click', async () => {
    if (dialog.open) return;
    active.abort();
    active = new AbortController();
    const signal = active.signal;
    openPoster.src = '/bear-stories/suitcase/open-poster.png';
    resetMemories();
    setState('opening');
    still.src = '/bear-stories/suitcase/closed-poster.png';
    entry.setAttribute('aria-expanded', 'true');
    overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    dialog.showModal();
    status.textContent = text.opening;
    if (reduced.matches) { finishOpen(); return; }
    const result = await playSuitcase({ canvas, clip: 'open', signal, onReady: () => { root.dataset.playing = ''; } });
    if (result !== 'cancelled') finishOpen(result === 'failed');
  });

  pack.addEventListener('click', async () => {
    active.abort();
    active = new AbortController();
    const signal = active.signal;
    resetMemories();
    setState('closing');
    status.textContent = text.closing;
    if (reduced.matches) { closeImmediately(); return; }
    const result = await playSuitcase({ canvas, clip: 'close', signal, onReady: () => { root.dataset.playing = ''; } });
    if (result !== 'cancelled') closeImmediately();
  });

  dismiss.addEventListener('click', closeImmediately);
  dialog.addEventListener('cancel', event => { event.preventDefault(); closeImmediately(); });
  dialog.addEventListener('click', event => {
    if (event.target !== dialog) return;
    const box = dialog.getBoundingClientRect();
    if (event.clientX < box.left || event.clientX > box.right || event.clientY < box.top || event.clientY > box.bottom) closeImmediately();
  });
  targets.forEach(target => target.addEventListener('click', () => {
    const selected = target.dataset.memory;
    targets.forEach(item => item.setAttribute('aria-pressed', String(item === target)));
    memories.forEach(memory => { memory.hidden = memory.dataset.photo !== selected; });
    const memory = memories.find(item => item.dataset.photo === selected);
    if (!memory) return;
    status.textContent = text.selected + (memory.querySelector('h3')?.textContent || selected);
    memory.scrollIntoView({ block: 'nearest', behavior: reduced.matches ? 'instant' : 'smooth' });
  }));
  root.querySelectorAll<HTMLImageElement>('.suitcase-real-photo img').forEach(image => {
    image.addEventListener('error', () => { image.closest<HTMLElement>('.suitcase-real-photo')?.setAttribute('data-unavailable', ''); });
  });
  reduced.addEventListener('change', () => {
    if (!reduced.matches || !dialog.open) return;
    active.abort();
    switch (state) {
      case 'opening': finishOpen(); break;
      case 'closing': closeImmediately(); break;
      case 'open': break;
      case 'closed': break;
      default: { const exhaustive: never = state; return exhaustive; }
    }
  });
  window.addEventListener('pagehide', () => active.abort());
}
