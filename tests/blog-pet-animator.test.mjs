import test from "node:test";
import assert from "node:assert/strict";
import {
  angleToCircularFrame,
  atlasFrameIndex,
  createFrameAnimator,
} from "../src/lib/blog-pet-animator.ts";

test("atlasFrameIndex maps linear frames into atlas grid", () => {
  const manifest = { frameCount: 54, columns: 8, circular: true };
  assert.deepEqual(atlasFrameIndex(0, manifest), {
    index: 0,
    column: 0,
    row: 0,
  });
  assert.deepEqual(atlasFrameIndex(7, manifest), {
    index: 7,
    column: 7,
    row: 0,
  });
  assert.deepEqual(atlasFrameIndex(8, manifest), {
    index: 8,
    column: 0,
    row: 1,
  });
  assert.deepEqual(atlasFrameIndex(53, manifest), {
    index: 53,
    column: 5,
    row: 6,
  });
  assert.deepEqual(atlasFrameIndex(53.6, manifest), {
    index: 0,
    column: 0,
    row: 0,
  });
});

test("setProgress maps pointer progress to frame targets", () => {
  const frames = [];
  const anim = createFrameAnimator({
    frameCount: 54,
    initialFrame: 0,
    reducedMotion: true,
    render(frame) {
      frames.push(frame);
    },
  });

  anim.setProgress(0);
  assert.equal(Math.round(anim.getCurrentFrame()), 0);

  anim.setProgress(1);
  assert.equal(Math.round(anim.getCurrentFrame()), 53);

  anim.setProgress(0.5);
  assert.equal(Math.round(anim.getCurrentFrame()), 27);

  anim.destroy();
  assert.ok(frames.length >= 1);
});

test("invalidate repaints when frame index is unchanged", () => {
  const frames = [];
  const anim = createFrameAnimator({
    frameCount: 54,
    initialFrame: 20,
    reducedMotion: true,
    render(frame) {
      frames.push(frame);
    },
  });

  anim.setProgress(20 / 53);
  const countAfterSet = frames.length;
  anim.invalidate();
  assert.ok(frames.length > countAfterSet);

  anim.destroy();
});

test("setDirection maps pointer vector to circular frame target", () => {
  const anim = createFrameAnimator({
    frameCount: 54,
    circular: true,
    reducedMotion: true,
    render() {},
  });

  const start = -Math.PI * 0.75;
  anim.setDirection(1, 0, start);
  assert.ok(Math.abs(anim.getCurrentFrame() - 20.25) < 0.01);

  anim.setDirection(0, 1, start);
  assert.ok(Math.abs(anim.getCurrentFrame() - 33.75) < 0.01);

  anim.setDirection(-1, 0, start);
  assert.ok(Math.abs(anim.getCurrentFrame() - 47.25) < 0.01);

  anim.destroy();
});

test("angleToCircularFrame wraps full circle", () => {
  const start = -Math.PI * 0.75;
  const atStart = angleToCircularFrame(-1, -1, 54, start);
  const atDown = angleToCircularFrame(0, 1, 54, start);
  assert.ok(Math.abs(atStart) < 0.01);
  assert.ok(Math.abs(atDown - 33.75) < 0.01);
});

test("animated damping converges without reversing direction", () => {
  const originalRaf = globalThis.requestAnimationFrame;
  const originalCancelRaf = globalThis.cancelAnimationFrame;
  const pending = new Map();
  let nextId = 1;

  globalThis.requestAnimationFrame = (callback) => {
    const id = nextId++;
    pending.set(id, callback);
    return id;
  };
  globalThis.cancelAnimationFrame = (id) => pending.delete(id);

  const frames = [];
  const anim = createFrameAnimator({
    frameCount: 54,
    initialFrame: 0,
    circular: true,
    render(frame) {
      frames.push(frame);
    },
  });

  try {
    anim.setTarget(20);
    let now = 0;
    for (let tick = 0; pending.size && tick < 240; tick += 1) {
      const [id, callback] = pending.entries().next().value;
      pending.delete(id);
      now += 1000 / 60;
      callback(now);
    }

    assert.ok(Math.abs(anim.getCurrentFrame() - 20) < 0.01);
    assert.ok(frames.length > 2);
    assert.ok(frames.every((frame) => frame >= 0 && frame <= 20));
    assert.ok(frames.every((frame, index) => index === 0 || frame >= frames[index - 1]));
  } finally {
    anim.destroy();
    globalThis.requestAnimationFrame = originalRaf;
    globalThis.cancelAnimationFrame = originalCancelRaf;
  }
});
