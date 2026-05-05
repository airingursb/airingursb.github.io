import { test } from 'node:test';
import assert from 'node:assert/strict';
import { resolveTheme, FIXED_DATES, FLOATING_DATES } from '../src/lib/easter-egg-themes.ts';

const at = (yyyyMmDd) => new Date(`${yyyyMmDd}T12:00:00`);

test('birthday wins on 6/30 (any year)', () => {
  const m = resolveTheme(at('2026-06-30'));
  assert.equal(m?.theme, 'cyan');
  assert.match(m?.en ?? '', /Birthday/);
  assert.match(m?.zh ?? '', /生日/);
});

test('Peak Day 2.2 / 3.3 / 6.6 / 8.8 / 9.9 / 10.10 fire purple', () => {
  for (const md of ['02-02', '03-03', '06-06', '08-08', '09-09', '10-10']) {
    const m = FIXED_DATES[md];
    assert.equal(m.theme, 'purple', `${md} should be purple`);
    assert.match(m.en, /Peak Day/);
  }
});

test('Spring Festival 2026 → rose, 7-day stretch', () => {
  for (const d of ['2026-02-16', '2026-02-17', '2026-02-18', '2026-02-19', '2026-02-20', '2026-02-21', '2026-02-22']) {
    const m = resolveTheme(at(d));
    assert.equal(m?.theme, 'rose', `${d} should be rose`);
  }
});

test('National Day stretch 10/1–10/7 → rose every year', () => {
  for (const d of ['10-01', '10-02', '10-03', '10-04', '10-05', '10-06', '10-07']) {
    const m = FIXED_DATES[d];
    assert.equal(m.theme, 'rose', `${d} should be rose`);
  }
});

test('floating beats fixed (May Day labour holiday overrides Star Wars 5/4 in 2026)', () => {
  const m = resolveTheme(at('2026-05-04'));
  assert.equal(m?.theme, 'rose');
  assert.match(m?.zh ?? '', /劳动节/);
});

test('Star Wars 5/4 fires on years without a labour-day override', () => {
  assert.equal(FIXED_DATES['05-04'].theme, 'blue');
  assert.match(FIXED_DATES['05-04'].en, /Star Wars/);
});

test('Christmas / Christmas Eve / Boxing Day all green', () => {
  assert.equal(FIXED_DATES['12-24'].theme, 'green');
  assert.equal(FIXED_DATES['12-25'].theme, 'green');
  assert.equal(FIXED_DATES['12-26'].theme, 'green');
});

test('non-holiday date returns null', () => {
  // 2026-05-06 (today per brief) — labour holiday ended 5/5, no peg
  assert.equal(resolveTheme(at('2026-05-06')), null);
  assert.equal(resolveTheme(at('2026-07-15')), null);
});

test('SG floating holidays present for 2026', () => {
  assert.equal(FLOATING_DATES['2026-04-03'].en, 'Good Friday');
  assert.equal(FLOATING_DATES['2026-05-31'].en, 'Vesak Day');
  assert.equal(FLOATING_DATES['2026-08-09'] ?? null, null); // 8/9 is fixed every year
  assert.equal(FIXED_DATES['08-09'].en, 'SG National Day');
});

test('节气 present 2026 with bilingual names', () => {
  assert.match(FLOATING_DATES['2026-02-04'].zh, /立春/);
  assert.match(FLOATING_DATES['2026-02-04'].en, /Spring/);
  assert.match(FLOATING_DATES['2026-06-21'].zh, /夏至/);
  assert.match(FLOATING_DATES['2026-12-21'].en, /Winter Solstice/);
});

test('every entry has both zh and en strings', () => {
  for (const [k, v] of Object.entries(FIXED_DATES)) {
    assert.ok(typeof v.zh === 'string' && v.zh.length > 0, `FIXED ${k} missing zh`);
    assert.ok(typeof v.en === 'string' && v.en.length > 0, `FIXED ${k} missing en`);
  }
  for (const [k, v] of Object.entries(FLOATING_DATES)) {
    assert.ok(typeof v.zh === 'string' && v.zh.length > 0, `FLOATING ${k} missing zh`);
    assert.ok(typeof v.en === 'string' && v.en.length > 0, `FLOATING ${k} missing en`);
  }
});

test('all themes are one of the 6 valid presets', () => {
  const valid = new Set(['green', 'blue', 'purple', 'amber', 'rose', 'cyan']);
  for (const [k, v] of Object.entries(FIXED_DATES)) {
    assert.ok(valid.has(v.theme), `FIXED ${k} has invalid theme ${v.theme}`);
  }
  for (const [k, v] of Object.entries(FLOATING_DATES)) {
    assert.ok(valid.has(v.theme), `FLOATING ${k} has invalid theme ${v.theme}`);
  }
});

test('coverage check — 2026 has at least 30 floating triggers', () => {
  const count = Object.keys(FLOATING_DATES).filter((k) => k.startsWith('2026-')).length;
  assert.ok(count >= 30, `expected 30+, got ${count}`);
});
