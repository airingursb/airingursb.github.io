/**
 * Reading ticket at the article foot (票根 B): information only, the stub is
 * the share entry. Pure half: what the ticket says for a given reading
 * session. Every field comes from real data; a field without data is hidden
 * (null) instead of guessed:
 *   date, time, sections read, images, words — measured in the page
 *   seat        — GET /api/posts/:slug/views (pv) + 1
 *   from        — the reader's country from POST /api/online/heartbeat
 *   regions     — GET /api/posts/:slug/view-regions (only with a real sample)
 */

export type TicketLang = "zh" | "en";

export type TicketInput = {
  readonly lang: TicketLang;
  readonly title: string;
  readonly slug: string;
  readonly now: Date;
  /** Active reading seconds in this visit. */
  readonly seconds: number;
  /** Estimated reading time of the article (minutes). */
  readonly minutes: number;
  /** Sections read / total; total 0 = the article has no sections → percent. */
  readonly read: number;
  readonly total: number;
  /** Share of the article scrolled through (0–1), for articles without sections. */
  readonly progress: number;
  readonly images: number;
  readonly words: number;
  readonly views: number | null;
  readonly country: { readonly code: string; readonly name: string } | null;
  readonly regions: number | null;
  readonly liked: boolean;
  readonly likes: number;
};

export type TicketView = {
  readonly skim: boolean;
  readonly admit: string;
  readonly date: string;
  readonly time: string;
  readonly readCell: string;
  readonly seat: string | null;
  readonly seatNo: string | null;
  readonly from: { readonly code: string; readonly name: string } | null;
  readonly fine: string;
  readonly sumBig: string;
  readonly sumSmall: string;
  readonly sumState: string;
  readonly code: string;
  readonly echo: { readonly likes: string; readonly date: string } | null;
  readonly shareText: string;
};

/** Regions are only worth a mention with a real sample (same bar as the old sidebar map). */
export const REGIONS_MIN_LOCATED = 20;
export const REGIONS_MIN_COUNT = 3;

const STRINGS = {
  zh: {
    admit: "ADMIT ONE", half: "半程 · 未检票", sec: "{n} 秒", min: "{n} 分钟", sections: "{r}/{t} 节",
    seat: "第 {n} 位", images: "{n} 张配图", words: "{n} 字",
    regions: "读者来自 {n} 个地区", skimLine: "跳读到结尾 · 还剩约 {n} 分钟 · 读完回来检票",
    done: "节 · 读完", halfway: "节 · 读到一半", pctDone: "读完", pctHalf: "读到一半",
    share: "我读完了《{t}》", shareTail: "，{r} · {d}", shareSkim: "我在读《{t}》",
  },
  en: {
    admit: "ADMIT ONE", half: "HALFWAY · UNCHECKED", sec: "{n} s", min: "{n} min", sections: "{r}/{t} sections",
    seat: "No. {n}", images: "{n} images", words: "{n} words",
    regions: "readers from {n} regions", skimLine: "Skimmed to the end · about {n} min left · come back to check in",
    done: "sections · done", halfway: "sections · halfway", pctDone: "done", pctHalf: "halfway",
    share: "I read “{t}”", shareTail: " — {r} · {d}", shareSkim: "Reading “{t}”",
  },
} as const;

const fill = (s: string, values: Record<string, string | number>) =>
  s.replace(/\{(\w)\}/g, (_, k: string) => String(values[k] ?? ""));
const pad2 = (n: number) => String(n).padStart(2, "0");
export const formatCount = (n: number) => Math.round(n).toLocaleString("en-US");

export function isoDay(d: Date) {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

/** Short duration: under a minute in seconds, otherwise rounded minutes. */
export function shortDuration(seconds: number, lang: TicketLang) {
  const t = STRINGS[lang];
  const s = Math.max(0, Math.round(seconds));
  return s >= 60 ? fill(t.min, { n: Math.round(s / 60) }) : fill(t.sec, { n: s });
}

/**
 * Skimmed: less than 35% of the estimated time, or under 60% of the sections
 * (60% of the article when it has none).
 */
export function isSkim(input: Pick<TicketInput, "seconds" | "minutes" | "read" | "total" | "progress">) {
  const fast = input.seconds < Math.max(1, input.minutes) * 60 * 0.35;
  const part = input.total > 0 ? input.read / input.total : input.progress;
  return fast || part < 0.6;
}

/** Ticket number: slug letters + seat (or the date when the seat is unknown). */
export function ticketCode(slug: string, seat: number | null, now: Date) {
  const head = slug.replace(/[^a-z0-9]+/gi, "").slice(0, 4).toUpperCase() || "POST";
  const tail = seat === null ? isoDay(now).replace(/-/g, "") : String(seat).padStart(6, "0");
  return `URSB-${head}-${tail}`;
}

/** Barcode bar widths (1–3), deterministic per code. */
export function barcode(seed: string, count: number): number[] {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  const out: number[] = [];
  for (let k = 0; k < count; k++) {
    h = (Math.imul(h, 1103515245) + 12345) >>> 0;
    out.push(1 + ((h >>> 16) % 3));
  }
  return out;
}

/** Sections whose end has scrolled above the viewport bottom (+40px). */
export function sectionsRead(ends: readonly number[], viewportBottom: number) {
  return ends.filter((end) => end <= viewportBottom + 40).length;
}

export function buildTicket(input: TicketInput): TicketView {
  const t = STRINGS[input.lang];
  const skim = isSkim(input);
  const percent = input.total === 0;
  const pct = Math.round(Math.min(1, Math.max(0, input.progress)) * 100);
  const time = shortDuration(input.seconds, input.lang);
  const readCell = percent ? `${pct}%` : fill(t.sections, { r: input.read, t: input.total });
  const seat = input.views === null ? null : input.views + 1;
  // What is left: the unread part, or (when the reader went too fast) the estimate minus the time spent.
  const unread = input.minutes * (1 - (percent ? pct / 100 : input.read / Math.max(1, input.total)));
  const left = Math.max(1, Math.round(Math.max(unread, input.minutes - input.seconds / 60)));
  const fine = skim
    ? fill(t.skimLine, { n: left })
    : [
        input.images > 0 ? fill(t.images, { n: input.images }) : "",
        input.words > 0 ? fill(t.words, { n: formatCount(input.words) }) : "",
        input.regions !== null ? fill(t.regions, { n: input.regions }) : "",
      ].filter(Boolean).join(" · ");
  const share = skim
    ? fill(t.shareSkim, { t: input.title })
    : fill(t.share, { t: input.title }) + fill(t.shareTail, { r: readCell, d: time });
  return {
    skim,
    admit: skim ? t.half : t.admit,
    date: isoDay(input.now),
    time,
    readCell,
    seat: seat === null ? null : fill(t.seat, { n: formatCount(seat) }),
    seatNo: seat === null ? null : `No.${String(seat).padStart(6, "0")}`,
    from: input.country,
    fine,
    sumBig: percent ? String(pct) : String(input.read),
    sumSmall: percent ? "%" : `/${input.total}`,
    sumState: percent ? (skim ? t.pctHalf : t.pctDone) : skim ? t.halfway : t.done,
    code: ticketCode(input.slug, seat, input.now),
    echo: input.liked ? { likes: `♥ ${input.likes}`, date: `${pad2(input.now.getMonth() + 1)}.${pad2(input.now.getDate())}` } : null,
    shareText: share,
  };
}

/** X / Twitter intent for the share panel. */
export function xIntent(text: string, url: string) {
  return `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`;
}

export const ticketFileName = (slug: string) => `ursb-${slug}-ticket.png`;
