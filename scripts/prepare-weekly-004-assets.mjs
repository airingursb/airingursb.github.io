import sharp from 'sharp';
import { mkdir, writeFile } from 'node:fs/promises';
const dest = 'public/reading/weekly/004';
await mkdir(dest, { recursive: true });
const sources = {
  excaliclaw: { url: 'https://excaliclaw.com/excaliclaw-mascot.webp', page: 'https://excaliclaw.com/', kind: 'official artwork' },
  magpie: { url: 'https://usemagpie.ai/img/picker-light.png', page: 'https://usemagpie.ai/', kind: 'official screenshot' },
  mobile: { url: 'https://raw.githubusercontent.com/mobile-next/mobile-mcp/main/docs/screenshots/mobile-mirror.png', page: 'https://github.com/mobile-next/mobile-mcp', kind: 'official screenshot' },
  blender: { url: 'https://pbs.twimg.com/media/HUrvT8AWUAAtsCR.jpg?name=orig', page: 'https://x.com/yrmkejun/status/2110763227361472904', kind: 'author output' },
  jev: { url: 'https://pbs.twimg.com/media/HUo7er9aUAAM9_Y.jpg?name=orig', page: 'https://x.com/op7418/status/2110565405752496445', kind: 'release image saved by author' },
  scion: { url: 'https://www-cdn.anthropic.com/images/4zrzovbb/website/cba1eaaa67385fd00f210badaacd147de480120b-3840x1718.png', page: 'https://www.anthropic.com/engineering/redesigning-source-control', kind: 'original research figure' },
};
for (const [id, source] of Object.entries(sources)) {
  const response = await fetch(source.url);
  if (!response.ok) throw new Error(`${id}: HTTP ${response.status}`);
  const buffer = Buffer.from(await response.arrayBuffer());
  const meta = await sharp(buffer).metadata();
  await writeFile(`output/004-research/${id}-original`, buffer);
  await sharp(buffer).resize({ width: 1600, withoutEnlargement: true }).webp({ quality: 85 }).toFile(`${dest}/${id}-full.webp`);
  if (id !== 'scion') for (const width of [480, 960]) await sharp(buffer).flatten({ background: '#fff' }).resize(width, Math.round(width * 2 / 3), { fit: 'cover', position: id === 'mobile' ? 'east' : 'centre' }).webp({ quality: 82 }).toFile(`${dest}/${id}-${width}.webp`);
  source.width = meta.width; source.height = meta.height;
}
// Pass the approved illustration PNG, without masthead or cover typography.
// Complete cover PNGs are exported from the real .issue-cover DOM after build.
if (process.argv[2]) for (const width of [480, 960]) {
  await sharp(process.argv[2]).resize({ width }).webp({ quality: 84, effort: 6 }).toFile(`${dest}/cover-04-handoff-${width}.webp`);
}
for (const width of [640, 1254]) await sharp(`${dest}/comic-handoff.png`).resize(width).webp({ quality: 85 }).toFile(`${dest}/comic-${width}.webp`);
await writeFile('src/data/ai-weekly/004.images.json', JSON.stringify(sources, null, 2) + '\n');
console.log('004 assets prepared');
