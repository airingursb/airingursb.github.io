-- SHU-624 — Importance scoring on companion_facts.
--
-- Problem: appendLearnedFacts caps facts at MAX_NPC_FACTS=30 per (account,npc)
-- and evicts by `observed_at ASC`. A user who says "我叫 Airing" once and then
-- chats mood for 30 days loses the name fact to ephemeral mood facts.
--
-- Fix: importance int (1-10, default 5). Eviction ORDER BY importance ASC,
-- observed_at ASC. Fact extractor prompt asks LLM to also output importance.
-- Existing rows get default 5 (backfill).

ALTER TABLE public.companion_facts
  ADD COLUMN IF NOT EXISTS importance int NOT NULL DEFAULT 5
    CHECK (importance BETWEEN 1 AND 10);

-- Index speeds up the eviction query: pick lowest-importance, oldest first.
CREATE INDEX IF NOT EXISTS companion_facts_eviction_idx
  ON public.companion_facts (account_id, npc_id, importance ASC, observed_at ASC);

COMMENT ON COLUMN public.companion_facts.importance IS
  '1=lowest (mood/ephemeral) → 10=highest (name/pronouns/core identity). Default 5. Used as the primary sort key for eviction when (account,npc) exceeds MAX_NPC_FACTS.';
