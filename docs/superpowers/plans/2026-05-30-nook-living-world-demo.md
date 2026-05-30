# nook 活世界 Demo — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Owner-only Demo where the 4 NPCs live a little while you're away (world self-loop), you get a morning NPC-voiced briefing (Telegram + nook card), and your local agent mirrors your coding/idle state into the world.

**Architecture:** New `routes/nook-world.js` (raw-Node `tryRoute` module) exposes 4 secret-gated endpoints. Pure logic in `lib/nook-world.js` (deps-injected for tests) + thin IO in `lib/nook-store.js`. GitHub Actions cron triggers nightly `tick` and morning `briefing`; the workflow itself sends Telegram (Aliyun can't reach Telegram). nook frontend reads the latest briefing into a card.

**Tech Stack:** Node ESM, raw `http`, `node --test`, Supabase (`@supabase/supabase-js`), Kimi (`callKimi`), GitHub Actions, Astro/Phaser frontend.

**Key facts (verified):**
- Routes: module exports `tryRoute(req,res,url)` returning bool; registered in `services/blog-api/routes/index.js` `routeModules[]`.
- Supabase: `import { getBlogSupabase } from '../lib/blog-supabase.js'` → `getBlogSupabase().from('t').insert(...).select(...).single()`.
- Kimi: `import { callKimi } from '../services/companion-service.js'` → `const res = await callKimi(messages,{stream:false}); const data = await res.json(); data.choices[0].message.content`.
- SOULs: `import { NPC_SOULS, getSoul, listAiNpcIds } from '../lib/npc-souls.js'`. Soul shape: `{name, species_phrase, home_phrase, voice_rules[], taboos[], default_room}`.
- Config: `import config from '../lib/config.js'` auto-loads `.env` into `process.env`.
- Tests: `npm test` runs `node --test tests/*.test.js`. DI-style unit tests (see `tests/companion-reply-loop.test.js`).
- Frontend API base: `https://chat.ursb.me`, `fetch(url,{credentials:'include'})`.
- Cron: `.github/workflows/daily-report.yml`, schedule `'3 1 * * *'` (09:03 BJT), secrets via `${{ secrets.X }}`.

**Demo auth:** all endpoints gated by header `X-Nook-Secret` === `config.nook.secret` (env `NOOK_SHARED_SECRET`). Owner account id = `config.nook.ownerAccountId` (env `NOOK_OWNER_ACCOUNT_ID`).

---

## File Structure

**blog-api (`services/blog-api/`)**
- Create `lib/nook-store.js` — Supabase IO: resident_state, world_events, nook_briefings.
- Create `lib/nook-world.js` — pure logic + orchestration (auth check, dormancy, prompt builders, parser, `runWorldLoop`, `runBriefing`), deps-injected.
- Create `routes/nook-world.js` — `tryRoute` with 4 endpoints.
- Modify `routes/index.js` — register the module.
- Modify `lib/config.js` — add `config.nook`.
- Create `tests/nook-world.test.js` — unit tests (pure fns + orchestration with fakes).

**main repo**
- Create `supabase/migrations/20260530_nook_world.sql` — 3 tables.
- Create `.github/workflows/nook-world.yml` — nightly tick + morning briefing(+Telegram).
- Create `scripts/nook-presence.sh` — local poster.
- Modify `src/components/LoungeGame.astro` — briefing card + fetch.

---

## Task 1: Supabase schema (3 tables)

**Files:**
- Create: `supabase/migrations/20260530_nook_world.sql`

- [ ] **Step 1: Write the migration SQL**

```sql
-- nook 活世界 Demo (2026-05-30) — world self-loop + daily briefing + presence.
-- Owner-only. Applied via Supabase MCP apply_migration; snapshot kept here.

CREATE TABLE IF NOT EXISTS resident_state (
  account_id uuid PRIMARY KEY REFERENCES accounts(id),
  activity   text NOT NULL DEFAULT 'idle',   -- 'coding' | 'idle'
  location   text,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS world_events (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  day          date NOT NULL,
  ts           timestamptz NOT NULL DEFAULT now(),
  participants text[] NOT NULL,
  summary      text NOT NULL,
  kind         text NOT NULL DEFAULT 'npc'
);
CREATE INDEX IF NOT EXISTS world_events_day_idx ON world_events(day);

CREATE TABLE IF NOT EXISTS nook_briefings (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  day        date NOT NULL,
  npc_voice  text NOT NULL,
  body       text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS nook_briefings_day_idx ON nook_briefings(day);
```

- [ ] **Step 2: Apply to Supabase**

Apply via Supabase MCP `apply_migration` (project `pcoyocvqfipuydhvdsle`, name `nook_world_demo`) with the SQL above. (Fallback: paste into Studio SQL editor https://supabase.com/dashboard/project/pcoyocvqfipuydhvdsle/sql/new)

- [ ] **Step 3: Verify tables exist**

Run via Supabase MCP `execute_sql`:
```sql
SELECT table_name FROM information_schema.tables
WHERE table_name IN ('resident_state','world_events','nook_briefings');
```
Expected: 3 rows.

- [ ] **Step 4: Commit**

```bash
cd /Users/airing/Files/code/airingursb.github.io
git add -f supabase/migrations/20260530_nook_world.sql
git commit -m "feat(nook): world-loop schema (resident_state, world_events, nook_briefings)"
```

---

## Task 2: Config (`config.nook`)

**Files:**
- Modify: `services/blog-api/lib/config.js`

- [ ] **Step 1: Add the nook config block**

In `lib/config.js`, inside the `const config = { ... }` object (next to the `kimi:` block), add:

```javascript
  nook: {
    secret: process.env.NOOK_SHARED_SECRET ?? '',
    ownerAccountId: process.env.NOOK_OWNER_ACCOUNT_ID ?? '',
  },
```

- [ ] **Step 2: Add env vars locally**

Append to `services/blog-api/.env` (do NOT commit .env):
```
NOOK_SHARED_SECRET=<generate: openssl rand -hex 24>
NOOK_OWNER_ACCOUNT_ID=<your accounts.id uuid — query Supabase: SELECT id FROM accounts WHERE email='bellehou2026@gmail.com'>
```

- [ ] **Step 3: Verify config loads**

Run:
```bash
cd services/blog-api && node -e "import('./lib/config.js').then(m=>console.log('secret set:', !!m.default.nook.secret, 'owner set:', !!m.default.nook.ownerAccountId))"
```
Expected: `secret set: true owner set: true`

- [ ] **Step 4: Commit**

```bash
git add services/blog-api/lib/config.js
git commit -m "feat(nook): add config.nook (secret + owner account id)"
```

---

## Task 3: Auth gate + dormancy (pure logic)

**Files:**
- Create: `services/blog-api/lib/nook-world.js`
- Test: `services/blog-api/tests/nook-world.test.js`

- [ ] **Step 1: Write the failing test**

Create `services/blog-api/tests/nook-world.test.js`:
```javascript
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { checkNookAuth, isResidentActive } from '../lib/nook-world.js';

test('checkNookAuth: matches header against secret', () => {
  const req = { headers: { 'x-nook-secret': 'abc' } };
  assert.equal(checkNookAuth(req, 'abc'), true);
  assert.equal(checkNookAuth(req, 'xyz'), false);
  assert.equal(checkNookAuth({ headers: {} }, 'abc'), false);
  assert.equal(checkNookAuth(req, ''), false);          // empty secret never authorizes
});

test('isResidentActive: fresh coding is active, stale is away', () => {
  const now = 1_000_000;
  const ttl = 15 * 60 * 1000;
  assert.equal(isResidentActive({ activity: 'coding', updated_at: new Date(now - 60_000).toISOString() }, now, ttl), true);
  assert.equal(isResidentActive({ activity: 'coding', updated_at: new Date(now - ttl - 1).toISOString() }, now, ttl), false);
  assert.equal(isResidentActive(null, now, ttl), false);
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `cd services/blog-api && node --test tests/nook-world.test.js`
Expected: FAIL — `Cannot find module ... nook-world.js`

- [ ] **Step 3: Create `lib/nook-world.js` with the two pure fns**

```javascript
// nook 活世界 Demo — pure logic + orchestration (deps-injected for tests).

/** True if the X-Nook-Secret header equals `secret` (and secret is non-empty). */
export function checkNookAuth(req, secret) {
  if (!secret) return false;
  return (req.headers?.['x-nook-secret'] || '') === secret;
}

/** True if the resident's last heartbeat is within ttlMs and they're not idle-away. */
export function isResidentActive(state, nowMs, ttlMs) {
  if (!state || !state.updated_at) return false;
  const age = nowMs - new Date(state.updated_at).getTime();
  return age <= ttlMs;
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `node --test tests/nook-world.test.js`
Expected: PASS (2 tests)

- [ ] **Step 5: Commit**

```bash
git add services/blog-api/lib/nook-world.js services/blog-api/tests/nook-world.test.js
git commit -m "feat(nook): auth check + resident dormancy (pure, tested)"
```

---

## Task 4: World-loop prompt builder + event parser

**Files:**
- Modify: `services/blog-api/lib/nook-world.js`
- Test: `services/blog-api/tests/nook-world.test.js`

- [ ] **Step 1: Write the failing test (append)**

Append to `tests/nook-world.test.js`:
```javascript
import { buildWorldLoopMessages, parseWorldEvents } from '../lib/nook-world.js';

const SOULS = [
  { id: 'npc_pip', name: 'Pip', species_phrase: '一只兔子，年轻、机灵', default_room: 'lobby' },
  { id: 'npc_ren', name: 'Ren', species_phrase: '一只熊猫，爱说爱蹦', default_room: 'dj_floor' },
];

test('buildWorldLoopMessages: includes residents, world state, asks for JSON', () => {
  const msgs = buildWorldLoopMessages(SOULS, { timePhase: '深夜', weather: '晴', ownerActivity: 'coding' });
  assert.equal(msgs.length, 2);
  assert.equal(msgs[0].role, 'system');
  assert.match(msgs[0].content, /Pip/);
  assert.match(msgs[0].content, /工坊|敲代码/);   // owner coding surfaced
  assert.match(msgs[0].content, /JSON/i);
});

test('parseWorldEvents: extracts a JSON array, drops malformed', () => {
  const text = '好的：\n[{"participants":["npc_pip","npc_ren"],"summary":"Pip 看 Ren 排曲","kind":"npc"},{"summary":"缺字段"}]';
  const evs = parseWorldEvents(text);
  assert.equal(evs.length, 1);
  assert.deepEqual(evs[0].participants, ['npc_pip','npc_ren']);
  assert.equal(evs[0].kind, 'npc');
});

test('parseWorldEvents: returns [] on garbage', () => {
  assert.deepEqual(parseWorldEvents('（没有数组）'), []);
  assert.deepEqual(parseWorldEvents(''), []);
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `node --test tests/nook-world.test.js`
Expected: FAIL — `buildWorldLoopMessages is not a function`

- [ ] **Step 3: Implement both (append to `lib/nook-world.js`)**

```javascript
/**
 * Build the Kimi messages for one world tick.
 * @param residents Array<{id,name,species_phrase,default_room}>
 * @param world {timePhase, weather, ownerActivity:'coding'|'idle'|'away'}
 */
export function buildWorldLoopMessages(residents, world) {
  const roster = residents
    .map((r) => `- ${r.name}（${r.species_phrase}，常在 ${r.default_room}）`)
    .join('\n');
  const ownerLine = world.ownerActivity === 'coding'
    ? '主人此刻在工坊敲代码（NPC 可以路过、议论，但别打扰）。'
    : '主人此刻不在村子里。';
  const system = [
    'nook 是一个安静的小村子。现在没有访客，住在这里的角色各自过着夜晚的生活。',
    `现在是${world.timePhase}，${world.weather}。${ownerLine}`,
    '',
    '在场的角色：',
    roster,
    '',
    '请生成今晚村子里**真实会发生的 3-5 件小事**：克制、生活化、符合每个角色的性子，角色之间可以有简单互动。',
    '只输出一个 JSON 数组，不要任何解释或思考过程。每个元素：',
    '{ "participants": ["<角色的 npc_id>", ...], "summary": "一句话中文事件", "kind": "npc" }',
    `合法 npc_id：${residents.map((r) => r.id).join(', ')}。`,
    '不要编造主人具体做了什么、说了什么；主人只是个背景。',
  ].join('\n');
  return [
    { role: 'system', content: system },
    { role: 'user', content: '生成今晚的事件 JSON 数组。' },
  ];
}

/** Tolerant parse of a JSON array of events from LLM text. Drops malformed items. */
export function parseWorldEvents(text) {
  if (!text) return [];
  const start = text.indexOf('[');
  const end = text.lastIndexOf(']');
  if (start === -1 || end <= start) return [];
  let arr;
  try { arr = JSON.parse(text.slice(start, end + 1)); } catch { return []; }
  if (!Array.isArray(arr)) return [];
  return arr
    .filter((e) => e && Array.isArray(e.participants) && typeof e.summary === 'string' && e.summary.trim())
    .map((e) => ({ participants: e.participants.map(String), summary: e.summary.trim(), kind: e.kind === 'resident' ? 'resident' : 'npc' }));
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `node --test tests/nook-world.test.js`
Expected: PASS (all tests)

- [ ] **Step 5: Commit**

```bash
git add services/blog-api/lib/nook-world.js services/blog-api/tests/nook-world.test.js
git commit -m "feat(nook): world-loop prompt builder + tolerant event parser"
```

---

## Task 5: Briefing voice rotation + prompt builder

**Files:**
- Modify: `services/blog-api/lib/nook-world.js`
- Test: `services/blog-api/tests/nook-world.test.js`

- [ ] **Step 1: Write the failing test (append)**

```javascript
import { pickBriefingVoice, buildBriefingMessages } from '../lib/nook-world.js';

test('pickBriefingVoice: deterministic rotation by day', () => {
  const ids = ['npc_jue','npc_pip','npc_mio','npc_ren'];
  // epoch day 0 → index 0
  assert.equal(pickBriefingVoice('1970-01-01', ids), 'npc_jue');
  assert.equal(pickBriefingVoice('1970-01-02', ids), 'npc_pip');
  assert.equal(pickBriefingVoice('1970-01-05', ids), 'npc_jue'); // wraps
});

test('buildBriefingMessages: voice soul + events, derive-only instruction', () => {
  const soul = { name: 'Airing', voice_rules: ['短句。'], default_room: 'library' };
  const events = [{ summary: 'Ren 排了一组安静的曲子' }, { summary: 'Mio 在阳台看了很久的月亮' }];
  const msgs = buildBriefingMessages(events, soul);
  assert.equal(msgs[0].role, 'system');
  assert.match(msgs[0].content, /Airing/);
  assert.match(msgs[1].content, /Ren 排了一组安静的曲子/);
  assert.match(msgs[0].content, /不要编造|只能根据/);
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `node --test tests/nook-world.test.js`
Expected: FAIL — `pickBriefingVoice is not a function`

- [ ] **Step 3: Implement (append to `lib/nook-world.js`)**

```javascript
/** Rotate the briefing voice by calendar day (YYYY-MM-DD), deterministic. */
export function pickBriefingVoice(day, npcIds) {
  const epochDay = Math.floor(new Date(day + 'T00:00:00Z').getTime() / 86_400_000);
  return npcIds[((epochDay % npcIds.length) + npcIds.length) % npcIds.length];
}

/** Build Kimi messages for the morning briefing, in `soul`'s voice, derived strictly from events. */
export function buildBriefingMessages(events, soul) {
  const list = events.map((e) => `- ${e.summary}`).join('\n');
  const system = [
    `你是 ${soul.name}。用你的口吻给主人写一段**早晨简报**，讲昨晚村子里发生的事。`,
    (soul.voice_rules || []).map((r) => `- ${r}`).join('\n'),
    '',
    '硬规则：',
    '- 100 字以内，温和、像随手记下的日记。',
    '- **只能根据下面列出的事件**，不要编造任何没列出的事、人、地点。',
    '- 直接开口，不要输出思考过程或自我检查。',
  ].join('\n');
  return [
    { role: 'system', content: system },
    { role: 'user', content: `昨晚的事件：\n${list}\n\n写简报。` },
  ];
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `node --test tests/nook-world.test.js`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add services/blog-api/lib/nook-world.js services/blog-api/tests/nook-world.test.js
git commit -m "feat(nook): briefing voice rotation + prompt builder"
```

---

## Task 6: Orchestration — runWorldLoop + runBriefing (deps-injected)

**Files:**
- Modify: `services/blog-api/lib/nook-world.js`
- Test: `services/blog-api/tests/nook-world.test.js`

- [ ] **Step 1: Write the failing test (append)**

```javascript
import { runWorldLoop, runBriefing } from '../lib/nook-world.js';

function kimiReturning(content) {
  return async () => ({ ok: true, json: async () => ({ choices: [{ message: { content } }] }) });
}

test('runWorldLoop: parses events and stores them', async () => {
  const stored = [];
  const deps = {
    souls: [{ id: 'npc_pip', name: 'Pip', species_phrase: 's', default_room: 'lobby' },
            { id: 'npc_ren', name: 'Ren', species_phrase: 's', default_room: 'dj_floor' }],
    getResidentState: async () => ({ activity: 'idle', updated_at: new Date().toISOString() }),
    insertWorldEvents: async (day, evs) => { stored.push(...evs); return evs.length; },
    callKimi: kimiReturning('[{"participants":["npc_pip"],"summary":"Pip 关了门廊的灯","kind":"npc"}]'),
    now: () => Date.parse('2026-05-30T15:00:00Z'),
  };
  const n = await runWorldLoop(deps);
  assert.equal(n, 1);
  assert.equal(stored[0].summary, 'Pip 关了门廊的灯');
});

test('runBriefing: empty events → quiet fallback, no Kimi, telegram skipped', async () => {
  let telegram = 0;
  const deps = {
    souls: [{ id: 'npc_jue', name: 'Airing', voice_rules: [], default_room: 'library' }],
    getEventsByDay: async () => [],
    insertBriefing: async (b) => b,
    callKimi: async () => { throw new Error('should not call'); },
    sendTelegram: async () => { telegram++; },
    now: () => Date.parse('2026-05-30T01:00:00Z'),
  };
  const out = await runBriefing(deps);
  assert.equal(out.hadEvents, false);
  assert.match(out.body, /安静/);
  assert.equal(telegram, 0);
});

test('runBriefing: with events → Kimi briefing stored + telegram sent', async () => {
  let sent = '';
  const deps = {
    souls: [{ id: 'npc_jue', name: 'Airing', voice_rules: [], default_room: 'library' }],
    getEventsByDay: async () => [{ summary: 'Ren 排了曲子' }],
    insertBriefing: async (b) => b,
    callKimi: kimiReturning('夜里很安静，Ren 一个人排了组慢曲。'),
    sendTelegram: async (t) => { sent = t; },
    now: () => Date.parse('2026-05-30T01:00:00Z'),
  };
  const out = await runBriefing(deps);
  assert.equal(out.hadEvents, true);
  assert.match(out.body, /Ren/);
  assert.match(sent, /Ren/);
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `node --test tests/nook-world.test.js`
Expected: FAIL — `runWorldLoop is not a function`

- [ ] **Step 3: Implement (append to `lib/nook-world.js`)**

```javascript
const RESIDENT_TTL_MS = 15 * 60 * 1000;

/** BJT calendar day (YYYY-MM-DD) for a given epoch ms. */
export function bjtDay(nowMs) {
  return new Date(nowMs + 8 * 3600_000).toISOString().slice(0, 10);
}

function timePhase(nowMs) {
  const h = (new Date(nowMs + 8 * 3600_000).getUTCHours());
  if (h >= 5 && h < 9) return '清晨';
  if (h >= 9 && h < 17) return '白天';
  if (h >= 17 && h < 20) return '傍晚';
  return '深夜';
}

/**
 * One world tick. deps: { souls, getResidentState, insertWorldEvents, callKimi, now }.
 * souls: Array<{id,name,species_phrase,default_room}>. Returns event count stored.
 */
export async function runWorldLoop(deps) {
  const nowMs = deps.now();
  const state = await deps.getResidentState();
  const ownerActivity = isResidentActive(state, nowMs, RESIDENT_TTL_MS)
    ? (state.activity === 'coding' ? 'coding' : 'idle')
    : 'away';
  const messages = buildWorldLoopMessages(deps.souls, {
    timePhase: timePhase(nowMs), weather: '晴', ownerActivity,
  });
  const res = await deps.callKimi(messages, { stream: false });
  if (!res.ok) throw new Error(`Kimi ${res.status}`);
  const data = await res.json();
  const events = parseWorldEvents(data.choices?.[0]?.message?.content || '');
  if (!events.length) return 0;
  return await deps.insertWorldEvents(bjtDay(nowMs), events);
}

const QUIET_BODY = '村子昨晚很安静，没什么事发生。';

/**
 * Morning briefing. deps: { souls, getEventsByDay, insertBriefing, callKimi, sendTelegram, now }.
 * Returns { day, npc_voice, body, hadEvents }.
 */
export async function runBriefing(deps) {
  const nowMs = deps.now();
  const day = bjtDay(nowMs);
  const npcIds = deps.souls.map((s) => s.id);
  const voiceId = pickBriefingVoice(day, npcIds);
  const soul = deps.souls.find((s) => s.id === voiceId) || deps.souls[0];

  const events = await deps.getEventsByDay(day);
  if (!events.length) {
    const out = { day, npc_voice: voiceId, body: QUIET_BODY, hadEvents: false };
    await deps.insertBriefing(out);
    return out;
  }

  const res = await deps.callKimi(buildBriefingMessages(events, soul), { stream: false });
  if (!res.ok) throw new Error(`Kimi ${res.status}`);
  const data = await res.json();
  let body = (data.choices?.[0]?.message?.content || '').trim();
  if (!body || body.length > 500) body = QUIET_BODY;   // runaway guard (reuse reasoning from companion fix)

  const out = { day, npc_voice: voiceId, body, hadEvents: true };
  await deps.insertBriefing(out);
  if (deps.sendTelegram) await deps.sendTelegram(`☀️ 昨晚的村子（${soul.name}）\n\n${body}`);
  return out;
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `node --test tests/nook-world.test.js`
Expected: PASS (all)

- [ ] **Step 5: Run the full suite (no regressions)**

Run: `npm test`
Expected: all pass.

- [ ] **Step 6: Commit**

```bash
git add services/blog-api/lib/nook-world.js services/blog-api/tests/nook-world.test.js
git commit -m "feat(nook): runWorldLoop + runBriefing orchestration (deps-injected, tested)"
```

---

## Task 7: Store layer (`lib/nook-store.js`)

**Files:**
- Create: `services/blog-api/lib/nook-store.js`

(Thin Supabase IO — verified by the Task 9 curl smoke; no unit test, matches `companion-memory.js` style.)

- [ ] **Step 1: Create the store**

```javascript
// nook 活世界 Demo — Supabase IO for resident_state / world_events / nook_briefings.
import { getBlogSupabase } from './blog-supabase.js';

export async function upsertResidentState(accountId, activity, location = null) {
  const sb = getBlogSupabase();
  const { error } = await sb.from('resident_state').upsert(
    { account_id: accountId, activity, location, updated_at: new Date().toISOString() },
    { onConflict: 'account_id' },
  );
  if (error) throw new Error(`upsertResidentState: ${error.message}`);
}

export async function getResidentState(accountId) {
  const sb = getBlogSupabase();
  const { data } = await sb.from('resident_state').select('activity, location, updated_at')
    .eq('account_id', accountId).maybeSingle();
  return data || null;
}

export async function insertWorldEvents(day, events) {
  const sb = getBlogSupabase();
  const rows = events.map((e) => ({ day, participants: e.participants, summary: e.summary, kind: e.kind }));
  const { error } = await sb.from('world_events').insert(rows);
  if (error) throw new Error(`insertWorldEvents: ${error.message}`);
  return rows.length;
}

export async function getEventsByDay(day) {
  const sb = getBlogSupabase();
  const { data } = await sb.from('world_events').select('participants, summary, kind, ts')
    .eq('day', day).order('ts', { ascending: true });
  return data || [];
}

export async function insertBriefing({ day, npc_voice, body }) {
  const sb = getBlogSupabase();
  const { error } = await sb.from('nook_briefings').upsert({ day, npc_voice, body }, { onConflict: 'day' });
  if (error) throw new Error(`insertBriefing: ${error.message}`);
  return { day, npc_voice, body };
}

export async function getLatestBriefing() {
  const sb = getBlogSupabase();
  const { data } = await sb.from('nook_briefings').select('day, npc_voice, body, created_at')
    .order('day', { ascending: false }).limit(1).maybeSingle();
  return data || null;
}
```

- [ ] **Step 2: Verify it imports cleanly**

Run: `cd services/blog-api && node -e "import('./lib/nook-store.js').then(m=>console.log(Object.keys(m)))"`
Expected: prints the 6 export names.

- [ ] **Step 3: Commit**

```bash
git add services/blog-api/lib/nook-store.js
git commit -m "feat(nook): Supabase store for resident_state/world_events/briefings"
```

---

## Task 8: Telegram sender helper (workflow-side note + server stub)

**Files:**
- Modify: `services/blog-api/lib/nook-world.js` (no Telegram from Aliyun — see note)

(Aliyun **cannot** reach api.telegram.org. So `runBriefing`'s `sendTelegram` dep is passed as `null` when invoked from the server endpoint; the **GitHub Action** sends Telegram using the briefing text returned by the endpoint. No server code change needed beyond what Task 6 already supports — `sendTelegram` is optional.)

- [ ] **Step 1: Confirm `runBriefing` tolerates `sendTelegram: null`**

The Task 6 code already guards `if (deps.sendTelegram)`. No change. (This task is a checkpoint, not code.)

- [ ] **Step 2: (no commit)** — proceed.

---

## Task 9: Endpoints (`routes/nook-world.js`) + registration

**Files:**
- Create: `services/blog-api/routes/nook-world.js`
- Modify: `services/blog-api/routes/index.js`

- [ ] **Step 1: Create the route module**

```javascript
// nook 活世界 Demo — secret-gated endpoints.
import config from '../lib/config.js';
import { listAiNpcIds, getSoul } from '../lib/npc-souls.js';
import { callKimi } from '../services/companion-service.js';
import { checkNookAuth, runWorldLoop, runBriefing } from '../lib/nook-world.js';
import * as store from '../lib/nook-store.js';

function soulsList() {
  return listAiNpcIds().map((id) => ({ id, ...getSoul(id) }));
}
function json(res, code, obj) {
  res.writeHead(code, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(obj));
}
async function readBody(req) {
  const chunks = [];
  for await (const c of req) chunks.push(c);
  try { return JSON.parse(Buffer.concat(chunks).toString() || '{}'); } catch { return {}; }
}

export async function tryRoute(req, res, url) {
  const p = url.pathname;

  // Public-ish read: latest briefing for the nook card (no secret; it's owner's public diary).
  if (req.method === 'GET' && p === '/api/nook-world/briefing/latest') {
    const b = await store.getLatestBriefing();
    json(res, 200, b || { body: null });
    return true;
  }

  // Everything else requires the shared secret.
  const gated = ['/api/nook-world/presence', '/api/nook-world/tick', '/api/nook-world/briefing'];
  if (!gated.includes(p)) return false;
  if (!checkNookAuth(req, config.nook.secret)) { json(res, 403, { error: 'forbidden' }); return true; }

  if (req.method === 'POST' && p === '/api/nook-world/presence') {
    const body = await readBody(req);
    const activity = body.activity === 'coding' ? 'coding' : 'idle';
    await store.upsertResidentState(config.nook.ownerAccountId, activity, body.location || null);
    json(res, 200, { ok: true, activity });
    return true;
  }

  if (req.method === 'POST' && p === '/api/nook-world/tick') {
    const n = await runWorldLoop({
      souls: soulsList(),
      getResidentState: () => store.getResidentState(config.nook.ownerAccountId),
      insertWorldEvents: store.insertWorldEvents,
      callKimi, now: () => Date.now(),
    });
    json(res, 200, { ok: true, events: n });
    return true;
  }

  if (req.method === 'POST' && p === '/api/nook-world/briefing') {
    const out = await runBriefing({
      souls: soulsList(),
      getEventsByDay: store.getEventsByDay,
      insertBriefing: store.insertBriefing,
      callKimi, sendTelegram: null, now: () => Date.now(),
    });
    json(res, 200, out);   // returns { day, npc_voice, body, hadEvents } — workflow forwards body to Telegram
    return true;
  }

  return false;
}
```

- [ ] **Step 2: Register in `routes/index.js`**

Add the import near the other route imports and add `nookWorld` to the `routeModules` array:
```javascript
import * as nookWorld from './nook-world.js';
// ... in routeModules = [ ... , nookWorld ];
```

- [ ] **Step 3: Smoke locally**

Run (one terminal): `cd services/blog-api && NOOK_SHARED_SECRET=testsecret NOOK_OWNER_ACCOUNT_ID=<your-uuid> node server.js`
Run (another): 
```bash
curl -s -X POST localhost:3000/api/nook-world/presence -H 'X-Nook-Secret: testsecret' -H 'Content-Type: application/json' -d '{"activity":"coding"}'
curl -s -X POST localhost:3000/api/nook-world/tick -H 'X-Nook-Secret: testsecret'
curl -s -X POST localhost:3000/api/nook-world/briefing -H 'X-Nook-Secret: testsecret'
curl -s localhost:3000/api/nook-world/briefing/latest
curl -s -X POST localhost:3000/api/nook-world/tick   # no secret
```
Expected: presence `{ok:true,activity:"coding"}`; tick `{ok:true,events:N}`; briefing `{day,npc_voice,body,hadEvents:true}`; latest returns the briefing; no-secret tick → 403.

- [ ] **Step 4: Commit**

```bash
git add services/blog-api/routes/nook-world.js services/blog-api/routes/index.js
git commit -m "feat(nook): secret-gated endpoints (presence/tick/briefing/latest)"
```

---

## Task 10: GitHub Actions cron (`nook-world.yml`)

**Files:**
- Create: `.github/workflows/nook-world.yml`

- [ ] **Step 1: Create the workflow**

```yaml
name: Nook Living World

on:
  schedule:
    - cron: '0 16 * * *'   # 00:00 BJT — nightly world tick
    - cron: '3 1 * * *'    # 09:03 BJT — morning briefing + Telegram
  workflow_dispatch:

jobs:
  tick:
    if: github.event.schedule == '0 16 * * *' || github.event_name == 'workflow_dispatch'
    runs-on: ubuntu-latest
    steps:
      - name: World self-loop tick
        run: |
          curl -fsS -X POST -H "X-Nook-Secret: ${SECRET}" \
            https://chat.ursb.me/api/nook-world/tick
        env:
          SECRET: ${{ secrets.NOOK_SHARED_SECRET }}

  briefing:
    if: github.event.schedule == '3 1 * * *' || github.event_name == 'workflow_dispatch'
    runs-on: ubuntu-latest
    steps:
      - name: Generate briefing + send Telegram
        run: |
          RESP=$(curl -fsS -X POST -H "X-Nook-Secret: ${SECRET}" https://chat.ursb.me/api/nook-world/briefing)
          echo "briefing: $RESP"
          HAD=$(echo "$RESP" | python3 -c "import sys,json;print(json.load(sys.stdin).get('hadEvents'))")
          if [ "$HAD" = "True" ]; then
            BODY=$(echo "$RESP" | python3 -c "import sys,json;d=json.load(sys.stdin);print('☀️ 昨晚的村子\n\n'+d['body'])")
            curl -fsS -X POST "https://api.telegram.org/bot${TG_TOKEN}/sendMessage" \
              -d chat_id="${TG_CHAT}" --data-urlencode text="$BODY"
          fi
        env:
          SECRET: ${{ secrets.NOOK_SHARED_SECRET }}
          TG_TOKEN: ${{ secrets.TELEGRAM_BOT_TOKEN }}
          TG_CHAT: ${{ secrets.TELEGRAM_CHAT_ID }}
```

- [ ] **Step 2: Add GitHub repo secrets**

In repo Settings → Secrets: add `NOOK_SHARED_SECRET` (= the server's value). `TELEGRAM_BOT_TOKEN` / `TELEGRAM_CHAT_ID` already exist (used by daily-report). Verify they're present.

- [ ] **Step 3: Commit**

```bash
git add .github/workflows/nook-world.yml
git commit -m "ci(nook): nightly world tick + morning briefing/Telegram cron"
```

---

## Task 11: Local presence poster (`scripts/nook-presence.sh`)

**Files:**
- Create: `scripts/nook-presence.sh`

- [ ] **Step 1: Create the poster**

```bash
#!/usr/bin/env bash
# nook presence poster — reports coding/idle to nook-world.
# Run every 5 min via cron:  */5 * * * * NOOK_SHARED_SECRET=xxx /path/scripts/nook-presence.sh
set -euo pipefail
: "${NOOK_SHARED_SECRET:?set NOOK_SHARED_SECRET}"
API="${NOOK_API:-https://chat.ursb.me}"

# coding = an active Claude Code / node CLI session in the last interval. Simplest heuristic: a running `claude` process.
if pgrep -fl "claude" >/dev/null 2>&1; then ACTIVITY="coding"; else ACTIVITY="idle"; fi

curl -fsS -X POST "$API/api/nook-world/presence" \
  -H "X-Nook-Secret: $NOOK_SHARED_SECRET" -H 'Content-Type: application/json' \
  -d "{\"activity\":\"$ACTIVITY\"}" >/dev/null && echo "posted: $ACTIVITY"
```

- [ ] **Step 2: Make executable + manual test**

```bash
chmod +x scripts/nook-presence.sh
NOOK_SHARED_SECRET=<server-secret> NOOK_API=https://chat.ursb.me ./scripts/nook-presence.sh
```
Expected: `posted: coding` (or idle). Then check Supabase `resident_state` has a fresh row.

- [ ] **Step 3: Document the cron line**

Add a comment block at top of the script (done above). Optionally add a `launchd` plist later — out of scope for Demo.

- [ ] **Step 4: Commit**

```bash
git add scripts/nook-presence.sh
git commit -m "feat(nook): local presence poster (coding/idle heartbeat)"
```

---

## Task 12: Frontend briefing card

**Files:**
- Modify: `src/components/LoungeGame.astro`

- [ ] **Step 1: Add the card markup + fetch**

In `LoungeGame.astro`, add a hidden card element near the existing overlays, and a script that fetches the latest briefing and reveals it. Insert markup:
```astro
<div id="nook-briefing-card" hidden>
  <div class="briefing-inner">
    <span class="briefing-title">☀️ 昨晚的村子</span>
    <p id="nook-briefing-body"></p>
    <button id="nook-briefing-close" aria-label="关闭">×</button>
  </div>
</div>
```
Add scoped styles (cozy card, fixed bottom-right) and this script:
```html
<script>
  (async () => {
    try {
      const res = await fetch('https://chat.ursb.me/api/nook-world/briefing/latest', { credentials: 'include' });
      if (!res.ok) return;
      const data = await res.json();
      if (!data || !data.body) return;
      const card = document.getElementById('nook-briefing-card');
      const seen = localStorage.getItem('nook-briefing-seen');
      if (seen === data.day) return;                 // only show once per day
      document.getElementById('nook-briefing-body').textContent = data.body;
      card.hidden = false;
      document.getElementById('nook-briefing-close').onclick = () => {
        card.hidden = true;
        if (data.day) localStorage.setItem('nook-briefing-seen', data.day);
      };
    } catch {}
  })();
</script>
```

- [ ] **Step 2: Build + visual self-test (per project CLAUDE.md rule)**

```bash
npm run build && npx astro preview --port 4321
```
Open the nook page with Playwright browser MCP, screenshot the card; confirm it shows the latest briefing and the × dismisses it (and stays dismissed for that day).

- [ ] **Step 3: Add a checklist entry**

Append a row to `tests/checklist.md`: "nook briefing card — shows latest world briefing once/day, × dismisses, reappears next day".

- [ ] **Step 4: Commit**

```bash
git add src/components/LoungeGame.astro tests/checklist.md
git commit -m "feat(nook): in-nook 'last night's village' briefing card"
```

---

## Task 13: Deploy + end-to-end smoke

**Files:** none (operational)

- [ ] **Step 1: Set server envs**

On the server's blog-api `.env` (via the deploy `--config` path or manual sync): add `NOOK_SHARED_SECRET` (same as the GitHub secret) and `NOOK_OWNER_ACCOUNT_ID` (your accounts.id). Apply the Task 1 migration to prod Supabase (already done in Task 1 if applied to the single shared project).

- [ ] **Step 2: Deploy blog-api**

```bash
./scripts/deploy-blog-api.sh
```
Wait for the `/health` check to pass.

- [ ] **Step 3: End-to-end smoke (against prod)**

```bash
SECRET=<server-secret>
curl -s -X POST https://chat.ursb.me/api/nook-world/presence -H "X-Nook-Secret: $SECRET" -d '{"activity":"coding"}'
curl -s -X POST https://chat.ursb.me/api/nook-world/tick     -H "X-Nook-Secret: $SECRET"
curl -s -X POST https://chat.ursb.me/api/nook-world/briefing -H "X-Nook-Secret: $SECRET"
curl -s https://chat.ursb.me/api/nook-world/briefing/latest
```
Expected: tick stores events; briefing returns a real NPC-voiced body; latest returns it. Inspect `world_events` / `nook_briefings` in Supabase.

- [ ] **Step 4: Trigger the workflow manually**

GitHub → Actions → "Nook Living World" → Run workflow. Confirm the briefing arrives in Telegram.

- [ ] **Step 5: Observe for 1–2 weeks (kill metric)**

Track: do you open the briefing? Does it read like "something happened" vs noise? < 60% open-rate over 14 days → revisit the world-loop prompt / NPC depth before building further.

---

## Self-Review (done)

- **Spec coverage:** resident_state/world_events/nook_briefings (T1) ✓ · presence + dormancy + local poster (T3,T9,T11) ✓ · world self-loop nightly (T4,T6,T9,T10) ✓ · daily briefing derived-from-events + voice rotation (T5,T6) ✓ · dual delivery Telegram(T10)+in-nook card(T12) ✓ · owner-only secret auth (T2,T3,T9) ✓ · reuse callKimi/SOULs/Supabase ✓ · YAGNI (no auth/multi-user/embeddings) ✓ · GitHub Actions cron (T10) ✓.
- **Telegram correction:** Aliyun→Telegram blocked → workflow sends it (T8 note, T10). ✓
- **Name-clash correction:** owner activity is ambient world-state, not a named actor (T4 prompt). ✓
- **Type consistency:** event shape `{participants, summary, kind}` consistent across parseWorldEvents/insertWorldEvents/getEventsByDay/buildBriefingMessages. briefing `{day,npc_voice,body,hadEvents}` consistent across runBriefing/insertBriefing/endpoint/workflow. ✓
- **No placeholders:** all steps have real code/commands. The local-poster heuristic (`pgrep claude`) is concrete (T11). ✓
