#!/usr/bin/env bash
# Deploy blog-api to Aliyun production server.
# Usage:
#   ./scripts/deploy-blog-api.sh             # full: rsync + rebuild + healthcheck
#   ./scripts/deploy-blog-api.sh --config    # rsync only, no rebuild
#   ./scripts/deploy-blog-api.sh --logs      # tail container logs after deploy
#   ./scripts/deploy-blog-api.sh --rollback  # restore previous image, no rsync

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SERVER="root@39.105.102.252"
REMOTE_DIR="/opt/blog-api"
HEALTH_URL="http://39.105.102.252:8904/health"
LOCAL_DIR="$REPO_ROOT/services/blog-api"

# Load ALIYUN_PASSWORD from .env at repo root
if [ -f "$REPO_ROOT/.env" ]; then
  set -a
  # shellcheck disable=SC1091
  source "$REPO_ROOT/.env"
  set +a
fi

if [ -z "${ALIYUN_PASSWORD:-}" ]; then
  echo "ERROR: ALIYUN_PASSWORD not set in .env" >&2
  exit 1
fi

if ! command -v sshpass >/dev/null 2>&1; then
  echo "ERROR: sshpass not installed (brew install hudochenkov/sshpass/sshpass)" >&2
  exit 1
fi

SSH_OPTS=(-o PreferredAuthentications=password -o PubkeyAuthentication=no -o StrictHostKeyChecking=no -o LogLevel=ERROR)
ssh_remote() {
  sshpass -p "$ALIYUN_PASSWORD" ssh "${SSH_OPTS[@]}" "$SERVER" "$@"
}

mode="full"
case "${1:-}" in
  --config)   mode="config" ;;
  --logs)     mode="logs" ;;
  --rollback) mode="rollback" ;;
  "")         mode="full" ;;
  *) echo "Unknown flag: $1" >&2; exit 1 ;;
esac

if [ "$mode" = "rollback" ]; then
  echo "[deploy] Rolling back to blog-api:backup..."
  ssh_remote '
    set -e
    docker tag blog-api:backup blog-api:latest
    docker stop blog-api 2>/dev/null || true
    docker rm blog-api 2>/dev/null || true
    cd /opt/blog-api && bash docker-run.sh
  '
  echo "[deploy] Rollback complete. Verifying /health..."
  sleep 3
  if curl -fsS --max-time 10 "$HEALTH_URL" >/dev/null; then
    echo "[deploy] OK — rolled back."
  else
    echo "[deploy] WARN — rollback container did not pass /health" >&2
    exit 1
  fi
  exit 0
fi

if [ "$mode" = "logs" ]; then
  exec sshpass -p "$ALIYUN_PASSWORD" ssh "${SSH_OPTS[@]}" -t "$SERVER" "docker logs -f blog-api --tail 50"
fi

echo "[deploy] rsync $LOCAL_DIR/ -> $SERVER:$REMOTE_DIR/"
# Note: use `sshpass -p` (not `-e`). `-e` (SSHPASS env) does NOT propagate
# to rsync's child ssh process reliably — saw "Permission denied" 2026-05-23.
# `-p` passes the password directly to sshpass, which then handles the
# subprocess's tty correctly.
sshpass -p "$ALIYUN_PASSWORD" rsync -az --delete \
  --exclude=node_modules/ \
  --exclude=.env \
  --exclude=knowledge-full-backup.md \
  --exclude=.git/ \
  --exclude=.DS_Store \
  -e "ssh ${SSH_OPTS[*]}" \
  "$LOCAL_DIR/" "$SERVER:$REMOTE_DIR/"

if [ "$mode" = "config" ]; then
  echo "[deploy] Config-only sync done (no rebuild)."
  exit 0
fi

echo "[deploy] Backing up current image and rebuilding..."
ssh_remote '
  set -e
  cd /opt/blog-api
  docker tag blog-api:latest blog-api:backup 2>/dev/null || true
  bash docker-run.sh
'

echo "[deploy] Verifying /health (up to 30s)..."
deadline=$(( $(date +%s) + 30 ))
while [ "$(date +%s)" -lt "$deadline" ]; do
  if curl -fsS --max-time 5 "$HEALTH_URL" >/dev/null 2>&1; then
    echo "[deploy] OK — blog-api healthy."
    exit 0
  fi
  sleep 2
done

echo "[deploy] FAIL — /health did not respond within 30s." >&2
echo "[deploy] Last 50 log lines:" >&2
ssh_remote "docker logs blog-api --tail 50" >&2 || true
echo "[deploy] Run './scripts/deploy-blog-api.sh --rollback' to revert." >&2
exit 1
