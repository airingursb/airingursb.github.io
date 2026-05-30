#!/bin/bash
# Sync office-studio/output/ → public/lounge/assets/office/  (mirror sync-gallery-assets.sh)
# Run after the designer adds sprites; run before commit to publish them.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SRC="$ROOT/office-studio/output"
DST="$ROOT/public/lounge/assets/office"

if [ ! -d "$SRC" ]; then
  echo "[sync-office] source dir not found: $SRC"
  exit 1
fi

mkdir -p "$DST"/{tiles,furniture}
rsync -a --delete "$SRC/tiles/" "$DST/tiles/" 2>/dev/null || true
rsync -a --delete "$SRC/furniture/" "$DST/furniture/" 2>/dev/null || true

expected=$(grep -cE '^### [A-Z][0-9]' "$ROOT/office-studio/MANIFEST.md" || true)
got=$(find "$DST" -type f -name "*.png" | wc -l | tr -d ' ')
echo "[sync-office] $got / $expected sprites present in public/"
for sub in tiles furniture; do
  n=$(find "$DST/$sub" -type f -name "*.png" 2>/dev/null | wc -l | tr -d ' ')
  echo "  $sub: $n"
done
