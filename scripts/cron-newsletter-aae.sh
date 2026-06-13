#!/bin/bash
# Scheduled batched-broadcast of the "after-ai-takes-everything" newsletter.
# Run nightly by ~/Library/LaunchAgents/me.airing.newsletter-aae.plist on
# 6/14, 6/15, 6/16 (each sends 80) and 6/17 (sends the remaining 75 AND
# finalizes the dedup record). After 6/17 the plist self-removes via the
# wrapper's launchctl-unload tail call.

set -uo pipefail

REPO=/Users/airing/Files/code/airingursb.github.io
NODE=/Users/airing/.nvm/versions/node/v22.16.0/bin/node
LOG=/tmp/newsletter-aae-cron.log
PLIST_LABEL=me.airing.newsletter-aae
PLIST_PATH="$HOME/Library/LaunchAgents/${PLIST_LABEL}.plist"

cd "$REPO" || exit 1

TODAY=$(date +%Y-%m-%d)
case "$TODAY" in
  2026-06-14|2026-06-15|2026-06-16)
    EXTRA=(--limit=80)
    ;;
  2026-06-17)
    EXTRA=()  # final batch — drop --limit so dedup record gets set
    ;;
  *)
    echo "[$TODAY] not a scheduled date, skipping" >> "$LOG"
    exit 0
    ;;
esac

{
  echo
  echo "=== $(date '+%Y-%m-%d %H:%M:%S %Z') ==="
  "$NODE" --env-file=.env scripts/send_newsletter.mjs \
    --slug=after-ai-takes-everything \
    --api-url=https://chat.ursb.me \
    "${EXTRA[@]}"
} >> "$LOG" 2>&1

# After the 6/17 run, the broadcast is done — unload + remove the plist so
# we don't accidentally fire again next month.
if [ "$TODAY" = "2026-06-17" ]; then
  /bin/launchctl unload "$PLIST_PATH" 2>/dev/null
  /bin/rm -f "$PLIST_PATH"
  echo "[$TODAY] broadcast finalized — plist unloaded + removed" >> "$LOG"
fi
