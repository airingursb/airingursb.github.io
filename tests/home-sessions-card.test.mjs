import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const root = new URL('../', import.meta.url);
const read = (p) => readFileSync(new URL(p, root), 'utf8');
const src = read('src/components/SessionsCard.astro');
const front = src.slice(0, src.indexOf('\n---', 4));
const script = src.slice(src.indexOf('<script>'), src.indexOf('</script>'));

const isoAdd = (s, n) => {
  const d = new Date(s + 'T00:00:00Z');
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
};
const sgtToday = () => new Date(Date.now() + 8 * 3600e3).toISOString().slice(0, 10);

// 2026-11-10: mid-day deploys left a partial "today" on the featured bar.
test('featured day is yesterday in Asia/Singapore, including a 0h rest day', () => {
  assert.match(front, /Date\.now\(\) \+ 8 \* 3600e3/);
  assert.match(front, /const yesterday = isoAdd\(sgtToday, -1\)/);
  assert.match(front, /days\.findIndex\(\(x\) => x\.d === yesterday\)/);
  assert.match(front, /d: yesterday, w: 0/);
  assert.doesNotMatch(front, /days\[ti\]\.w < 0\.3/);
  assert.doesNotMatch(front, /while \(ti > 0 && days\[ti\]\.w/);
});

test('streak and 7d windows follow the featured yesterday index', () => {
  assert.match(front, /if \(ti >= 0\) \{/);
  assert.match(front, /for \(let i = ti; i >= 0 && days\[i\]\.w >= 1; i--\) streak\+\+/);
  assert.match(front, /days\.slice\(Math\.max\(0, ti - 6\), ti \+ 1\)/);
  assert.match(front, /days\.slice\(Math\.max\(0, ti - 13\), Math\.max\(0, ti - 6\)\)/);
});

test('heatmap ends at yesterday; 365-day and monthly totals still use all days', () => {
  assert.match(front, /const lastDate = yesterday;/);
  assert.doesNotMatch(front, /const lastDate = days\.at\(-1\)/);
  assert.match(front, /const last = days\.slice\(-365\)/);
  // monthly buckets iterate the full `days` array
  assert.match(front, /for \(const x of days\) \{\n  const k = x\.d\.slice\(0, 7\)/);
});

test('the 24-hour dial uses the same yesterday as the featured bar', () => {
  assert.match(front, /const dialDay = yesterday;/);
  assert.match(front, /const dialHrs = hourly\[dialDay\]/);
  assert.doesNotMatch(front, /latest calendar day with at least half an hour/);
  assert.match(src, /data-day=\{td\.d\}/);
  assert.match(src, /data-day=\{dialDay\}/);
});

test('client labels yesterday as 昨天 MM-DD / yesterday MM-DD, otherwise MM-DD', () => {
  assert.match(script, /const md = d\.slice\(5\)/);
  assert.match(script, /d === y \? \(zh\(\) \? `昨天 \$\{md\}` : `yesterday \$\{md\}`\) : md/);
  assert.match(script, /活跃 · \$\{rel\}/);
  assert.match(script, /active · \$\{rel\}/);
  assert.doesNotMatch(script, /`今天|\? '今天'|\? "今天"|'today'|"today"|`today /);
});

test('SGT yesterday helper matches the card (today is not featured)', () => {
  const today = sgtToday();
  const yesterday = isoAdd(today, -1);
  assert.match(yesterday, /^\d{4}-\d{2}-\d{2}$/);
  assert.notEqual(yesterday, today);
  assert.equal(isoAdd(yesterday, 1), today);

  const rize = JSON.parse(read('src/data/rize.json'));
  const dates = rize.days.map((r) => r[0]);
  assert.ok(dates.includes(yesterday), `rize.json should already contain ${yesterday}`);
});

function relabel(d, lang, viewerToday) {
  const y = isoAdd(viewerToday, -1);
  const md = d.slice(5);
  const rel = d === y ? (lang === 'zh' ? `昨天 ${md}` : `yesterday ${md}`) : md;
  return rel;
}

test('label examples: yesterday carries the date; any other day is MM-DD', () => {
  assert.equal(relabel('2026-11-09', 'zh', '2026-11-10'), '昨天 11-09');
  assert.equal(relabel('2026-11-09', 'en', '2026-11-10'), 'yesterday 11-09');
  assert.equal(relabel('2026-11-10', 'zh', '2026-11-10'), '11-10');
  assert.equal(relabel('2026-11-08', 'en', '2026-11-10'), '11-08');
});
