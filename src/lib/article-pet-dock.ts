import { createEditorialActor } from "./editorial-actor";
import { petDockTransform } from "./article-pet-dock-geometry";
import { BLOG_PET_DISMISSED, isBlogPetDismissed } from "./blog-pet-preference";

export function createArticlePetDock(dock: HTMLElement): () => void {
  const host = dock.querySelector<HTMLElement>("[data-editorial-actor]");
  const replay = dock.querySelector<HTMLButtonElement>("[data-pet-replay]");
  if (!host || !replay) return () => {};

  const pet = document.getElementById("blog-pet");
  const desktop = window.matchMedia("(min-width: 801px)");
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
  const actor = createEditorialActor(host);
  const poster = host.querySelector<HTMLImageElement>("[data-actor-poster]");
  const useOriginalPoster = () => {
    if (poster) poster.src = "/oil-motion/blog-pet/poster.png";
  };
  poster?.addEventListener("error", useOriginalPoster, { once: true });
  if (poster?.complete && !poster.naturalWidth) useOriginalPoster();
  let visible = false;
  let visited = false;
  let disposed = false;
  let dismissed = isBlogPetDismissed();
  let travel: Animation | undefined;
  let arrival = 0;
  dock.hidden = dismissed;

  const cancelTravel = () => {
    arrival++;
    travel?.cancel();
    travel = undefined;
    if (pet) delete pet.dataset.petTravelling;
  };

  const settle = () => {
    if (pet) pet.dataset.petDocked = "true";
    dock.dataset.dockState = "docked";
    cancelTravel();
    if (visited) return;
    visited = true;
    void actor.play("close");
  };

  const restore = () => {
    cancelTravel();
    dock.dataset.dockState = "floating";
    if (pet) delete pet.dataset.petDocked;
    actor.stop();
  };

  const sync = () => {
    if (disposed) return;
    if (dismissed || !visible) {
      restore();
      return;
    }
    if (document.hidden) return;
    if (dock.dataset.dockState === "docked") return;
    if (reduced.matches || !desktop.matches || !pet || pet.hidden) {
      settle();
      return;
    }
    if (travel) return;
    const source = pet.getBoundingClientRect();
    const target = dock.getBoundingClientRect();
    if (!source.width || !target.width) {
      settle();
      return;
    }
    const motion = getComputedStyle(dock);
    const duration = Number.parseFloat(motion.getPropertyValue("--editorial-dock")) || 420;
    const easing = motion.getPropertyValue("--editorial-ease").trim() || "cubic-bezier(.2,.8,.2,1)";
    pet.dataset.petTravelling = "true";
    dock.dataset.dockState = "travelling";
    const ticket = ++arrival;
    travel = pet.animate(
      [{ transform: "none" }, { transform: petDockTransform(source, target) }],
      { duration, easing, fill: "forwards" },
    );
    travel.finished.then(() => {
      if (ticket === arrival && visible && !dismissed && !disposed) settle();
    }).catch((error: unknown) => {
      if (!(error instanceof DOMException && error.name === "AbortError")) restore();
    });
  };

  const observer = new IntersectionObserver((entries) => {
    const entry = entries[0];
    if (!entry) return;
    visible = entry.isIntersecting && entry.intersectionRatio >= .5;
    sync();
  }, { threshold: [0, .5] });
  observer.observe(dock);

  const dismiss = () => {
    dismissed = true;
    dock.hidden = true;
    restore();
    if (pet) pet.hidden = true;
  };
  const onStorage = (event: StorageEvent) => {
    if (event.key === BLOG_PET_DISMISSED && event.newValue === "1") dismiss();
  };
  const onReplay = () => {
    if (!dismissed && dock.dataset.dockState === "docked") void actor.play("close");
  };
  const onVisibility = () => {
    if (document.hidden) travel?.pause();
    else if (travel) travel.play();
    else sync();
  };
  const onViewportChange = () => {
    if (travel) {
      cancelTravel();
      if (visible) settle();
    }
    sync();
  };
  replay.addEventListener("click", onReplay);
  window.addEventListener(BLOG_PET_DISMISSED, dismiss);
  window.addEventListener("storage", onStorage);
  window.addEventListener("resize", onViewportChange, { passive: true });
  desktop.addEventListener("change", onViewportChange);
  reduced.addEventListener("change", onViewportChange);
  document.addEventListener("visibilitychange", onVisibility);

  return () => {
    disposed = true;
    restore();
    actor.dispose();
    poster?.removeEventListener("error", useOriginalPoster);
    observer.disconnect();
    replay.removeEventListener("click", onReplay);
    window.removeEventListener(BLOG_PET_DISMISSED, dismiss);
    window.removeEventListener("storage", onStorage);
    window.removeEventListener("resize", onViewportChange);
    desktop.removeEventListener("change", onViewportChange);
    reduced.removeEventListener("change", onViewportChange);
    document.removeEventListener("visibilitychange", onVisibility);
  };
}
