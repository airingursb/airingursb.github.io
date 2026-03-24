#!/bin/bash
# Collect local health/vibe-coding data to local_data.json (no git push).
# The data will be picked up on the next manual push or PR merge.
# Schedule via cron: 0 9 */2 * * /path/to/sync_local_data.sh

set -e

REPO_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$REPO_DIR"

echo "[$(date)] Starting local data sync..."

# Collect data
python3 scripts/collect_local_data.py

echo "[$(date)] Local data collected. Remember to commit & push when ready."
