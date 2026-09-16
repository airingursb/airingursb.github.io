// Run: node scripts/bear-stories/workshop/make-evidence.mjs
import sharp from 'sharp';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import path from 'node:path';
const root = 'output/bear-stories/revision-2/workshop';
const picks = new Set([0, 30, 48, 60, 90, 120, 150, 180]);
for (const variant of ['before', 'after']) {
  const asset = path.join(root, variant, 'workshop-atlas.webp');
  for (const [theme, background] of [['dark', '#151719'], ['light', '#ffffff']]) {
    const directory = path.join(root, variant, `${theme}-frames`);
    await mkdir(directory, { recursive: true });
    for (let index = 0; index < 181; index++) {
      const name = String(index + 1).padStart(4, '0');
      const frame = sharp(asset).extract({ left: index % 10 * 384, top: Math.floor(index / 10) * 216, width: 384, height: 216 }).flatten({ background });
      await frame.clone().png().toFile(path.join(directory, `${name}.png`));
      if (picks.has(index)) await frame.clone().resize(1152, 648, { kernel: 'nearest' }).png().toFile(path.join(root, variant, `${name}-${theme}-3x.png`));
    }
    for (const scale of [1, 3]) execFileSync('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', '-framerate', '12', '-i', path.join(directory, '%04d.png'), '-vf', `scale=iw*${scale}:ih*${scale}:flags=neighbor`, '-c:v', 'libx264', '-preset', 'fast', '-crf', '10', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', path.join(root, variant, `motion-${theme}-${scale}x.mp4`)], { stdio: 'inherit' });
  }
}
const before = (await readFile(path.join(root, 'before/workshop-atlas.webp'))).toString('base64');
const after = (await readFile(path.join(root, 'after/workshop-atlas.webp'))).toString('base64');
await writeFile(path.join(root, 'after/comparison.html'), `<!doctype html><html lang="en"><meta charset="utf-8"><title>Workshop full-action processing comparison</title><style>body{font:16px system-ui;margin:24px;background:#151719;color:#eee}button,input,select{font:inherit;margin:8px;padding:8px}canvas{image-rendering:pixelated;background:#151719;display:block}label{display:inline-block}#frame{font-variant-numeric:tabular-nums}</style><h1>Workshop: before / after</h1><p>Diagnostic viewer. All 181 authored frames; no runtime UI changes. Toggle either asset at the same frame.</p><label>Asset <select id="variant"><option>after</option><option>before</option></select></label><label>Scale <select id="scale"><option value="1">1× (384×216)</option><option value="3">3× (1152×648)</option></select></label><label>Theme <select id="theme"><option value="#151719">dark</option><option value="#ffffff">light</option></select></label><button id="play">Play full action</button><label>Frame <input id="timeline" type="range" min="0" max="180" value="0"></label><span id="frame">0 / 180</span><canvas width="384" height="216"></canvas><script>const images={before:new Image(),after:new Image()};images.before.src='data:image/webp;base64,${before}';images.after.src='data:image/webp;base64,${after}';const canvas=document.querySelector('canvas'),ctx=canvas.getContext('2d'),variant=document.querySelector('#variant'),scale=document.querySelector('#scale'),theme=document.querySelector('#theme'),timeline=document.querySelector('#timeline'),label=document.querySelector('#frame');let index=0,started=0,playing=false,request=0;function draw(){ctx.clearRect(0,0,384,216);ctx.imageSmoothingEnabled=false;ctx.drawImage(images[variant.value],index%10*384,Math.floor(index/10)*216,384,216,0,0,384,216);canvas.style.width=(384*Number(scale.value))+'px';canvas.style.height=(216*Number(scale.value))+'px';canvas.style.background=theme.value;timeline.value=String(index);label.textContent=index+' / 180';}function tick(now){index=Math.min(180,Math.floor((now-started)*.012));draw();if(index<180&&playing)request=requestAnimationFrame(tick);else playing=false;}for(const input of [variant,scale,theme])input.onchange=draw;timeline.oninput=()=>{playing=false;cancelAnimationFrame(request);index=Number(timeline.value);draw();};document.querySelector('#play').onclick=()=>{cancelAnimationFrame(request);playing=true;started=performance.now();request=requestAnimationFrame(tick);};images.after.onload=draw;</script></html>`);
console.log('Saved full-action 1x/3x light/dark evidence and exact-raster comparison viewer');
