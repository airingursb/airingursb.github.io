export type Season = {
  id: string
  months: number[]
  tint: string
  alpha: number
  particle: string
}

export type HolidayWindow = { from: string; to: string }
export type Holiday = {
  id: string
  tint: string
  alpha: number
  particle: string
  windows: HolidayWindow[]
}

export type SeasonManifest = {
  schema_version: number
  seasons: Season[]
  holidays: Holiday[]
}

const EMPTY: SeasonManifest = { schema_version: 1, seasons: [], holidays: [] }
let cached: SeasonManifest | null = null

export async function loadSeasons(): Promise<SeasonManifest> {
  if (cached) return cached
  try {
    const res = await fetch('/lounge/data/seasons.json', { cache: 'no-store' })
    if (!res.ok) { cached = EMPTY; return EMPTY }
    const json = await res.json()
    if (!json || !Array.isArray(json.seasons)) { cached = EMPTY; return EMPTY }
    cached = json as SeasonManifest
    return cached
  } catch {
    cached = EMPTY
    return EMPTY
  }
}

export function getSeasonManifest(): SeasonManifest {
  return cached ?? EMPTY
}

export function getCurrentSeason(now: Date = new Date()): Season | null {
  const m = now.getMonth() + 1
  for (const s of getSeasonManifest().seasons) {
    if (s.months.includes(m)) return s
  }
  return null
}

function dateInRange(d: Date, from: string, to: string): boolean {
  const dStr = d.toISOString().slice(0, 10)
  return dStr >= from && dStr <= to
}

export function getCurrentHoliday(now: Date = new Date()): Holiday | null {
  for (const h of getSeasonManifest().holidays) {
    for (const w of h.windows) {
      if (dateInRange(now, w.from, w.to)) return h
    }
  }
  return null
}

/** Parse hex color string '#rrggbb' to integer 0xRRGGBB. */
export function hexToInt(hex: string): number {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex)
  if (!m) return 0xffffff
  return parseInt(m[1], 16)
}
