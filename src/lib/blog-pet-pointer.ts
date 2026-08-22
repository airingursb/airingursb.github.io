/** Circular pointer look: viewport-centered direction vector. */

export type PointerVectorInput = {
  clientX: number;
  clientY: number;
  viewportWidth: number;
  viewportHeight: number;
  deadZone?: number;
};

export type PointerVector = {
  dx: number;
  dy: number;
  inDeadZone: boolean;
};

/**
 * Angle from viewport center toward the cursor.
 * Pet sits in a corner — pet-local vectors cannot reach right/down on screen;
 * screen-center origin matches oil-motion circular pointer look.
 */
export function computePointerVector(input: PointerVectorInput): PointerVector {
  const originX = input.viewportWidth * 0.5;
  const originY = input.viewportHeight * 0.45;
  const dx = input.clientX - originX;
  const dy = input.clientY - originY;
  const dist = Math.hypot(dx, dy);
  const deadZone =
    input.deadZone ??
    Math.min(input.viewportWidth, input.viewportHeight) * 0.06;

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
