/**
 * oil-motion runtime helpers for BlogPetWidget.
 * Circular frame damping + sprite-atlas canvas rendering.
 */

export type AtlasManifest = {
  asset: string;
  frameCount: number;
  columns: number;
  rows: number;
  cellWidth: number;
  cellHeight: number;
  atlasWidth: number;
  atlasHeight: number;
  parameterSpace?: "circular" | "linear";
  circular?: boolean;
  initialFrame?: number;
  startAngleRadians?: number;
  fallback?: string;
};

export type FrameAnimator = {
  setTarget: (frame: number) => void;
  setProgress: (progress: number) => void;
  setDirection: (x: number, y: number, startAngle?: number) => void;
  getCurrentFrame: () => number;
  invalidate: () => void;
  destroy: () => void;
};

const clamp = (v: number, min: number, max: number) =>
  Math.min(max, Math.max(min, v));

const wrap = (value: number, length: number) =>
  ((value % length) + length) % length;

const shortestCircularDelta = (
  from: number,
  to: number,
  frameCount: number,
) => {
  let delta = wrap(to, frameCount) - wrap(from, frameCount);
  if (delta > frameCount / 2) delta -= frameCount;
  if (delta < -frameCount / 2) delta += frameCount;
  return delta;
};

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
  const originalTarget = target;
  let change = current - target;
  const maxChange = maxSpeed * st;
  change = clamp(change, -maxChange, maxChange);
  const limitedTarget = current - change;
  const temp = (velocity + omega * change) * dt;
  const newVel = (velocity - omega * temp) * exp;
  let output = limitedTarget + (change + temp) * exp;
  if ((originalTarget - current > 0) === (output > originalTarget)) {
    output = originalTarget;
    return [output, 0];
  }
  return [output, newVel];
}

export function atlasFrameIndex(
  frame: number,
  manifest: Pick<AtlasManifest, "frameCount" | "columns" | "circular">,
) {
  const rounded = Math.round(frame);
  const index = manifest.circular
    ? wrap(rounded, manifest.frameCount)
    : clamp(rounded, 0, manifest.frameCount - 1);
  return {
    index,
    column: index % manifest.columns,
    row: Math.floor(index / manifest.columns),
  };
}

export function angleToCircularFrame(
  x: number,
  y: number,
  frameCount: number,
  startAngle = -Math.PI * 0.75,
) {
  const angle = Math.atan2(y, x);
  const turn = Math.PI * 2;
  const normalized = ((angle - startAngle + turn) % turn) / turn;
  return normalized * frameCount;
}

export function createFrameAnimator(options: {
  frameCount: number;
  initialFrame?: number;
  circular?: boolean;
  smoothTime?: number;
  maxSpeed?: number;
  reducedMotion?: boolean;
  render: (frame: number) => void;
}): FrameAnimator {
  const frameCount = Math.max(1, Math.floor(options.frameCount));
  const circular = options.circular ?? false;
  const smoothTime = options.smoothTime ?? 0.11;
  const maxSpeed = options.maxSpeed ?? frameCount * 2;
  const reducedMotion = options.reducedMotion ?? false;

  const normalizeFrame = (frame: number) =>
    circular ? wrap(frame, frameCount) : clamp(frame, 0, frameCount - 1);

  let position = normalizeFrame(options.initialFrame ?? 0);
  let target = position;
  let velocity = 0;
  let lastFrame = -1;
  let lastTime = 0;
  let raf = 0;
  let destroyed = false;
  let forcePaint = true;

  const paint = () => {
    const rounded = Math.round(normalizeFrame(position));
    const frame = circular ? wrap(rounded, frameCount) : rounded;
    if (forcePaint || frame !== lastFrame) {
      options.render(frame);
      lastFrame = frame;
      forcePaint = false;
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
      const normalized = normalizeFrame(frame);
      target = circular
        ? position + shortestCircularDelta(position, normalized, frameCount)
        : normalized;
      if (reducedMotion) {
        position = target;
        velocity = 0;
        paint();
        return;
      }
      schedule();
    },
    setDirection(x: number, y: number, startAngle = -Math.PI * 0.75) {
      this.setTarget(angleToCircularFrame(x, y, frameCount, startAngle));
    },
    setProgress(progress: number) {
      this.setTarget(clamp(progress, 0, 1) * (frameCount - 1));
    },
    getCurrentFrame() {
      return normalizeFrame(position);
    },
    invalidate() {
      forcePaint = true;
      paint();
      if (
        !reducedMotion &&
        (Math.abs(target - position) > 0.002 || Math.abs(velocity) > 0.002)
      ) {
        schedule();
      }
    },
    destroy() {
      destroyed = true;
      if (raf) cancelAnimationFrame(raf);
      raf = 0;
    },
  };
}

export function createAtlasRenderer(options: {
  canvas: HTMLCanvasElement;
  image: HTMLImageElement;
  manifest: AtlasManifest;
}) {
  const ctx = options.canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas 2D unavailable");

  const resize = () => {
    const css = options.canvas.clientWidth || 144;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    options.canvas.width = Math.round(css * dpr);
    options.canvas.height = Math.round(css * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  };

  const render = (frame: number) => {
    const { column, row } = atlasFrameIndex(frame, options.manifest);
    const css = options.canvas.clientWidth || 144;
    ctx.clearRect(0, 0, css, css);
    ctx.drawImage(
      options.image,
      column * options.manifest.cellWidth,
      row * options.manifest.cellHeight,
      options.manifest.cellWidth,
      options.manifest.cellHeight,
      0,
      0,
      css,
      css,
    );
  };

  resize();

  return {
    render,
    resize,
    destroy() {
      ctx.clearRect(0, 0, options.canvas.width, options.canvas.height);
    },
  };
}
