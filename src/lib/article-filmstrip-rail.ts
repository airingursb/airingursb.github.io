/**
 * Filmstrip index, DOM half: the ranger in the comment rail and the strip in
 * the lightbox. Inline comment cards win: where a card covers the ranger it
 * moves below the card, or fades to 14% when there is no room (hover restores).
 */
import { FILMSTRIP_MIN, articleImages, currentFigure, figureCaptions, pad2 } from "./article-filmstrip.ts";

type Figure = { img: HTMLImageElement; src: string; caption: string; section: number };
type FilmStrings = { readonly untitled: string; readonly figure: string; readonly keys: string; readonly lightboxKeys: string; readonly prev: string; readonly next: string };

const FOLLOW_HOLD_MS = 2500;
const KEY_HOLD_MS = 4000;
const sectionName = (h: Element) => (h.textContent || "").replace(/^\s*[\p{Extended_Pictographic}️\s]+/u, "").trim();

export function mountArticleFilmstrip(host: HTMLElement): () => void {
  const content = document.querySelector<HTMLElement>(".post-content");
  const rail = document.getElementById("commentRail");
  if (!content) return () => {};
  const t: FilmStrings = JSON.parse(host.dataset.strings || "{}");
  const listeners = new AbortController();
  const signal = listeners.signal;
  const chapters = Array.from(content.querySelectorAll<HTMLElement>("h2"));
  const headings = Array.from(content.querySelectorAll<HTMLElement>("h2, h3"));
  const top = (el: Element) => el.getBoundingClientRect().top + scrollY;

  const images = articleImages(content);
  if (images.length < FILMSTRIP_MIN) return () => {};
  const chapterOf = (y: number) => chapters.reduce((c, h, i) => (top(h) <= y + 2 ? i : c), -1);
  const headingOf = (y: number) => headings.reduce<HTMLElement | null>((c, h) => (top(h) <= y ? h : c), null);
  const captions = figureCaptions(images.map((img) => {
    const next = img.nextElementSibling;
    const figcaption = img.closest("figure")?.querySelector("figcaption");
    const heading = headingOf(top(img));
    return {
      alt: img.alt || "",
      caption: (next?.classList.contains("img-caption") ? next.textContent : figcaption?.textContent) || "",
      section: heading ? sectionName(heading) : "",
    };
  }), t.untitled, t.figure);
  const figures: Figure[] = images.map((img, i) => ({ img, src: img.currentSrc || img.src, caption: captions[i], section: chapterOf(top(img)) }));
  const sectionLabel = (s: number) => (s < 0 ? "§0" : `§${s + 1}`);

  const goTo = (i: number) => {
    const f = figures[i];
    if (!f) return;
    const r = f.img.getBoundingClientRect();
    window.scrollTo({ top: r.top + scrollY - Math.max(60, (innerHeight - r.height) / 2), behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
  };

  // ───────────── ranger in the rail (desktop) ─────────────
  let root: HTMLElement | null = null;
  let current = -1;
  let shift = 0;
  let holdUntil = 0;
  if (rail) {
    document.documentElement.classList.add("has-filmstrip");
    root = document.createElement("div");
    root.className = "filmstrip";
    root.tabIndex = -1;
    const many = figures.length > 24;
    root.innerHTML = `<div class="fs-head"><span><b>$</b> ranger figures/</span><span class="fs-count"><b class="fs-cur">01</b>/${pad2(figures.length)}</span></div>`
      + '<div class="fs-preview"><img alt="" decoding="async"><span class="fs-preview-cap"></span></div><div class="fs-list"></div>'
      + `<div class="fs-status"><span class="fs-status-l"></span><span>${t.keys}</span></div>`;
    const list = root.querySelector<HTMLElement>(".fs-list")!;
    list.append(...figures.map((f, i) => {
      const row = document.createElement("button");
      row.type = "button";
      row.className = "fs-row";
      row.dataset.i = String(i);
      const no = document.createElement("span");
      no.className = "fs-no";
      no.textContent = pad2(i + 1);
      const thumb = document.createElement("span");
      thumb.className = "fs-thumb";
      const img = document.createElement("img");
      img.alt = "";
      img.decoding = "async";
      if (many) img.loading = "lazy";
      img.src = f.src;
      thumb.append(img);
      const cap = document.createElement("span");
      cap.className = "fs-title";
      cap.textContent = f.caption;
      const sec = document.createElement("span");
      sec.className = "fs-sec";
      sec.textContent = sectionLabel(f.section);
      row.append(no, thumb, cap, sec);
      return row;
    }));
    const placeInRail = () => {
      if (!root || !rail) return;
      // With inline comment cards, .cr-cards grows to the last card: keep the ranger under the header.
      const hasCards = !!rail.querySelector("#commentCards .cm-card");
      const header = rail.querySelector(".cr-header");
      if (hasCards && header && root.previousElementSibling !== header) header.after(root);
      if (!hasCards && rail.lastElementChild !== root) rail.append(root);
    };
    rail.append(root);
    placeInRail();
    root.addEventListener("click", (e) => {
      const row = (e.target as HTMLElement).closest<HTMLElement>(".fs-row");
      if (row) goTo(Number(row.dataset.i));
    }, { signal });
    for (const type of ["wheel", "touchmove"]) list.addEventListener(type, () => { holdUntil = Date.now() + FOLLOW_HOLD_MS; }, { passive: true, signal });
    root.addEventListener("keydown", (e) => {
      if (e.key === "ArrowDown" || e.key === "ArrowUp") {
        e.preventDefault();
        holdUntil = Date.now() + KEY_HOLD_MS;
        paint(Math.max(0, Math.min(figures.length - 1, current + (e.key === "ArrowDown" ? 1 : -1))), true);
        root?.querySelector<HTMLElement>(".fs-row.is-cur")?.focus({ preventScroll: true });
      }
      if (e.key === "Enter" && (e.target as HTMLElement) === root) goTo(current);
    }, { signal });
    const cards = document.getElementById("commentCards");
    if (cards) {
      const observer = new MutationObserver(() => { placeInRail(); tuck(); });
      observer.observe(cards, { childList: true });
      signal.addEventListener("abort", () => observer.disconnect());
    }
  }

  function paint(force?: number, manual = false) {
    // No ranger, or the rail is hidden (narrow screens): only the lightbox strip remains.
    if (!root || !root.offsetParent) return;
    const state = typeof force === "number"
      ? { index: force, on: true, before: false }
      : currentFigure(figures.map((f) => f.img.getBoundingClientRect()), innerHeight);
    const i = state.index;
    root.classList.toggle("is-before", state.before);
    root.querySelectorAll<HTMLElement>(".fs-row").forEach((row) => {
      const k = Number(row.dataset.i);
      row.classList.toggle("is-cur", k === i);
      row.classList.toggle("is-past", k < i);
    });
    root.querySelector(".fs-cur")!.textContent = pad2(i + 1);
    const changed = current !== i;
    current = i;
    const f = figures[i];
    if (!f) return;
    const preview = root.querySelector<HTMLImageElement>(".fs-preview img")!;
    if (preview.getAttribute("src") !== f.src) preview.src = f.src;
    root.querySelector(".fs-preview-cap")!.textContent = f.caption;
    root.querySelector(".fs-status-l")!.textContent = `${pad2(i + 1)}/${pad2(figures.length)}  ${f.section < 0 ? "" : `§${f.section + 1} ${sectionName(chapters[f.section])}`}`;
    const list = root.querySelector<HTMLElement>(".fs-list")!;
    const row = root.querySelector<HTMLElement>(".fs-row.is-cur");
    if (row && (manual || Date.now() > holdUntil)) {
      const target = row.offsetTop - list.clientHeight * 0.4;
      if (Math.abs(list.scrollTop - target) > 2) list.scrollTo({ top: target, behavior: changed ? "smooth" : "auto" });
    }
    tuck();
  }

  function tuck() {
    if (!root) return;
    const r = root.getBoundingClientRect();
    const start = r.top - shift;
    const end = start + r.height;
    const covering = Array.from(document.querySelectorAll("#commentCards .cm-card"))
      .map((c) => c.getBoundingClientRect())
      .filter((q) => q.height > 0 && q.bottom > start - 8 && q.top < end + 8);
    let next = 0;
    let faded = false;
    if (covering.length) {
      next = Math.max(...covering.map((q) => q.bottom)) - start + 14;
      if (start + next + r.height > innerHeight - 8) { next = 0; faded = true; }
    }
    if (next !== shift) { shift = next; root.style.transform = shift ? `translateY(${shift}px)` : ""; }
    root.classList.toggle("is-tucked", faded && !root.matches(":hover"));
  }

  // ───────────── strip in the lightbox ─────────────
  const augment = (overlay: HTMLElement) => {
    const big = overlay.querySelector<HTMLImageElement>(".img-zoom-img");
    if (!big || overlay.querySelector(".fs-lightbox")) return;
    let i = Math.max(0, figures.findIndex((f) => f.src === big.src || f.img.src === big.src));
    const strip = document.createElement("div");
    strip.className = "fs-lightbox";
    strip.innerHTML = `<div class="fs-lb-bar"><span class="fs-lb-n"></span><span class="fs-lb-t"></span><span class="fs-lb-k">${t.lightboxKeys}</span></div><div class="fs-lb-roll"></div>`;
    const roll = strip.querySelector<HTMLElement>(".fs-lb-roll")!;
    roll.append(...figures.map((f, k) => {
      const b = document.createElement("button");
      b.type = "button";
      b.className = "fs-lb-frame";
      b.dataset.i = String(k);
      const img = document.createElement("img");
      img.loading = "lazy";
      img.alt = "";
      img.src = f.src;
      const no = document.createElement("em");
      no.textContent = String(k + 1);
      b.append(img, no);
      return b;
    }));
    const nav = (cls: string, label: string, text: string) => {
      const b = document.createElement("button");
      b.type = "button";
      b.className = `fs-lb-nav ${cls}`;
      b.setAttribute("aria-label", label);
      b.textContent = text;
      return b;
    };
    strip.append(nav("fs-lb-prev", t.prev, "‹"), nav("fs-lb-next", t.next, "›"));
    overlay.append(strip);
    overlay.classList.add("has-filmstrip");
    const show = (k: number) => {
      i = (k + figures.length) % figures.length;
      big.src = figures[i].src;
      big.alt = figures[i].img.alt;
      strip.querySelector(".fs-lb-n")!.textContent = `${pad2(i + 1)}/${pad2(figures.length)}`;
      strip.querySelector(".fs-lb-t")!.textContent = figures[i].caption;
      roll.querySelectorAll<HTMLElement>(".fs-lb-frame").forEach((b) => b.classList.toggle("is-cur", Number(b.dataset.i) === i));
      const cur = roll.querySelector<HTMLElement>(".fs-lb-frame.is-cur");
      if (cur) roll.scrollTo({ left: cur.offsetLeft - roll.clientWidth / 2 + cur.offsetWidth / 2, behavior: "smooth" });
    };
    strip.addEventListener("click", (e) => {
      e.stopPropagation();
      const target = e.target as HTMLElement;
      const frame = target.closest<HTMLElement>(".fs-lb-frame");
      if (frame) return show(Number(frame.dataset.i));
      if (target.closest(".fs-lb-prev")) show(i - 1);
      if (target.closest(".fs-lb-next")) show(i + 1);
    });
    const onKey = (e: KeyboardEvent) => {
      if (!overlay.isConnected || !overlay.classList.contains("open")) {
        if (!overlay.isConnected) document.removeEventListener("keydown", onKey, true);
        return;
      }
      if (e.key === "ArrowRight") { e.preventDefault(); show(i + 1); }
      if (e.key === "ArrowLeft") { e.preventDefault(); show(i - 1); }
    };
    document.addEventListener("keydown", onKey, true);
    show(i);
  };
  const lightboxes = new MutationObserver((records) => {
    for (const r of records) for (const n of r.addedNodes) {
      if (n instanceof HTMLElement && n.classList.contains("img-zoom-overlay")) augment(n);
    }
  });
  lightboxes.observe(document.body, { childList: true });

  let frameRequest = 0;
  window.addEventListener("scroll", () => {
    if (!frameRequest) frameRequest = requestAnimationFrame(() => { frameRequest = 0; paint(); });
  }, { passive: true, signal });
  window.addEventListener("resize", () => paint(), { passive: true, signal });
  paint();

  return () => {
    listeners.abort();
    lightboxes.disconnect();
    root?.remove();
    document.documentElement.classList.remove("has-filmstrip");
  };
}
