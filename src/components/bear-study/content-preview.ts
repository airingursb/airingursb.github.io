const triggerSelector = '[data-keepsake="letter"], [data-keepsake="camera"], [data-book]';

export class BearContentPreview extends HTMLElement {
  private owner: HTMLElement | null = null;
  private active: HTMLElement | null = null;
  private trigger: HTMLElement | null = null;
  private dismissTrigger: HTMLElement | null = null;
  private dispose: AbortController | null = null;

  connectedCallback() {
    if (typeof this.showPopover !== 'function') return;
    this.owner = this.closest('bear-home-study, [data-bear-preview-scope]');
    if (!this.owner) return;
    this.dispose = new AbortController();
    const { signal } = this.dispose;
    for (const trigger of this.owner.querySelectorAll<HTMLElement>(triggerSelector)) {
      const panel = this.panelFor(trigger);
      if (!panel) continue;
      trigger.setAttribute('aria-haspopup', 'dialog');
      trigger.setAttribute('aria-controls', panel.id);
      trigger.setAttribute('aria-expanded', 'false');
      if (trigger instanceof HTMLAnchorElement) trigger.setAttribute('role', 'button');
    }
    this.owner.addEventListener('click', this.handleClick, { capture: true, signal });
    this.owner.addEventListener('pointerdown', this.pointerDown, { capture: true, signal });
    this.owner.addEventListener('keydown', this.keydown, { signal });
    window.addEventListener('resize', this.position, { signal });
    window.addEventListener('scroll', this.position, { capture: true, passive: true, signal });
    window.visualViewport?.addEventListener('resize', this.position, { signal });
    window.visualViewport?.addEventListener('scroll', this.position, { signal });
    this.addEventListener('click', this.closeClick, { signal });
    for (const panel of this.querySelectorAll<HTMLElement>('[data-preview]')) {
      panel.addEventListener('toggle', () => this.sync(panel), { signal });
    }
  }

  private panelFor(trigger: HTMLElement): HTMLElement | null {
    const kind = trigger.hasAttribute('data-book') ? 'book' : trigger.dataset.keepsake;
    return this.querySelector(`[data-preview="${kind}"]`);
  }

  private pointerDown = (event: PointerEvent) => {
    const trigger = event.target instanceof Element ? event.target.closest<HTMLElement>(triggerSelector) : null;
    this.dismissTrigger = trigger === this.trigger && this.active?.matches(':popover-open') ? trigger : null;
  };

  private handleClick = (event: MouseEvent) => {
    if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    if (!(event.target instanceof Element)) return;
    const trigger = event.target.closest<HTMLElement>(triggerSelector);
    if (!trigger || trigger.closest('bear-home-study, [data-bear-preview-scope]') !== this.owner) return;
    const panel = this.panelFor(trigger);
    if (!panel) return;
    event.preventDefault();
    const dismiss = event.detail > 0 && this.dismissTrigger === trigger;
    this.dismissTrigger = null;
    if (dismiss || panel.matches(':popover-open')) {
      if (panel.matches(':popover-open')) panel.hidePopover();
      return;
    }
    this.trigger?.setAttribute('aria-expanded', 'false');
    this.active?.hidePopover();
    this.active = panel;
    this.trigger = trigger;
    for (const image of panel.querySelectorAll<HTMLImageElement>('[data-preview-src]')) {
      if (image.dataset.previewSrc) {
        image.src = image.dataset.previewSrc;
        delete image.dataset.previewSrc;
      }
    }
    panel.showPopover();
    trigger.setAttribute('aria-expanded', 'true');
    this.position();
    panel.querySelector<HTMLElement>('[data-preview-focus]')?.focus({ preventScroll: true });
  };

  private keydown = (event: KeyboardEvent) => {
    if (event.key !== ' ' || !(event.target instanceof HTMLAnchorElement)) return;
    if (!event.target.matches(triggerSelector) || !this.panelFor(event.target)) return;
    event.preventDefault();
    event.target.click();
  };

  private closeClick = (event: MouseEvent) => {
    if (event.target instanceof Element && event.target.closest('[data-preview-close]')) this.active?.hidePopover();
  };

  private sync(panel: HTMLElement) {
    if (panel !== this.active || panel.matches(':popover-open')) return;
    const focused = document.activeElement;
    this.trigger?.setAttribute('aria-expanded', 'false');
    if (focused === document.body || (focused instanceof Element && panel.contains(focused))) {
      const target = this.trigger?.getClientRects().length ? this.trigger :
        Array.from(this.owner?.querySelectorAll<HTMLElement>('button, a[href]') ?? [])
          .find(element => !this.contains(element) && element.getClientRects().length > 0);
      target?.focus({ preventScroll: true });
    }
    this.active = null;
    this.trigger = null;
  }

  private position = () => {
    if (!this.active || !this.trigger || !this.active.matches(':popover-open')) return;
    const viewport = window.visualViewport;
    const width = viewport?.width ?? window.innerWidth;
    const height = viewport?.height ?? window.innerHeight;
    const offsetX = viewport?.offsetLeft ?? 0;
    const offsetY = viewport?.offsetTop ?? 0;
    const trigger = this.trigger.getBoundingClientRect();
    const panel = { width: this.active.offsetWidth, height: this.active.offsetHeight };
    const left = Math.max(offsetX + 16, Math.min(trigger.left + trigger.width / 2 - panel.width / 2, offsetX + width - panel.width - 16));
    const below = trigger.bottom + 8;
    const top = below + panel.height <= offsetY + height - 16 ? below : Math.max(offsetY + 16, trigger.top - panel.height - 8);
    this.active.style.left = `${left}px`;
    this.active.style.top = `${top}px`;
    this.active.style.transformOrigin = `${trigger.left + trigger.width / 2 - left}px ${top >= trigger.bottom ? 'top' : 'bottom'}`;
  };

  disconnectedCallback() {
    this.dispose?.abort();
    this.trigger?.setAttribute('aria-expanded', 'false');
    this.active = null;
    this.trigger = null;
    this.dismissTrigger = null;
  }
}
