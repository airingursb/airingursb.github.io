import test from "node:test";
import assert from "node:assert/strict";
import {
  circularStartAngle,
  computePointerVector,
} from "../src/lib/blog-pet-pointer.ts";

test("computePointerVector uses the panda center as origin", () => {
  const originX = 1800;
  const originY = 960;

  const center = computePointerVector({
    clientX: originX,
    clientY: originY,
    originX,
    originY,
  });
  assert.equal(center.inDeadZone, true);

  const right = computePointerVector({
    clientX: originX + 60,
    clientY: originY,
    originX,
    originY,
    deadZone: 0,
  });
  assert.ok(right.dx > 0);
  assert.ok(Math.abs(right.dy) < 5);

  const down = computePointerVector({
    clientX: originX,
    clientY: originY + 60,
    originX,
    originY,
    deadZone: 0,
  });
  assert.ok(down.dy > 0);
});

test("circularStartAngle maps pointer-down to downFrame", () => {
  const frameCount = 54;
  const downFrame = 34;
  const start = circularStartAngle(frameCount, downFrame);
  const angle = Math.PI / 2;
  const turn = Math.PI * 2;
  const normalized = ((angle - start + turn) % turn) / turn;
  assert.ok(Math.abs(normalized * frameCount - downFrame) < 0.5);
});
