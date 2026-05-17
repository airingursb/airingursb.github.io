# Lounge audio sources

All current audio is **CC0 / public-domain equivalent**. No external source assets — every clip is procedurally synthesized via ffmpeg sine/noise sources (see `scripts/lounge/bake-sfx.mjs`).

## SFX

| File | Description | Source |
|---|---|---|
| click.{ogg,mp3} | UI button click | ffmpeg sine 880Hz, 40ms |
| footstep_a.{ogg,mp3} | Walk step (variant A) | ffmpeg brown noise low-passed |
| footstep_b.{ogg,mp3} | Walk step (variant B) | ffmpeg brown noise low-passed, alt seed |
| wave.{ogg,mp3} | Emote: wave | ffmpeg sine 1200Hz with vibrato |
| sit.{ogg,mp3} | Emote: sit (soft thump) | ffmpeg pink noise low-passed |
| dance.{ogg,mp3} | Emote: dance start | ffmpeg sine 1568Hz (G6) with vibrato |
| say.{ogg,mp3} | Emote: say (speech bubble pop) | ffmpeg sine 660Hz, fast attack |
| menu_open.{ogg,mp3} | Radial menu opens | ffmpeg sine 540Hz |
| menu_close.{ogg,mp3} | Radial menu closes | ffmpeg sine 440Hz |

## BGM

Not yet present. Reserved slot: `bgm/lobby_day.{ogg,mp3}`.

Plan: generate via Suno/Udio, drop into this directory in a V2.1.1 follow-up patch. Document the generation prompt + license back here when added.

## Regeneration

```
node scripts/lounge/bake-sfx.mjs
```

All SFX deterministic. Re-run safe (overwrites in place).
