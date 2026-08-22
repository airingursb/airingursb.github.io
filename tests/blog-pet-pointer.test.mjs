import test from "node:test";
import assert from "node:assert/strict";
import {
  computePointerLook,
  normalizeAngle,
  pickDirection,
} from "../src/lib/blog-pet-pointer.ts";

const petRect = {
  left: 16,
  top: 500,
  width: 144,
  height: 144,
  right: 160,
  bottom: 644,
  x: 16,
  y: 500,
  toJSON() {
    return {};
  },
};

test("normalizeAngle wraps to [-π, π]", () => {
  assert.ok(Math.abs(normalizeAngle(Math.PI * 2)) < 0.001);
  assert.ok(Math.abs(normalizeAngle(-Math.PI * 2)) < 0.001);
  assert.ok(Math.abs(normalizeAngle(Math.PI * 3) - Math.PI) < 0.001);
});

test("pickDirection selects 8 compass sectors", () => {
  assert.equal(pickDirection(0), "right");
  assert.equal(pickDirection(Math.PI / 4), "bottom-right");
  assert.equal(pickDirection(Math.PI / 2), "bottom");
  assert.equal(pickDirection((3 * Math.PI) / 4), "bottom-left");
  assert.equal(pickDirection(Math.PI), "left");
  assert.equal(pickDirection((-3 * Math.PI) / 4), "top-left");
  assert.equal(pickDirection(-Math.PI / 2), "top");
  assert.equal(pickDirection(-Math.PI / 4), "top-right");
});

test("computePointerLook returns rest pose inside dead zone", () => {
  const anchorX = petRect.left + petRect.width * 0.55;
  const anchorY = petRect.top + petRect.height * 0.38;

  const look = computePointerLook({
    petRect,
    clientX: anchorX,
    clientY: anchorY,
    maxDistance: 400,
    deadZone: 28,
  });

  assert.equal(look.directionId, "right");
  assert.equal(look.progress, 0);
});

test("computePointerLook maps distance with quadratic progress", () => {
  const anchorX = petRect.left + petRect.width * 0.55;
  const anchorY = petRect.top + petRect.height * 0.38;
  const maxDistance = 400;

  const full = computePointerLook({
    petRect,
    clientX: anchorX + maxDistance,
    clientY: anchorY,
    maxDistance,
    deadZone: 0,
  });
  assert.equal(full.directionId, "right");
  assert.ok(Math.abs(full.progress - 1) < 0.001);

  const half = computePointerLook({
    petRect,
    clientX: anchorX + maxDistance * 0.5,
    clientY: anchorY,
    maxDistance,
    deadZone: 0,
  });
  assert.ok(Math.abs(half.progress - 0.25) < 0.001);
});

test("computePointerLook picks upward direction", () => {
  const anchorX = petRect.left + petRect.width * 0.55;
  const anchorY = petRect.top + petRect.height * 0.38;

  const look = computePointerLook({
    petRect,
    clientX: anchorX,
    clientY: anchorY - 300,
    maxDistance: 400,
    deadZone: 0,
  });

  assert.equal(look.directionId, "top");
  assert.ok(look.progress > 0.5);
});
