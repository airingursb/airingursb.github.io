# Task · Rename Mochi → Airing in /nook/ + blog-api + DB

> Hand-off to the nook agent (per memory `reference_nook_linear_shu537.md`
> and the agent-boundary doc `docs/onboarding-nook-agent.md`).
>
> The /world/ agent has already done the matching rename on its side
> (commit `329a8e921`). This brief is for the other half — /nook/ scene
> + blog-api companion code + Supabase data layer.
>
> User request: 2026-05-24
> "中间的 Mochi 的名字改成 Airing 吧, 包括 Nook 里的 Mochi 的名字也
>  改成 Airing 怎么样"

---

## 0 · Decision point first (block on user)

Before any code: **the rename has a semantic snag.** "Airing" is the
project owner / user's real handle. There are now several "Airing"
entities in the world:

- `/world/` panda avatar (the player's self-representation)
- `/world/` cabin chat character (was Mochi, now renamed)
- `/nook/` library + gallery NPC (currently Mochi → would become Airing)
- `/nook/` Grove portal "跟 Mochi 散步" → would become "跟 Airing 散步"

If the nook NPC becomes literally "Airing", the user is talking to
themselves. This may be fine (it's their inner-voice persona), but
confirm with user before changing 20+ slugs / fact keys / DB rows.

**Alternatives to surface:**
- A) Full literal rename: every "Mochi" → "Airing" (matches user's stated
     ask but produces self-chat experience).
- B) Display name only: render "Airing" everywhere but keep internal
     slug/IDs as `mochi`, `met_mochi`, etc. Cheapest. No DB migration.
- C) Replace with a different alter-ego name like "小 A" / "Bear" /
     "A 君" to preserve the "this is you, but the inner voice version"
     framing without name collision.

Get the user to pick before touching DB.

---

## 1 · Scope inventory (what needs to change for full rename)

### Frontend (`src/lounge/`)

| File | What's there | Change |
|---|---|---|
| `src/lounge/gallery_mochi.ts` | `const NPC_NAME = 'Mochi'`, stanchion label `'Mochi · 巡馆'`, floating hint `点 Mochi 聊聊 ✦`, function names `setupGalleryMochi` / `teardownGalleryMochi` / `openMochiChat`, var `mochiBear` | Rename UI strings (option B) or rename everything including file name `gallery_airing.ts` + symbol names (option A) |
| `src/lounge/grove_portal.ts` | Portal label `跟 Mochi 散步`, comment "library Mochi", slug `mochi-grove` in iframe URL | UI string change; slug change requires `/nook/inner/mochi-grove/` route rename too |
| Other lounge files referencing Mochi | (grep before starting) | Sync to chosen naming |

### Backend (`services/blog-api/`)

| File | What's there | Change |
|---|---|---|
| `services/blog-api/lib/quests.js` | 9+ quests with slugs `mochi_grove_walk`, `mochi_book_recommendation`, `pip_meet_mochi`, `mochi_late_night_tea`, `mochi_quote_classic`, `mochi_share_essay`, `mochi_silence_company`, `mochi_first_visit_note`; description text mentions Mochi; fact keys `met_mochi`, `had_late_tea_with_mochi`, `got_mochi_quote`, `got_mochi_essay_rec`, `sat_silently_with_mochi`, `got_mochi_essay_rec`; completion patterns regex `/Mochi\|麻糬/` | If full rename: change slugs + fact keys + regex patterns + descriptions. Slug change → must migrate `companion_facts` rows. |
| `services/blog-api/lib/npc-souls.js` (if exists) | NPC persona definitions probably reference Mochi | Update persona system prompt |
| Other companion-* files | (grep before starting) | Sync |

### Database (Supabase project `pcoyocvqfipuydhvdsle`)

- `companion_facts` table: rows with `key LIKE 'met_mochi%'` or
  similar `*_mochi*` keys. If slugs change in code, these rows become
  unreachable. Options:
  - Migration script: `UPDATE companion_facts SET key = REPLACE(key, 'mochi', 'airing') WHERE key LIKE '%mochi%'`
  - OR: keep DB keys as-is and only rename display strings (option B)
- `companion_messages` may have `npc_id` column with value `'mochi'` or
  `'npc_jue'`. Confirm what the actual NPC ID convention is, then
  decide if it needs renaming.
- Quest completion records: `quest_completions` or similar table may
  reference quest slugs.

Check first:
```sql
SELECT DISTINCT npc_id FROM companion_messages LIMIT 5;
SELECT key, COUNT(*) FROM companion_facts WHERE key ILIKE '%mochi%' GROUP BY key;
SELECT slug FROM <quest_completion_table> WHERE slug LIKE '%mochi%';
```

### Sprites & assets

- `gallery-studio/` may have Mochi-specific sprites (gallery_mochi
  panda?). Check `output/` and `MANIFEST.md` for any C-series or
  characters that say "Mochi" in their prompt. Regenerate with codex
  if needed.

### Docs

- `CLAUDE.md` mentions "Mochi/Pip/Mio/Ren" — update if full rename.
- Migration comments mention Mochi (`supabase/migrations/20260523_002_facts_source_message.sql`) — search/replace if doing slug migration.

---

## 2 · Recommended order

1. **User-decision call** (block on user for option A/B/C above).
2. If option B (display-only):
   - Update UI strings in lounge files (~10 strings).
   - No DB migration. Ship in 30 min.
3. If option A (full rename):
   - Snapshot prod DB first (`pg_dump` via Supabase dashboard).
   - Write migration SQL: rename keys in `companion_facts`, update
     `npc_id` in `companion_messages` if applicable.
   - Update `quests.js` slugs + descriptions + fact-key references.
   - Update `gallery_mochi.ts` → `gallery_airing.ts` + all callers.
   - Update `grove_portal.ts` + route directory `/nook/inner/mochi-grove/`
     → `/nook/inner/airing-grove/` + iframe URL.
   - Update `npc-souls.js` persona prompt.
   - Update CLAUDE.md doc.
   - Deploy blog-api (`./scripts/deploy-blog-api.sh`).
   - Verify with a couple of chat sessions that the AI still recognizes
     itself (the persona system prompt drives identity).
   - Ship in 4-6 hours.
4. If option C (different alter-ego name like "小 A"):
   - Like option A in scope, just with different target string.

---

## 3 · Coordination with /world/ side

The /world/ agent has already done its half (commit `329a8e921`):
- `/world/` chat UI says "Airing" everywhere user-facing.
- E05 banner PNG must be regenerated (codex task already added to
  `world-studio/MANIFEST.md:164`).

If you go with option C, /world/ agent needs to redo its rename too.
Sync via the user before going off-track.

---

## 4 · What NOT to touch

Per agent boundary doc:
- `src/world/*`, `src/components/WorldGame.astro`, `src/pages/world.astro`
  — that's /world/ agent territory. Already handled.
- `src/grove3d/*` — separate agent.

---

## 5 · Acceptance criteria

- [ ] User-decision confirmed (A / B / C).
- [ ] All chosen-scope strings renamed.
- [ ] Build passes (`rm -rf dist .astro && npm run build`).
- [ ] If option A: prod DB snapshotted before migration; migration script
      committed; idempotent if re-run.
- [ ] If option A: a test chat session shows the NPC introduces themselves
      with the new name and remembers prior facts (i.e. migration worked).
- [ ] CLAUDE.md updated to reflect new naming.
- [ ] Linear sub-issue under SHU-537 created for traceability
      (per memory `reference_nook_linear_shu537.md`).
