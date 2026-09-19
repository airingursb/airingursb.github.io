const initialized = new WeakSet<HTMLImageElement>();

export function initNextPagePreviews(): void {
  for (const cover of document.querySelectorAll<HTMLImageElement>('[data-next-page-preview] img')) {
    if (initialized.has(cover)) continue;
    initialized.add(cover);
    const lifetime = new AbortController();
    cover.addEventListener('error', () => { cover.hidden = true; }, { signal: lifetime.signal });
    if (cover.complete && cover.naturalWidth === 0) cover.hidden = true;
    document.addEventListener('astro:before-swap', () => lifetime.abort(), { once: true, signal: lifetime.signal });
  }
}
