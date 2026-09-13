import { freshWeather, singaporeTime } from './life.ts';
import type { LifeContext } from './life.ts';

export type BirdPlace = 'window' | 'garden';
export type BirdPhase = 'away' | 'landing' | 'perched' | 'peck' | 'hop' | 'leaving';
export const birdDelay = (random: number, returning = false): number => (returning ? 10_000 : 20_000) * (1 + random);
export const birdCooldown = (random: number): number => 180_000 + random * 120_000;

export function birdReturnVisit(getStorage: () => Pick<Storage, 'getItem' | 'setItem'>, now: number): boolean {
  const day = Math.floor((now + 8 * 60 * 60_000) / 86_400_000);
  try {
    const storage = getStorage();
    const previous = storage.getItem('bear-bird-last-day');
    const returning = storage.getItem('bear-bird-friendly-day') === String(day)
      || (previous !== null && Number(previous) === day - 1);
    storage.setItem('bear-bird-last-day', String(day));
    if (returning) storage.setItem('bear-bird-friendly-day', String(day));
    return returning;
  } catch (error) {
    if (error instanceof DOMException && (error.name === 'SecurityError' || error.name === 'QuotaExceededError')) return false;
    throw error;
  }
}

export function birdWeatherAllows(context: LifeContext): boolean {
  const weather = freshWeather(context.weather, context.now);
  const { hour } = singaporeTime(context.now);
  return hour >= 7 && hour < 18 && (weather?.kind === 'sunny' || weather?.kind === 'cloudy');
}

export class BirdVisitGate {
  private owner: BirdPlace | null = null;
  private availableAt = 0;

  claim(place: BirdPlace, now: number): boolean {
    if (this.owner !== null || now < this.availableAt) return false;
    this.owner = place;
    return true;
  }

  release(place: BirdPlace, now: number, random: number): void {
    if (this.owner !== place) return;
    this.owner = null;
    this.availableAt = now + birdCooldown(random);
  }
}

export class BirdVisit {
  phase: BirdPhase = 'away';
  elapsed = 0;
  private reaction = 0;
  private tapped = false;
  private readonly duration: number;

  constructor(random: number) { this.duration = 16_000 + random * 2_000; }

  start(): void { this.phase = 'landing'; }

  advance(milliseconds: number): boolean {
    if (this.phase === 'away') return false;
    this.elapsed += milliseconds;
    this.reaction = Math.max(0, this.reaction - milliseconds);
    if (this.elapsed >= this.duration + 900) this.phase = 'away';
    else if (this.elapsed >= this.duration) this.phase = 'leaving';
    else if (this.elapsed < 900) this.phase = 'landing';
    else if (this.reaction > 0) this.phase = 'hop';
    else if (this.elapsed >= 3500 && this.elapsed < 4150) this.phase = 'peck';
    else this.phase = 'perched';
    if (this.phase !== 'peck' || this.tapped) return false;
    this.tapped = true;
    return true;
  }

  interact(): void {
    if (this.phase !== 'perched' && this.phase !== 'peck') return;
    this.reaction = 700;
    this.phase = 'hop';
  }
}
