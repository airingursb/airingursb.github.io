# Grove 3D · Avatar GLB drop folder

`/grove3d/models/{species}.glb` is auto-loaded by `<GLBAvatar species={...}/>`.
If a file is missing the avatar falls back to the procedural primitive
stack, so you can ship models incrementally — one drop = one species
upgraded, no code changes.

## Filenames

| Drop here as              | What it becomes               |
| ------------------------- | ----------------------------- |
| `bear.glb`                | Player who chose bear         |
| `cat.glb`                 | Player who chose cat          |
| `fox.glb`                 | …                             |
| `capybara.glb`            |                               |
| `bird.glb`                |                               |
| `bunny.glb`               |                               |
| `puppy.glb`               |                               |
| `panda.glb`               |                               |
| `hamster.glb`             |                               |
| `penguin.glb`             |                               |
| `frog.glb`                |                               |
| `mochi.glb`               | Mochi NPC (the bear in grove) |

## Specs the loader expects

- Format: `.glb` (binary glTF 2.0) — `.gltf+bin` also works if you put files alongside
- Origin: feet on **y = 0**, model upright, **+Z forward** (so walking forward = +Z)
- Scale: total height ≈ **1.8 units** (matches the capsule collider)
- Tri budget: 10k–25k OK; >30k starts costing perf on low-end mobile
- Materials: PBR (baseColor / roughness / metallic), embedded textures recommended
- Animation clips (optional but huge upgrade): `Idle`, `Walk`, `Run`, `Jump`
  - Loader matches clip names loosely — `idle`, `Walking`, `RunFast` all fine
  - No clips = static mesh; still looks great

## Prompts

See [`PROMPTS.md`](./PROMPTS.md) — one prompt per species + Mochi,
tuned for Meshy / Tripo / Rodin text-to-3D.
