// src/lib/home-workouts.ts
// Workout index for the homepage: the Workouts card lists these, and the
// Comics card links an episode to the hike drawn in it (same day).
import { existsSync, readFileSync } from 'node:fs';
import { resolve as resolvePath } from 'node:path';
import { getCollection } from 'astro:content';
import { defaultWorkoutTitle } from '../components/workouts/format.mjs';

export interface HomeWorkout {
  id: string;
  type: string;
  start: string;
  /** Local calendar day of the start, YYYY-MM-DD. */
  date: string;
  durationSec: number;
  stats: { distanceKm?: number; elevationUpM?: number; heart?: { avg?: number } };
  /** Path "d" in a 100×60 viewBox, written by scripts/sync-workouts.mjs. */
  trackSvg: string;
  /** Place name without the "YYYY-MM-DD · " prefix the content titles carry. */
  name: { zh: string; en: string };
}

export async function loadHomeWorkouts(): Promise<HomeWorkout[]> {
  // The full index stays local (gitignored); CI builds from the public one.
  const local = resolvePath('./src/data/workouts.json');
  const pub = resolvePath('./src/data/workouts-public.json');
  const file = existsSync(local) ? local : (existsSync(pub) ? pub : null);
  if (!file) return [];
  const items = JSON.parse(readFileSync(file, 'utf8')) as Array<any>;

  // Astro 5 lowercases content collection IDs; workout UUIDs are uppercase.
  const titles = new Map((await getCollection('workouts')).map(e => [e.id.toLowerCase(), e.data.title]));
  const stripDate = (t: string) => t.replace(/^\d{4}-\d{2}-\d{2}\s*·\s*/, '');

  return items.map((w) => {
    const title = titles.get(w.id.toLowerCase());
    return {
      id: w.id,
      type: w.type,
      start: w.start,
      date: String(w.start).slice(0, 10),
      durationSec: w.durationSec ?? 0,
      stats: w.stats ?? {},
      trackSvg: w.trackSvg ?? '',
      name: {
        zh: stripDate(title?.zh ?? defaultWorkoutTitle(w.start, w.type, 'zh')),
        en: stripDate(title?.en ?? defaultWorkoutTitle(w.start, w.type, 'en')),
      },
    };
  });
}
