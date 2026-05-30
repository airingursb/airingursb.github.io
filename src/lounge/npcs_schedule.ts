// Pure schedule logic for NPCs — split out so Node tests can import it
// without dragging the gametime / config tree along.

export type ScheduleBracket = {
  from: string   // "HH:MM"
  to: string     // "HH:MM"
  // NB: other fields are NpcDef-specific; this signature accepts duck-typed
  // brackets so npcs.ts can re-use it against its NpcDef-typed schedule.
  [k: string]: unknown
}

export function parseHHMM(s: string): number {
  const m = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(s)
  if (!m) return NaN
  return parseInt(m[1], 10) * 60 + parseInt(m[2], 10)
}

/** Return the first matching bracket for `now`'s minutes-of-day, or null.
 *  Half-open [from, to). Special case: to === 23:59 (1439) is inclusive so
 *  all-day schedules cover the final minute. */
export function pickBracket<T extends ScheduleBracket>(brackets: T[], now: Date): T | null {
  const minutes = now.getHours() * 60 + now.getMinutes()
  for (const b of brackets) {
    const from = parseHHMM(b.from)
    const to = parseHHMM(b.to)
    if (Number.isNaN(from) || Number.isNaN(to)) continue
    if (to === 1439) {
      if (minutes >= from && minutes <= to) return b
    } else {
      if (minutes >= from && minutes < to) return b
    }
  }
  return null
}
