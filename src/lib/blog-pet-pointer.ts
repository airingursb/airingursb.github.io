/** 8-way pointer look: pick clip + scrub progress from pointer vs pet anchor. */

export type BlogPetDirectionId =
  | "right"
  | "top-right"
  | "top"
  | "top-left"
  | "left"
  | "bottom-left"
  | "bottom"
  | "bottom-right";

export const BLOG_PET_DIRECTIONS: ReadonlyArray<{
  id: BlogPetDirectionId;
  angle: number;
}> = [
  { id: "right", angle: 0 },
  { id: "bottom-right", angle: Math.PI / 4 },
  { id: "bottom", angle: Math.PI / 2 },
  { id: "bottom-left", angle: (3 * Math.PI) / 4 },
  { id: "left", angle: Math.PI },
  { id: "top-left", angle: (-3 * Math.PI) / 4 },
  { id: "top", angle: -Math.PI / 2 },
  { id: "top-right", angle: -Math.PI / 4 },
];

const TAU = Math.PI * 2;

const clamp = (v: number, min: number, max: number) =>
  Math.min(max, Math.max(min, v));

export function normalizeAngle(angle: number) {
  let a = angle % TAU;
  if (a > Math.PI) a -= TAU;
  if (a < -Math.PI) a += TAU;
  return a;
}

export function pickDirection(angle: number): BlogPetDirectionId {
  let best = BLOG_PET_DIRECTIONS[0];
  let bestDelta = Infinity;
  for (const entry of BLOG_PET_DIRECTIONS) {
    const delta = Math.abs(normalizeAngle(angle - entry.angle));
    if (delta < bestDelta) {
      bestDelta = delta;
      best = entry;
    }
  }
  return best.id;
}

export type PointerLookInput = {
  petRect: DOMRect;
  clientX: number;
  clientY: number;
  maxDistance: number;
  deadZone?: number;
};

export type PointerLookState = {
  directionId: BlogPetDirectionId;
  progress: number;
};

/** Anchor near panda head; distance → scrub progress (sqrt easing). */
export function computePointerLook(input: PointerLookInput): PointerLookState {
  const { petRect, clientX, clientY, maxDistance } = input;
  const deadZone = input.deadZone ?? 28;

  const anchorX = petRect.left + petRect.width * 0.55;
  const anchorY = petRect.top + petRect.height * 0.38;
  const dx = clientX - anchorX;
  const dy = clientY - anchorY;
  const dist = Math.hypot(dx, dy);

  if (dist < deadZone) {
    return { directionId: "right", progress: 0 };
  }

  const angle = Math.atan2(dy, dx);
  const directionId = pickDirection(angle);
  const normalized = clamp(dist / Math.max(1, maxDistance), 0, 1);
  const progress = Math.sqrt(normalized);

  return { directionId, progress };
}

export function defaultLookMaxDistance() {
  return Math.min(window.innerWidth, window.innerHeight) * 0.42;
}
