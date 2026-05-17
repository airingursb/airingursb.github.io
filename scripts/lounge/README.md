# Lounge asset pipeline

Tools and conventions for the pixel-art lounge at `/lounge`.

Everything in `public/lounge/assets/` is **generated** — sprites baked from source PNGs, tilemaps emitted as `.tmj` JSON, SFX synthesized by ffmpeg. Don't hand-edit the generated files; edit the bake script and re-run it.

## Scripts

| Script | Purpose |
|---|---|
| `bake-bear-sprites.mjs` | Build per-region bear sprite atlases (PNG + JSON) from the source `bear.png` |
| `bake-tileset.mjs` | Programmatically draw the 6-tile `indoor_lobby_v0` tileset |
| `bake-sfx.mjs` | Synthesize 9 SFX as .ogg via ffmpeg sine/noise primitives |
| `bake-rooms.mjs` | Generate `dj_floor.tmj` + `balcony.tmj` |
| `bake-library.mjs` | Generate `library.tmj` (V2.5) |
| `patch-lobby.mjs` | Stamp the original lobby tilemap with portals + interactables |
| `patch-lobby-library-door.mjs` | Idempotent: add the north door + portal to library |
| `validate-assets.mjs` | Read-only sanity check of `public/lounge/manifest.json` vs disk |

## Quick start

```bash
# Re-bake all rooms
node scripts/lounge/bake-rooms.mjs
node scripts/lounge/bake-library.mjs
node scripts/lounge/patch-lobby.mjs              # only needed once for V1 → V2 lobby
node scripts/lounge/patch-lobby-library-door.mjs

# Validate everything
npm run lounge:validate
```

## Manifest format

`public/lounge/manifest.json` is the source of truth for what exists.

```jsonc
{
  "schema_version": 1,
  "rooms": [
    {
      "id": "room_library",         // must match /^room_[a-z][a-z0-9_]*$/
      "file": "rooms/library.tmj",  // relative to public/lounge/assets/
      "tileset": "indoor_lobby_v0",
      "bgm":     "audio/bgm/library_quiet.ogg",      // OPTIONAL — 404-tolerant
      "ambient": "audio/ambient/pages_turning.ogg"   // OPTIONAL — 404-tolerant
    }
  ],
  "tilesets": [ { "id": "...", "file": "..." } ],
  "sprites":  [ { "id": "...", "file": "..." } ],
  "audio": {
    "sfx":     ["click", "wave", ...],
    "bgm":     ["audio/bgm/...", ...],
    "ambient": ["audio/ambient/...", ...]
  }
}
```

The `bgm`/`ambient` paths can be declared even if the files don't exist yet — the validator warns but doesn't fail, and the runtime audio loader is 404-tolerant. This lets us ship the audio framework before authoring the actual sound files.

## Adding a new SFX

1. Synthesize the audio via `bake-sfx.mjs` (extend the script) or drop a CC0/original `.ogg` into `public/lounge/assets/audio/sfx/<key>.ogg`.
2. Add `<key>` to `AUDIO_SFX_KEYS` in `src/lounge/config.ts`.
3. Add `<key>` to `audio.sfx` array in `public/lounge/manifest.json`.
4. `npm run lounge:validate` — must exit 0.
5. Call via `playSfx('<key>')` from anywhere in the lounge code.

The validator cross-checks that `AUDIO_SFX_KEYS` in config.ts and `audio.sfx` in the manifest stay in sync.

## Adding a new room

This is the canonical "prove the pipeline works" task. Here's the full recipe — exactly what V2.5 did to add `room_library`.

1. **Server allowlist** (`services/blog-api/lib/lounge.js`):
   - Add `'room_<name>'` to `VALID_ROOMS`
   - Add a `ROOM_FLOORS['room_<name>']` entry with `left/right/top/bottom` pixel bounds matching the tilemap size

2. **Client allowlist** (`src/lounge/config.ts`):
   - Add `'room_<name>'` to `VALID_ROOMS`

3. **Generate the tilemap.** Copy `bake-rooms.mjs` or `bake-library.mjs` as a template and write a `build<Name>()` function:
   - Use the existing `indoor_lobby_v0` tileset (tile IDs: FLOOR=1, WALL=2, DOOR=3, TABLE=4, CHAIR=5, PLANT=6)
   - Emit 7 layers in order: `floor`, `furniture_below`, `furniture_above`, `collision`, `spawn_points`, `portals`, `interactables`
   - `spawn_points` must include a `default` point. Add a `from_<adjacent_room>` point per inbound portal.
   - Walls in `collision` layer must cover the borders. Leave a gap where each door is.

4. **Connect via portals.** For every adjacent room, add a portal rect in `portals` with two string properties: `target_room: 'room_<name>'`, `target_spawn: 'from_<this_room>'`. The other side does the same back.

5. **Patch adjacent rooms.** Easiest: a small idempotent patch script (see `patch-lobby-library-door.mjs`). It should add the new door's portal + spawn + collision split, and detect prior runs to avoid duplicates.

6. **Update manifest** (`public/lounge/manifest.json`): add the room to `rooms[]` with its `file`, `tileset`, optional `bgm`/`ambient`.

7. **Update RoomScene** (`src/lounge/scenes/RoomScene.ts`):
   - Add `this.load.tilemapTiledJSON('room_<name>', '/lounge/assets/rooms/<name>.tmj')` in `preload`
   - Add an entry to the `ROOM_AUDIO` map at the top of the file
   - Add a particle config branch in `setupParticles()` (or skip if the room has no ambient effect)

8. **Validate**: `npm run lounge:validate`. Fix any errors. Warnings about missing audio files are expected if you haven't authored them yet.

9. **Deploy the server submodule**: `./scripts/deploy-blog-api.sh`. Without this the server will reject `room_<name>` with `full`.

10. **Browser-test**: walk through the new portal both directions, confirm interactables work, check for console errors.

## Adding a new tileset

Currently we have one programmatic tileset (`bake-tileset.mjs` → `indoor_lobby_v0`). To add another:

1. Copy `bake-tileset.mjs` → `bake-<name>.mjs`. Adjust the `drawTile<N>()` functions.
2. Output: `public/lounge/assets/tilesets/<name>/tiles.png` + `tiles.json`.
3. Register in manifest under `tilesets[]`.
4. In each room that uses it, the `bake-rooms.mjs` template references the tileset via its `image` field. Either point `bake-rooms.mjs` at the new tileset or write a new bake script per tileset family.

## Common errors

| Symptom | Likely cause |
|---|---|
| Server returns `full` on join | Room id not in server `VALID_ROOMS`. Re-deploy blog-api. |
| Peer in another room appears as ghost | Client did not filter on `room` in snap/join callbacks (regression check `RoomScene.onSnap`). |
| Portal triggers but scene doesn't load | Target room not in client `VALID_ROOMS`, or tilemap not preloaded in `RoomScene.preload`. |
| Validator: "Orphan tilemap on disk" | You added a `.tmj` file without registering it in the manifest. Either add to manifest or delete the file. |
| Validator: "missing spawn_points object layer" | Tilemap is missing a required object layer. Re-bake from script. |
| Console error: `cache.audio.exists is false` for sfx_X | Forgot to add `X` to manifest sfx list, or the file is missing. |
| Hot reload broke after editing `bake-*.mjs` | Bake scripts emit files; you also need to re-run the script. |

## File layout reference

```
public/lounge/
├── manifest.json                        # source of truth
└── assets/
    ├── audio/
    │   ├── ambient/                     # per-room ambient loops (optional)
    │   ├── bgm/                         # per-room BGM (optional)
    │   └── sfx/                         # short SFX, must exist
    ├── rooms/                           # *.tmj tilemaps
    ├── sprites/bear/<region>/           # sprite.png + sprite.json
    └── tilesets/<id>/                   # tiles.png + tiles.json
```
