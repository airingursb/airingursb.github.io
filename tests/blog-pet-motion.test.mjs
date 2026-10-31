import test from "node:test";
import assert from "node:assert/strict";
import {
  CLOSE_REVERSE_RATE, DIZZY, POKE_DIZZY_COUNT,
  cellOrigin, cellPoint, chooseReaction, closeFrame, endZone, initialPokes, queueReaction, registerPoke, stepClose,
} from "../src/lib/blog-pet-motion.ts";

test("the end is reached when half of the like card's head is on screen, left only 40px below it", () => {
  assert.equal(endZone({ top: 700, height: 200 }, 800), "reach");
  assert.equal(endZone({ top: 760, height: 200 }, 800), "between");
  assert.equal(endZone({ top: 840, height: 200 }, 800), "between");
  assert.equal(endZone({ top: 841, height: 200 }, 800), "away");
  assert.equal(endZone({ top: -400, height: 200 }, 800), "reach");
});

test("the close plays once, hands over to close-rest, and reverses at 3x", () => {
  const clip = { frames: 96, fps: 12, hasRest: true };
  let clock = { phase: "closing", pos: 0, rest: 0 };
  clock = stepClose(clock, clip, 4);
  assert.equal(clock.phase, "closing");
  assert.equal(closeFrame(clock, clip, 12), 48);
  clock = stepClose(clock, clip, 5);
  assert.equal(clock.phase, "rest");
  assert.equal(closeFrame(clock, clip, 12), 0);
  clock = stepClose(clock, clip, 1.5);
  assert.equal(closeFrame(clock, clip, 12), 6);
  // Reversing from the last frame takes a third of the forward time.
  clock = stepClose({ phase: "opening", pos: 95, rest: 0 }, clip, 95 / 12 / CLOSE_REVERSE_RATE - 0.01);
  assert.equal(clock.opened, false);
  clock = stepClose(clock, clip, 0.02);
  assert.equal(clock.opened, true);
  assert.equal(clock.pos, 0);
});

test("a close without close-rest settles on its last frame", () => {
  const clock = stepClose({ phase: "closing", pos: 90, rest: 0 }, { frames: 96, fps: 12, hasRest: false }, 1);
  assert.equal(clock.settled, true);
  assert.equal(clock.pos, 95);
});

test("five pokes inside two seconds ask for dizzy once, a pause re-arms it", () => {
  let state = initialPokes;
  const kinds = [];
  for (let i = 0; i < 7; i++) {
    const r = registerPoke(state, 1000 + i * 300);
    state = r.state;
    kinds.push(r.kind);
  }
  assert.equal(kinds.indexOf("burst"), POKE_DIZZY_COUNT - 1);
  assert.equal(kinds.filter((k) => k === "burst").length, 1);
  // 2.5 s later the latch is gone, but a single poke is just a poke.
  const later = registerPoke(state, 1000 + 6 * 300 + 2500);
  assert.equal(later.kind, "random");
  assert.equal(later.state.latched, false);
});

test("slow pokes never add up to dizzy", () => {
  let state = initialPokes;
  for (let i = 0; i < 10; i++) {
    const r = registerPoke(state, i * 600);
    state = r.state;
    assert.equal(r.kind, "random");
  }
});

test("at most one reaction waits, and dizzy outranks a waiting random one", () => {
  const random = { kind: "random" };
  const burst = { kind: "burst" };
  assert.deepEqual(queueReaction(null, random), random);
  assert.deepEqual(queueReaction(random, burst), burst);
  assert.deepEqual(queueReaction(burst, random), burst);
  assert.equal(queueReaction(random, { kind: "random" }).kind, "random");
});

test("random reactions skip dizzy and never repeat back to back", () => {
  const pool = ["wave", "shy", "page", "beret", "hop", DIZZY];
  for (let i = 0; i < 50; i++) {
    const r = Math.random;
    const pick = chooseReaction(pool, "wave", r);
    assert.notEqual(pick, "wave");
    assert.notEqual(pick, DIZZY);
  }
  assert.equal(chooseReaction(["wave", DIZZY], "wave", () => 0), "wave");
  assert.equal(chooseReaction(pool, null, () => 0.9999), "hop");
});

test("hit test maps the pointer into the current atlas cell", () => {
  assert.deepEqual(cellOrigin(11, 8, 288, 288), { x: 3 * 288, y: 288 });
  const box = { left: 100, top: 200, width: 144, height: 144 };
  assert.deepEqual(cellPoint(100, 200, box, 288, 288), { x: 0, y: 0 });
  assert.deepEqual(cellPoint(172, 272, box, 288, 288), { x: 144, y: 144 });
  assert.equal(cellPoint(244, 250, box, 288, 288), null);
  assert.equal(cellPoint(99, 250, box, 288, 288), null);
});
