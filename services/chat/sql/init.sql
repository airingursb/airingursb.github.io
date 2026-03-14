-- Chat service schema
-- Run this once against your Supabase project.

-- ── Visitors ──────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS chat_visitors (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  visitor_id    TEXT        NOT NULL UNIQUE,
  ip            TEXT,
  user_agent    TEXT,
  device_type   TEXT,         -- mobile / tablet / desktop
  os            TEXT,         -- iOS 18, Android 15, macOS 15, Windows 11, …
  browser       TEXT,         -- Chrome 133, Safari 18, Firefox 136, …
  country       TEXT,         -- SG, CN, US, …
  city          TEXT,         -- Singapore, Beijing, …
  first_seen_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_seen_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- visitor_id UNIQUE already creates an implicit index, no separate index needed

-- ── Messages ──────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS chat_messages (
  id          BIGSERIAL   PRIMARY KEY,
  visitor_id  TEXT        NOT NULL REFERENCES chat_visitors (visitor_id) ON DELETE CASCADE,
  role        TEXT        NOT NULL CHECK (role IN ('user', 'assistant')),
  content     TEXT        NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_chat_messages_visitor_created
  ON chat_messages (visitor_id, created_at);
