// Build-time Noto Serif SC subsetting for the AI Weekly issues (H6).
// Same idea as Echo / weekly 001, which ship committed per-surface subsets,
// but computed from the built HTML so every issue only carries the glyphs it
// actually prints. See DESIGN.md → "AI Weekly fonts".
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
// Static import: by astro:build:done Vite's module runner is closed, so a
// dynamic import() from this config-loaded module would fail.
import subsetFont from 'subset-font';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);

/** Faces the weekly pages declare (see WeeklyFonts.astro). */
export const WEEKLY_FONT_WEIGHTS = [400, 700];
export const LATIN_RANGE = 'U+0000-02FF, U+2000-206F, U+20AC, U+2122, U+2190-21FF';
export const CJK_RANGE = 'U+2E80-2FFF, U+3000-9FFF, U+F900-FAFF, U+FE10-FE1F, U+FE30-FE4F, U+FF00-FFEF';

/** Issues to subset and the built pages (zh / en) whose text they cover. */
export const WEEKLY_FONT_TARGETS = [
  { issue: '005', pages: { zh: ['reading/weekly/005/index.html', 'previews/ai-weekly-005/index.html'], en: ['en/reading/weekly/005/index.html', 'en/previews/ai-weekly-005/index.html'] } },
  { issue: '004', pages: { zh: ['reading/weekly/004/index.html', 'previews/ai-weekly-004/index.html'], en: ['en/reading/weekly/004/index.html', 'en/previews/ai-weekly-004/index.html'] } },
  { issue: '002', pages: { zh: ['reading/weekly/002/index.html', 'previews/ai-weekly-002/index.html'], en: ['en/reading/weekly/002/index.html', 'en/previews/ai-weekly-002/index.html'] } },
  { issue: '003', pages: { zh: ['reading/weekly/003/index.html', 'previews/ai-weekly-003/index.html'], en: ['en/reading/weekly/003/index.html', 'en/previews/ai-weekly-003/index.html'] } },
];

export function weeklyFontUrl(issue, lang, weight, part) {
  return `/reading/weekly/${issue}/fonts/noto-serif-sc-${lang}-${weight}-${part}.woff2`;
}

const ENTITIES = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ' };

/** Visible text of an HTML document's <body> (scripts, styles and tags removed). */
export function visibleText(html) {
  const body = html.match(/<body[^>]*>([\s\S]*)<\/body>/i)?.[1] ?? html;
  return body
    .replace(/<script\b[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style\b[\s\S]*?<\/style>/gi, ' ')
    .replace(/<!--[\s\S]*?-->/g, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (match, code) => {
      if (code[0] === '#') {
        const n = code[1].toLowerCase() === 'x' ? parseInt(code.slice(2), 16) : parseInt(code.slice(1), 10);
        return Number.isFinite(n) ? String.fromCodePoint(n) : match;
      }
      return ENTITIES[code.toLowerCase()] ?? match;
    });
}

function inRanges(cp, ranges) {
  return ranges.some(([a, b]) => cp >= a && cp <= b);
}
const parseRanges = (spec) => spec.split(',').map((part) => {
  const [a, b] = part.trim().replace(/^U\+/i, '').split('-');
  return [parseInt(a, 16), parseInt(b ?? a, 16)];
});
const LATIN = parseRanges(LATIN_RANGE);
const CJK = parseRanges(CJK_RANGE);

/** Split the characters of `text` into the latin and CJK faces. */
export function splitCharacters(text) {
  const latin = new Set();
  const cjk = new Set();
  for (const ch of text) {
    const cp = ch.codePointAt(0);
    if (cp < 0x20) continue;
    if (inRanges(cp, LATIN)) latin.add(ch);
    else if (inRanges(cp, CJK)) cjk.add(ch);
  }
  return { latin: [...latin].sort().join(''), cjk: [...cjk].sort().join('') };
}

function sourceFont(subset, weight) {
  const dir = path.dirname(require.resolve('@fontsource/noto-serif-sc/package.json'));
  return path.join(dir, 'files', `noto-serif-sc-${subset}-${weight}-normal.woff2`);
}

/**
 * Write every issue/lang/weight subset into `outDir` (the built site).
 * Returns a report of { file, chars, bytes } for logging and the size record.
 */
export async function buildWeeklyFontSubsets(outDir, { targets = WEEKLY_FONT_TARGETS, log = () => {} } = {}) {
  const report = [];
  const cache = new Map();
  const load = async (file) => {
    if (!cache.has(file)) cache.set(file, await readFile(file));
    return cache.get(file);
  };
  for (const target of targets) {
    for (const [lang, pages] of Object.entries(target.pages)) {
      let text = '';
      for (const page of pages) {
        const file = path.join(outDir, page);
        if (existsSync(file)) text += visibleText(await readFile(file, 'utf8'));
      }
      if (!text) continue;
      const { latin, cjk } = splitCharacters(text);
      for (const weight of WEEKLY_FONT_WEIGHTS) {
        for (const [part, chars, subset] of [['cjk', cjk, 'chinese-simplified'], ['latin', latin, 'latin']]) {
          // English pages set Latin in the system serif; only their CJK names need Noto.
          if (lang === 'en' && part === 'latin') continue;
          const source = await load(sourceFont(subset, weight));
          const output = await subsetFont(source, chars || ' ', { targetFormat: 'woff2' });
          const url = weeklyFontUrl(target.issue, lang, weight, part);
          const dest = path.join(outDir, url);
          await mkdir(path.dirname(dest), { recursive: true });
          await writeFile(dest, output);
          report.push({ file: url, chars: [...chars].length, bytes: output.length });
          log(`${url} ${[...chars].length} chars ${(output.length / 1024).toFixed(1)}KB`);
        }
      }
    }
  }
  return report;
}
