class PhotoDarkroom extends HTMLElement {
  connectedCallback() {
    const dialog = this.querySelector<HTMLDialogElement>('dialog');
    const entry = this.querySelector<HTMLButtonElement>('.darkroom-entry');
    const close = this.querySelector<HTMLButtonElement>('.darkroom-close');
    const print = this.querySelector<HTMLButtonElement>('.darkroom-print');
    const flip = this.querySelector<HTMLButtonElement>('.darkroom-flip');
    const photo = this.querySelector<HTMLImageElement>('[data-photo]');
    const bear = this.querySelector<HTMLImageElement>('.darkroom-bear');
    const status = this.querySelector<HTMLElement>('[role="status"]');
    if (!dialog || !entry || !close || !print || !flip || !photo || !bear || !status) return;
    const reduced = matchMedia('(prefers-reduced-motion: reduce)');
    let timer = 0;
    let request = 0;
    const poster = '/photo-motion/photographer-poster.png';
    const ready = () => {
      dialog.dataset.state = 'ready';
      print.disabled = false;
      flip.disabled = false;
      status.textContent = 'Your photograph is ready. Turn it over to see where and when it was taken.';
    };
    const turn = () => {
      const back = print.getAttribute('aria-pressed') !== 'true';
      print.setAttribute('aria-pressed', String(back));
      print.setAttribute('aria-label', back ? 'Show the photograph' : 'Show the back of the photograph');
      print.querySelector('.print-front')?.setAttribute('aria-hidden', String(back));
      print.querySelector('.print-back')?.setAttribute('aria-hidden', String(!back));
      flip.innerHTML = back ? 'Photo side <span aria-hidden="true">↶</span>' : 'Turn over <span aria-hidden="true">↶</span>';
    };
    entry.addEventListener('click', async () => {
      const current = ++request;
      window.clearTimeout(timer);
      if (print.getAttribute('aria-pressed') === 'true') turn();
      print.disabled = true;
      flip.disabled = true;
      if (dialog.dataset.state === 'error') photo.src = photo.src;
      dialog.dataset.state = 'loading';
      status.textContent = 'Developing your photograph…';
      dialog.showModal();
      try {
        await photo.decode();
        if (current !== request || !dialog.open) return;
        if (reduced.matches) return ready();
        bear.src = '/photo-motion/photographer.webp';
        dialog.dataset.state = 'developing';
        timer = window.setTimeout(ready, 3500);
      } catch {
        if (current !== request || !dialog.open) return;
        dialog.dataset.state = 'error';
        status.textContent = 'The photograph could not load. Close the darkroom and try again.';
        status.style.cssText = 'position:static;width:auto;height:auto;clip-path:none;font-size:12px';
      }
    });
    close.addEventListener('click', () => dialog.close());
    dialog.addEventListener('click', event => { if (event.target === dialog) {
      const bounds = dialog.getBoundingClientRect();
      if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) dialog.close();
    } });
    dialog.addEventListener('close', () => {
      request++;
      window.clearTimeout(timer);
      bear.src = poster;
      status.removeAttribute('style');
      entry.focus({ preventScroll: true });
    });
    flip.addEventListener('click', turn);
    print.addEventListener('click', turn);
    bear.addEventListener('error', () => { if (!bear.src.endsWith('photographer-poster.png')) bear.src = poster; });
    document.addEventListener('visibilitychange', () => { if (document.hidden) bear.src = poster; });
    reduced.addEventListener('change', () => { if (reduced.matches) {
      bear.src = poster;
      if (dialog.dataset.state === 'developing') { window.clearTimeout(timer); ready(); }
    } });
  }
}
if (!customElements.get('photo-darkroom')) customElements.define('photo-darkroom', PhotoDarkroom);
