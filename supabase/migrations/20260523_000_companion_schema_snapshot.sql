-- SHU-622 (2026-05-23) — Companion schema snapshot.
--
-- Schema was originally created ad-hoc via Supabase Dashboard / MCP
-- apply_migration during V3.0-A/B development. This file is a SNAPSHOT
-- of what already exists in prod (project pcoyocvqfipuydhvdsle) so that:
--   1. The schema lives in git (auditable, recoverable)
--   2. New environments can recreate it from scratch
--   3. PR reviewers can see what the data layer looks like
--
-- Cascade audit (verified via pg_constraint query 2026-05-23):
--   All account-scoped tables have ON DELETE CASCADE → accounts(id)
--   accounts(id) itself cascades from auth.users(id) ON DELETE CASCADE
--   ⇒ Deleting an auth user cleanly removes all their companion data.
--
-- Column shapes inferred from:
--   - constraint dumps (PK/FK/UNIQUE/CHECK definitions)
--   - services/blog-api/lib/companion-memory.js usage
--   - prior session specs (docs/superpowers/specs/2026-05-*.md)
-- Anything not visible from those sources is marked ❓ at end-of-line.

-- ── Extensions ────────────────────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS pgvector;
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- ── accounts ──────────────────────────────────────────────────────────────
-- One row per logged-in user. id == auth.users.id (Supabase Auth).
CREATE TABLE IF NOT EXISTS public.accounts (
  id                         uuid        PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at                 timestamptz NOT NULL DEFAULT now(),
  email                      text,
  display_name               text,
  ai_npc_id                  text        DEFAULT 'npc_jue',     -- preferred NPC for /chat default
  companion_user_profile     jsonb       DEFAULT '{}'::jsonb,    -- cross-NPC profile (name / pronouns / etc)
  blog_subscriber_id         bigint      REFERENCES public.subscribers(id) ON DELETE SET NULL,
  last_seen_at               timestamptz                                                   -- ❓
);

-- ── companion_messages ────────────────────────────────────────────────────
-- Raw chat history per (account, npc). Capped externally to ~30 per (account,npc).
CREATE TABLE IF NOT EXISTS public.companion_messages (
  id          bigserial   PRIMARY KEY,
  account_id  uuid        NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  npc_id      text        NOT NULL DEFAULT 'npc_jue',
  role        text        NOT NULL CHECK (role IN ('user', 'assistant')),
  content     text        NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS companion_messages_account_npc_time_idx
  ON public.companion_messages (account_id, npc_id, created_at DESC);

-- ── companion_facts ───────────────────────────────────────────────────────
-- Long-term facts NPC "knows" about user. (account_id, npc_id, key) unique
-- so updates are upserts. embedding fills lazily by SHU-598 quota.
CREATE TABLE IF NOT EXISTS public.companion_facts (
  id           bigserial    PRIMARY KEY,
  account_id   uuid         NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  npc_id       text         NOT NULL,
  key          text         NOT NULL,
  value        text         NOT NULL,
  observed_at  timestamptz  NOT NULL DEFAULT now(),
  embedding    vector(1024),  -- bge-m3, nullable until embed-on-write or backfill
  UNIQUE (account_id, npc_id, key)
);
CREATE INDEX IF NOT EXISTS companion_facts_account_npc_time_idx
  ON public.companion_facts (account_id, npc_id, observed_at DESC);
-- HNSW for ANN search; ivfflat would also work
CREATE INDEX IF NOT EXISTS companion_facts_embedding_idx
  ON public.companion_facts USING hnsw (embedding vector_cosine_ops)
  WHERE embedding IS NOT NULL;

-- ── companion_episodes ────────────────────────────────────────────────────
-- LLM-rolled-up summaries of conversation windows. Searched semantically
-- when NPC needs longer-term context than the message buffer covers.
CREATE TABLE IF NOT EXISTS public.companion_episodes (
  id                bigserial    PRIMARY KEY,
  account_id        uuid         NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  npc_id            text         NOT NULL,
  summary           text         NOT NULL,
  first_message_id  bigint       REFERENCES public.companion_messages(id) ON DELETE SET NULL,
  last_message_id   bigint       REFERENCES public.companion_messages(id) ON DELETE SET NULL,
  created_at        timestamptz  NOT NULL DEFAULT now(),
  embedding         vector(1024)
);
CREATE INDEX IF NOT EXISTS companion_episodes_account_npc_time_idx
  ON public.companion_episodes (account_id, npc_id, created_at DESC);
CREATE INDEX IF NOT EXISTS companion_episodes_embedding_idx
  ON public.companion_episodes USING hnsw (embedding vector_cosine_ops)
  WHERE embedding IS NOT NULL;

-- ── chat_clips ────────────────────────────────────────────────────────────
-- User-saved NPC quotes, optionally shareable via public link (SHU-607).
CREATE TABLE IF NOT EXISTS public.chat_clips (
  id                 bigserial    PRIMARY KEY,
  account_id         uuid         NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  npc_id             text         NOT NULL,
  text               text         NOT NULL,
  context_user_msg   text,
  source_message_id  bigint       REFERENCES public.companion_messages(id) ON DELETE SET NULL,
  share_token        text         UNIQUE,
  created_at         timestamptz  NOT NULL DEFAULT now()
);

-- ── npc_diary ─────────────────────────────────────────────────────────────
-- NPC public daily diaries (no account scope; readable by anyone visiting
-- the NPC profile page). nightly cron writes one entry per NPC per day per kind.
CREATE TABLE IF NOT EXISTS public.npc_diary (
  id             bigserial    PRIMARY KEY,
  npc_id         text         NOT NULL,
  entry_date     date         NOT NULL,
  kind           text         NOT NULL DEFAULT 'general',  -- 'general' | 'reading' | future kinds
  summary        text         NOT NULL,
  message_count  int          DEFAULT 0,
  created_at     timestamptz  NOT NULL DEFAULT now(),
  UNIQUE (npc_id, entry_date, kind)
);

-- ── companion_quests ──────────────────────────────────────────────────────
-- Per-account quest state. Quest catalog lives in code (services/blog-api/lib/quests.js).
CREATE TABLE IF NOT EXISTS public.companion_quests (
  id          bigserial    PRIMARY KEY,
  account_id  uuid         NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  slug        text         NOT NULL,
  state       text         NOT NULL DEFAULT 'suggested',  -- 'suggested'|'accepted'|'completed'|'declined'
  evidence    jsonb        DEFAULT '{}'::jsonb,
  created_at  timestamptz  NOT NULL DEFAULT now(),
  updated_at  timestamptz  NOT NULL DEFAULT now(),
  UNIQUE (account_id, slug)
);

-- ── festival_progress ─────────────────────────────────────────────────────
-- Per-account festival state. Festival defs live in services/blog-api/lib/festivals.js.
CREATE TABLE IF NOT EXISTS public.festival_progress (
  id                   bigserial    PRIMARY KEY,
  account_id           uuid         NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  festival_slug        text         NOT NULL,
  steps_completed      text[]       DEFAULT '{}'::text[],
  inventory_unlocked   text[]       DEFAULT '{}'::text[],
  updated_at           timestamptz  NOT NULL DEFAULT now(),
  UNIQUE (account_id, festival_slug)
);

-- ── notification_queue ────────────────────────────────────────────────────
-- Used by dispatch-notifications Edge Function (SHU-587 incident). Schema
-- snapshot here so the Edge Function's queries can be reasoned about.
CREATE TABLE IF NOT EXISTS public.notification_queue (
  id             bigserial    PRIMARY KEY,
  event_type     text         NOT NULL,
  channel        text         NOT NULL DEFAULT 'main',  -- 'main' | 'noise'
  payload        jsonb        NOT NULL DEFAULT '{}'::jsonb,
  scheduled_for  timestamptz  NOT NULL DEFAULT now(),
  sent_at        timestamptz,
  created_at     timestamptz  NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS notification_queue_pending_idx
  ON public.notification_queue (scheduled_for) WHERE sent_at IS NULL;

-- ── RPC: semantic search over facts ───────────────────────────────────────
CREATE OR REPLACE FUNCTION public.search_companion_facts(
  p_account_id uuid,
  p_npc_id     text,
  p_query      vector(1024),
  p_limit      int DEFAULT 5
) RETURNS TABLE (
  id          bigint,
  key         text,
  value       text,
  observed_at timestamptz,
  similarity  float
) LANGUAGE sql STABLE AS $$
  SELECT id, key, value, observed_at,
         1 - (embedding <=> p_query) AS similarity
  FROM public.companion_facts
  WHERE account_id = p_account_id
    AND npc_id = p_npc_id
    AND embedding IS NOT NULL
  ORDER BY embedding <=> p_query
  LIMIT p_limit
$$;

-- ── RPC: semantic search over episodes ────────────────────────────────────
CREATE OR REPLACE FUNCTION public.search_companion_episodes(
  p_account_id uuid,
  p_npc_id     text,
  p_query      vector(1024),
  p_limit      int DEFAULT 3
) RETURNS TABLE (
  id         bigint,
  summary    text,
  created_at timestamptz,
  similarity float
) LANGUAGE sql STABLE AS $$
  SELECT id, summary, created_at,
         1 - (embedding <=> p_query) AS similarity
  FROM public.companion_episodes
  WHERE account_id = p_account_id
    AND npc_id = p_npc_id
    AND embedding IS NOT NULL
  ORDER BY embedding <=> p_query
  LIMIT p_limit
$$;

-- ── pg_cron jobs (informational, prod state as of 2026-05-23) ─────────────
-- jobid=1 dispatch-notifications-sweep   '* * * * *'        — UNSCHEDULED 2026-05-23 (SHU-587 death-spiral fix)
-- jobid=2 dispatch-notifications-hourly  '0 * * * *'        — UNSCHEDULED 2026-05-23 (same)
-- jobid=3 notification-queue-cleanup     '17 3 * * *'       — active, deletes sent>30d
--
-- Re-add when ready (SHU-589): low-freq sweep + hourly digest with retry_count gating.
