/**
 * oil-motion pilot runtime helpers for BlogPetWidget.
 * Frame damping + sprite-atlas canvas rendering (124-frame scrub).
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
};

export type FrameAnimator = {
  setTarget: (frame: number) => void;
  setProgress: (progress: number) => void;
  getCurrentFrame: () => number;
  /** Force a paint even when the rounded frame index is unchanged (e.g. direction swap). */
  invalidate: () => void;
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
  const newVel = (velocity - omega * change) * exp;
  let output = current - change + (change + temp) * exp;
  if ((target - current > 0) === (output > target)) {
    output = target;
    return [output, 0];
  }
  return [output, newVel];
}

export function atlasFrameIndex(
  frame: number,
  manifest: Pick<AtlasManifest, "frameCount" | "columns">,
) {
  const index = clamp(Math.round(frame), 0, manifest.frameCount - 1);
  return {
    index,
    column: index % manifest.columns,
    row: Math.floor(index / manifest.columns),
  };
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
  const smoothTime = options.smoothTime ?? 0.1;
  const maxSpeed = options.maxSpeed ?? frameCount * 4;
  const reducedMotion = options.reducedMotion ?? false;

  let position = clamp(options.initialFrame ?? 0, 0, frameCount - 1);
  let target = position;
  let velocity = 0;
  let lastFrame = -1;
  let lastTime = 0;
  let raf = 0;
  let destroyed = false;

  let forcePaint = true;

  const paint = () => {
    const frame = Math.round(clamp(position, 0, frameCount - 1));
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
      target = clamp(frame, 0, frameCount - 1);
      if (reducedMotion) {
        position = target;
        velocity = 0;
        paint();
        return;
      }
      schedule();
    },
    setProgress(progress: number) {
      this.setTarget(clamp(progress, 0, 1) * (frameCount - 1));
    },
    getCurrentFrame() {
      return clamp(position, 0, frameCount - 1);
    },
    invalidate() {
      forcePaint = true;
      paint();
      if (!reducedMotion && (Math.abs(target - position) > 0.002 || Math.abs(velocity) > 0.002)) {
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

export type DirectionAtlasClip = {
  id: string;
  manifest: AtlasManifest;
  image: HTMLImageElement;
};

export function createOmniAtlasRenderer(options: {
  canvas: HTMLCanvasElement;
  clips: DirectionAtlasClip[];
}) {
  const ctx = options.canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas 2D unavailable");

  const clipMap = new Map(options.clips.map((c) => [c.id, c]));
  let activeId = options.clips[0]?.id ?? "right";

  const resize = () => {
    const css = options.canvas.clientWidth || 144;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    options.canvas.width = Math.round(css * dpr);
    options.canvas.height = Math.round(css * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  };

  const render = (directionId: string, frame: number) => {
    const clip = clipMap.get(directionId) ?? clipMap.get(activeId);
    if (!clip) return;
    activeId = clip.id;

    const { column, row } = atlasFrameIndex(frame, clip.manifest);
    const css = options.canvas.clientWidth || 144;
    ctx.clearRect(0, 0, css, css);
    ctx.drawImage(
      clip.image,
      column * clip.manifest.cellWidth,
      row * clip.manifest.cellHeight,
      clip.manifest.cellWidth,
      clip.manifest.cellHeight,
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
