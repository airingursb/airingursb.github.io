-- Chat service schema
-- Run this once against your Supabase project.

-- ── Visitors ──────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS chat_visitors (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  visitor_id    TEXT        NOT NULL UNIQUE,
  ip            TEXT,
  user_agent    TEXT,
  first_seen_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_seen_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_chat_visitors_visitor_id
  ON chat_visitors (visitor_id);

-- ── Messages ──────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS chat_messages (
  id          BIGSERIAL   PRIMARY KEY,
  visitor_id  TEXT        NOT NULL REFERENCES chat_visitors (visitor_id) ON DELETE CASCADE,
  role        TEXT        NOT NULL CHECK (role IN ('user', 'assistant')),
  content     TEXT        NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_chat_messages_visitor_id
  ON chat_messages (visitor_id);

CREATE INDEX IF NOT EXISTS idx_chat_messages_created_at
  ON chat_messages (created_at);
