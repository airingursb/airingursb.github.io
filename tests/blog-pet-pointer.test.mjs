import test from "node:test";
import assert from "node:assert/strict";
import {
  circularStartAngle,
  computePointerVector,
} from "../src/lib/blog-pet-pointer.ts";

test("computePointerVector uses viewport center origin", () => {
  const w = 1920;
  const h = 1080;
  const originX = w * 0.5;
  const originY = h * 0.45;

  const center = computePointerVector({
    clientX: originX,
    clientY: originY,
    viewportWidth: w,
    viewportHeight: h,
  });
  assert.equal(center.inDeadZone, true);

  const right = computePointerVector({
    clientX: w - 10,
    clientY: originY,
    viewportWidth: w,
    viewportHeight: h,
    deadZone: 0,
  });
  assert.ok(right.dx > 0);
  assert.ok(Math.abs(right.dy) < 5);

  const down = computePointerVector({
    clientX: originX,
    clientY: h - 10,
    viewportWidth: w,
    viewportHeight: h,
    deadZone: 0,
  });
  assert.ok(down.dy > 0);
});

test("circularStartAngle maps pointer-down to downFrame", () => {
  const frameCount = 124;
  const downFrame = 65;
  const start = circularStartAngle(frameCount, downFrame);
  const angle = Math.PI / 2;
  const turn = Math.PI * 2;
  const normalized = ((angle - start + turn) % turn) / turn;
  assert.ok(Math.abs(normalized * frameCount - downFrame) < 0.5);
});
