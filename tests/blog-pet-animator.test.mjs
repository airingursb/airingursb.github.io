import test from "node:test";
import assert from "node:assert/strict";
import {
  angleToCircularFrame,
  atlasFrameIndex,
  createFrameAnimator,
} from "../src/lib/blog-pet-animator.ts";

test("atlasFrameIndex maps linear frames into atlas grid", () => {
  const manifest = { frameCount: 124, columns: 12 };
  assert.deepEqual(atlasFrameIndex(0, manifest), {
    index: 0,
    column: 0,
    row: 0,
  });
  assert.deepEqual(atlasFrameIndex(11, manifest), {
    index: 11,
    column: 11,
    row: 0,
  });
  assert.deepEqual(atlasFrameIndex(12, manifest), {
    index: 12,
    column: 0,
    row: 1,
  });
  assert.deepEqual(atlasFrameIndex(123, manifest), {
    index: 123,
    column: 3,
    row: 10,
  });
});

test("setProgress maps pointer progress to frame targets", () => {
  const frames = [];
  const anim = createFrameAnimator({
    frameCount: 124,
    initialFrame: 0,
    reducedMotion: true,
    render(frame) {
      frames.push(frame);
    },
  });

  anim.setProgress(0);
  assert.equal(Math.round(anim.getCurrentFrame()), 0);

  anim.setProgress(1);
  assert.equal(Math.round(anim.getCurrentFrame()), 123);

  anim.setProgress(0.5);
  assert.equal(Math.round(anim.getCurrentFrame()), 62);

  anim.destroy();
  assert.ok(frames.length >= 1);
});

test("invalidate repaints when frame index is unchanged", () => {
  const frames = [];
  const anim = createFrameAnimator({
    frameCount: 124,
    initialFrame: 40,
    reducedMotion: true,
    render(frame) {
      frames.push(frame);
    },
  });

  anim.setProgress(40 / 123);
  const countAfterSet = frames.length;
  anim.invalidate();
  assert.ok(frames.length > countAfterSet);

  anim.destroy();
});

test("setDirection maps pointer vector to circular frame target", () => {
  const anim = createFrameAnimator({
    frameCount: 124,
    circular: true,
    reducedMotion: true,
    render() {},
  });

  anim.setDirection(1, 0, -Math.PI * 0.75);
  assert.ok(Math.abs(anim.getCurrentFrame() - 46.5) < 0.5);

  anim.destroy();
});

test("angleToCircularFrame wraps full circle", () => {
  const start = -Math.PI * 0.75;
  const atStart = angleToCircularFrame(
    Math.cos(start),
    Math.sin(start),
    124,
    start,
  );
  assert.ok(Math.abs(atStart) < 0.01);
});
