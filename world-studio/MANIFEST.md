# World Studio — MVP Asset Manifest

> 19 张 MVP sprite。挨个生成，生成完把对应行 `[ ]` 改 `[x]` 并 commit。
> 每个 prompt = `STYLE.md 整段` + 下面 `**Prompt:**` 后面那段。

---

## A · Ground Tiles (5 张 · 128×128 PNG · 透明背景)

### A01 — Grass tile  `[x]`
- **File:** `output/tiles/A01-grass.png`
- **Size:** 128×128 px
- **Prompt:** A single seamless isometric grass tile, 128×128 pixels, viewed from above at 45-degree angle. Soft sage-green grass blades with subtle hand-painted texture, a few darker moss patches and one or two tiny yellow wildflowers for variation. Top-down rhombus shape filling the canvas. Transparent background (NOT a square — only the diamond-shaped tile area is opaque). Must tile seamlessly when placed next to copies of itself on all 4 sides.

### A02 — Stone path tile  `[x]`
- **File:** `output/tiles/A02-stone.png`
- **Size:** 128×128 px
- **Prompt:** A single seamless isometric stone path tile, 128×128 pixels. Cobblestone arrangement of 3-5 rounded warm grey-beige river stones fitted together with moss in the cracks. Hand-painted soft shading, slight wear on the stones. Diamond-shaped tile area only, transparent elsewhere. Must tile seamlessly with copies of itself.

### A03 — Wood floor tile  `[x]`
- **File:** `output/tiles/A03-wood.png`
- **Size:** 128×128 px
- **Prompt:** A single seamless isometric warm wood plank floor tile, 128×128 pixels. Aged oak planks running diagonally, soft brown grain hints, warm cinnamon palette. Two or three plank seams visible. Diamond-shaped tile only, transparent elsewhere. Must tile seamlessly with copies of itself.

### A04 — Shallow water tile  `[x]`
- **File:** `output/tiles/A04-water.png`
- **Size:** 128×128 px
- **Prompt:** A single seamless isometric shallow water tile, 128×128 pixels. Misty teal water surface with very gentle painted ripples (concentric soft circles), one or two pale highlight reflections suggesting a sky above. Soft and dreamy, not photoreal. Diamond-shaped tile only, transparent elsewhere. Must tile seamlessly.

### A05 — Sandy dirt tile  `[x]`
- **File:** `output/tiles/A05-sand.png`
- **Size:** 128×128 px
- **Prompt:** A single seamless isometric sandy dirt path tile, 128×128 pixels. Warm sandy-beige soil with a few tiny pebbles and a hint of grass at one corner. Hand-painted soft texture. Diamond-shaped tile only, transparent elsewhere. Must tile seamlessly.

---

## B · Character (4 张 · 256×256 PNG · 透明背景)

> 主角 = Airing 熊猫。**支持 image2 ref 的话，每张都附 `refs/panda.png`**。
> 4 张是同一个角色不同朝向的待机帧。**保持比例/颜色/特征一模一样**。

### B01 — Avatar idle, facing camera (front-south)  `[x]`
- **File:** `output/character/B01-idle-south.png`
- **Size:** 256×256 px
- **Ref:** attach `refs/panda.png`
- **Prompt:** The Airing panda character (see attached reference) standing upright in a relaxed bipedal idle pose, facing the viewer directly. Front-three-quarter isometric view (camera is slightly above and slightly to the side, 45-degree angle). Arms hanging relaxed at sides. Calm soft expression looking ahead. Both feet visible on the ground. Sprite occupies roughly the lower 80% of the canvas vertically. Transparent background, no ground shadow.

### B02 — Avatar idle, facing right (east)  `[x]`
- **File:** `output/character/B02-idle-east.png`
- **Size:** 256×256 px
- **Ref:** attach `refs/panda.png`
- **Prompt:** Same Airing panda character as B01 (attached reference), same proportions and palette, same relaxed bipedal idle pose, but now turned to face right (east) in profile-three-quarter view. Head pointed right, body angled 45 degrees from the camera. Both feet still on the ground. Tail/back of head partially visible. Transparent background, no ground shadow. Must be visually consistent with B01 — same character, just rotated.

### B03 — Avatar idle, facing away (back-north)  `[x]`
- **File:** `output/character/B03-idle-north.png`
- **Size:** 256×256 px
- **Ref:** attach `refs/panda.png`
- **Prompt:** Same Airing panda character as B01 (attached reference), facing away from the camera (north, back view). Back of the round head visible with the distinctive black ears in silhouette. White back fur with the characteristic black saddle. Both feet visible. Relaxed bipedal idle. Transparent background, no ground shadow. Must be visually consistent with B01 — same character, just turned around.

### B04 — Avatar idle, facing left (west)  `[x]`
- **File:** `output/character/B04-idle-west.png`
- **Size:** 256×256 px
- **Ref:** attach `refs/panda.png`
- **Prompt:** Same Airing panda character as B01 (attached reference), facing left (west) in profile-three-quarter view. Mirror of B02 essentially. Head pointed left, body angled 45 degrees. Both feet visible. Relaxed bipedal idle. Transparent background, no ground shadow. Must be visually consistent with B01 and B02.

---

## C · Buildings / Work-Zone Anchors (5 张 · 256×256 PNG · 透明背景)

> 这些是"作品展示区"的核心 prop。玩家走到附近会触发对应类别的作品列表面板。
> **每个都比角色稍大或同高**，作为环境锚点。

### C01 — Cozy bookshelf (BLOG)  `[x]`
- **File:** `output/buildings/C01-bookshelf.png`
- **Size:** 256×256 px
- **Prompt:** A warm wooden bookshelf, isometric 45-degree view, 3 shelves stacked tall. Rows of colorful book spines (assorted warm-tone covers — terracotta, cream, dusty olive, faded teal). A small framed photo and a tiny potted succulent on top. Aged oak wood with soft grain. Looks inviting and lived-in, like a personal library. Transparent background, no ground shadow.

### C02 — Easel with painted comic panel (COMICS)  `[x]`
- **File:** `output/buildings/C02-easel.png`
- **Size:** 256×256 px
- **Prompt:** A wooden art easel, isometric 45-degree view, holding a small square canvas painted with a charming 4-panel comic strip in a 2×2 grid (the comic shows tiny pandas — generic abstract suggestion of the comic, not legible text). Brushes in a jar at the easel's base. A folded apron draped over one leg. Warm cinnamon wood. Transparent background, no ground shadow.

### C03 — Vintage record player table (MUSIC)  `[x]`
- **File:** `output/buildings/C03-record-player.png`
- **Size:** 256×256 px
- **Prompt:** A small wooden side table with a vintage vinyl record player on top, isometric 45-degree view. Record is mid-spin (subtle motion blur lines around the edge). A few vinyl record sleeves leaning against the table's leg. Warm amber light glowing from inside the player. Cozy and slightly nostalgic. Transparent background, no ground shadow.

### C04 — Reading nook armchair (READING)  `[x]`
- **File:** `output/buildings/C04-armchair.png`
- **Size:** 256×256 px
- **Prompt:** A plush over-stuffed armchair upholstered in soft dusty-rose linen, isometric 45-degree view. An open book lies face-down on the seat (suggesting "just got up"). A folded knit blanket draped over one arm. A small side table next to it holds a steaming cup of tea. Warm and inviting, the kind of chair you sink into for hours. Transparent background, no ground shadow.

### C05 — Campfire ring (CHAT / AI COMPANION)  `[x]`
- **File:** `output/buildings/C05-campfire.png`
- **Size:** 256×256 px
- **Prompt:** A small stone fire ring with a warm orange campfire burning gently, isometric 45-degree view. 3-4 rounded stones arranged in a circle. Small log pile next to it. One short cozy log bench (a single split log on two stone supports) facing the fire. Soft warm glow radiates from the flame (the glow should be drawn into the sprite itself, not as a separate light). Evening dusk warmth. Transparent background, no ground shadow.

---

## D · Decorations (5 张 · 128×128 PNG · 透明背景)

> 用来填充场景空地，避免空旷感。

### D01 — Pine tree  `[ ]`
- **File:** `output/decorations/D01-pine.png`
- **Size:** 128×128 px
- **Prompt:** A medium-sized pine tree, isometric 45-degree view. Soft layered triangular canopy of muted sage-green needles in 3 distinct tiers. A small visible patch of warm brown trunk at the base. Hand-painted, slightly stylized. Sprite occupies the full height of the canvas. Transparent background, no ground shadow.

### D02 — Small round bush  `[ ]`
- **File:** `output/decorations/D02-bush.png`
- **Size:** 128×128 px
- **Prompt:** A small round shrub bush, isometric 45-degree view. Soft cluster of moss-green foliage clumps in a roughly spherical shape, with 2-3 tiny pale-pink berries peeking out. Sits flat on the ground. Hand-painted softness. Transparent background, no ground shadow.

### D03 — Mossy rock cluster  `[ ]`
- **File:** `output/decorations/D03-rocks.png`
- **Size:** 128×128 px
- **Prompt:** A cluster of 3 rounded river rocks of varying sizes (large, medium, small), isometric 45-degree view. Cool grey-beige stone color with patches of soft moss-green on the tops. Smooth weathered shapes, not angular. Transparent background, no ground shadow.

### D04 — Warm wooden lamp post  `[ ]`
- **File:** `output/decorations/D04-lamp.png`
- **Size:** 128×128 px
- **Prompt:** A short wooden lamp post, isometric 45-degree view. Cinnamon-wood vertical post with a small lantern-style glass enclosure on top emitting a warm yellow glow (the glow should be drawn into the sprite). The lantern has a tiny gabled roof. Cozy fairytale feel. Sprite occupies most of the canvas vertically. Transparent background, no ground shadow.

### D05 — Lavender flower patch  `[ ]`
- **File:** `output/decorations/D05-lavender.png`
- **Size:** 128×128 px
- **Prompt:** A small patch of lavender flowers, isometric 45-degree view. 5-7 tall slender stems with soft dusty-purple flower spikes at the top, set in a low cluster of pale green leaves at the base. Hand-painted softness, slight variation in heights. Transparent background, no ground shadow.

---

## 进度

- [ ] A 系列 (5/5)
- [ ] B 系列 (4/4)
- [ ] C 系列 (5/5)
- [ ] D 系列 (5/5)

全部完成后通知用户。
