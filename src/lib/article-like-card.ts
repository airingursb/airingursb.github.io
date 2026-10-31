/**
 * The like card under the closing date (L3). The like API and its optimistic
 * update stay in PostLayout's inline script, which reports every change as an
 * `article:like-state` event (and mirrors it on the button's data-liked /
 * data-count). This module only paints: subtitle, aria state, the counter
 * rolling to the new number and the heart pop.
 */

export const LIKE_STATE_EVENT = "article:like-state";

export type LikeState = { readonly liked: boolean; readonly count: number };
export type LikeStateDetail = LikeState & { readonly animate?: boolean };

export type LikeCardStrings = {
  readonly ask: string;
  readonly done: string;
  readonly hint: string;
  readonly thanks: string;
  readonly like: string;
  readonly unlike: string;
};

export type OdometerDigit = { readonly from: string; readonly to: string; readonly roll: boolean };

/**
 * Digits of `next`, each paired with the digit it rolls from. Numbers that
 * gain a digit roll the new leading digit in from blank.
 */
export function odometer(previous: number | null, next: number): OdometerDigit[] {
  const to = String(Math.max(0, Math.round(next)));
  if (previous === null || previous === next) return [...to].map((d) => ({ from: d, to: d, roll: false }));
  const from = String(Math.max(0, Math.round(previous))).padStart(to.length, " ").slice(-to.length);
  return [...to].map((d, i) => ({ from: from[i] === " " ? "" : from[i], to: d, roll: from[i] !== d }));
}

/** Like state the inline script left on the button (it may run first). */
export function readLikeState(button: HTMLElement): LikeState | null {
  const count = Number(button.dataset.count);
  if (button.dataset.count === undefined || !Number.isFinite(count)) return null;
  return { liked: button.dataset.liked === "true", count };
}

const HTML_ESCAPES: Record<string, string> = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" };
const escapeHtml = (s: string) => s.replace(/[&<>"]/g, (c) => HTML_ESCAPES[c]);

export function mountArticleLikeCard(root: HTMLElement): () => void {
  const button = root.querySelector<HTMLButtonElement>("[data-like-card]");
  const title = root.querySelector<HTMLElement>("[data-like-title]");
  const hint = root.querySelector<HTMLElement>("[data-like-hint]");
  const counter = root.querySelector<HTMLElement>("[data-like-count]");
  if (!button || !title || !hint || !counter) return () => {};
  const t: LikeCardStrings = JSON.parse(root.dataset.strings || "{}");
  let shown: number | null = null;
  let popTimer = 0;

  const paint = ({ liked, count, animate }: LikeStateDetail) => {
    const digits = odometer(animate ? shown : null, count);
    counter.innerHTML = digits.map((d) => `<span class="alk-od"><span class="alk-od-col${d.roll ? " is-roll" : ""}"><i>${escapeHtml(d.from)}</i><i>${escapeHtml(d.to)}</i></span></span>`).join("");
    shown = count;
    button.classList.toggle("is-on", liked);
    button.setAttribute("aria-pressed", String(liked));
    button.setAttribute("aria-label", (liked ? t.unlike : t.like).replace("{n}", String(count)));
    title.textContent = liked ? t.done : t.ask;
    hint.textContent = liked ? t.thanks : t.hint;
    if (animate && liked) {
      button.classList.remove("is-pop");
      void button.offsetWidth;
      button.classList.add("is-pop");
      clearTimeout(popTimer);
      popTimer = window.setTimeout(() => button.classList.remove("is-pop"), 700);
    }
  };
  const onState = (event: Event) => paint((event as CustomEvent<LikeStateDetail>).detail);
  button.addEventListener(LIKE_STATE_EVENT, onState);
  const initial = readLikeState(button);
  if (initial) paint(initial);

  return () => {
    clearTimeout(popTimer);
    button.removeEventListener(LIKE_STATE_EVENT, onState);
  };
}
