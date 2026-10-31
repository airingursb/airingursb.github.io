/**
 * Ribbon bookmark (丝带书签 A): where the reader stopped last time, per post,
 * in localStorage. Every storage access is wrapped: private windows, blocked
 * or full storage simply mean "no bookmark".
 */

export type Bookmark = { readonly pct: number; readonly ts: number };
type StorageLike = Pick<Storage, "getItem" | "setItem" | "removeItem">;

export const bookmarkKey = (slug: string) => `reading-bookmark:${slug}`;
/** Below this there is nothing to come back to; at the end the bookmark is cleared. */
export const BOOKMARK_MIN = 0.05;
export const BOOKMARK_MAX = 0.95;
/** Older bookmarks are dropped. */
export const BOOKMARK_TTL_MS = 60 * 24 * 60 * 60 * 1000;

const DAY = 24 * 60 * 60 * 1000;

export function parseBookmark(raw: string | null, now: number): Bookmark | null {
  if (!raw) return null;
  try {
    const value = JSON.parse(raw) as Partial<Bookmark>;
    const pct = Number(value.pct);
    const ts = Number(value.ts);
    if (!Number.isFinite(pct) || !Number.isFinite(ts)) return null;
    if (pct < BOOKMARK_MIN || pct >= BOOKMARK_MAX || now - ts > BOOKMARK_TTL_MS || ts > now + DAY) return null;
    return { pct, ts };
  } catch {
    return null;
  }
}

export function loadBookmark(storage: () => StorageLike, slug: string, now = Date.now()): Bookmark | null {
  try {
    return parseBookmark(storage().getItem(bookmarkKey(slug)), now);
  } catch {
    return null;
  }
}

export function saveBookmark(storage: () => StorageLike, slug: string, pct: number, now = Date.now()): boolean {
  try {
    storage().setItem(bookmarkKey(slug), JSON.stringify({ pct: Math.round(pct * 1000) / 1000, ts: now }));
    return true;
  } catch {
    return false;
  }
}

export function clearBookmark(storage: () => StorageLike, slug: string): void {
  try {
    storage().removeItem(bookmarkKey(slug));
  } catch {
    // Nothing stored, nothing to clear.
  }
}

/** "今天 / 昨天 / 3 天前" by calendar day. */
export function bookmarkWhen(ts: number, now: number, lang: "zh" | "en"): string {
  const start = (t: number) => { const d = new Date(t); d.setHours(0, 0, 0, 0); return d.getTime(); };
  const days = Math.round((start(now) - start(ts)) / DAY);
  if (lang === "en") return days <= 0 ? "today" : days === 1 ? "yesterday" : `${days} days ago`;
  return days <= 0 ? "今天" : days === 1 ? "昨天" : `${days} 天前`;
}

/** Share of the article above the reading line (30% down the viewport). */
export function readingPosition(contentTop: number, contentHeight: number, viewportHeight: number): number {
  return Math.min(1, Math.max(0, (viewportHeight * 0.3 - contentTop) / Math.max(1, contentHeight)));
}

export const minutesLeft = (minutes: number, pct: number) => Math.max(1, Math.round(minutes * (1 - pct)));
