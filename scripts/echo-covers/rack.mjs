// Small JPEG covers for the homepage Echo rack.
//
// The share cards in public/echo/share/NN-{zh,en}.png are 540×720 PNGs
// (~300KB each). The rack shows twelve of them at once, at most ~170px wide,
// so it reads 360×480 JPEGs from public/echo/rack/ instead. A cover is
// (re)written only when its share card is newer, so a new issue's share card
// gets its rack cover on the next dev start or build without a manual step.
//
//   node scripts/echo-covers/rack.mjs        # write missing / stale covers
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

export const RACK_WIDTH = 360;
export const RACK_HEIGHT = 480;

export async function buildEchoRackCovers(root = process.cwd(), { log = () => {} } = {}) {
  const src = path.join(root, 'public/echo/share');
  const out = path.join(root, 'public/echo/rack');
  if (!fs.existsSync(src)) return [];
  fs.mkdirSync(out, { recursive: true });
  const written = [];
  for (const name of fs.readdirSync(src).sort()) {
    const m = /^(\d{2,})-(zh|en)\.png$/.exec(name);
    if (!m) continue;
    const from = path.join(src, name);
    const to = path.join(out, `${m[1]}-${m[2]}.jpg`);
    // A fresh clone writes both files within a moment of each other; allow a second of slack.
    if (fs.existsSync(to) && fs.statSync(to).mtimeMs + 1000 >= fs.statSync(from).mtimeMs) continue;
    await sharp(from)
      .resize(RACK_WIDTH, RACK_HEIGHT, { fit: 'cover', position: 'top' })
      .flatten({ background: '#f4efe1' })
      .jpeg({ quality: 76, mozjpeg: true, progressive: true })
      .toFile(to);
    const bytes = fs.statSync(to).size;
    written.push({ name: path.basename(to), bytes });
    log(`echo rack cover ${path.basename(to)} ${(bytes / 1024).toFixed(1)}KB`);
  }
  return written;
}

/** Astro integration: make sure every share card has a rack cover before pages render. */
export function echoRackCovers() {
  return {
    name: 'echo-rack-covers',
    hooks: {
      'astro:config:setup': async ({ config, logger }) => {
        const written = await buildEchoRackCovers(fileURLToPath(config.root), { log: (line) => logger.info(line) });
        if (written.length) logger.info(`Echo rack covers: wrote ${written.length}`);
      },
    },
  };
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  const written = await buildEchoRackCovers(process.cwd(), { log: console.log });
  console.log(`${written.length} cover(s) written`);
}
