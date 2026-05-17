# 主提示词模板

复制下面整段，替换 4 个 `{PANEL_N}` 占位符为你的具体场景描述，然后喂给图像 AI。

---

## Prompt（英文，给模型用）

```
A 4-panel comic strip in a 2×2 grid layout, thin white gutters (~12px) between panels, square 1:1 aspect ratio.

# CHARACTERS — render them EXACTLY as the attached reference images.

## Panda ("Airing") — main character
A round, fluffy panda in confident black-and-white ink wash. Big expressive black-dot eyes with subtle highlights. Round head, soft cheeks. The brushwork is loose but the character is recognizable in every panel.

## Moflow — the AI companion
A small water-drop / blob creature, ~1/3 the panda's size. Smooth body with a soft pale blue wash, large dark eyes with tiny white reflections, a small tuft on top. Lives beside or near the panda. Quiet, often watching.

# PANELS

**Panel 1 (top-left):** {PANEL_1}

**Panel 2 (top-right):** {PANEL_2}

**Panel 3 (bottom-left):** {PANEL_3}

**Panel 4 (bottom-right):** {PANEL_4}

# STYLE

Hand-painted ink wash comic illustration (水墨画 sensibility). Confident, expressive brushstrokes. Pale watercolor accents allowed (gentle pink cheeks, soft blue on Moflow). White / off-white paper background. NOT photographic, NOT 3D, NOT digital-vector. Illustrative but emotionally legible.

Minimal backgrounds — a desk edge, a windowsill, a teacup — never busy. Same characters across all 4 panels; the panda in panel 4 must look like the panda in panel 1.

NO text anywhere in the image — no speech bubbles, no labels, no captions, no writing on objects.
```

---

## Midjourney 参数

```
--ar 1:1 --style raw --cref <panda_url> --cref <moflow_url> --cw 100
```

`--cw 100` 表示 character weight 拉满，强迫模型尽量接近 ref。

把 `refs/panda.png` 和 `refs/moflow-ink.png` 上传到 imgur 或 cdn，把 URL 替换上去。

---

## 场景描述写作建议

每个 `{PANEL_N}` 写 **1-2 句具体的画面**，包含：

- 出场角色（panda alone / both / Moflow alone / 都不在）
- 姿势、表情、视线方向
- 光线、设置（少而精）
- 一个具体的道具或物件

**别这么写**：`panda is sad`

**这么写**：`panda slumped over keyboard, cursor still blinking on screen, late afternoon light through window, Moflow watching quietly from beside the mug`

---

## 完整示例（参考）

主题：**今天 debug 三小时发现是少了个分号**

```
Panel 1 (top-left): Panda hunched over laptop at a wooden desk, expression focused, brow slightly furrowed. Steam rising from a teacup. Window in background, morning light. Moflow nestled on the desk beside the laptop, watching with mild concern.

Panel 2 (top-right): Same desk angle but later in the day — light from window has shifted to a warmer afternoon glow. Panda still at laptop, posture more slumped now, one paw on chin. Three empty mugs lined up. Moflow has fallen asleep curled by the keyboard.

Panel 3 (bottom-left): Close-up of panda's face — eyes wide, jaw slack, frozen mid-realization. A faint pencil-line drawn around one tiny detail on the laptop screen (suggesting a missing semicolon, but no text visible). Moflow stirred awake by the sudden stillness.

Panel 4 (bottom-right): Panda from behind, viewed through the doorway. Slumped forward over the laptop, completely still. Moflow has climbed onto the panda's head and is patting it gently. Window is now dim — evening. A teacup on the table is empty.
```

—

发图给 bot 时 caption 就写：**分号** （或英文 `The Semicolon`）。
