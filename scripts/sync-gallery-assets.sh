#!/bin/bash
# Sync Codex-generated assets from gallery-studio/output/ → public/lounge/assets/gallery/
# Run after Codex adds more sprites. Run before commit to publish them.
set -euo pipefail

SRC="$(cd "$(dirname "$0")/.." && pwd)/gallery-studio/output"
DST="$(cd "$(dirname "$0")/.." && pwd)/public/lounge/assets/gallery"

if [ ! -d "$SRC" ]; then
  echo "[sync-gallery] source dir not found: $SRC"
  exit 1
fi

mkdir -p "$DST"/{paintings,centerpieces,architecture,npc,tiles,decorations}
rsync -av "$SRC/" "$DST/" | grep -v '^$\|^sending\|^total\|^sent ' || true

echo ""
echo "[sync-gallery] manifest progress:"
expected=$(grep -c '^### [A-F][0-9]' "$(dirname "$SRC")/MANIFEST.md" || true)
got=$(find "$DST" -type f -name "*.png" | wc -l | tr -d ' ')
echo "  $got / $expected sprites present in public/"

echo ""
echo "[sync-gallery] missing per category:"
for sub in paintings centerpieces architecture npc tiles decorations; do
  n=$(find "$DST/$sub" -type f -name "*.png" 2>/dev/null | wc -l | tr -d ' ')
  echo "  $sub: $n"
done
