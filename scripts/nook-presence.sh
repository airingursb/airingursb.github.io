#!/usr/bin/env bash
# nook presence poster — reports coding/idle to nook-world.
# Run every 5 min via cron:  */5 * * * * NOOK_SHARED_SECRET=xxx /path/scripts/nook-presence.sh
set -euo pipefail
: "${NOOK_SHARED_SECRET:?set NOOK_SHARED_SECRET}"
API="${NOOK_API:-https://chat.ursb.me}"

# coding = an active Claude Code / node CLI session. Simplest heuristic: a running `claude` process.
if pgrep -fl "claude" >/dev/null 2>&1; then ACTIVITY="coding"; else ACTIVITY="idle"; fi

curl -fsS -X POST "$API/api/nook-world/presence" \
  -H "X-Nook-Secret: $NOOK_SHARED_SECRET" -H 'Content-Type: application/json' \
  -d "{\"activity\":\"$ACTIVITY\"}" >/dev/null && echo "posted: $ACTIVITY"
