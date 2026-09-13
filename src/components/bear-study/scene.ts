import { freshContent, freshWeather, lifeAction, lifeActivity, parseWeather, singaporeTime } from './life';
import type { LifeContent } from './life';
import type { ClipId } from './timeline';

/** Coordinates scene props with the existing weather badge and authored animation. */
export class BearLifeScene {
  private timer = 0;
  private key = '';
  private lighting: boolean | undefined;
  private cameraPlayed = false;
  private photo: LifeContent | null = null;
  private readonly generatedAt: number;
  private readonly lamp: HTMLButtonElement | null;
  private readonly letter: HTMLAnchorElement | null;
  private readonly camera: HTMLAnchorElement | null;
  private readonly book: HTMLAnchorElement | null;

  constructor(private readonly root: HTMLElement, private readonly choose: (id: ClipId) => void) {
    this.generatedAt = Number(root.dataset.generatedAt);
    this.lamp = root.querySelector('[data-action="lamp"]');
    this.letter = root.querySelector('[data-keepsake="letter"]');
    this.camera = root.querySelector('[data-keepsake="camera"]');
    this.book = root.querySelector('[data-book]');
  }

  private context() {
    const badge = document.getElementById('weatherLine');
    return { now: Date.now(), weather: parseWeather({ kind: badge?.dataset.weather, observedAt: Number(badge?.dataset.observedAt) }) };
  }

  private content(link: HTMLAnchorElement | null): LifeContent | null {
    if (!link) return null;
    const publishedAt = Number(link.dataset.publishedAt);
    return Number.isFinite(publishedAt) ? { href: link.href, title: link.ariaLabel || '', publishedAt } : null;
  }

  refresh = () => {
    if (document.hidden) return;
    const context = this.context();
    const time = singaporeTime(context.now);
    const weather = freshWeather(context.weather, context.now);
    const base = lifeActivity(context);
    this.root.dataset.period = time.dayPeriod;
    this.root.dataset.weather = weather?.kind || 'unknown';
    if (time.lampOn !== this.lighting) {
      this.lighting = time.lampOn;
      this.setLamp(time.lampOn);
    }
    const article = freshContent(this.content(this.letter), this.generatedAt, context.now);
    this.photo = freshContent(this.content(this.camera), this.generatedAt, context.now);
    if (this.letter) this.letter.hidden = article === null;
    if (this.camera) this.camera.hidden = this.photo === null;
    const key = `${time.dayPeriod}:${base}`;
    if (key !== this.key) {
      this.key = key;
      this.choose(base);
    }
  };

  private setLamp(on: boolean) {
    this.root.dataset.lamp = on ? 'on' : 'off';
    this.lamp?.setAttribute('aria-pressed', String(on));
    if (this.lamp) this.lamp.ariaLabel = on ? '关掉小熊的台灯' : '打开小熊的台灯';
  }

  private click = (event: MouseEvent) => {
    if (event.target instanceof Element && event.target.closest('[data-action="lamp"]')) {
      this.setLamp(this.root.dataset.lamp !== 'on');
    }
  };

  nextAction(random: number): ClipId { return lifeAction(this.context(), random); }

  arrival(): boolean {
    const context = this.context();
    const weather = freshWeather(context.weather, context.now);
    if (this.cameraPlayed || !this.photo || weather?.kind === 'rainy' || weather?.kind === 'thunder' || singaporeTime(context.now).dayPeriod === 'night') return false;
    this.cameraPlayed = true;
    return true;
  }

  sync(clip: ClipId, phase: string) {
    if (this.book) this.book.hidden = clip !== 'reading' || phase !== 'hold';
    this.root.dataset.cameraInHands = String(clip === 'camera');
  }

  start() {
    if (this.lamp) this.lamp.hidden = false;
    this.refresh();
    this.timer = window.setInterval(this.refresh, 30_000);
    window.addEventListener('pet-weather', this.refresh);
    document.addEventListener('visibilitychange', this.refresh);
    this.root.addEventListener('click', this.click);
  }

  stop() {
    clearInterval(this.timer);
    window.removeEventListener('pet-weather', this.refresh);
    document.removeEventListener('visibilitychange', this.refresh);
    this.root.removeEventListener('click', this.click);
  }
}
