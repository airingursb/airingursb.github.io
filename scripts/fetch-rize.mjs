#!/usr/bin/env node
// Pull work-time data from the Rize public API into src/data/rize.json for
// the homepage Work Sessions card.
//
//   days   — one row per Rize day: work / meeting / break hours and hours per
//            category bucket (from `summaries`, fetched a month at a time
//            because a year in one call times out).
//   hourly — minutes worked / in meetings / on break per clock hour, last 60
//            calendar days (from raw `events` + `sessions`).
//   apps   — minutes per app per calendar day (from raw `events`).
//
// Company tools and entertainment apps are dropped here, before anything is
// written, because the JSON is committed to a public repo.
//
// Usage: RIZE_API_KEY=… node scripts/fetch-rize.mjs [--backfill]
//   First run (or --backfill) walks back to BACKFILL_FROM; later runs only
//   refresh the last few days, so the daily CI run stays under a minute.
import 'dotenv/config';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(ROOT, 'src', 'data', 'rize.json');
const API = 'https://api.rize.io/api/v1/graphql';
const KEY = process.env.RIZE_API_KEY;
const TZ = '+08:00';              // Asia/Singapore, the account's timezone
const BACKFILL_FROM = '2025-11-01';
const REFRESH_DAYS = 3;           // today is partial, yesterday may still sync
const HOURLY_DAYS = 60;
const APP_DAYS = 400;
const BACKFILL = process.argv.includes('--backfill');

// Rize category key → card bucket. Rize files the Ghostty terminal under
// "utility" and the ego browser under "miscellaneous", so those two are
// folded into coding and research instead of left as noise.
const BUCKETS = {
  build: ['code', 'debug', 'config', 'utility', 'design', 'virtual_machine'],
  talk: ['messaging', 'video_conferencing', 'meetings', 'email', 'scheduling', 'customer_support', 'hiring', 'sales'],
  write: ['documenting', 'noting', 'writing', 'task_management', 'productivity', 'product', 'marketing'],
  read: ['data_research', 'research', 'browsing', 'search', 'reading', 'learning', 'news', 'miscellaneous', 'uncategorized'],
  off: ['entertainment', 'social_media', 'personal', 'finance'],
};
const B_KEYS = Object.keys(BUCKETS);
const K2B = Object.fromEntries(Object.entries(BUCKETS).flatMap(([b, ks]) => ks.map((k) => [k, b])));

// Never written to disk: company tools, entertainment, and OS noise.
const BLOCK = /lark|feishu|飞书|bytedance|byted|tiktok|douyin|coze|watermark|爱奇艺|iqiyi|bilibili|哔哩|youtube|netflix|mgtv|芒果|腾讯视频|优酷|quark helper|screen sharing|loginwindow|system settings|system preferences|finder|rize|dock|control center|notification center|universalcontrol|coreservicesuiagent/i;

const BLOCK_HOST = /bytedance|byted\.|bytetech|larkoffice|larksuite|feishu|tiktok|coze\.|iqiyi|bilibili|youtube|netflix|mgtv|douyin|twitch|hsreplay|localhost|^\d+\.\d+\.\d+\.\d+$/i;

if (!KEY) {
  console.error('RIZE_API_KEY is not set; keeping the existing src/data/rize.json.');
  process.exit(0);
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function gql(query, variables = {}) {
  for (let i = 0; i < 4; i++) {
    try {
      const res = await fetch(API, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${KEY}` },
        body: JSON.stringify({ query, variables }),
      });
      const json = await res.json();
      if (res.ok && !json.errors) return json.data;
      console.warn(`  rize: ${res.status} ${JSON.stringify(json.errors ?? json).slice(0, 200)}`);
    } catch (e) {
      console.warn(`  rize: ${e.message}`);
    }
    await sleep(1500 * (i + 1));
  }
  throw new Error('Rize API kept failing');
}

const iso = (d) => d.toISOString().slice(0, 10);
const addDays = (s, n) => { const d = new Date(s + 'T00:00:00Z'); d.setUTCDate(d.getUTCDate() + n); return iso(d); };
const todayLocal = () => iso(new Date(Date.now() + 8 * 3600e3));
const h2 = (sec) => Math.round(sec / 36) / 100; // seconds → hours, 2 dp

async function fetchSummaries(from, to) {
  const rows = [];
  for (let s = from; s <= to; s = addDays(s, 31)) {
    const e = addDays(s, 30) < to ? addDays(s, 30) : to;
    const d = await gql(`query($s:ISO8601Date!,$e:ISO8601Date!){summaries(startDate:$s,endDate:$e,bucketSize:"day",includeCategories:true){
      buckets{date workHours meetingTime breakTime categories{category{key} timeSpent}}}}`, { s, e });
    for (const b of d.summaries.buckets ?? []) {
      const c = Object.fromEntries(B_KEYS.map((k) => [k, 0]));
      for (const x of b.categories ?? []) c[K2B[x.category?.key] ?? 'read'] += x.timeSpent ?? 0;
      rows.push([b.date.slice(0, 10), h2(b.workHours ?? 0), h2(b.meetingTime ?? 0), h2(b.breakTime ?? 0), ...B_KEYS.map((k) => h2(c[k]))]);
    }
    console.log(`  summaries ${s} → ${e}`);
  }
  return rows;
}

// Seconds of [a, b) that fall in each clock hour of `day` (local time).
function spread(day, a, b, into) {
  const base = Date.parse(`${day}T00:00:00${TZ}`);
  let t = Math.max(a, base);
  const end = Math.min(b, base + 864e5);
  while (t < end) {
    const h = Math.floor((t - base) / 3600e3);
    const next = Math.min(end, base + (h + 1) * 3600e3);
    into[h] += (next - t) / 1000;
    t = next;
  }
}

async function fetchDay(day) {
  const s = `${day}T00:00:00${TZ}`, e = `${addDays(day, 1)}T00:00:00${TZ}`;
  const ev = new Array(24).fill(0), mt = new Array(24).fill(0), br = new Array(24).fill(0);
  const apps = {};
  let after = null;
  do {
    const d = await gql(`query($s:ISO8601DateTime!,$e:ISO8601DateTime!,$a:String){events(startTime:$s,endTime:$e,first:200,after:$a){
      edges{node{appName urlHost startTime endTime}} pageInfo{hasNextPage endCursor}}}`, { s, e, a: after });
    for (const { node: n } of d.events.edges) {
      const a = Date.parse(n.startTime), b = Date.parse(n.endTime);
      if (!(b > a)) continue;
      spread(day, a, b, ev);
      const name = (n.appName ?? '').trim();
      // Browser time on a company or entertainment site doesn't count toward
      // the browser, so Chrome isn't inflated by hours of work docs.
      if (name && !BLOCK.test(name) && !(n.urlHost && BLOCK_HOST.test(n.urlHost))) apps[name] = (apps[name] ?? 0) + (b - a) / 1000;
    }
    after = d.events.pageInfo.hasNextPage ? d.events.pageInfo.endCursor : null;
  } while (after);
  const ss = await gql(`query($s:ISO8601DateTime!,$e:ISO8601DateTime!){sessions(startTime:$s,endTime:$e){type startTime endTime}}`, { s, e });
  for (const x of ss.sessions ?? []) {
    const into = x.type === 'meeting' ? mt : x.type === 'break' ? br : null;
    if (into) spread(day, Date.parse(x.startTime), Date.parse(x.endTime), into);
  }
  // Events can overlap, so each hour is capped at 60 minutes in total.
  const hours = ev.map((v, h) => { const m = Math.min(mt[h], 3600), w = Math.max(0, Math.min(v, 3600) - m); return [Math.round(w / 60), Math.round(m / 60), Math.round(Math.min(br[h], 3600) / 60)]; });
  const appMin = Object.fromEntries(Object.entries(apps).map(([k, v]) => [k, Math.round(v / 60)]).filter(([, m]) => m >= 1));
  return { hours, apps: appMin };
}

async function main() {
  let prev = { days: [], hourly: {}, apps: {} };
  try { prev = { ...prev, ...JSON.parse(await fs.readFile(OUT, 'utf8')) }; } catch {}
  const today = todayLocal();

  // Daily summaries: refetch the tail, keep the rest.
  const lastDay = prev.days.at(-1)?.[0];
  const sumFrom = BACKFILL || !lastDay ? BACKFILL_FROM : addDays(lastDay, -REFRESH_DAYS);
  const fresh = await fetchSummaries(sumFrom, today);
  const byDate = new Map(prev.days.map((r) => [r[0], r]));
  for (const r of fresh) byDate.set(r[0], r);
  const days = [...byDate.values()].sort((a, b) => (a[0] < b[0] ? -1 : 1));

  // Raw events: every missing day back to the backfill start, plus the tail.
  const appFrom = addDays(today, -APP_DAYS) > BACKFILL_FROM ? addDays(today, -APP_DAYS) : BACKFILL_FROM;
  const want = [];
  for (let d = appFrom; d <= today; d = addDays(d, 1)) {
    if (BACKFILL || !(d in prev.apps) || d >= addDays(today, -REFRESH_DAYS)) want.push(d);
  }
  const hourly = { ...prev.hourly }, apps = { ...prev.apps };
  let i = 0;
  await Promise.all(Array.from({ length: 3 }, async () => {
    while (i < want.length) {
      const d = want[i++];
      const r = await fetchDay(d);
      hourly[d] = r.hours; apps[d] = r.apps;
      if (want.length > 10 && i % 20 === 0) console.log(`  events ${i}/${want.length}`);
    }
  }));
  const hourCut = addDays(today, -(HOURLY_DAYS - 1)), appCut = addDays(today, -APP_DAYS);
  const pick = (o, cut) => Object.fromEntries(Object.keys(o).filter((d) => d >= cut).sort().map((d) => [d, o[d]]));

  const out = { updatedAt: new Date().toISOString(), tz: TZ, buckets: B_KEYS, days, hourly: pick(hourly, hourCut), apps: pick(apps, appCut) };
  await fs.writeFile(OUT, JSON.stringify(out) + '\n');
  console.log(`rize: ${days.length} days, ${Object.keys(out.hourly).length} hourly, ${Object.keys(out.apps).length} app days → ${path.relative(ROOT, OUT)}`);
}

main().catch((e) => { console.error(e); process.exit(1); });
