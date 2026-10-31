/**
 * Ribbon bookmark, DOM half: a satin ribbon hanging from the headline rule
 * says where the reader stopped last time; clicking it scrolls back and marks
 * "continue here". The position is saved while reading and cleared at the
 * closing date. Storage helpers: reading-bookmark.ts.
 */
import {
  BOOKMARK_MAX, BOOKMARK_MIN, bookmarkWhen, clearBookmark, loadBookmark, minutesLeft, readingPosition, saveBookmark,
  type Bookmark,
} from "./reading-bookmark.ts";

type RibbonStrings = { readonly last: string; readonly chapter: string; readonly percent: string; readonly left: string; readonly here: string; readonly mobile: string };

const SAVE_EVERY_MS = 1000;
const MARK_FADES_AFTER = 600;
const storage = () => window.localStorage;
const sectionName = (h: Element) => (h.textContent || "").replace(/^\s*[\p{Extended_Pictographic}️\s]+/u, "").trim();

export function mountReadingRibbon(ribbon: HTMLAnchorElement): () => void {
  const content = document.querySelector<HTMLElement>(".post-content");
  const title = document.querySelector<HTMLElement>("[data-article-title]");
  const header = ribbon.parentElement;
  if (!content || !title || !header) return () => {};
  const slug = ribbon.dataset.slug || "";
  const lang = ribbon.dataset.lang === "en" ? "en" : "zh";
  const minutes = Number(ribbon.dataset.minutes) || 1;
  const t: RibbonStrings = JSON.parse(ribbon.dataset.strings || "{}");
  const desktop = matchMedia("(min-width: 1101px)");
  const reduced = matchMedia("(prefers-reduced-motion: reduce)");
  const listeners = new AbortController();
  const signal = listeners.signal;
  const field = (name: string) => ribbon.querySelector<HTMLElement>(`[data-f="${name}"]`)!;
  const headings = Array.from(content.querySelectorAll<HTMLElement>("h2"));

  let pending: Bookmark | null = loadBookmark(storage, slug);
  let finished = false;
  let lastSave = 0;
  let unsaved = -1;
  let rows: MutationObserver | null = null;

  const contentY = (pct: number) => {
    const r = content.getBoundingClientRect();
    return r.top + scrollY + r.height * pct;
  };
  const chapterAt = (y: number) => {
    let index = -1;
    headings.forEach((h, i) => { if (h.getBoundingClientRect().top + scrollY <= y + 2) index = i; });
    return index;
  };
  const place = () => {
    ribbon.style.left = desktop.matches ? `${Math.round(title.getBoundingClientRect().left - header.getBoundingClientRect().left + 8)}px` : "";
  };
  const collapse = () => {
    ribbon.classList.add("is-resumed");
    document.querySelector("#mtocPill .reading-ribbon-tail")?.classList.add("is-done");
  };

  // A paragraph-level anchor near the saved position (not inside a figure).
  const paragraphAt = (y: number) => {
    let best: HTMLElement | null = null;
    content.querySelectorAll<HTMLElement>(":scope > p, :scope > h2, :scope > h3, :scope > blockquote, :scope > ul, :scope > ol").forEach((p) => {
      if (p.querySelector("img") || !p.textContent?.trim()) return;
      if (p.getBoundingClientRect().top + scrollY <= y + 4) best = p;
    });
    return best as HTMLElement | null;
  };
  const resume = () => {
    if (!pending) return;
    const y = contentY(pending.pct);
    const p = paragraphAt(y);
    window.scrollTo({ top: (p ? p.getBoundingClientRect().top + scrollY : y) - innerHeight * 0.3, behavior: reduced.matches ? "auto" : "smooth" });
    collapse();
    pending = null;
    if (!p) return;
    const mark = document.createElement("span");
    mark.className = "reading-ribbon-here";
    mark.setAttribute("aria-hidden", "true");
    mark.innerHTML = "<i></i>";
    mark.append(t.here);
    p.classList.add("has-ribbon-here");
    p.prepend(mark);
    const from = y;
    const fade = () => {
      if (scrollY + innerHeight * 0.3 <= from + MARK_FADES_AFTER) return;
      mark.classList.add("is-gone");
      window.removeEventListener("scroll", fade);
      window.setTimeout(() => { mark.remove(); p.classList.remove("has-ribbon-here"); }, 700);
    };
    window.setTimeout(() => window.addEventListener("scroll", fade, { passive: true, signal }), 1200);
  };

  const show = (bm: Bookmark) => {
    const y = contentY(bm.pct);
    const chapter = chapterAt(y);
    field("when").textContent = `${t.last} · ${bookmarkWhen(bm.ts, Date.now(), lang)}`;
    field("chapter").textContent = chapter >= 0 ? t.chapter.replace("{n}", String(chapter + 1)) : t.percent.replace("{n}", String(Math.round(bm.pct * 100)));
    field("title").textContent = chapter >= 0 ? sectionName(headings[chapter]) : "";
    field("title").hidden = chapter < 0;
    field("left").textContent = t.left.replace("{n}", String(minutesLeft(minutes, bm.pct)));
    ribbon.hidden = false;
    place();
    // Mobile: a ribbon tail on the contents pill, and the row marked in its sheet.
    const pill = document.getElementById("mtocPill");
    if (pill && !pill.querySelector(".reading-ribbon-tail")) {
      const tail = document.createElement("span");
      tail.className = "reading-ribbon-tail";
      tail.setAttribute("aria-hidden", "true");
      pill.append(tail);
    }
    const markRow = () => {
      const id = chapter >= 0 ? headings[chapter].id : "";
      const row = id ? Array.from(document.querySelectorAll<HTMLAnchorElement>("#mtocList a")).find((a) => decodeURIComponent(a.getAttribute("href") || "").slice(1) === id) : null;
      if (!row || row.querySelector(".reading-ribbon-row")) return;
      const tag = document.createElement("span");
      tag.className = "reading-ribbon-row";
      tag.textContent = t.mobile.replace("{n}", String(Math.round(bm.pct * 100)));
      row.append(tag);
    };
    markRow();
    const list = document.getElementById("mtocList");
    rows?.disconnect();
    rows = list ? new MutationObserver(markRow) : null;
    if (list) rows?.observe(list, { childList: true });
  };

  const save = (force = false) => {
    if (finished || unsaved < 0) return;
    const now = Date.now();
    if (!force && now - lastSave < SAVE_EVERY_MS) return;
    lastSave = now;
    saveBookmark(storage, slug, unsaved, now);
    unsaved = -1;
  };
  const onScroll = () => {
    if (finished) return;
    const coda = content.querySelector(".article-coda");
    if (coda && coda.getBoundingClientRect().top < innerHeight * 0.8) {
      // Read to the end: the bookmark is done.
      finished = true;
      clearBookmark(storage, slug);
      ribbon.classList.add("is-done");
      document.querySelector("#mtocPill .reading-ribbon-tail")?.classList.add("is-done");
      return;
    }
    const r = content.getBoundingClientRect();
    const pct = readingPosition(r.top, r.height, innerHeight);
    // While the ribbon still offers the old spot, only passing it moves the bookmark.
    if (pending) {
      if (pct < pending.pct - 0.02) return;
      pending = null;
      collapse();
    }
    if (pct < BOOKMARK_MIN || pct >= BOOKMARK_MAX) return;
    unsaved = pct;
    save();
  };

  ribbon.addEventListener("click", (e) => { e.preventDefault(); resume(); }, { signal });
  window.addEventListener("scroll", onScroll, { passive: true, signal });
  window.addEventListener("resize", place, { passive: true, signal });
  window.addEventListener("pagehide", () => save(true), { signal });
  document.addEventListener("visibilitychange", () => { if (document.hidden) save(true); }, { signal });
  if (pending) {
    show(pending);
    // Images above the spot change the layout as they load: re-read the chapter then.
    window.addEventListener("load", () => { if (pending) show(pending); }, { once: true, signal });
  }

  return () => {
    save(true);
    rows?.disconnect();
    listeners.abort();
  };
}
