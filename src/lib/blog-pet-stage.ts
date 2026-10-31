/**
 * IP panda companion, DOM half: the close and react layers stacked on the
 * gaze canvas of BlogPetWidget (desktop only). Timeline and queue rules live
 * in blog-pet-motion.ts.
 *
 * - End of article: turn to the down frame → close once → close-rest loop;
 *   leaving reverses the close at 3× and hands back to the gaze.
 * - Poke (click / Enter / Space on opaque pixels): turn to frame 0 → one
 *   reaction → gaze. One poke may wait; five in two seconds = dizzy. During
 *   the close the panda only nods (a small squash).
 */
import type { AtlasManifest, FrameAnimator } from "./blog-pet-animator.ts";
import type { EditorialManifest } from "./editorial-actor-assets.ts";
import {
  DIZZY, HIT_ALPHA, IP_PANDA_BASE, IP_PANDA_DOWN_FRAME,
  cellOrigin, cellPoint, chooseReaction, circularDelta, closeFrame, endZone,
  initialPokes, queueReaction, registerPoke, stepClose, wrapFrame,
  type CloseClock, type ReactionRequest,
} from "./blog-pet-motion.ts";

type Stage = "gaze" | "turning" | "closing" | "rest" | "opening" | "aligning" | "react";
type Layer = "gaze" | "close" | "react";
type Atlas = { image: HTMLImageElement; frames: number; columns: number; width: number; height: number };
type Reactions = { clips: Map<string, Atlas>; fps: number; pool: string[] };

export type BlogPetStageOptions = {
  readonly root: HTMLElement;
  readonly canvas: HTMLCanvasElement;
  readonly image: HTMLImageElement;
  readonly atlas: AtlasManifest;
  readonly animator: FrameAnimator;
  readonly startAngle: number;
};

const CLOSE_STATES = new Set<Stage>(["turning", "closing", "rest", "opening"]);
const ALIGN_TIMEOUT_MS = 2000;
const TURN_TIMEOUT_MS = 1500;

/** The like card at the article foot; the closing date stamp when there is none. */
const endMarker = () => document.querySelector<HTMLElement>("[data-article-like]") ?? document.querySelector<HTMLElement>(".article-coda");

export function createBlogPetStage(o: BlogPetStageOptions): () => void {
  const { root, canvas, image, atlas, animator } = o;
  const frameCount = atlas.frameCount;
  const listeners = new AbortController();
  const signal = listeners.signal;
  const desktop = matchMedia("(min-width: 1101px)");

  const layer = (name: string) => {
    const c = document.createElement("canvas");
    c.className = `blog-pet-layer blog-pet-layer--${name}`;
    c.setAttribute("aria-hidden", "true");
    root.append(c);
    return c;
  };
  const closeCanvas = layer("close");
  const reactCanvas = layer("react");
  const closeContext = closeCanvas.getContext("2d");
  const reactContext = reactCanvas.getContext("2d");
  const probe = document.createElement("canvas");
  probe.width = probe.height = 1;
  const probeContext = probe.getContext("2d", { willReadFrequently: true });

  let stage: Stage = "gaze";
  let disposed = false;
  let css = 144;
  let pointer: { x: number; y: number } | null = null;
  let shown: Layer = "gaze";
  // What the visible layer currently draws, for the alpha hit test.
  let drawn: { image: HTMLImageElement; x: number; y: number; w: number; h: number } | null = null;

  // Close layer
  let close: { clip: Atlas; rest: Atlas | null; fps: number } | null = null;
  let closeLoad: Promise<void> | null = null;
  let clock: CloseClock = { phase: "closing", pos: 0, rest: 0 };
  let closeFrameRequest = 0;
  let closeTime = 0;
  let wantClose = false;

  // React layer
  let reactions: Reactions | null = null;
  let reactLoad: Promise<Reactions> | null = null;
  let pokes = initialPokes;
  let pending: ReactionRequest | null = null;
  let current: { name: string; request: ReactionRequest } | null = null;
  let alignRequest: ReactionRequest | null = null;
  let lastReaction: string | null = null;
  let reactFrameRequest = 0;
  let reactElapsed = 0;
  let reactTime: number | null = null;
  let ackTimer = 0;

  const hold = (on: boolean) => {
    if (on) root.dataset.petHold = "true";
    else delete root.dataset.petHold;
  };
  const show = (next: Layer) => {
    shown = next;
    closeCanvas.classList.toggle("is-on", next === "close");
    reactCanvas.classList.toggle("is-on", next === "react");
    root.classList.toggle("is-layered", next !== "gaze");
    root.dataset.petLayer = next;
  };
  const size = () => {
    css = canvas.clientWidth || 144;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    for (const [c, ctx] of [[closeCanvas, closeContext], [reactCanvas, reactContext]] as const) {
      c.width = Math.round(css * dpr);
      c.height = Math.round(css * dpr);
      ctx?.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    if (shown === "close") drawClose();
  };
  const paint = (ctx: CanvasRenderingContext2D | null, source: HTMLImageElement, frame: number, columns: number, w: number, h: number) => {
    if (!ctx) return;
    const at = cellOrigin(frame, columns, w, h);
    ctx.clearRect(0, 0, css, css);
    ctx.drawImage(source, at.x, at.y, w, h, 0, 0, css, css);
    drawn = { image: source, x: at.x, y: at.y, w, h };
  };

  const resumeGaze = () => {
    hold(false);
    if (!pointer) return;
    const r = canvas.getBoundingClientRect();
    const dx = pointer.x - (r.left + r.width / 2);
    const dy = pointer.y - (r.top + r.height / 2);
    if (Math.hypot(dx, dy) > r.width * 0.08) animator.setDirection(dx, dy, o.startAngle);
  };
  // Resolve once the gaze has damped onto `frame` (or after a timeout).
  const turnTo = (frame: number, timeout: number, still: () => boolean) => new Promise<boolean>((resolve) => {
    animator.setTarget(frame);
    const start = performance.now();
    const wait = (now: number) => {
      if (disposed || !still()) return resolve(false);
      if (Math.abs(circularDelta(animator.getCurrentFrame(), frame, frameCount)) < 0.05 || now - start > timeout) return resolve(true);
      requestAnimationFrame(wait);
    };
    requestAnimationFrame(wait);
  });

  // ───────────────────────── close ─────────────────────────
  const atlasOf = (manifest: EditorialManifest, image: HTMLImageElement, name: string): Atlas | null => {
    const clip = manifest.clips[name];
    if (!clip) return null;
    if (image.naturalWidth < manifest.width * manifest.columns || image.naturalHeight < manifest.height * Math.ceil(clip.frames / manifest.columns)) return null;
    return { image, frames: clip.frames, columns: manifest.columns, width: manifest.width, height: manifest.height };
  };
  const loadClose = () => {
    closeLoad ??= (async () => {
      const assets = await import("./editorial-actor-assets.ts");
      const url = new URL(`${IP_PANDA_BASE}close/manifest.json`, location.href).href;
      const manifest = await assets.loadEditorialManifest(url);
      const clip = manifest?.clips.close;
      if (!manifest || !clip) throw new Error("close manifest");
      const restName = clip.rest ?? "close-rest";
      const restClip = manifest.clips[restName];
      const [main, rest] = await Promise.all([
        assets.loadEditorialAtlas(new URL(clip.asset, url).href),
        restClip ? assets.loadEditorialAtlas(new URL(restClip.asset, url).href) : Promise.resolve(null),
      ]);
      const mainAtlas = main && atlasOf(manifest, main, "close");
      if (!mainAtlas) throw new Error("close atlas");
      close = { clip: mainAtlas, rest: rest ? atlasOf(manifest, rest, restName) : null, fps: manifest.fps };
      if (!disposed) sync();
    })().catch(() => { closeLoad = null; });
    return closeLoad;
  };
  const drawClose = () => {
    if (!close) return;
    const resting = clock.phase === "rest" && close.rest;
    const atlasNow = resting ? close.rest! : close.clip;
    const frame = closeFrame(clock, close.clip, close.rest?.frames ?? 0);
    paint(closeContext, atlasNow.image, frame, atlasNow.columns, atlasNow.width, atlasNow.height);
    root.dataset.petFrame = `${resting ? "rest" : "close"}:${frame}`;
  };
  const tickClose = (now: number) => {
    closeFrameRequest = 0;
    if (!close || (stage !== "closing" && stage !== "rest" && stage !== "opening")) return;
    const dt = closeTime ? Math.min((now - closeTime) / 1000, 1 / 20) : 1 / 60;
    closeTime = now;
    const next = stepClose(clock, { frames: close.clip.frames, fps: close.fps, hasRest: !!close.rest }, dt);
    clock = { phase: next.phase, pos: next.pos, rest: next.rest };
    if (next.phase === "rest") stage = "rest";
    drawClose();
    if (next.opened) return opened();
    if (next.settled) return;
    closeFrameRequest = requestAnimationFrame(tickClose);
  };
  const runClose = () => {
    if (closeFrameRequest) return;
    closeTime = 0;
    closeFrameRequest = requestAnimationFrame(tickClose);
  };
  const arrive = () => {
    if (!close) return;
    if (stage === "aligning" || stage === "react") { wantClose = true; return; }
    if (stage === "opening") { stage = "closing"; clock.phase = "closing"; runClose(); return; }
    if (stage !== "gaze") return;
    stage = "turning";
    hold(true);
    void turnTo(IP_PANDA_DOWN_FRAME, TURN_TIMEOUT_MS, () => stage === "turning").then((ok) => {
      if (!ok || stage !== "turning") return;
      stage = "closing";
      clock = { phase: "closing", pos: 0, rest: 0 };
      drawClose();
      show("close");
      runClose();
    });
  };
  const leave = () => {
    wantClose = false;
    if (stage === "turning") { stage = "gaze"; resumeGaze(); return; }
    if (stage === "closing" || stage === "rest") {
      // From the loop: reverse from the last close frame.
      if (stage === "rest" && close) clock.pos = close.clip.frames - 1;
      stage = "opening";
      clock.phase = "opening";
      runClose();
    }
  };
  const opened = () => {
    animator.setTarget(IP_PANDA_DOWN_FRAME);
    show("gaze");
    stage = "gaze";
    resumeGaze();
    sync();
  };

  // ───────────────────────── react ─────────────────────────
  const loadReactions = (): Promise<Reactions> => {
    if (reactLoad) return reactLoad;
    const load = (async (): Promise<Reactions> => {
      const assets = await import("./editorial-actor-assets.ts");
      const url = new URL(`${IP_PANDA_BASE}react/manifest.json`, location.href).href;
      const manifest = await assets.loadEditorialManifest(url);
      if (!manifest) throw new Error("react manifest");
      const names = Object.keys(manifest.clips);
      const images = await Promise.all(names.map((name) => assets.loadEditorialAtlas(new URL(manifest.clips[name].asset, url).href)));
      const clips = new Map<string, Atlas>();
      names.forEach((name, i) => {
        const a = images[i] && atlasOf(manifest, images[i]!, name);
        if (a) clips.set(name, a);
      });
      const pool = [...clips.keys()].filter((name) => name !== DIZZY);
      if (!pool.length) throw new Error("react atlas");
      const ready: Reactions = { clips, fps: manifest.fps, pool };
      reactions = ready;
      return ready;
    })();
    reactLoad = load;
    load.catch(() => { if (reactLoad === load) reactLoad = null; });
    return load;
  };
  const ack = () => {
    root.classList.remove("is-ack");
    void root.offsetWidth;
    root.classList.add("is-ack");
    clearTimeout(ackTimer);
    ackTimer = window.setTimeout(() => root.classList.remove("is-ack"), 360);
  };
  const drawReaction = (frame: number) => {
    if (!reactions || !current) return;
    const clip = reactions.clips.get(current.name)!;
    // First and last frames are gaze frame 0, drawn from the gaze atlas for a seamless hand-off.
    if (frame <= 0 || frame >= clip.frames - 1) paint(reactContext, image, IP_PANDA_DOWN_FRAME, atlas.columns, atlas.cellWidth, atlas.cellHeight);
    else paint(reactContext, clip.image, frame, clip.columns, clip.width, clip.height);
    root.dataset.petFrame = `${current.name}:${frame}`;
  };
  const begin = (request: ReactionRequest) => {
    if (!reactions) return;
    const name = request.name && reactions.clips.has(request.name) ? request.name : chooseReaction(reactions.pool, lastReaction);
    if (!name) return;
    current = { name, request };
    lastReaction = name;
    stage = "react";
    reactElapsed = 0;
    reactTime = null;
    root.dataset.petReaction = name;
    root.dataset.petReactions = String(Number(root.dataset.petReactions || 0) + 1);
    drawReaction(0);
    show("react");
    if (!reactFrameRequest) reactFrameRequest = requestAnimationFrame(tickReaction);
  };
  const tickReaction = (now: number) => {
    reactFrameRequest = 0;
    if (stage !== "react" || !current || !reactions) return;
    if (reactTime !== null) reactElapsed += Math.min((now - reactTime) / 1000, 0.1);
    reactTime = now;
    const clip = reactions.clips.get(current.name)!;
    const frame = Math.floor(reactElapsed * reactions.fps);
    if (frame >= clip.frames) return finishReaction();
    drawReaction(frame);
    reactFrameRequest = requestAnimationFrame(tickReaction);
  };
  const finishReaction = () => {
    if (current && reactions) drawReaction(reactions.clips.get(current.name)!.frames - 1);
    current = null;
    delete root.dataset.petReaction;
    if (wantClose) {
      // Read to the end mid-reaction: drop the queue and close (gaze is already on frame 0).
      wantClose = false;
      pending = null;
      show("gaze");
      stage = "gaze";
      sync();
      if (stage === "gaze") resumeGaze();
      return;
    }
    if (pending) { const next = pending; pending = null; begin(next); return; }
    show("gaze");
    stage = "gaze";
    resumeGaze();
  };
  const request = (r: ReactionRequest) => {
    const dizzyActive = current?.name === DIZZY || alignRequest?.name === DIZZY || pending?.name === DIZZY;
    if (r.kind === "burst" && dizzyActive) return;
    if (stage === "gaze") return align(r);
    if (stage === "aligning" || stage === "react") pending = queueReaction(pending, r);
  };
  const align = (r: ReactionRequest) => {
    stage = "aligning";
    alignRequest = r;
    hold(true);
    const aligned = turnTo(IP_PANDA_DOWN_FRAME, ALIGN_TIMEOUT_MS, () => stage === "aligning");
    Promise.all([loadReactions(), aligned]).then(([, ok]) => {
      if (ok && stage === "aligning") begin(r);
    }).catch(() => {
      if (stage !== "aligning") return;
      stage = "gaze";
      resumeGaze();
      ack();
    }).finally(() => { alignRequest = null; });
  };
  const poke = () => {
    if (disposed || !desktop.matches) return;
    if (CLOSE_STATES.has(stage)) return ack();
    const result = registerPoke(pokes, performance.now());
    pokes = result.state;
    request(result.kind === "burst" ? { kind: "burst", name: DIZZY } : { kind: "random" });
  };

  // ───────────────────────── hit test ─────────────────────────
  const opaqueAt = (x: number, y: number) => {
    if (!probeContext) return true;
    let source = drawn;
    if (shown === "gaze" || !source) {
      const frame = wrapFrame(Math.round(animator.getCurrentFrame()), frameCount);
      const at = cellOrigin(frame, atlas.columns, atlas.cellWidth, atlas.cellHeight);
      source = { image, x: at.x, y: at.y, w: atlas.cellWidth, h: atlas.cellHeight };
    }
    const p = cellPoint(x, y, canvas.getBoundingClientRect(), source.w, source.h);
    if (!p) return false;
    probeContext.clearRect(0, 0, 1, 1);
    probeContext.drawImage(source.image, source.x + p.x, source.y + p.y, 1, 1, 0, 0, 1, 1);
    return probeContext.getImageData(0, 0, 1, 1).data[3] >= HIT_ALPHA;
  };
  // Only opaque pixels take the pointer: elsewhere clicks fall through to the page.
  let over = false;
  const hover = (x: number, y: number) => {
    const next = !root.hidden && desktop.matches && opaqueAt(x, y);
    if (next === over) return;
    over = next;
    root.classList.toggle("is-hot", over);
    if (over) void loadReactions().catch(() => {});
  };

  // ───────────────────────── wiring ─────────────────────────
  let scrollRequest = 0;
  const sync = () => {
    scrollRequest = 0;
    if (disposed || root.hidden || !desktop.matches) return;
    const card = endMarker();
    if (!card) return;
    const zone = endZone(card.getBoundingClientRect(), innerHeight);
    if (zone === "reach" && stage !== "closing" && stage !== "rest" && stage !== "turning") arrive();
    else if (zone === "away") leave();
  };
  const reset = () => {
    cancelAnimationFrame(closeFrameRequest);
    cancelAnimationFrame(reactFrameRequest);
    closeFrameRequest = reactFrameRequest = 0;
    pending = null;
    current = null;
    wantClose = false;
    stage = "gaze";
    show("gaze");
    hold(false);
  };

  window.addEventListener("pointermove", (e) => {
    pointer = { x: e.clientX, y: e.clientY };
    hover(e.clientX, e.clientY);
  }, { passive: true, signal });
  document.documentElement.addEventListener("pointerleave", () => { if (over) { over = false; root.classList.remove("is-hot"); } }, { signal });
  root.addEventListener("click", (e) => { if (opaqueAt(e.clientX, e.clientY)) poke(); }, { signal });
  root.addEventListener("focus", () => { void loadReactions().catch(() => {}); }, { signal });
  root.addEventListener("keydown", (e) => {
    if (e.target !== root || e.repeat || (e.key !== "Enter" && e.key !== " ")) return;
    e.preventDefault();
    poke();
  }, { signal });
  window.addEventListener("scroll", () => { if (!scrollRequest) scrollRequest = requestAnimationFrame(sync); }, { passive: true, signal });
  window.addEventListener("resize", () => { size(); sync(); }, { passive: true, signal });
  desktop.addEventListener("change", () => { if (!desktop.matches) reset(); else sync(); }, { signal });

  // Download the close atlas only when the reader nears the end.
  const marker = endMarker();
  const near = marker ? new IntersectionObserver((entries) => {
    if (!entries.some((entry) => entry.isIntersecting)) return;
    near?.disconnect();
    void loadClose();
  }, { rootMargin: "0px 0px 150% 0px" }) : null;
  if (marker) near!.observe(marker);

  root.tabIndex = 0;
  root.setAttribute("role", "button");
  root.dataset.petInteractive = "true";
  size();
  show("gaze");

  return () => {
    disposed = true;
    reset();
    clearTimeout(ackTimer);
    near?.disconnect();
    listeners.abort();
    closeCanvas.remove();
    reactCanvas.remove();
  };
}

/** Reduced motion: no close animation, the still swaps to the closed-book pose at the end. */
export function createBlogPetStill(root: HTMLElement, still: HTMLImageElement, gazePoster: string): () => void {
  const listeners = new AbortController();
  const rest = `${IP_PANDA_BASE}close/rest.webp`;
  let closed = false;
  const sync = () => {
    const card = endMarker();
    if (!card || root.hidden) return;
    const zone = endZone(card.getBoundingClientRect(), innerHeight);
    if (zone === "between" || closed === (zone === "reach")) return;
    closed = zone === "reach";
    still.src = closed ? rest : gazePoster;
  };
  window.addEventListener("scroll", sync, { passive: true, signal: listeners.signal });
  window.addEventListener("resize", sync, { passive: true, signal: listeners.signal });
  sync();
  return () => listeners.abort();
}
