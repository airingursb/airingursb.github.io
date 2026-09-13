export type LifeActivity = 'typing' | 'reading' | 'sleep' | 'music' | 'coffee';
export type LifeAction = LifeActivity | 'stretch' | 'drink' | 'camera';
export type DayPeriod = 'morning' | 'work' | 'afternoon' | 'evening' | 'night';
export type LifeWeather = {
  readonly kind: 'sunny' | 'cloudy' | 'rainy' | 'thunder';
  readonly observedAt: number;
};
export type LifeContent = {
  readonly href: string;
  readonly title: string;
  readonly publishedAt: number;
};
export type LifeContext = {
  readonly now: number;
  readonly weather: LifeWeather | null;
};
export type SingaporeTime = {
  readonly hour: number;
  readonly dayPeriod: DayPeriod;
  readonly lampOn: boolean;
};

const MINUTE = 60_000;
const DAY = 24 * 60 * MINUTE;
const DEFAULT_ACTIVITY: Readonly<Record<DayPeriod, LifeActivity>> = {
  morning: 'coffee', work: 'typing', afternoon: 'reading', evening: 'reading', night: 'sleep',
};
const RAIN_WEATHER: Readonly<Record<LifeWeather['kind'], boolean>> = {
  sunny: false, cloudy: false, rainy: true, thunder: true,
};

/** Unix millisecond timestamps keep the room independent of the visitor's timezone. */
export function singaporeTime(now: number): SingaporeTime {
  const hour = new Date(now + 8 * 60 * MINUTE).getUTCHours();
  const dayPeriod = hour < 7 || hour >= 23 ? 'night'
    : hour < 11 ? 'morning' : hour < 14 ? 'work' : hour < 18 ? 'afternoon' : 'evening';
  return { hour, dayPeriod, lampOn: hour >= 19 || hour < 7 };
}

export function parseWeather(input: unknown): LifeWeather | null {
  if (typeof input !== 'object' || input === null || !('kind' in input) || !('observedAt' in input)) return null;
  const { kind, observedAt } = input;
  if (typeof observedAt !== 'number' || !Number.isFinite(observedAt) || observedAt < 0) return null;
  switch (kind) {
    case 'sunny': case 'cloudy': case 'rainy': case 'thunder':
      return { kind, observedAt };
    default:
      return null;
  }
}

export function freshWeather(weather: LifeWeather | null, now: number): LifeWeather | null {
  if (weather === null) return null;
  const age = now - weather.observedAt;
  return age >= -5 * MINUTE && age <= 45 * MINUTE ? weather : null;
}

export function freshContent(content: LifeContent | null, generatedAt: number, now: number): LifeContent | null {
  if (content === null) return null;
  const snapshotAge = now - generatedAt;
  const contentAge = now - content.publishedAt;
  return snapshotAge >= 0 && snapshotAge <= 7 * DAY && contentAge >= 0 && contentAge <= 14 * DAY ? content : null;
}

/** Omit random for the initial, stable activity; later intervals may briefly play music. */
export function lifeActivity(context: LifeContext, random: number | null = null): LifeActivity {
  const weather = freshWeather(context.weather, context.now);
  const { dayPeriod } = singaporeTime(context.now);
  if (dayPeriod !== 'night' && weather !== null && RAIN_WEATHER[weather.kind]) return 'reading';
  switch (dayPeriod) {
    case 'night':
      return 'sleep';
    case 'morning': case 'work': case 'afternoon': case 'evening':
      return random !== null && random >= 0.1 && random < 0.2 ? 'music' : DEFAULT_ACTIVITY[dayPeriod];
    default:
      return assertNever(dayPeriod);
  }
}

export function lifeAction(context: LifeContext, random: number): LifeAction {
  const activity = lifeActivity(context, random);
  switch (activity) {
    case 'sleep':
      return activity;
    case 'typing': case 'reading': case 'music': case 'coffee':
      return random < 0.05 ? 'stretch' : random < 0.1 ? 'drink' : activity;
    default:
      return assertNever(activity);
  }
}

/** The caller supplies a sample from [0, 1], normally Math.random(). */
export function routineDelay(random: number): number {
  return 45_000 + random * 45_000;
}

function assertNever(value: never): never {
  throw new TypeError(`Unexpected life variant: ${value}`);
}
