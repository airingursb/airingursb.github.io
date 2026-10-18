// Behaviour for <ShareDialog>: native <dialog> + showModal(), shared by the
// comics, reading, workouts and photos detail pages.
type Umami = { track: (event: string, data?: Record<string, unknown>) => void };

function track(event: string | undefined, data: Record<string, unknown>) {
  if (!event) return;
  const umami = (window as unknown as { umami?: Umami }).umami;
  try { umami?.track(event, data); } catch { /* analytics must never break sharing */ }
}

function warmPreview(dialog: HTMLDialogElement) {
  // A preview marked data-share-reuse="<selector>" shows the exact file the
  // page already displays (already in cache), so it appears instantly.
  dialog.querySelectorAll<HTMLImageElement>('.site-share-preview img[data-share-reuse]').forEach((img) => {
    const source = document.querySelector<HTMLImageElement>(img.dataset.shareReuse!);
    const current = source?.currentSrc;
    if (current && img.src !== current) {
      img.removeAttribute('srcset');
      img.removeAttribute('sizes');
      img.src = current;
    }
  });
  // Lazy images inside a closed dialog never start loading; switch them to
  // eager as soon as the reader shows intent so the preview is ready on open.
  dialog.querySelectorAll<HTMLImageElement>('.site-share-preview img[loading="lazy"]').forEach((img) => {
    img.loading = 'eager';
  });
}

function setup(dialog: HTMLDialogElement) {
  if (dialog.dataset.shareReady) return;
  dialog.dataset.shareReady = 'true';
  const d = dialog.dataset;
  const input = dialog.querySelector<HTMLInputElement>('.site-share-url')!;
  const copyButton = dialog.querySelector<HTMLButtonElement>('[data-share-copy]')!;
  const nativeButton = dialog.querySelector<HTMLButtonElement>('[data-share-native]')!;
  const status = dialog.querySelector<HTMLElement>('.site-share-status')!;
  let eventData: Record<string, unknown> = {};
  try { eventData = JSON.parse(d.eventData || '{}'); } catch { eventData = {}; }
  const payload = (extra: Record<string, unknown> = {}) => ({ ...eventData, url: d.shareUrl, lang: document.documentElement.lang, ...extra });
  let opener: HTMLElement | null = null;

  const triggers = document.querySelectorAll<HTMLElement>(`[data-share-open="${dialog.id}"]`);
  triggers.forEach((trigger) => {
    trigger.setAttribute('aria-haspopup', 'dialog');
    for (const type of ['pointerenter', 'pointerdown', 'focus']) {
      trigger.addEventListener(type, () => warmPreview(dialog), { once: true, passive: true });
    }
    trigger.addEventListener('click', () => {
      opener = trigger;
      warmPreview(dialog);
      copyButton.textContent = d.copyLabel || copyButton.textContent;
      copyButton.removeAttribute('data-copied');
      status.textContent = d.hint || '';
      document.documentElement.classList.add('site-share-open');
      dialog.showModal();
      // Keep the meaningful end of the URL (issue number, slug) visible.
      input.scrollLeft = input.scrollWidth;
      dialog.querySelector<HTMLButtonElement>('[data-share-close]')?.focus();
      track(d.openEvent, payload());
    });
  });

  dialog.querySelector('[data-share-close]')?.addEventListener('click', () => dialog.close());
  dialog.addEventListener('click', (event) => {
    if (event.target !== dialog) return;
    const rect = dialog.getBoundingClientRect();
    const outside = event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom;
    if (outside) dialog.close();
  });
  dialog.addEventListener('close', () => {
    document.documentElement.classList.remove('site-share-open');
    opener?.focus();
  });

  const selectUrl = () => {
    input.select();
    requestAnimationFrame(() => { input.scrollLeft = input.scrollWidth; });
  };
  input.addEventListener('focus', selectUrl);
  input.addEventListener('click', selectUrl);
  // Keep Tab / Shift+Tab cycling inside the dialog (no detour to the browser UI).
  dialog.addEventListener('keydown', (event) => {
    if (event.key !== 'Tab') return;
    const controls = [...dialog.querySelectorAll<HTMLElement>('button:not([hidden]), a[href], input')];
    const first = controls[0];
    const last = controls[controls.length - 1];
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
  });

  copyButton.addEventListener('click', async () => {
    let copied = false;
    try {
      if (navigator.clipboard?.writeText) { await navigator.clipboard.writeText(d.shareUrl || input.value); copied = true; }
    } catch { copied = false; }
    if (!copied) {
      input.focus();
      input.select();
      try { copied = document.execCommand('copy'); } catch { copied = false; }
    }
    copyButton.textContent = copied ? (d.copiedLabel || 'Copied') : (d.copyLabel || 'Copy link');
    copyButton.dataset.copied = String(copied);
    status.textContent = copied ? (d.copyOk || '') : (d.copyFail || '');
    if (copied) copyButton.focus();
    track(d.actionEvent, payload({ channel: 'copy', result: copied ? 'success' : 'failed' }));
  });

  nativeButton.hidden = typeof navigator.share !== 'function';
  nativeButton.addEventListener('click', async () => {
    try {
      await navigator.share({ title: d.shareTitle, url: d.shareUrl });
      status.textContent = d.nativeOk || '';
      track(d.actionEvent, payload({ channel: 'native', result: 'success' }));
    } catch (error) {
      const cancelled = error instanceof Error && error.name === 'AbortError';
      track(d.actionEvent, payload({ channel: 'native', result: cancelled ? 'cancelled' : 'failed' }));
      if (!cancelled) status.textContent = d.nativeFail || '';
    }
  });

  dialog.querySelectorAll<HTMLAnchorElement>('[data-share-channel]').forEach((link) => {
    link.addEventListener('click', () => track(d.actionEvent, payload({ channel: link.dataset.shareChannel })));
  });
}

export function initShareDialogs() {
  document.querySelectorAll<HTMLDialogElement>('dialog[data-site-share]').forEach(setup);
}
