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
