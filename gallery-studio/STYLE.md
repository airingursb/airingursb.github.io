# Gallery Studio — STYLE LOCK · Saul Bass / WPA Poster

> **这份文件不可改。** 每个 prompt 必须以**下面整段 STYLE 文字作为前缀**，再拼接 MANIFEST 里的 sprite-specific 提示。

---

## STYLE PREFIX（每个 prompt 必须包含这段，不可省略、不可改写）

```
Art style: 1930s WPA Federal Art Project poster fused with Saul Bass title-sequence
graphic design. Flat geometric shapes, hard edges only — no gradients, no soft
brushes, no airbrush. Bold silhouettes simplified to 1–3 primary geometric forms.
Heavy use of negative space. Asymmetric but balanced modernist composition.

Palette: 4 colors max per painting, drawn ONLY from this fixed set:
  - cream      #f0e8c8  (the canvas / paper / "off-white" base)
  - vermilion  #d44820  (warm action / signal red)
  - teal       #2a8090  (cool counter / depth)
  - mustard    #d8b048  (gold-yellow accent)
  - ink        #1a1a1a  (line / silhouette / outline)
Pick a 3–4 color subset per piece; use cream as background unless explicitly told
otherwise. Do NOT introduce new colors. Do NOT use grayscale. Do NOT use brand
colors (no React-blue, no Chrome rainbow).

Mood: confident, museum-grade, declarative, slightly retro-futurist. Each piece
should feel like a single distilled idea hit with a hammer — not an illustration
of "everything about X", but ONE moment / ONE metaphor from X.

Resolution & framing:
  - Output 512×512 PNG, transparent background
  - The composition sits inside an implicit square — leave ~6% margin from each
    edge (≈30px) for breathing room (so the picture doesn't bleed when framed
    in-game)
  - Portrait or symmetrical composition preferred (the game frames are slightly
    portrait-oriented)
  - NO border / NO frame inside the image (Phaser draws the gold frame around it)

ABSOLUTE BANS:
  - ❌ NO text, letters, numbers, or typography inside the painting
       (no "TLS", no "1.3", no Chinese characters — the in-game brass plaque
        below the frame carries the title)
  - ❌ NO photorealism, NO 3D render look, NO glossy materials
  - ❌ NO gradients of any kind — flat color only, hard edges
  - ❌ NO drop shadows, NO outer glows, NO bevels
  - ❌ NO signatures, watermarks, or "by AI" markings
  - ❌ NO outline-everything-in-black cartoon style — use silhouettes, not
       outlined drawings (think Saul Bass, not Hanna-Barbera)
  - ❌ NO mid-century clipart vibe — this is graphic-art quality, not stock
  - ❌ NO references to specific brand logos (no React atom logo, no Chrome
       rainbow, no GitHub octocat — these are tech concepts not corporate ads)
```

---

## 风格深度参考（不进 prompt，只是给 agent 内化用）

### 三大源头

1. **WPA Federal Art Project 海报** (1935–1943)  
   - 美国大萧条期间联邦艺委会印的国家公园 / 公共健康 / 文化活动海报  
   - 限色丝网印刷工艺决定了「平涂 + 硬边 + 3–4 色」的视觉语言  
   - Google "WPA poster" 看几十张即可建立直觉

2. **Saul Bass 片头/海报** (1955–1995)  
   - 《迷魂记》《精神病患者》《金臂人》《剃刀边缘》  
   - 提炼电影核心成 1 个几何符号 → 整个画面绕这个符号展开  
   - 大量 negative space，标题字体本身也是几何构成

3. **Polish poster school** (1950s–80s)  
   - Henryk Tomaszewski、Wojciech Fangor 等人  
   - 比 Bass 更超现实、更隐喻，但同样限色、同样硬边

### 给 tech 主题做 Saul Bass 化的方法

> 每件作品的 Prompt 都遵守这个套路：

1. **提炼 ONE metaphor**：不要画"TLS 协议的全部"，画"两只手交换密封信封"
2. **简化到 1–3 形状**：圆 + 三角 + 线 = 整个画面
3. **negative space 讲故事**：留白本身就是构图的一部分（Bass《Anatomy of a Murder》的肢体留白是经典）
4. **不平衡但稳的构图**：主体往一边偏，用 negative space 平衡
5. **限色但用得狠**：3 色平涂，对比强烈（cream 当背景，剩 2 色当主色）

---

## ✅ DO / ❌ DON'T 例子

| ✅ DO | ❌ DON'T |
|---|---|
| 提炼一个核心隐喻图形 | 把文章每个步骤都画进去 |
| 用 3 色 cream/vermilion/teal | 加第 6 个颜色凑细节 |
| 硬边平涂 | 加 blur 或 gradient「让它柔和点」 |
| 留 30% 空白 | 把画面填满 |
| 让 ink 画作为 silhouette | 用 ink 把所有形状描边 |
| 抽象到能看出概念 | 抽象到看不懂在画什么 |
| 几何化的具象（手、信封、芯片、波形） | 完全抽象的色块（这是 Rothko 不是 Bass） |
