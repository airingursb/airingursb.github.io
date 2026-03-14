#!/bin/bash
# Collect local health/vibe-coding data and push to repo.
# Schedule via cron: 0 9 */2 * * /path/to/sync_local_data.sh
#
# Runs every 2 days at 9am.

set -e

REPO_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$REPO_DIR"

echo "[$(date)] Starting local data sync..."

# Collect data
python3 scripts/collect_local_data.py

# Check if anything changed
if git diff --quiet data/local_data.json 2>/dev/null; then
    echo "No changes in local data, skipping commit."
    exit 0
fi

# Commit and push
git add data/local_data.json
git commit -m "chore: update local data (health + vibe coding)

Auto-collected by sync_local_data.sh"
git push origin master

echo "[$(date)] Local data synced and pushed."
