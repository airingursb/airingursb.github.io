#!/usr/bin/env bash
#
# Cloud Agent install script for the ursb.me Astro site.
#
# Primary dev scope is the root Astro static site, so `npm ci` at the repo root
# is the required step. The private blog-server backend (mounted at services/ via
# an SSH submodule) is set up best-effort through the authenticated gh CLI so
# full-stack work is possible when the token has access — but a failure there is
# never fatal, keeping the environment usable as a site-only checkout.
#
# Idempotent: safe to re-run. This mirrors the environment's dashboard `install`
# command; keep the two in sync when changing setup behaviour.

set -uo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

echo "[cloud-install] node $(node -v), npm $(npm -v)"

echo "[cloud-install] installing root dependencies (npm ci)…"
npm ci || exit 1

if [ -f services/blog-api/package.json ]; then
  echo "[cloud-install] services/blog-api present; refreshing backend deps…"
  (cd services/blog-api && npm ci) || echo "[cloud-install] blog-api deps failed (non-fatal)"
elif command -v gh >/dev/null 2>&1 && gh auth status >/dev/null 2>&1 && rm -rf services && gh repo clone airingursb/blog-server services -- --depth 1; then
  echo "[cloud-install] cloned blog-server; installing backend deps…"
  (cd services/blog-api && npm ci) || echo "[cloud-install] blog-api deps failed (non-fatal)"
  if [ ! -f services/blog-api/.env ]; then
    echo "[cloud-install] writing services/blog-api/.env (dev defaults)…"
    printf 'HMAC_SECRET=%s\nPORT=3000\nTRUST_PROXY=true\nALLOWED_ORIGINS=%s\n' \
      "$(openssl rand -hex 32)" \
      "https://ursb.me,https://www.ursb.me,https://airingursb.github.io,http://localhost:8111,http://localhost:4321,http://localhost:4322,http://localhost:4323" \
      > services/blog-api/.env
  fi
else
  echo "[cloud-install] blog-api backend unavailable (no gh access); continuing site-only"
fi

echo "[cloud-install] done."
exit 0
