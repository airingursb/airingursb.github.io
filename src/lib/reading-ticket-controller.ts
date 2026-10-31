/**
 * Reading ticket, DOM half: measures the visit (active time, sections read),
 * collects the live fields (views, the reader's country, readers online,
 * reader regions, the like state) and keeps the server-rendered ticket in
 * sync. The stub is the share entry: navigator.share with the ticket PNG when
 * available, otherwise a paper panel anchored on the stub.
 */
import { textCounts } from "./blog-archive.ts";
import { LIKE_STATE_EVENT, readLikeState, type LikeStateDetail } from "./article-like-card.ts";
import {
  REGIONS_MIN_COUNT, REGIONS_MIN_LOCATED, barcode, buildTicket, sectionsRead, ticketFileName, xIntent,
  type TicketInput, type TicketLang, type TicketView,
} from "./reading-ticket.ts";
import { canvasBlob, drawTicket } from "./reading-ticket-image.ts";
import { articleImages } from "./article-filmstrip.ts";

const API = "https://chat.ursb.me";
const IDLE_AFTER_MS = 60_000;
/** Not prose (same list as post-sections). */
const SKIP = "pre, script, style, svg, noscript, template, textarea, button, figcaption, .code-bar, .article-coda, .article-like, .article-reading-dock, .katex";

export type TicketStrings = {
  readonly brand: string;
  readonly stub: string;
  readonly cells: Readonly<Record<"date" | "time" | "read" | "seat" | "from" | "online", string>>;
  readonly panel: string;
  readonly close: string;
  readonly copy: string;
  readonly copied: string;
  readonly copyFailed: string;
  readonly save: string;
  readonly saveNote: string;
  readonly saved: string;
  readonly saveFailed: string;
  readonly x: string;
  readonly xNote: string;
};

type Live = { views: number | null; country: TicketInput["country"]; online: number | null; regions: number | null; liked: boolean; likes: number };

function articleWords(content: HTMLElement) {
  let words = 0;
  const walker = document.createTreeWalker(content, NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT, {
    acceptNode(n) {
      if (n.nodeType === 1) return (n as Element).matches(SKIP) ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_SKIP;
      return NodeFilter.FILTER_ACCEPT;
    },
  });
  for (let n = walker.nextNode(); n; n = walker.nextNode()) {
    const c = textCounts(n.nodeValue || "");
    words += c.cjk + c.latin;
  }
  return words;
}

function countryName(code: string, lang: TicketLang) {
  try {
    return new Intl.DisplayNames([lang === "en" ? "en" : "zh-CN"], { type: "region" }).of(code) || code;
  } catch {
    return code;
  }
}

export function mountReadingTicket(root: HTMLElement): () => void {
  const content = document.querySelector<HTMLElement>(".post-content");
  const stub = root.querySelector<HTMLElement>("[data-ticket-stub]");
  if (!content || !stub) return () => {};
  const t: TicketStrings = JSON.parse(root.dataset.strings || "{}");
  const lang: TicketLang = root.dataset.lang === "en" ? "en" : "zh";
  const slug = root.dataset.slug || "";
  const title = root.dataset.title || "";
  const url = root.dataset.url || location.href;
  const minutes = Number(root.dataset.minutes) || 1;
  const listeners = new AbortController();
  const signal = listeners.signal;
  const field = (name: string) => root.querySelector<HTMLElement>(`[data-f="${name}"]`);
  const cell = (name: string) => root.querySelector<HTMLElement>(`[data-cell="${name}"]`);

  // Sections: h2s; articles with fewer than two read by percent instead.
  const headings = Array.from(content.querySelectorAll<HTMLElement>("h2"));
  const sections = headings.length >= 2 ? headings : [];
  const images = articleImages(content).length;
  const words = articleWords(content);

  let seconds = 0;
  let lastActivity = Date.now();
  let read = 0;
  let progress = 0;
  const live: Live = { views: null, country: null, online: null, regions: null, liked: false, likes: 0 };
  let view: TicketView | null = null;
  let png: Blob | null = null;
  let pngKey = "";

  const measure = () => {
    const bottom = scrollY + innerHeight;
    if (sections.length) {
      const end = content.querySelector(".article-coda") ?? content;
      const ends = sections.map((_, i) => (i + 1 < sections.length ? sections[i + 1] : end).getBoundingClientRect().top + scrollY);
      read = Math.max(read, sectionsRead(ends, bottom));
    }
    const r = content.getBoundingClientRect();
    progress = Math.max(progress, Math.min(1, Math.max(0, (innerHeight - r.top) / Math.max(1, r.height))));
  };
  const input = (): TicketInput => ({
    lang, title, slug, now: new Date(), seconds, minutes, read, total: sections.length, progress, images, words, ...live,
  });
  const set = (name: string, value: string) => {
    const el = field(name);
    if (el && el.textContent !== value) el.textContent = value;
  };
  const render = () => {
    const next = buildTicket(input());
    const prev = view;
    view = next;
    root.classList.toggle("is-skim", next.skim);
    set("admit", next.admit);
    set("date", next.date);
    set("time", next.time);
    set("read", next.readCell);
    set("seat", next.seat ?? "");
    set("online", next.online ?? "");
    set("fine", next.fine);
    set("no", next.seatNo ?? "");
    set("sumBig", next.sumBig);
    set("sumSmall", next.sumSmall);
    set("sumState", next.sumState);
    set("sumTime", next.time);
    cell("seat")!.hidden = next.seat === null;
    cell("online")!.hidden = next.online === null;
    cell("from")!.hidden = next.from === null;
    if (next.from && next.from.code !== prev?.from?.code) {
      const from = field("from")!;
      const flag = document.createElement("img");
      flag.className = "c-flag";
      flag.src = `/flags/${next.from.code.toLowerCase()}.svg`;
      flag.alt = next.from.code;
      flag.loading = "lazy";
      flag.addEventListener("error", () => flag.remove(), { once: true });
      from.replaceChildren(flag, ` ${next.from.name}`);
    }
    field("fine")!.hidden = !next.fine;
    field("barcode")!.hidden = next.skim;
    field("nobar")!.hidden = !next.skim;
    if (next.code !== prev?.code) {
      field("barcode")!.replaceChildren(...barcode(next.code, 31).map((w, i) => {
        const bar = document.createElement("i");
        bar.style.flex = String(w);
        if (i % 2) bar.className = "gap";
        return bar;
      }));
    }
    const echo = field("echo")!;
    echo.hidden = !next.echo;
    if (next.echo) { set("echoLikes", next.echo.likes); set("echoDate", next.echo.date); }
  };

  // ───────────── visit: active time + scroll ─────────────
  for (const type of ["scroll", "pointermove", "keydown", "touchstart"]) {
    window.addEventListener(type, () => { lastActivity = Date.now(); }, { passive: true, signal });
  }
  const timer = window.setInterval(() => {
    if (document.visibilityState !== "visible" || Date.now() - lastActivity > IDLE_AFTER_MS) return;
    seconds++;
    render();
  }, 1000);
  let scrollRequest = 0;
  window.addEventListener("scroll", () => {
    if (scrollRequest) return;
    scrollRequest = requestAnimationFrame(() => { scrollRequest = 0; measure(); render(); });
  }, { passive: true, signal });

  // ───────────── live fields ─────────────
  const grid = document.getElementById("contentGrid");
  const takeViews = (pv: number) => { if (pv > 0) { live.views = pv; render(); } };
  takeViews(Number(grid?.dataset.views) || 0);
  document.addEventListener("article:views", (e) => takeViews((e as CustomEvent<{ pv: number }>).detail.pv), { signal });

  const takeCountry = (code: unknown) => {
    const cc = String(code || "").toUpperCase();
    if (!/^[A-Z]{2}$/.test(cc) || cc === "XX" || cc === "T1") return;
    live.country = { code: cc, name: countryName(cc, lang) };
    render();
  };
  try { takeCountry(sessionStorage.getItem("vp_country")); } catch { /* storage is optional */ }
  window.addEventListener("visitor-country-ready", (e) => takeCountry((e as CustomEvent<{ country: string }>).detail.country), { signal });

  const takeOnline = (counts: unknown) => {
    const page = (counts as { page?: unknown } | null)?.page;
    if (typeof page !== "number" || page < 1) return;
    live.online = page;
    render();
  };
  takeOnline((window as unknown as { __onlineCounts?: unknown }).__onlineCounts);
  window.addEventListener("online-counts", (e) => takeOnline((e as CustomEvent).detail), { signal });

  const likeButton = document.getElementById("articleLikeBtn");
  const takeLike = (s: LikeStateDetail | null) => {
    if (!s) return;
    live.liked = s.liked;
    live.likes = s.count;
    render();
  };
  if (likeButton) takeLike(readLikeState(likeButton));
  document.addEventListener(LIKE_STATE_EVENT, (e) => takeLike((e as CustomEvent<LikeStateDetail>).detail), { signal });

  const loadRegions = async () => {
    try {
      const res = await fetch(`${API}/api/posts/${encodeURIComponent(slug)}/view-regions`, { signal: AbortSignal.timeout(8000), credentials: "omit" });
      if (!res.ok) return;
      const data = await res.json() as { regionCount?: number; located?: number };
      const count = Number(data.regionCount) || 0;
      if (count >= REGIONS_MIN_COUNT && (Number(data.located) || 0) >= REGIONS_MIN_LOCATED) { live.regions = count; render(); }
    } catch { /* the fine print simply leaves regions out */ }
  };
  // Only when the reader gets close to the ticket.
  const near = new IntersectionObserver((entries) => {
    if (!entries.some((e) => e.isIntersecting)) return;
    near.disconnect();
    void loadRegions();
  }, { rootMargin: "0px 0px 100% 0px" });
  near.observe(root);

  // ───────────── share ─────────────
  const ticketPng = async () => {
    if (!view) return null;
    const key = JSON.stringify(view);
    if (png && pngKey === key) return png;
    const css = getComputedStyle(root);
    const body = getComputedStyle(document.body);
    const v = (name: string, fallback: string) => css.getPropertyValue(name).trim() || fallback;
    const cellValues: [string, string][] = [[t.cells.date, view.date], [t.cells.time, view.time], [t.cells.read, view.readCell]];
    if (view.seat) cellValues.push([t.cells.seat, view.seat]);
    if (view.from) cellValues.push([t.cells.from, view.from.name]);
    if (view.online) cellValues.push([t.cells.online, view.online]);
    try {
      const canvas = drawTicket(view, { title, brand: t.brand, stub: t.stub, cells: cellValues }, url, {
        page: body.backgroundColor || "#0d1117",
        paper: v("--tk-paper", "#f6f1e4"), ink: v("--tk-ink", "#201e19"), mute: v("--tk-mute", "#6c6555"),
        rule: v("--tk-rule2", "rgba(32,30,25,.18)"), red: v("--tk-red", "#d4342c"),
        serif: body.getPropertyValue("--font-serif").trim() || "serif", mono: body.getPropertyValue("--font-mono").trim() || "monospace",
      });
      png = await canvasBlob(canvas);
      pngKey = key;
      return png;
    } catch {
      return null;
    }
  };

  let panel: HTMLElement | null = null;
  let scrolledForPanel = false;
  const closePanel = (refocus = false) => {
    if (!panel) return;
    panel.remove();
    panel = null;
    scrolledForPanel = false;
    root.classList.remove("is-sharing");
    stub.setAttribute("aria-expanded", "false");
    if (refocus) stub.focus({ preventScroll: true });
  };
  const placePanel = () => {
    if (!panel) return;
    // Measure the whole ticket, not the stub: the stub shifts on hover.
    const box = root.getBoundingClientRect();
    const ticket = (root.querySelector(".tk") ?? stub).getBoundingClientRect();
    const width = panel.offsetWidth;
    const side = ticket.right + 14 + width <= innerWidth - 12 && innerWidth > 1100;
    panel.classList.toggle("is-side", side);
    if (side) {
      panel.style.left = `${Math.round(ticket.right - box.left + 14)}px`;
      panel.style.top = `${Math.round(ticket.top - box.top)}px`;
    } else {
      const s = stub.getBoundingClientRect();
      panel.style.left = `${Math.round(Math.max(s.left - box.left, s.right - box.left - width))}px`;
      panel.style.top = `${Math.round(ticket.bottom - box.top + 10)}px`;
    }
    const p = panel.getBoundingClientRect();
    if (p.bottom > innerHeight - 8 && !scrolledForPanel) {
      scrolledForPanel = true;
      window.scrollBy({ top: p.bottom - innerHeight + 16, behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
    }
  };
  const flash = (row: HTMLElement, message: string, ok: boolean) => {
    const label = row.querySelector<HTMLElement>(".tk-sp-t");
    if (!label) return;
    const keep = label.dataset.keep || label.textContent || "";
    label.dataset.keep = keep;
    label.textContent = message;
    row.classList.toggle("is-ok", ok);
    row.classList.toggle("is-err", !ok);
    window.setTimeout(() => { label.textContent = keep; row.classList.remove("is-ok", "is-err"); }, 1800);
  };
  const copy = async (text: string) => {
    if (navigator.clipboard && window.isSecureContext) {
      try { await navigator.clipboard.writeText(text); return true; } catch { /* fall back below */ }
    }
    const area = document.createElement("textarea");
    area.value = text;
    area.setAttribute("readonly", "");
    area.style.cssText = "position:fixed;left:-9999px;top:0;opacity:0";
    document.body.append(area);
    area.select();
    let ok = false;
    try { ok = document.execCommand("copy"); } catch { ok = false; }
    area.remove();
    return ok;
  };
  const row = (act: string, icon: string, label: string, note: string, href?: string) => {
    const el = document.createElement(href ? "a" : "button");
    el.className = "tk-sp-row";
    el.dataset.act = act;
    if (href) Object.assign(el, { href, target: "_blank", rel: "noopener noreferrer" });
    else (el as HTMLButtonElement).type = "button";
    const k = document.createElement("span");
    k.className = "tk-sp-k";
    k.setAttribute("aria-hidden", "true");
    k.textContent = icon;
    const tx = document.createElement("span");
    tx.className = "tk-sp-t";
    tx.textContent = label;
    const small = document.createElement("small");
    small.textContent = note;
    el.append(k, tx, small);
    return el;
  };
  const openPanel = () => {
    if (!view) return;
    closePanel();
    panel = document.createElement("div");
    panel.className = "tk-share";
    panel.setAttribute("role", "dialog");
    panel.setAttribute("aria-label", stub.getAttribute("aria-label") || "");
    const head = document.createElement("div");
    head.className = "tk-sp-head";
    const name = document.createElement("span");
    name.textContent = view.seatNo ? `${t.panel} · ${t.stub} ${view.seatNo}` : t.panel;
    const x = document.createElement("button");
    x.type = "button";
    x.className = "tk-sp-x";
    x.setAttribute("aria-label", t.close);
    x.textContent = "×";
    head.append(name, x);
    panel.append(
      head,
      row("copy", "⧉", t.copy, url.replace(/^https?:\/\//, "").replace(/\/$/, "")),
      row("save", "↓", t.save, t.saveNote),
      row("x", "𝕏", t.x, t.xNote, xIntent(view.shareText, url)),
    );
    root.append(panel);
    root.classList.add("is-sharing");
    stub.setAttribute("aria-expanded", "true");
    placePanel();
    panel.addEventListener("click", async (e) => {
      e.stopPropagation();
      const target = e.target as HTMLElement;
      if (target.closest(".tk-sp-x")) return closePanel(true);
      const r = target.closest<HTMLElement>("[data-act]");
      if (!r) return;
      if (r.dataset.act === "copy") {
        const ok = await copy(url);
        flash(r, ok ? t.copied : t.copyFailed, ok);
      }
      if (r.dataset.act === "save") {
        const blob = await ticketPng();
        if (!blob) return flash(r, t.saveFailed, false);
        const a = document.createElement("a");
        a.href = URL.createObjectURL(blob);
        a.download = ticketFileName(slug);
        document.body.append(a);
        a.click();
        a.remove();
        window.setTimeout(() => URL.revokeObjectURL(a.href), 4000);
        flash(r, t.saved, true);
      }
      if (r.dataset.act === "x") window.setTimeout(() => closePanel(), 150);
    });
    panel.querySelector<HTMLElement>(".tk-sp-row")?.focus({ preventScroll: true });
  };
  const share = async () => {
    if (!view) return;
    if (typeof navigator.share === "function") {
      const data: ShareData = { title: `${title} · URSB`, text: view.shareText, url };
      const blob = await ticketPng();
      const file = blob ? new File([blob], ticketFileName(slug), { type: "image/png" }) : null;
      if (file && navigator.canShare?.({ files: [file] })) data.files = [file];
      try {
        await navigator.share(data);
      } catch (error) {
        if (!(error instanceof DOMException && error.name === "AbortError")) openPanel();
      }
      return;
    }
    if (panel) closePanel(); else openPanel();
  };

  stub.addEventListener("click", () => { void share(); }, { signal });
  stub.addEventListener("keydown", (e) => {
    if ((e.key !== "Enter" && e.key !== " ") || e.repeat) return;
    e.preventDefault();
    void share();
  }, { signal });
  // Draw the PNG ahead of time so system share keeps the click's user activation.
  stub.addEventListener("pointerenter", () => { void ticketPng(); }, { signal });
  stub.addEventListener("focus", () => { void ticketPng(); }, { signal });
  document.addEventListener("click", (e) => {
    if (panel && !panel.contains(e.target as Node) && !stub.contains(e.target as Node)) closePanel();
  }, { capture: true, signal });
  document.addEventListener("keydown", (e) => { if (e.key === "Escape" && panel) closePanel(true); }, { signal });
  window.addEventListener("resize", placePanel, { passive: true, signal });

  measure();
  render();
  root.dataset.ready = "true";

  return () => {
    clearInterval(timer);
    near.disconnect();
    closePanel();
    listeners.abort();
  };
}
