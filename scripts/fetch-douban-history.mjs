#!/usr/bin/env node
// 拉取豆瓣读书 / 观影的完整历史（含封面），封面缩成 120×160 webp 转存到 R2。
// 输出 data/douban-history.json，供主页「那年今日」使用。
//
// 为什么走移动端接口：网页版 book/movie.douban.com/people/* 对脚本返回 403，
// m.douban.com/rexxar 在带 Referer 时可用，并且返回精确时间和封面地址。
// 为什么转存封面：doubanio 图片有防盗链，外站直接引用会 403/418。
//
// 用法：node scripts/fetch-douban-history.mjs [--force-covers]
import 'dotenv/config';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import { uploadIfChanged, publicUrl } from './lib/photos-r2.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(ROOT, 'data', 'douban-history.json');
const USER = '82387673';
const PAGE = 50;
const FORCE = process.argv.includes('--force-covers');
const UA = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148';
const HEADERS = { 'User-Agent': UA, Referer: 'https://m.douban.com/mine/' };
// 想读（mark）信号太弱，不进「那年今日」
const LISTS = [
  ['book', 'done'], ['book', 'doing'],
  ['movie', 'done'], ['movie', 'doing'],
];

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function getJson(url, tries = 3) {
  for (let i = 0; i < tries; i++) {
    try {
      const res = await fetch(url, { headers: HEADERS });
      if (res.ok) return await res.json();
      console.warn(`  HTTP ${res.status} ${url}`);
    } catch (e) {
      console.warn(`  ${e.message} ${url}`);
    }
    await sleep(1500 * (i + 1));
  }
  throw new Error(`failed: ${url}`);
}

async function fetchList(type, status) {
  const out = [];
  for (let start = 0; ; start += PAGE) {
    const url = `https://m.douban.com/rexxar/api/v2/user/${USER}/interests?type=${type}&status=${status}&start=${start}&count=${PAGE}&for_mobile=1`;
    const data = await getJson(url);
    for (const it of data.interests ?? []) {
      const s = it.subject ?? {};
      if (!s.id || !s.title) continue;
      out.push({
        id: String(s.id),
        t: type,
        s: status,
        title: s.title,
        rating: it.rating?.value ?? 0,
        date: (it.create_time ?? '').slice(0, 10),
        src: s.pic?.normal ?? s.cover_url ?? null,
      });
    }
    console.log(`  ${type}/${status}: ${Math.min(start + PAGE, data.total)}/${data.total}`);
    if (start + PAGE >= (data.total ?? 0)) break;
    await sleep(1000);
  }
  return out;
}

async function mirrorCover(item) {
  const key = `douban/${item.t}/${item.id}.webp`;
  const res = await fetch(item.src, { headers: { 'User-Agent': UA, Referer: 'https://m.douban.com/' } });
  if (!res.ok) throw new Error(`cover HTTP ${res.status}`);
  const buf = Buffer.from(await res.arrayBuffer());
  const webp = await sharp(buf).resize(120, 160, { fit: 'cover', position: 'attention' }).webp({ quality: 72 }).toBuffer();
  await uploadIfChanged({ key, body: webp, contentType: 'image/webp' });
  return publicUrl(key);
}

async function pool(items, n, fn) {
  let i = 0;
  await Promise.all(Array.from({ length: n }, async () => {
    while (i < items.length) { const k = i++; await fn(items[k], k); }
  }));
}

async function main() {
  let prev = new Map();
  try {
    const old = JSON.parse(await fs.readFile(OUT, 'utf8'));
    prev = new Map(old.items.map((x) => [`${x.t}:${x.id}`, x]));
  } catch {}

  const all = [];
  for (const [type, status] of LISTS) all.push(...await fetchList(type, status));

  // 同一条目可能既在 doing 又在 done：保留 done
  const byKey = new Map();
  for (const it of all) {
    const k = `${it.t}:${it.id}`;
    if (!byKey.has(k) || it.s === 'done') byKey.set(k, it);
  }
  const items = [...byKey.values()];

  let uploaded = 0, reused = 0, failed = 0;
  await pool(items, 6, async (it) => {
    const old = prev.get(`${it.t}:${it.id}`);
    if (old?.cover && !FORCE) { it.cover = old.cover; reused++; }
    else if (it.src) {
      try { it.cover = await mirrorCover(it); uploaded++; }
      catch (e) { failed++; console.warn(`  cover failed ${it.title}: ${e.message}`); }
    }
    delete it.src;
  });

  items.sort((a, b) => (a.date < b.date ? 1 : -1));
  await fs.writeFile(OUT, JSON.stringify({ updatedAt: new Date().toISOString(), items }, null, 1) + '\n');
  console.log(`done: ${items.length} items · covers uploaded ${uploaded}, reused ${reused}, failed ${failed} → ${path.relative(ROOT, OUT)}`);
}

main().catch((e) => { console.error(e); process.exit(1); });
