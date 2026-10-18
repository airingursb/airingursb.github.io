#!/usr/bin/env node
// Refresh src/data/post-image-sizes.json — intrinsic sizes of the remote images
// used in posts and notes, read by src/plugins/rehype-post-images.mjs so body
// images get width/height without the build touching the network.
//
//   node scripts/build-post-image-sizes.mjs          # fetch only new URLs
//   node scripts/build-post-image-sizes.mjs --all    # re-measure everything
//
// Only the first 64 KB of each image is requested (HTTP Range); PNG, GIF,
// JPEG (with EXIF orientation) and WebP headers are parsed locally.

import fs from 'node:fs';
import path from 'node:path';
import { unified } from 'unified';
import remarkParse from 'remark-parse';
import { visit } from 'unist-util-visit';

const OUT = path.resolve('src/data/post-image-sizes.json');
const ROOTS = ['src/content/posts', 'src/content/notes'];
const all = process.argv.includes('--all');

function files(dir) {
  const out = [];
  for (const f of fs.readdirSync(dir)) {
    const p = path.join(dir, f);
    if (fs.statSync(p).isDirectory()) out.push(...files(p));
    else if (/\.mdx?$/.test(f)) out.push(p);
  }
  return out;
}

function collectUrls() {
  const urls = new Set();
  for (const root of ROOTS) {
    for (const f of files(root)) {
      const src = fs.readFileSync(f, 'utf8');
      const tree = unified().use(remarkParse).parse(src.replace(/^---[\s\S]*?---/, ''));
      visit(tree, 'image', (n) => { if (/^https?:\/\//.test(n.url)) urls.add(n.url); });
      for (const m of src.matchAll(/<img[^>]*\ssrc=["'](https?:[^"']+)["']/g)) urls.add(m[1]);
    }
  }
  return [...urls];
}

const u16be = (b, o) => (b[o] << 8) | b[o + 1];
const u16le = (b, o) => b[o] | (b[o + 1] << 8);
const u32be = (b, o) => ((b[o] << 24) >>> 0) + (b[o + 1] << 16) + (b[o + 2] << 8) + b[o + 3];
const u24le = (b, o) => b[o] | (b[o + 1] << 8) | (b[o + 2] << 16);

function exifOrientation(b, start, len) {
  // APP1: "Exif\0\0" + TIFF header
  if (b.toString('latin1', start, start + 4) !== 'Exif') return 1;
  const t = start + 6;
  const le = b.toString('latin1', t, t + 2) === 'II';
  const r16 = (o) => (le ? u16le(b, o) : u16be(b, o));
  const r32 = (o) => (le ? (b[o] | (b[o + 1] << 8) | (b[o + 2] << 16) | (b[o + 3] << 24)) >>> 0 : u32be(b, o));
  const ifd = t + r32(t + 4);
  if (ifd + 2 > start + len) return 1;
  const n = r16(ifd);
  for (let i = 0; i < n; i++) {
    const e = ifd + 2 + i * 12;
    if (e + 12 > b.length) break;
    if (r16(e) === 0x0112) return r16(e + 8);
  }
  return 1;
}

export function parseSize(b) {
  if (b.length >= 24 && b[0] === 0x89 && b.toString('latin1', 1, 4) === 'PNG') {
    return [u32be(b, 16), u32be(b, 20)];
  }
  if (b.length >= 10 && b.toString('latin1', 0, 3) === 'GIF') return [u16le(b, 6), u16le(b, 8)];
  if (b.length >= 30 && b.toString('latin1', 0, 4) === 'RIFF' && b.toString('latin1', 8, 12) === 'WEBP') {
    const kind = b.toString('latin1', 12, 16);
    if (kind === 'VP8X') return [u24le(b, 24) + 1, u24le(b, 27) + 1];
    if (kind === 'VP8 ') return [u16le(b, 26) & 0x3fff, u16le(b, 28) & 0x3fff];
    if (kind === 'VP8L') {
      const bits = b[21] | (b[22] << 8) | (b[23] << 16) | (b[24] << 24);
      return [(bits & 0x3fff) + 1, ((bits >> 14) & 0x3fff) + 1];
    }
  }
  if (b[0] === 0xff && b[1] === 0xd8) {
    let o = 2;
    let orientation = 1;
    while (o + 9 < b.length) {
      if (b[o] !== 0xff) { o++; continue; }
      const marker = b[o + 1];
      if (marker === 0xd8 || (marker >= 0xd0 && marker <= 0xd7) || marker === 0x01 || marker === 0xff) { o += marker === 0xff ? 1 : 2; continue; }
      const len = u16be(b, o + 2);
      if (marker === 0xe1) orientation = exifOrientation(b, o + 4, len - 2);
      if (marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc) {
        const h = u16be(b, o + 5);
        const w = u16be(b, o + 7);
        return orientation >= 5 && orientation <= 8 ? [h, w] : [w, h];
      }
      o += 2 + len;
    }
  }
  return null;
}

async function measure(url) {
  for (const end of [65535, 524287]) {
    try {
      const res = await fetch(url, { headers: { Range: `bytes=0-${end}` }, signal: AbortSignal.timeout(20000) });
      if (!res.ok) return null;
      const buf = Buffer.from(await res.arrayBuffer());
      const size = parseSize(buf);
      if (size && size[0] > 0 && size[1] > 0) return size;
      if (buf.length <= end) return null; // whole file already read
    } catch {
      return null;
    }
  }
  return null;
}

async function main() {
  const prev = !all && fs.existsSync(OUT) ? JSON.parse(fs.readFileSync(OUT, 'utf8')) : {};
  const urls = collectUrls();
  const todo = urls.filter((u) => !prev[u]);
  console.log(`${urls.length} image URLs, ${todo.length} to measure`);
  const out = { ...prev };
  let failed = 0;
  let i = 0;
  const worker = async () => {
    while (i < todo.length) {
      const url = todo[i++];
      const size = await measure(url);
      if (size) out[url] = size; else failed++;
    }
  };
  await Promise.all(Array.from({ length: 12 }, worker));
  const sorted = Object.fromEntries(Object.keys(out).filter((u) => urls.includes(u)).sort().map((u) => [u, out[u]]));
  fs.writeFileSync(OUT, JSON.stringify(sorted, null, 0).replace(/\],"/g, '],\n"') + '\n');
  console.log(`wrote ${Object.keys(sorted).length} sizes, ${failed} failed`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === new URL(import.meta.url).pathname) main();
