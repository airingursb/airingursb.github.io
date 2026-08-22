/** Circular pointer look: subject-centered direction vector. */

export type PointerVectorInput = {
  clientX: number;
  clientY: number;
  originX: number;
  originY: number;
  deadZone?: number;
};

export type PointerVector = {
  dx: number;
  dy: number;
  inDeadZone: boolean;
};

/**
 * Angle from the panda's visual center toward the cursor.
 * The caller re-reads the subject rectangle so layout changes cannot stale it.
 */
export function computePointerVector(input: PointerVectorInput): PointerVector {
  const dx = input.clientX - input.originX;
  const dy = input.clientY - input.originY;
  const dist = Math.hypot(dx, dy);
  const deadZone = input.deadZone ?? 12;

  return {
    dx,
    dy,
    inDeadZone: dist < deadZone,
  };
}

/** Calibrate start angle so frame `downFrame` sits at pointer-down (π/2). */
export function circularStartAngle(frameCount: number, downFrame: number) {
  return Math.PI / 2 - (downFrame / frameCount) * Math.PI * 2;
}
