// Build-time per-letter subsets of the Echo handwriting font (details M7).
// `src/features/echo/assets/hand.woff2` stays the committed master (every
// glyph any letter uses, ~350KB). After the build, each letter page gets its
// own subset holding only the characters that page prints, a preload pointing
// at it and an @font-face whose unicode-range lists exactly those characters.
// Because that face is declared after the bundled stylesheet, the browser
// takes it first for every listed character and never downloads the master;
// anything outside the list (text typed by a reader, say) still falls back to
// the master face, so no glyph is ever lost. Dev keeps the master font.
import { readFile, writeFile, mkdir, readdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import path from 'node:path';
// Static import: by astro:build:done Vite's module runner is closed, so a
// dynamic import() from this config-loaded module would fail.
import subsetFont from 'subset-font';
import { fileURLToPath } from 'node:url';
import { visibleText } from '../weekly-fonts/subset.mjs';

export const HAND_SOURCE = fileURLToPath(new URL('../../src/features/echo/assets/hand.woff2', import.meta.url));
export const HAND_FAMILY = 'Echo Manuscript';
export const LETTER_ROOTS = ['echo/letters', 'en/echo/letters'];
const PRELOAD = /<link rel="preload" href="(\/_astro\/hand\.[^"]+\.woff2)"/;

async function* htmlFiles(dir) {
  if (!existsSync(dir)) return;
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) yield* htmlFiles(full);
    else if (entry.name === 'index.html') yield full;
  }
}

/** Code points of `text` written as a compact CSS unicode-range. */
export function unicodeRange(text) {
  const points = [...new Set([...text].map((ch) => ch.codePointAt(0)))].filter((cp) => cp >= 0x20).sort((a, b) => a - b);
  const parts = [];
  for (let i = 0; i < points.length; i++) {
    let end = i;
    while (end + 1 < points.length && points[end + 1] === points[end] + 1) end++;
    const hex = (n) => n.toString(16).toUpperCase();
    parts.push(end === i ? `U+${hex(points[i])}` : `U+${hex(points[i])}-${hex(points[end])}`);
    i = end;
  }
  return parts.join(', ');
}

/** Subset the handwriting font for every built letter page in `outDir`. */
export async function buildEchoHandSubsets(outDir, { log = () => {} } = {}) {
  const master = await readFile(HAND_SOURCE);
  const report = [];
  const written = new Map();
  for (const root of LETTER_ROOTS) {
    for await (const file of htmlFiles(path.join(outDir, root))) {
      let html = await readFile(file, 'utf8');
      const preload = html.match(PRELOAD);
      if (!preload) continue;
      const chars = [...new Set(visibleText(html))].filter((ch) => ch.codePointAt(0) >= 0x20).sort().join('');
      const font = await subsetFont(master, chars, { targetFormat: 'woff2' });
      const hash = createHash('sha256').update(font).digest('hex').slice(0, 10);
      const url = `/echo/fonts/hand-${hash}.woff2`;
      if (!written.has(url)) {
        const dest = path.join(outDir, url);
        await mkdir(path.dirname(dest), { recursive: true });
        await writeFile(dest, font);
        written.set(url, font.length);
      }
      const face = `<style data-echo-hand-subset>@font-face{font-family:'${HAND_FAMILY}';src:url('${url}') format('woff2');font-style:normal;font-weight:400;font-display:swap;unicode-range:${unicodeRange(chars)};}</style>`;
      html = html.replace(preload[0], preload[0].replace(preload[1], url)).replace('</head>', `${face}</head>`);
      await writeFile(file, html);
      const page = path.relative(outDir, file);
      report.push({ page, url, chars: [...chars].length, bytes: font.length });
      log(`${page} → ${url} ${[...chars].length} chars ${(font.length / 1024).toFixed(1)}KB`);
    }
  }
  return { report, master: master.length };
}
