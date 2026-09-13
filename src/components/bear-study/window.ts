export class BearWindow extends HTMLElement {
  private root: HTMLElement | null = null;
  private observer: MutationObserver | null = null;
  private preference: MediaQueryList | null = null;
  private weather = 'unknown';
  private dryingRemaining = 0;
  private dryingStarted = 0;
  private dryingTimer = 0;

  connectedCallback(): void {
    const button = this.querySelector('button');
    if (button) button.disabled = false;
    this.root = this.closest('bear-home-study');
    if (!this.root) return;
    this.root.dataset.curtain = button?.getAttribute('aria-pressed') === 'true' ? 'closed' : 'open';
    this.preference = matchMedia('(prefers-reduced-motion: reduce)');
    this.observer = new MutationObserver(this.refresh);
    this.observer.observe(this.root, { attributes: true, attributeFilter: ['data-weather', 'data-playing', 'data-curtain'] });
    this.addEventListener('click', this.toggleCurtain);
    document.addEventListener('visibilitychange', this.refresh);
    this.preference.addEventListener('change', this.refresh);
    this.refresh();
  }

  disconnectedCallback(): void {
    clearTimeout(this.dryingTimer);
    this.observer?.disconnect();
    this.preference?.removeEventListener('change', this.refresh);
    document.removeEventListener('visibilitychange', this.refresh);
    this.removeEventListener('click', this.toggleCurtain);
    this.weather = 'unknown';
    this.dryingRemaining = 0;
    this.dryingStarted = 0;
    this.root = null;
  }

  private refresh = (): void => {
    if (!this.root) return;
    clearTimeout(this.dryingTimer);
    if (this.dryingStarted > 0) this.dryingRemaining = Math.max(0, this.dryingRemaining - (performance.now() - this.dryingStarted));
    this.dryingStarted = 0;
    // The scene supplies freshWeather-filtered values; unknown breaks rain history.
    const weather = this.root.dataset.weather || 'unknown';
    if (weather !== this.weather) {
      const wasRaining = this.weather === 'rainy' || this.weather === 'thunder';
      const clearWeather = weather === 'sunny' || weather === 'cloudy';
      if (!clearWeather) this.dryingRemaining = 0;
      else if (wasRaining) this.dryingRemaining = 12_000;
      this.weather = weather;
    }
    if (this.preference?.matches) this.dryingRemaining = 0;
    const running = this.root.dataset.playing === 'true' && this.root.dataset.curtain === 'open' && !document.hidden && !this.preference?.matches;
    this.dataset.running = String(running);
    this.dataset.drying = String(this.dryingRemaining > 0);
    if (running && this.dryingRemaining > 0) {
      this.dryingStarted = performance.now();
      this.dryingTimer = window.setTimeout(() => {
        this.dryingRemaining = 0;
        this.dryingStarted = 0;
        this.dataset.drying = 'false';
      }, this.dryingRemaining);
    }
  };

  private toggleCurtain = (): void => {
    const button = this.querySelector('button');
    if (!button) return;
    const closed = button.getAttribute('aria-pressed') !== 'true';
    button.setAttribute('aria-pressed', String(closed));
    button.setAttribute('aria-label', closed ? '拉开小熊的窗帘' : '拉上小熊的窗帘');
    if (this.root) this.root.dataset.curtain = closed ? 'closed' : 'open';
  };
}
