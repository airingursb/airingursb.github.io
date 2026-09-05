#!/bin/sh
set -eu
cd "$(dirname "$0")/../.."
BLENDER_BIN=${BLENDER_BIN:-/Applications/Blender.app/Contents/MacOS/Blender}
"$BLENDER_BIN" --background --factory-startup --python-exit-code 1 --python scripts/character-models/build.py
"$BLENDER_BIN" --background output/character-models/v3/companions-v3.blend --python-exit-code 1 --python scripts/character-models/groom.py
"$BLENDER_BIN" --background output/character-models/v3/companions-plush-v3.blend --python-exit-code 1 --python scripts/character-models/export_groom.py
for character in panda; do
  npx --yes @gltf-transform/cli@4.5.0 optimize "output/character-models/v3/groom-raw/$character-v3.glb" "public/diorama/models/$character-v3.glb" --compress meshopt --simplify false --texture-compress false --palette false
done
