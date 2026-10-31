/**
 * Filmstrip index (胶片 C, `$ ranger figures/`): opt-in per post with
 * frontmatter `filmstrip: true`. Desktop: a sticky ranger in the right rail
 * (preview of the current figure + list); everywhere: the same strip at the
 * bottom of the image lightbox. Pure helpers here; DOM: article-filmstrip-rail.
 */

/** Fewer figures than this: no filmstrip, the page stays as it is. */
export const FILMSTRIP_MIN = 3;

export const pad2 = (n: number) => String(n).padStart(2, "0");

type Span = { readonly top: number; readonly bottom: number };

/**
 * Current figure: the last one whose top is above 55% of the viewport. `on`
 * while it is still visible; `before` = the reader has not reached the first.
 */
export function currentFigure(boxes: readonly Span[], viewportHeight: number): { index: number; on: boolean; before: boolean } {
  let index = -1;
  for (let i = 0; i < boxes.length; i++) {
    if (boxes[i].top <= viewportHeight * 0.55) index = i;
    else break;
  }
  if (index < 0) return { index: boxes.length ? 0 : -1, on: false, before: true };
  const box = boxes[index];
  return { index, on: box.bottom > 40 && box.top < viewportHeight, before: false };
}

/** Caption: alt text, else the caption under the image, else "section · fig N". */
export function figureCaptions(figures: readonly { alt: string; caption: string; section: string }[], untitled: string, figure: string): string[] {
  const counts = new Map<string, number>();
  return figures.map((f) => {
    const own = (f.alt || f.caption).trim().replace(/[。.]$/, "");
    if (own) return own;
    const name = f.section || untitled;
    const n = (counts.get(name) ?? 0) + 1;
    counts.set(name, n);
    return `${name} · ${figure.replace("{n}", String(n))}`;
  });
}

/** Figures of the article (not emoji, flags, math, the like card or the panda). */
export function articleImages(content: HTMLElement): HTMLImageElement[] {
  return Array.from(content.querySelectorAll<HTMLImageElement>("img")).filter((img) =>
    !img.closest(".katex, .article-coda, .article-like, .editorial-actor")
    && !img.classList.contains("c-flag")
    && !/emoji|sticker/i.test(`${img.className} ${img.getAttribute("src") || ""}`));
}
