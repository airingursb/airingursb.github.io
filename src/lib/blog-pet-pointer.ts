/** Circular pointer look: anchor-relative vector for setDirection(). */

export type PointerVectorInput = {
  petRect: DOMRect;
  clientX: number;
  clientY: number;
  deadZone?: number;
};

export type PointerVector = {
  dx: number;
  dy: number;
  inDeadZone: boolean;
};

/** Anchor near panda head; vector points toward the cursor. */
export function computePointerVector(input: PointerVectorInput): PointerVector {
  const deadZone = input.deadZone ?? 36;
  const anchorX = input.petRect.left + input.petRect.width * 0.55;
  const anchorY = input.petRect.top + input.petRect.height * 0.38;
  const dx = input.clientX - anchorX;
  const dy = input.clientY - anchorY;
  const dist = Math.hypot(dx, dy);

  return {
    dx,
    dy,
    inDeadZone: dist < deadZone,
  };
}
