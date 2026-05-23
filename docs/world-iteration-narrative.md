# /world/ — iteration narrative

> Built 2026-05-24. 37+ commits, 6+ sub-agent design critique cycles,
> 6+ independent SHIP verdicts.

This is the design diary for the R3F floating-island diorama at
`src/world/` (route `/world/`). Captured for context that the
commit log can't.

---

## The brief

User wanted a 2.5D / 3D "箱庭" portfolio scene where their works
(blog / comics / music / reading / AI chat) live as physical objects
in a tiny self-contained world. References given: Captain Toad,
Monument Valley, Tiny Glade.

## Path that didn't work

1. **Procedural primitives** (early grove3d work) — visual ceiling
   too low. User: "你这个画的是什么东西... 5 分钟就交付了."
2. **GLB generation via Meshy** — burned ~400 credits, models
   inconsistent / didn't pass user taste bar. User: "我感觉风格不好,
   我应该还是调好风格再让你生成的, 浪费了很多钱."
3. **2D Phaser iso grid** — user: "完全没有场景设计... 你这在干嘛呢？
   简直是豆腐渣工程." Archived to `_phaser-attempt/` then deleted
   in iter 37.
4. **First-pass R3F blockout** (iter 1) — user: "你纠对了. 箱庭 =
   miniature 世界 / 微缩景观（dollhouse / snow globe / tray garden）,
   不是 box."

## Path that did

1. Reframed as **organic forest cabin island**, not a literal box.
2. Pivoted to **all-procedural R3F geometry** (no GLB asset hunt).
3. Adopted **iterative sub-agent critique loop** — every 2-3 iter
   spawn an independent design critic, apply gaps, repeat.
4. Set hard composition rule: **cabin = uncontested hero**. Cut
   Rainbow / HotAirBalloon / Scarecrow in iter 14 when they pulled
   the eye away.

## What the scene contains

(Edit `src/world/README.md` for the live file map.)

- Floating organic island, 22-unit radius, with cliff drop + cloud
  sea + 2 distant mini-islands
- Log cabin (hero) with Mochi NPC + panda avatar at door + smoke +
  glowing window + red door + porch + rocking chair
- 4 outdoor zones: hammock (north), easel (west), gazebo (east),
  book deck (south)
- 5 tree species (45 trees) + 6 filler types (35) + 720 instanced
  grass blades + 120 wildflowers
- Pond + river + waterfall + bridge
- Critters: cat / 2 ducks / deer + sparkle birds + butterflies + bees
- Cabin → real chat with `chat.ursb.me/api/ai-companion/chat`
- 4 other zones → HTML panel with real content from
  articles/music/highlights JSON (build-time import)
- Day / dusk toggle that shifts both lights AND sky
- 📷 photo snap / 🎯 camera reset / 🌙 day-night UI buttons
- Adaptive QUALITY tier (low/medium/high) gates SSAO + DoF

## Composition decisions worth not undoing

- **No rainbow** — incompatible with the chosen sun direction
- **No hot air balloon** — sky catcher that out-competes the cabin
- **No scarecrow** — narrative redundancy with weathervane
- **Cabin off-center at [-2, -1]** — orbit reveals a changing hero
- **Cool fill light killed** — warm-only palette commits to one hour
- **DoF subtle (bokehScale 1.5)** — not radial-blur-from-near
- **Bloom threshold 0.55** — window glow + door red are hero
  bright pixels; was too high at 0.85

## Materials / palette refs (do not freelance)

- Warm sun: `#FFD09A` from `[20, 11, 9]` (elev ~28°)
- Dusk sun: `#FF9A6A` from `[18, 4, 14]` (elev ~12°)
- Warm hemisphere sky: `#FFD9A8` / ground bounce `#5A3A28`
- Grass: `#85AC78` light → `#6AA055` dark patches
- Soil: `#7A5A3E`
- Wood logs: `#9E7A52` light alternating `#6E4F31` dark
- Shingle palette (5-color rotation): `#5C3A22 / #4A2F1C / #6E4A2E /
  #3A2516 / #8B5E3C` + occasional moss `#7A9268`
- Hero door red: `#A03030`
- Mailbox red (muted, not competing): `#8B4848`
- Cherry blossom (muted, not competing): `#E8D2DC`
- Maple autumn accent: `#D9622B / #E29A4A / #C0451E`

## Performance budget

- ~50-60K triangles drawn per frame (instanced grass + 45 trees +
  cabin shingles dominate)
- Single shadow-casting directional light (3072² shadow map)
- SSAO + Bloom + DoF + Vignette + SMAA + ACES (high tier)
- Adaptive degrade for low-end: drops SSAO + DoF
- Suspense + WorldLoader splash keeps the first 1-2s clean
