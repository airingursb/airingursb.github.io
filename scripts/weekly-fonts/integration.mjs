import { fileURLToPath } from 'node:url';
import { buildWeeklyFontSubsets } from './subset.mjs';
import { buildEchoHandSubsets } from '../echo-fonts/hand-subset.mjs';

/** Astro integration: subset the AI Weekly serif and the Echo handwriting after the pages are built. */
export function weeklyFontSubset() {
  return {
    name: 'weekly-font-subset',
    hooks: {
      'astro:build:done': async ({ dir, logger }) => {
        const report = await buildWeeklyFontSubsets(fileURLToPath(dir), { log: (line) => logger.info(line) });
        const total = report.reduce((sum, item) => sum + item.bytes, 0);
        logger.info(`AI Weekly serif subsets: ${report.length} files, ${(total / 1024).toFixed(1)}KB total`);
        const echo = await buildEchoHandSubsets(fileURLToPath(dir));
        const sizes = echo.report.map((item) => item.bytes);
        if (sizes.length) logger.info(`Echo handwriting subsets: ${sizes.length} letter pages, ${(Math.min(...sizes) / 1024).toFixed(1)}–${(Math.max(...sizes) / 1024).toFixed(1)}KB each (master ${(echo.master / 1024).toFixed(1)}KB)`);
      },
    },
  };
}
