import test from "node:test";
import assert from "node:assert/strict";
import {
  BOOKMARK_TTL_MS, bookmarkKey, bookmarkWhen, clearBookmark, loadBookmark, minutesLeft, parseBookmark, readingPosition, saveBookmark,
} from "../src/lib/reading-bookmark.ts";

const now = new Date(2026, 9, 31, 12).getTime();
const memory = () => {
  const values = new Map();
  return { values, storage: () => ({ getItem: (k) => values.get(k) ?? null, setItem: (k, v) => values.set(k, v), removeItem: (k) => values.delete(k) }) };
};

test("a saved position comes back for the same post only", () => {
  const { values, storage } = memory();
  assert.equal(saveBookmark(storage, "weekly-36", 0.4321, now), true);
  assert.equal(values.get(bookmarkKey("weekly-36")), JSON.stringify({ pct: 0.432, ts: now }));
  assert.deepEqual(loadBookmark(storage, "weekly-36", now), { pct: 0.432, ts: now });
  assert.equal(loadBookmark(storage, "weekly-35", now), null);
  clearBookmark(storage, "weekly-36");
  assert.equal(loadBookmark(storage, "weekly-36", now), null);
});

test("blocked, throwing or full storage means no bookmark, never an error", () => {
  const blocked = () => { throw new DOMException("denied", "SecurityError"); };
  assert.equal(loadBookmark(blocked, "a", now), null);
  assert.equal(saveBookmark(blocked, "a", 0.5, now), false);
  assert.doesNotThrow(() => clearBookmark(blocked, "a"));
  const full = () => ({ getItem() { throw new Error("x"); }, setItem() { throw new DOMException("full", "QuotaExceededError"); }, removeItem() { throw new Error("x"); } });
  assert.equal(loadBookmark(full, "a", now), null);
  assert.equal(saveBookmark(full, "a", 0.5, now), false);
  assert.doesNotThrow(() => clearBookmark(full, "a"));
});

test("garbage, near-start, finished and stale bookmarks are ignored", () => {
  assert.equal(parseBookmark("{oops", now), null);
  assert.equal(parseBookmark(JSON.stringify({ pct: "x", ts: now }), now), null);
  assert.equal(parseBookmark(JSON.stringify({ pct: 0.02, ts: now }), now), null);
  assert.equal(parseBookmark(JSON.stringify({ pct: 0.96, ts: now }), now), null);
  assert.equal(parseBookmark(JSON.stringify({ pct: 0.5, ts: now - BOOKMARK_TTL_MS - 1 }), now), null);
  assert.deepEqual(parseBookmark(JSON.stringify({ pct: 0.5, ts: now - 1000 }), now), { pct: 0.5, ts: now - 1000 });
});

test("when, position and minutes left", () => {
  assert.equal(bookmarkWhen(now - 60_000, now, "zh"), "今天");
  assert.equal(bookmarkWhen(new Date(2026, 9, 30, 23).getTime(), now, "zh"), "昨天");
  assert.equal(bookmarkWhen(new Date(2026, 9, 27, 8).getTime(), now, "zh"), "4 天前");
  assert.equal(bookmarkWhen(new Date(2026, 9, 30, 8).getTime(), now, "en"), "yesterday");
  assert.equal(readingPosition(-1000, 4000, 1000), 0.325);
  assert.equal(readingPosition(500, 4000, 1000), 0);
  assert.equal(readingPosition(-9000, 4000, 1000), 1);
  assert.equal(minutesLeft(12, 0.5), 6);
  assert.equal(minutesLeft(12, 0.99), 1);
});
