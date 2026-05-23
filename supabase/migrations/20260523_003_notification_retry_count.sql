-- SHU-588 · Bound notification_queue retries
--
-- Background: V7 dispatch releases sent_at→NULL on send failure so the next
-- sweep retries the row. A permanently bad row (invalid chat_id / payload)
-- would loop forever, eating pg_net + connections. Cap at 5 attempts.

ALTER TABLE notification_queue
  ADD COLUMN IF NOT EXISTS retry_count int NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS notification_queue_pending_retry_idx
  ON notification_queue (scheduled_for)
  WHERE sent_at IS NULL AND retry_count < 5;

-- Atomic release helpers — postgrest-js can't express `retry_count = retry_count + 1`
-- in a normal .update() call, so we wrap it.
CREATE OR REPLACE FUNCTION release_notification(p_id bigint)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE notification_queue
  SET sent_at = NULL,
      retry_count = retry_count + 1
  WHERE id = p_id;
$$;

CREATE OR REPLACE FUNCTION release_notifications_bulk(p_ids bigint[])
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE notification_queue
  SET sent_at = NULL,
      retry_count = retry_count + 1
  WHERE id = ANY(p_ids);
$$;

GRANT EXECUTE ON FUNCTION release_notification(bigint) TO service_role;
GRANT EXECUTE ON FUNCTION release_notifications_bulk(bigint[]) TO service_role;
