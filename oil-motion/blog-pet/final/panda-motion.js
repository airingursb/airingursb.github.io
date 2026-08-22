const TAU = Math.PI * 2;

const wrap = (value, length) => ((value % length) + length) % length;

function shortestCircularDelta(from, to, frameCount) {
  let delta = wrap(to, frameCount) - wrap(from, frameCount);
  if (delta > frameCount / 2) delta -= frameCount;
  if (delta < -frameCount / 2) delta += frameCount;
  return delta;
}

function createCircularAnimator({ frameCount, initialFrame = 0, render }) {
  let position = initialFrame;
  let target = initialFrame;
  let velocity = 0;
  let raf = 0;
  let lastTime = 0;
  let lastFrame = -1;
  const smoothTime = 0.11;
  const maxSpeed = frameCount * 2;

  const draw = () => {
    const frame = Math.round(wrap(position, frameCount)) % frameCount;
    if (frame !== lastFrame) {
      render(frame);
      lastFrame = frame;
    }
  };

  const tick = (now) => {
    raf = 0;
    const dt = lastTime ? Math.min((now - lastTime) / 1000, 1 / 30) : 1 / 60;
    lastTime = now;
    const omega = 2 / smoothTime;
    const x = omega * dt;
    const decay = 1 / (1 + x + 0.48 * x * x + 0.235 * x * x * x);
    const change = Math.max(-maxSpeed * smoothTime, Math.min(maxSpeed * smoothTime, position - target));
    const limitedTarget = position - change;
    const temp = (velocity + omega * change) * dt;
    velocity = (velocity - omega * temp) * decay;
    position = limitedTarget + (change + temp) * decay;
    draw();
    if (Math.abs(target - position) > 0.002 || Math.abs(velocity) > 0.002) {
      raf = requestAnimationFrame(tick);
    }
  };

  const schedule = () => {
    if (!raf) raf = requestAnimationFrame(tick);
  };

  draw();
  return {
    setDirection(dx, dy, startAngle) {
      const angle = Math.atan2(dy, dx);
      const progress = wrap(angle - startAngle, TAU) / TAU;
      const frame = progress * frameCount;
      target = position + shortestCircularDelta(position, frame, frameCount);
      schedule();
    },
    destroy() {
      if (raf) cancelAnimationFrame(raf);
    },
  };
}

export async function mountPandaMotion(element, manifestUrl = "./panda-circular.json") {
  const manifestHref = new URL(manifestUrl, document.baseURI);
  const manifest = await fetch(manifestHref).then((response) => response.json());
  const assetUrl = new URL(manifest.asset, manifestHref);
  const fallbackUrl = new URL(manifest.fallback, manifestHref);
  const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;

  element.style.width = "240px";
  element.style.height = "240px";
  element.style.backgroundRepeat = "no-repeat";
  element.style.backgroundColor = "transparent";

  if (reducedMotion) {
    element.style.backgroundImage = `url(${fallbackUrl})`;
    element.style.backgroundSize = "contain";
    element.style.backgroundPosition = "center";
    return () => {};
  }

  const atlas = new Image();
  atlas.src = assetUrl;
  await atlas.decode();
  element.style.backgroundImage = `url(${assetUrl})`;
  element.style.backgroundSize = `${manifest.columns * 100}% ${manifest.rows * 100}%`;

  const render = (frame) => {
    const column = frame % manifest.columns;
    const row = Math.floor(frame / manifest.columns);
    const x = manifest.columns === 1 ? 0 : (column / (manifest.columns - 1)) * 100;
    const y = manifest.rows === 1 ? 0 : (row / (manifest.rows - 1)) * 100;
    element.style.backgroundPosition = `${x}% ${y}%`;
  };

  const animator = createCircularAnimator({
    frameCount: manifest.frameCount,
    initialFrame: manifest.initialFrame,
    render,
  });

  const onPointerMove = (event) => {
    const rect = element.getBoundingClientRect();
    const dx = event.clientX - (rect.left + rect.width / 2);
    const dy = event.clientY - (rect.top + rect.height / 2);
    if (Math.hypot(dx, dy) < 12) return;
    animator.setDirection(dx, dy, manifest.startAngleRadians);
  };

  window.addEventListener("pointermove", onPointerMove, { passive: true });
  return () => {
    window.removeEventListener("pointermove", onPointerMove);
    animator.destroy();
  };
}
