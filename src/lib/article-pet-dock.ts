import { createEditorialActor } from "./editorial-actor";
import { IP_PANDA_BASE } from "./blog-pet-motion.ts";

/**
 * The panda sitting on the like card (≤ 1100px, where there is no corner
 * panda). It closes its book the first time the card comes into view and then
 * keeps resting (tap to replay); on
 * desktop the corner panda closes in place instead (blog-pet-stage) and the
 * dock stays hidden. Reduced motion shows the closed-book still.
 */
export function createArticlePetDock(dock: HTMLElement): () => void {
  const host = dock.querySelector<HTMLElement>("[data-editorial-actor]");
  const replay = dock.querySelector<HTMLButtonElement>("[data-pet-replay]");
  if (!host || !replay) return () => {};

  const narrow = window.matchMedia("(max-width: 1100px)");
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
  const actor = createEditorialActor(host);
  const poster = host.querySelector<HTMLImageElement>("[data-actor-poster]");
  const restingPoster = `${IP_PANDA_BASE}close/rest.webp`;
  const readingPoster = poster?.getAttribute("src") ?? "";
  let visible = false;
  let closed = false;

  const usePoster = () => {
    if (poster) poster.src = reduced.matches ? restingPoster : readingPoster;
  };
  const restore = () => {
    closed = false;
    dock.dataset.dockState = "floating";
    actor.stop();
  };
  const sync = () => {
    if (!narrow.matches) {
      if (closed) restore();
      return;
    }
    if (!visible || document.hidden || closed) return;
    closed = true;
    dock.dataset.dockState = "docked";
    if (!reduced.matches) void actor.play("close");
  };

  const observer = new IntersectionObserver((entries) => {
    const entry = entries[0];
    if (!entry) return;
    visible = entry.isIntersecting && entry.intersectionRatio >= .5;
    sync();
  }, { threshold: [0, .5] });
  observer.observe(dock);

  const onReplay = () => {
    if (closed && !reduced.matches) void actor.play("close");
  };
  const onMotion = () => { usePoster(); restore(); sync(); };
  replay.addEventListener("click", onReplay);
  narrow.addEventListener("change", sync);
  reduced.addEventListener("change", onMotion);
  document.addEventListener("visibilitychange", sync);
  usePoster();

  return () => {
    restore();
    actor.dispose();
    observer.disconnect();
    replay.removeEventListener("click", onReplay);
    narrow.removeEventListener("change", sync);
    reduced.removeEventListener("change", onMotion);
    document.removeEventListener("visibilitychange", sync);
  };
}
