/**
 * Lightweight frame animator inspired by oil-motion's interactive-motion.
 * Maps a continuous target frame with damping; used by BlogPetWidget.
 */
export type FrameAnimator = {
  setTarget: (frame: number) => void;
  setDirection: (x: number, y: number, startAngle?: number) => void;
  getCurrentFrame: () => number;
  destroy: () => void;
};

const clamp = (v: number, min: number, max: number) =>
  Math.min(max, Math.max(min, v));

function smoothDamp(
  current: number,
  target: number,
  velocity: number,
  smoothTime: number,
  maxSpeed: number,
  dt: number,
): [number, number] {
  const st = Math.max(0.0001, smoothTime);
  const omega = 2 / st;
  const x = omega * dt;
  const exp = 1 / (1 + x + 0.48 * x * x + 0.235 * x * x * x);
  let change = current - target;
  const maxChange = maxSpeed * st;
  change = clamp(change, -maxChange, maxChange);
  const temp = (velocity + omega * change) * dt;
  const newVel = (velocity - omega * temp) * exp;
  let output = current - change + (change + temp) * exp;
  if ((target - current > 0) === (output > target)) {
    output = target;
    return [output, 0];
  }
  return [output, newVel];
}

export function createFrameAnimator(options: {
  frameCount: number;
  initialFrame?: number;
  smoothTime?: number;
  maxSpeed?: number;
  reducedMotion?: boolean;
  render: (frame: number) => void;
}): FrameAnimator {
  const frameCount = Math.max(1, Math.floor(options.frameCount));
  const smoothTime = options.smoothTime ?? 0.12;
  const maxSpeed = options.maxSpeed ?? frameCount * 3;
  const reducedMotion = options.reducedMotion ?? false;

  let position = clamp(options.initialFrame ?? 0, 0, frameCount - 1);
  let target = position;
  let velocity = 0;
  let lastFrame = -1;
  let lastTime = 0;
  let raf = 0;
  let destroyed = false;

  const paint = () => {
    const frame = Math.round(clamp(position, 0, frameCount - 1));
    if (frame !== lastFrame) {
      options.render(frame);
      lastFrame = frame;
    }
  };

  const loop = (now: number) => {
    raf = 0;
    if (destroyed) return;
    const dt = lastTime ? Math.min((now - lastTime) / 1000, 1 / 30) : 1 / 60;
    lastTime = now;
    if (reducedMotion) {
      position = target;
      velocity = 0;
    } else {
      [position, velocity] = smoothDamp(
        position,
        target,
        velocity,
        smoothTime,
        maxSpeed,
        dt,
      );
    }
    paint();
    if (Math.abs(target - position) > 0.002 || Math.abs(velocity) > 0.002) {
      raf = requestAnimationFrame(loop);
    }
  };

  const schedule = () => {
    if (!raf && !destroyed) raf = requestAnimationFrame(loop);
  };

  paint();

  return {
    setTarget(frame: number) {
      target = clamp(frame, 0, frameCount - 1);
      if (reducedMotion) {
        position = target;
        velocity = 0;
        paint();
        return;
      }
      schedule();
    },
    setDirection(x: number, y: number, _startAngle = -Math.PI) {
      // Atlas order: 0=look-left, 1=front, 2=look-right
      // Horizontal dominance for the 3-frame linear atlas.
      const t = clamp((x + 1) / 2, 0, 1); // -1..1 → 0..1
      this.setTarget(t * (frameCount - 1));
    },
    getCurrentFrame() {
      return clamp(position, 0, frameCount - 1);
    },
    destroy() {
      destroyed = true;
      if (raf) cancelAnimationFrame(raf);
      raf = 0;
    },
  };
}

export function applyAtlasFrame(
  el: HTMLElement,
  frame: number,
  frameCount: number,
) {
  const n = Math.max(1, frameCount);
  const i = clamp(Math.round(frame), 0, n - 1);
  el.style.backgroundSize = `${n * 100}% 100%`;
  el.style.backgroundPosition =
    n === 1 ? "0% 0%" : `${(i / (n - 1)) * 100}% 0%`;
}
