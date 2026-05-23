-- SHU-625 — Trace which user message produced which fact.
--
-- Problem: facts in companion_facts are anonymous — no way to answer
-- "why does Mochi think I'm a vegetarian?" without scanning the whole
-- conversation log manually.
--
-- Fix: add source_message_id FK to companion_messages. Set NULL on
-- message delete (so trimming old messages doesn't lose facts).

ALTER TABLE public.companion_facts
  ADD COLUMN IF NOT EXISTS source_message_id bigint
    REFERENCES public.companion_messages(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS companion_facts_source_msg_idx
  ON public.companion_facts (source_message_id)
  WHERE source_message_id IS NOT NULL;

COMMENT ON COLUMN public.companion_facts.source_message_id IS
  'The user message this fact was extracted from. NULL if pre-SHU-625 or message has been pruned.';
