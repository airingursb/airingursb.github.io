# World Studio — Style Anchor

> **每个 prompt 必须以这段为前缀。不要改写、不要省略、不要"用我自己的话总结"。**
> 整批 sprite 视觉一致性的唯一保险就是这个 anchor 锁死。

---

## Style Prompt（英文，直接拼到 image2）

```
Style: Stylized cozy diorama art, inspired by Stardew Valley × Animal Crossing × Studio Ghibli. Painterly soft cel-shading with 2-3 tone gradients, warm earthy pastel palette, slightly hand-painted feel with visible brush texture. Charming and inviting, not gritty or realistic.

View: Isometric 45-degree projection (cabinet projection / dimetric). Sprite faces the camera at a 45-degree angle — front-three-quarter view. Vertical pieces lean slightly back so the top is visible. NOT top-down, NOT side-scrolling, NOT first-person.

Lighting: Soft warm sunlight from upper-left (northwest). Shadows fall toward lower-right (southeast). Gentle ambient bounce light from the right keeps shadows colored, not pure black.

Palette anchors (use these tones; do not invent saturated colors):
- Grass / foliage: muted sage green #7BA374, soft moss #6B8B5A
- Earth / wood: warm cinnamon #8B6F47, oak brown #A8855C
- Stone: cool grey-beige #B5AFA3, deep slate #6D6B66
- Water: misty teal #8FB4B7, shadow blue #5A7A82
- Warm accents: terracotta #C97B5C, peach #F4D9A0, butter cream #FAEFC8
- Sky / background: not needed (transparent), but if hinted, dusk lavender #C4B8D8

Background: PURE TRANSPARENT ALPHA. Absolutely no background color, no scenery, no scene context. The sprite must be cleanly isolated for compositing into a tile-based world.

Detail level: Medium. Recognizable silhouette at small sizes. No fine pixel hatching, no photoreal fur, no busy texture noise. Smooth painted surfaces with 2-3 light/shadow planes per object.

No: text, watermarks, signatures, captions, UI elements, photorealism, harsh shadows, anime/cel-shaded comic outlines, sketchy lines, ground shadow (handled by engine separately), generic stock-asset feel.
```

---

## Character Description (for B-series sprites — main avatar)

```
Character: "Airing" — a small round panda matching the attached refs/panda.png reference image.

Key features (must stay consistent across all character sprites):
- Round chubby body with white belly and black limbs/ears (classic panda pattern)
- Soft head with distinctive black eye patches
- Big expressive black-dot eyes with a single tiny white highlight
- Small round black nose
- Stubby short limbs, bipedal stance
- Calm gentle warm personality
- No clothing, no accessories (unless a specific sprite calls for one)

Approximate proportions: head is ~40% of total height (chibi). Body is round, not muscular. Hands and feet are small soft paws.

If image2 supports reference images, attach refs/panda.png. Otherwise use this text description verbatim.
```

---

## Object Description Defaults

For furniture / buildings (C-series), unless a sprite specifies otherwise:
- **Wood:** warm aged oak, visible grain hint, soft round corners
- **Metal:** brushed copper or warm bronze, never chrome or steel
- **Fabric:** linen or cotton, oat / cream / dusty rose color
- **Paper / books:** aged off-white, gentle stains, no Lorem text

For natural elements (D-series):
- **Trees:** loose canopy clusters, not rigid topiary
- **Plants:** soft varied leaf clusters
- **Stone:** rounded river rocks or moss-covered boulders, never angular geometric

---

## Reference matching priority

If a sprite description conflicts with this STYLE anchor (e.g. "make a chrome modern desk" but STYLE says "no chrome"), **STYLE wins**. Tell the user and ask for resolution.
