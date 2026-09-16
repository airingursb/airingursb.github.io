import sharp from 'sharp';
import assert from 'node:assert/strict';
import { cp, mkdir, stat, writeFile } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';

const root = 'output/bear-stories/revision-2/suitcase';
const width = 480, height = 270;
const themes = [['dark', '#0d1117'], ['light', '#ffffff']];
const samples = [0, 18, 36, 54, 63, 65, 72, 90, 108, 126, 144, 162, 179];
const frames = [];
await mkdir(`${root}/after`, { recursive: true });
await cp('public/bear-stories/suitcase', `${root}/after/public`, { recursive: true });
for (const clip of ['open', 'close']) {
  await mkdir(`${root}/after/${clip}/frames`, { recursive: true });
  for (let chunk = 0; chunk < 4; chunk++) {
    const file = `${clip}-${chunk}.webp`;
    const [master, delivered] = await Promise.all([
      sharp(`${root}/after/lossless-master/${file}`).ensureAlpha().raw().toBuffer(),
      sharp(`public/bear-stories/suitcase/${file}`).ensureAlpha().raw().toBuffer(),
    ]);
    for (let cell = 0; cell < Math.min(48, 180 - chunk * 48); cell++) {
      const index = chunk * 48 + cell;
      const pixels = Buffer.alloc(width * height * 4);
      const metric = { clip, index, alphaChanges: 0, maxRgb: 0, maxCompositeDark: 0, maxCompositeLight: 0, maxCompositeGray: 0, creamMaxRgb: 0 };
      for (let y = 0; y < height; y++) {
        const offset = ((Math.floor(cell / 6) * height + y) * width * 6 + cell % 6 * width) * 4;
        delivered.copy(pixels, y * width * 4, offset, offset + width * 4);
        for (let x = 0; x < width; x++) {
          const i = offset + x * 4;
          if (master[i + 3] !== delivered[i + 3]) metric.alphaChanges++;
          if (!master[i + 3]) continue;
          for (let c = 0; c < 3; c++) {
            const delta = Math.abs(master[i + c] - delivered[i + c]);
            metric.maxRgb = Math.max(metric.maxRgb, delta);
            if (master[i] > 190 && master[i + 1] > 180 && master[i + 2] > 120) metric.creamMaxRgb = Math.max(metric.creamMaxRgb, delta);
            for (const [key, background] of [['maxCompositeDark', [13, 17, 23][c]], ['maxCompositeLight', 255], ['maxCompositeGray', 128]]) {
              const a = master[i + c] * master[i + 3] / 255 + background * (1 - master[i + 3] / 255);
              const b = delivered[i + c] * delivered[i + 3] / 255 + background * (1 - delivered[i + 3] / 255);
              metric[key] = Math.max(metric[key], Math.abs(a - b));
            }
          }
        }
      }
      frames.push(metric);
      const frame = `${String(index + 1).padStart(4, '0')}.png`;
      const png = await sharp(pixels, { raw: { width, height, channels: 4 } }).png().toBuffer();
      await writeFile(`${root}/after/${clip}/frames/${frame}`, png);
      if (!samples.includes(index)) continue;
      for (const [theme, background] of themes) {
        const before = await sharp(`${root}/before/${clip}/${frame}`).flatten({ background }).png().toBuffer();
        const after = await sharp(png).flatten({ background }).png().toBuffer();
        await sharp({ create: { width: width * 2, height, channels: 3, background } }).composite([{ input: before, left: 0, top: 0 }, { input: after, left: width, top: 0 }]).png().toFile(`${root}/after/${clip}/${theme}-${index}-toggle-1x.png`);
        const closeups = await Promise.all([before, after].map(input => sharp(input).extract({ left: 85, top: 50, width: 305, height: 175 }).resize(915, 525, { kernel: 'nearest' }).png().toBuffer()));
        await sharp({ create: { width: 915, height: 1050, channels: 3, background } }).composite(closeups.map((input, i) => ({ input, left: 0, top: i * 525 }))).png().toFile(`${root}/after/${clip}/${theme}-${index}-toggle-3x.png`);
      }
    }
  }
  for (const [theme, background] of themes) for (const scale of [1, 3]) {
    execFileSync('ffmpeg', ['-y', '-v', 'error', '-framerate', '18', '-i', `${root}/after/${clip}/frames/%04d.png`, '-f', 'lavfi', '-i', `color=c=${background}:s=480x270:r=18`, '-filter_complex', `[1:v][0:v]overlay=shortest=1,scale=${width * scale}:${height * scale}:flags=neighbor`, '-frames:v', '180', '-c:v', 'libx264', '-crf', '12', '-pix_fmt', 'yuv444p', '-an', '-movflags', '+faststart', `${root}/after/${clip}/${theme}-${scale}x-full-sequence.mp4`]);
  }
}
const summary = { frames: frames.length, alphaChanges: frames.reduce((n, frame) => n + frame.alphaChanges, 0), maxRgb: Math.max(...frames.map(frame => frame.maxRgb)), maxComposite: Math.max(...frames.flatMap(frame => [frame.maxCompositeDark, frame.maxCompositeLight, frame.maxCompositeGray])), creamMaxRgb: Math.max(...frames.map(frame => frame.creamMaxRgb)) };
const sizes = [];
for (const clip of ['open', 'close']) for (let chunk = 0; chunk < 4; chunk++) {
  const file = `${clip}-${chunk}.webp`;
  sizes.push({ file, masterBytes: (await stat(`${root}/after/lossless-master/${file}`)).size, publicBytes: (await stat(`public/bear-stories/suitcase/${file}`)).size, requestedInFullFlow: clip === 'open' || chunk < 3 });
}
await writeFile(`${root}/encoding-regression.json`, JSON.stringify({ summary, sizes, frames }, null, 2));
assert.equal(summary.alphaChanges, 0);
assert.ok(summary.maxRgb <= 4 && summary.maxComposite <= 4.00001 && summary.creamMaxRgb <= 4);
await writeFile(`${root}/review.html`, `<!doctype html><meta charset="utf-8"><title>Suitcase matte comparison</title><style>body{margin:24px;background:#0d1117;color:#ddd;font:14px system-ui}header{position:sticky;top:0;background:#222;padding:12px;z-index:1}label{margin-right:20px}main{display:flex;gap:20px;width:max-content}img{image-rendering:pixelated;display:block}h2{font:inherit}</style><header><label>Sequence <select id="clip"><option>open</option><option>close</option></select></label><label>Frame <input id="frame" type="range" min="0" max="179" value="0"><output id="value">0</output></label><label>Scale <select id="scale"><option value="1">1x</option><option value="3">3x</option></select></label><label>Background <select id="theme"><option value="#0d1117">Dark</option><option value="#ffffff">Light</option><option value="#808080">Gray</option></select></label></header><main><section><h2>Before</h2><img id="before"></section><section><h2>Delivered</h2><img id="after"></section></main><script>const clip=document.querySelector('#clip'),frame=document.querySelector('#frame'),scale=document.querySelector('#scale'),theme=document.querySelector('#theme');function update(){const file=String(Number(frame.value)+1).padStart(4,'0')+'.png';document.querySelector('#value').value=frame.value;document.body.style.background=theme.value;document.querySelector('#before').src='before/'+clip.value+'/'+file;document.querySelector('#after').src='after/'+clip.value+'/frames/'+file;for(const image of document.images)image.width=480*Number(scale.value)}for(const input of [clip,frame,scale,theme])input.addEventListener('input',update);update();</script>`);
console.log(JSON.stringify({ summary, totalMasterBytes: sizes.reduce((n, item) => n + item.masterBytes, 0), totalPublicBytes: sizes.reduce((n, item) => n + item.publicBytes, 0), firstFlowBytes: sizes.filter(item => item.requestedInFullFlow).reduce((n, item) => n + item.publicBytes, 0) }));
