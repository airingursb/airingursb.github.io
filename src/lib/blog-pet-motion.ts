/**
 * IP panda companion: the pure half of the end-of-article close and the poke
 * reactions (DOM half: blog-pet-stage.ts).
 *
 * Desktop (> 1100px) keeps the panda in the corner: at the end of the article
 * the gaze atlas turns to its "looking down" frame, the close layer plays once
 * and then loops close-rest; scrolling back reverses the close at 3× and the
 * gaze resumes. Clicking the panda turns it to frame 0 and plays one reaction.
 */

/** Asset folder (public/editorial-motion/ip-panda/{gaze,close,react}/). */
export const IP_PANDA_BASE = "/editorial-motion/ip-panda/";
/** Gaze frame the close and react layers are pixel-aligned with. */
export const IP_PANDA_DOWN_FRAME = 0;
/** Reverse speed of the close when the reader leaves the end. */
export const CLOSE_REVERSE_RATE = 3;
/** The reader has "left" once the like card sits this far below the viewport. */
export const END_AWAY_MARGIN = 40;
/** Pokes inside this window count towards dizzy. */
export const POKE_WINDOW_MS = 2000;
export const POKE_DIZZY_COUNT = 5;
export const DIZZY = "dizzy";
/** Alpha (0–255) below which a pixel does not count as the panda. */
export const HIT_ALPHA = 24;

export const wrapFrame = (frame: number, count: number) =>
  ((frame % count) + count) % count;

export function circularDelta(from: number, to: number, count: number) {
  let delta = wrapFrame(to, count) - wrapFrame(from, count);
  if (delta > count / 2) delta -= count;
  if (delta < -count / 2) delta += count;
  return delta;
}

type Box = { readonly top: number; readonly height: number };

/**
 * Where the like card is relative to the viewport: half of its first 120px
 * visible (or scrolled past) = reached; entirely more than 40px below the
 * viewport = away; anything in between keeps the current state.
 */
export function endZone(card: Box, viewportHeight: number): "reach" | "away" | "between" {
  if (card.top + Math.min(card.height, 120) * 0.5 < viewportHeight) return "reach";
  if (card.top > viewportHeight + END_AWAY_MARGIN) return "away";
  return "between";
}

export type ClosePhase = "closing" | "rest" | "opening";
export type CloseClock = { phase: ClosePhase; pos: number; rest: number };
export type CloseClip = { frames: number; fps: number; hasRest: boolean };

/**
 * Advance the close layer by dt seconds. Closing ends on the last frame and
 * hands over to close-rest; opening runs backwards at CLOSE_REVERSE_RATE and
 * reports `opened` on frame 0.
 */
export function stepClose(clock: CloseClock, clip: CloseClip, dt: number): CloseClock & { opened: boolean; settled: boolean } {
  const next = { ...clock, opened: false, settled: false };
  if (next.phase === "closing") {
    next.pos += dt * clip.fps;
    if (next.pos >= clip.frames) {
      next.pos = clip.frames - 1;
      if (clip.hasRest) { next.phase = "rest"; next.rest = 0; } else next.settled = true;
    }
  } else if (next.phase === "rest") {
    next.rest += dt * clip.fps;
  } else {
    next.pos -= dt * clip.fps * CLOSE_REVERSE_RATE;
    if (next.pos <= 0) { next.pos = 0; next.opened = true; }
  }
  return next;
}

/** Frame index the close layer shows for a clock. */
export function closeFrame(clock: CloseClock, clip: { frames: number }, restFrames: number) {
  if (clock.phase === "rest" && restFrames > 0) return Math.floor(clock.rest) % restFrames;
  return Math.max(0, Math.min(clip.frames - 1, Math.floor(clock.pos)));
}

export type PokeState = { readonly times: readonly number[]; readonly latched: boolean; readonly last: number };
export const initialPokes: PokeState = { times: [], latched: false, last: -Infinity };

/**
 * Register a poke. Five or more inside two seconds asks for dizzy once; the
 * latch resets after a two-second pause so a new burst can trigger it again.
 */
export function registerPoke(state: PokeState, now: number): { state: PokeState; kind: "burst" | "random" } {
  const latched = now - state.last > POKE_WINDOW_MS ? false : state.latched;
  const times = [...state.times.filter((t) => now - t <= POKE_WINDOW_MS), now];
  if (times.length >= POKE_DIZZY_COUNT && !latched) return { state: { times, latched: true, last: now }, kind: "burst" };
  return { state: { times, latched, last: now }, kind: "random" };
}

export type ReactionRequest = { readonly kind: "burst" | "random" | "named"; readonly name?: string };

const priority = (r: ReactionRequest) => (r.kind === "burst" ? 2 : 1);

/**
 * While a reaction plays, at most one more waits; a dizzy request replaces a
 * waiting random one, never the other way round. Returns the new pending
 * request (or the old one when the request is dropped).
 */
export function queueReaction(pending: ReactionRequest | null, request: ReactionRequest): ReactionRequest | null {
  if (!pending || priority(request) >= priority(pending)) return request;
  return pending;
}

/** Random reaction from the pool (dizzy excluded), never the one just played. */
export function chooseReaction(pool: readonly string[], last: string | null, random = Math.random) {
  const candidates = pool.filter((name) => name !== DIZZY && name !== last);
  const from = candidates.length ? candidates : pool.filter((name) => name !== DIZZY);
  return from[Math.min(from.length - 1, Math.floor(random() * from.length))] ?? null;
}

/** Top-left of `frame` inside a sprite atlas. */
export function cellOrigin(frame: number, columns: number, width: number, height: number) {
  return { x: (frame % columns) * width, y: Math.floor(frame / columns) * height };
}

type Rect = { readonly left: number; readonly top: number; readonly width: number; readonly height: number };

/**
 * Map a viewport point over the drawn panda to a pixel inside its atlas cell,
 * or null when the point is outside the box.
 */
export function cellPoint(clientX: number, clientY: number, box: Rect, cellWidth: number, cellHeight: number) {
  const u = (clientX - box.left) / box.width;
  const v = (clientY - box.top) / box.height;
  if (!(u >= 0 && u < 1 && v >= 0 && v < 1)) return null;
  return { x: Math.floor(u * cellWidth), y: Math.floor(v * cellHeight) };
}
