# Office Studio — STYLE LOCK · 干净现代像素办公室

> **这份文件不可改。** 每个 sprite 的 prompt 必须以**下面整段 STYLE 文字作为前缀**，再拼接 MANIFEST 里那件家具/瓦片的 specific 提示。
> 目标:和 nook 现有的 lobby/gallery 同一套**俯视像素**渲染兼容(16px 瓦片、轻¾视角),但读起来是一间**干净、极简、现代的初创办公室**(参考 Marvis 办公室那种"性冷淡白" + 一点暖色点缀)。

---

## STYLE PREFIX(每个 prompt 必须包含这段,不可省略)

```
Art style: cozy top-down pixel art, same family as a Stardew/Animal-Crossing-like
2D game seen from a slight 3/4 top-down angle. Crisp pixel edges, a few shades of
soft pixel shading per surface (NOT flat vector, NOT photorealistic, NOT 3D render).
The subject is a piece of a CLEAN, MINIMAL, MODERN startup OFFICE — bright, airy,
uncluttered, calm.

Palette: cool light neutrals as the base, with restrained warm accents only:
  - floor / walls : off-white #f2f0ec, light warm-grey #e6e3dc
  - furniture     : white #fafafa, light grey #d8d6d0, soft shadow #c9c6bf
  - monitor bezel : dark charcoal #2a2a30 ; screen-glow (active) soft cyan #6cc8e8
  - chair / tech  : graphite #3a3a42
  - WARM accents (use sparingly, 1-2 per sprite): plant green #5a8f4a,
    coffee/wood brown #8a6a44, mustard #d8b048, a single chair-accent color
    (red #d44820 / purple #7c5cd0 / yellow #e8c020 / blue #3a7fd0)
Keep it LIGHT and CLEAN — lots of white/neutral, color only as a small accent.
Do NOT make it warm/wooden/cozy-cabin (that's the lobby); do NOT make it a
museum (that's the gallery). This is a bright modern office.

Rendering & grid:
  - Pixel art aligned to a 16×16 px tile grid. Output the exact px size given per
    sprite in MANIFEST (e.g. 32×32, 48×32, 16×16).
  - Transparent background (PNG) for all FURNITURE / PROPS / DECOR.
  - FLOOR and WALL tiles: 16×16, fully opaque, must TILE seamlessly (edges wrap).
  - Slight top-down 3/4 view: you see the TOP of desks/tables and a little of the
    front face, like the existing nook rooms. Cast a soft, short pixel drop-shadow
    DOWN-LEFT under furniture (subtle, 1-2px, #c9c6bf-ish) so it sits on the floor.

Mood: a calm, bright, focused workspace. Tidy. A little charming (a plant here, a
coffee mug there) but never cluttered.

ABSOLUTE BANS:
  - ❌ NO text, letters, numbers, logos, or screen UI text inside the sprite
       (monitors show a soft glow / abstract blocks, never readable text)
  - ❌ NO photorealism, NO 3D render look, NO glossy/plastic highlights, NO bloom
  - ❌ NO smooth gradients across a whole shape — use stepped pixel shading (2-4 shades)
  - ❌ NO heavy black outline-everything cartoon style — soft pixel edges, like the
       reference game art, not Hanna-Barbera
  - ❌ NO warm wooden cabin vibe, NO marble/museum vibe
  - ❌ NO characters/animals in furniture sprites (characters are rendered separately
       by the game engine — these are just the room + furniture)
  - ❌ NO signatures / watermarks
```

---

## 风格内化参考(不进 prompt,只给绘图 agent 找感觉)

1. **参考锚**:Marvis 办公室(性冷淡白、工位 + 显示器 + 黑色 agent 角色、左侧咖啡站/跑步机/卫生间的小品)——我们要的是**那种干净留白的办公室空间感**,但用**像素**而不是 3D 白模。
2. **同场景兄弟**:nook 的 `lobby` / `gallery` 房间(同一套俯视像素瓦片渲染)。新办公室要能和它们用同一个引擎渲染、和同样的 Bear 像素角色共处一帧——所以**瓦片对齐、视角一致、阴影方向一致**。
3. **颜色纪律**:整间以浅中性色铺底(白/浅灰/off-white),暖色只做点缀(一盆绿植、一杯咖啡、椅背一道彩色、显示器一抹冷光)。**留白是主角。**
4. **角色不用画**:主 agent / subAgents 用游戏里现成的动物像素角色(`bear.ts`),studio 只产**房间 + 家具 + 道具**。
