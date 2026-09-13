import { BirdVisit, BirdVisitGate, birdDelay, birdReturnVisit, birdWeatherAllows } from './bird-state';
import type { BirdPlace } from './bird-state';
import { parseWeather } from './life';

const visits = new BirdVisitGate();

export class BearBird extends HTMLElement {
  private cleanup: (() => void) | undefined;

  connectedCallback(): void {
    this.cleanup?.();
    const button = this.querySelector('button');
    const scope = this.closest('[data-bear-preview-scope], bear-home-study');
    const place: BirdPlace = this.dataset.place === 'garden' ? 'garden' : 'window';
    if (!button || !scope) return;
    const reduced = matchMedia('(prefers-reduced-motion: reduce)');
    let visible = false, eligibleTime = 0, last = 0, timer = 0;
    const preview = this.dataset.birdPreview === 'true';
    const returning = preview ? false : birdReturnVisit(() => localStorage, Date.now());
    const nextDelay = () => preview ? 3_000 : birdDelay(Math.random(), returning);
    let delay = nextDelay();
    let visit: BirdVisit | null = null;
    const paint = () => {
      const state = visit?.phase || 'away';
      this.dataset.state = state;
      this.hidden = state === 'away';
      button.disabled = state === 'landing' || state === 'leaving' || state === 'away';
    };
    const leave = () => {
      if (visit) {
        visits.release(place, Date.now(), Math.random());
        visit = null;
        this.dispatchEvent(new CustomEvent('bear-bird-left', { bubbles: true }));
        delay = nextDelay();
      }
      eligibleTime = 0;
      paint();
    };
    const allowed = () => {
      const badge = document.getElementById('weatherLine');
      const weather = parseWeather({ kind: badge?.dataset.weather, observedAt: Number(badge?.dataset.observedAt) });
      const curtain = this.closest('bear-home-study')?.getAttribute('data-curtain');
      return !reduced.matches && !scope.querySelector(':popover-open')
        && (place === 'garden' || curtain !== 'closed') && birdWeatherAllows({ now: Date.now(), weather });
    };
    const tick = () => {
      const now = performance.now();
      const delta = last ? Math.min(now - last, 500) : 0;
      last = now;
      if (!allowed()) { leave(); return; }
      if (visit) {
        const tapped = visit.advance(delta);
        if (visit.phase === 'away') leave();
        else {
          paint();
          if (tapped && place === 'window') this.dispatchEvent(new CustomEvent('bear-bird-tap', { bubbles: true }));
        }
      } else {
        eligibleTime += delta;
        if (eligibleTime >= delay && visits.claim(place, Date.now())) {
          visit = new BirdVisit(Math.random());
          visit.start();
          paint();
        }
      }
    };
    const refresh = () => {
      clearInterval(timer);
      last = 0;
      if (!allowed()) leave();
      if (document.hidden) return;
      if (!visible) {
        if (visit) leave();
        return;
      }
      if (allowed()) timer = window.setInterval(tick, 100);
    };
    const interact = (event: MouseEvent) => {
      event.stopPropagation();
      if (!visible || document.hidden || !allowed() || !visit) return;
      visit.interact();
      paint();
    };
    const viewport = new IntersectionObserver(entries => {
      visible = entries.some(entry => entry.isIntersecting);
      refresh();
    });
    viewport.observe(place === 'window' ? scope : this.parentElement || scope);
    const attributes = new MutationObserver(refresh);
    attributes.observe(scope, { attributes: true, attributeFilter: ['data-curtain', 'data-period', 'data-weather'] });
    button.addEventListener('click', interact);
    scope.addEventListener('toggle', refresh, true);
    document.addEventListener('visibilitychange', refresh);
    window.addEventListener('pet-weather', refresh);
    reduced.addEventListener('change', refresh);
    paint();
    this.cleanup = () => {
      clearInterval(timer);
      leave();
      viewport.disconnect();
      attributes.disconnect();
      button.removeEventListener('click', interact);
      scope.removeEventListener('toggle', refresh, true);
      document.removeEventListener('visibilitychange', refresh);
      window.removeEventListener('pet-weather', refresh);
      reduced.removeEventListener('change', refresh);
    };
  }

  disconnectedCallback(): void { this.cleanup?.(); }
}
