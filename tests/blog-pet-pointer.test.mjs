import test from "node:test";
import assert from "node:assert/strict";
import {
  angleToCircularFrame,
  createFrameAnimator,
} from "../src/lib/blog-pet-animator.ts";
import { computePointerVector } from "../src/lib/blog-pet-pointer.ts";

const petRect = {
  left: 1600,
  top: 700,
  width: 144,
  height: 144,
  right: 1744,
  bottom: 844,
  x: 1600,
  y: 700,
  toJSON() {
    return {};
  },
};

test("computePointerVector marks dead zone near anchor", () => {
  const anchorX = petRect.left + petRect.width * 0.55;
  const anchorY = petRect.top + petRect.height * 0.38;

  const near = computePointerVector({
    petRect,
    clientX: anchorX,
    clientY: anchorY,
  });
  assert.equal(near.inDeadZone, true);

  const far = computePointerVector({
    petRect,
    clientX: 100,
    clientY: 400,
    deadZone: 0,
  });
  assert.equal(far.inDeadZone, false);
  assert.ok(far.dx < 0);
});

test("angleToCircularFrame maps right to 3/8 of the loop", () => {
  const frame = angleToCircularFrame(1, 0, 124, -Math.PI * 0.75);
  assert.ok(Math.abs(frame - 46.5) < 0.01);
});

test("circular animator takes shortest path around the loop", () => {
  const frames = [];
  const anim = createFrameAnimator({
    frameCount: 124,
    initialFrame: 2,
    circular: true,
    reducedMotion: true,
    render(frame) {
      frames.push(frame);
    },
  });

  anim.setTarget(120);
  assert.equal(Math.round(anim.getCurrentFrame()), 120);

  anim.setTarget(4);
  assert.equal(Math.round(anim.getCurrentFrame()), 4);

  anim.destroy();
});
