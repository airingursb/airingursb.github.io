# Gallery Studio — ursb.me Nook 美术馆素材工作台

> 你（Codex / 绘图 agent）只画 sprite，**不写代码**。我（nook agent）接管把素材导入 Phaser 场景。
> 类比 `comics-studio/` 和 `world-studio/`。

---

## 目标场景

ursb.me 的 nook 里要建一个**真正的大型美术馆**（多展区、多展品、几十个细节），陈列博主 Airing 的技术作品（immersive 长文、四格漫画、3D 园子）。

整馆使用统一艺术风格：**Saul Bass / WPA 海报**（详见 `STYLE.md`，不可改）。

---

## 📁 目录结构

```
gallery-studio/
├── README.md          ← 这份（工作流契约）
├── STYLE.md           ← 不可改的风格锚（每个 prompt 必须以此整段为前缀）
├── MANIFEST.md        ← 资产清单（你按这个清单从上到下挨个生成）
├── refs/              ← 参考图（如有 source 海报参考可放这里）
└── output/            ← 你的产出区
    ├── paintings/     ← A 系列 · 馆藏画作（每件展品一幅 Saul Bass 海报）
    ├── centerpieces/  ← B 系列 · 中庭焦点作品（更大、更重的核心展品）
    ├── architecture/  ← C 系列 · 建筑构件（柱子、雕像、长椅、信息台、门）
    ├── npc/           ← D 系列 · 馆员 NPC sprite（导览员 4 方向）
    ├── tiles/         ← E 系列 · 地板/墙面瓦片（大理石、镶木）
    └── decorations/   ← F 系列 · 装饰小品（绒绳栏杆、植物、铭牌）
```

---

## 🤝 Drawing Agent 契约

**你的工作 = 看 `MANIFEST.md`，从上到下挨个 sprite 生成 PNG。每生成一个就在 MANIFEST 里把 `[ ]` 改成 `[x]`，不要跳着做。**

### 输出规范（每个 sprite）

- **格式**：PNG，**透明背景**（无白底、无棋盘格）
- **分辨率**：按 MANIFEST 中每个 sprite 标注的尺寸
- **命名**：完全按 MANIFEST 里给出的文件名（如 `A01-chromium-renderer.png`），不要改名
- **存放路径**：按 MANIFEST 中 `**File:**` 字段
- **不在图里加文字 / 水印 / signature** —— 这是规则（详见 STYLE.md），馆藏画作的标题由游戏内的铭牌呈现，不是画的一部分
- **保持风格一致**：所有作品必须可以被识别为「同一位 designer / 同一个展览」 —— 调色板、笔触、构成原则严格按 STYLE.md

### 生成流程

1. 打开 `STYLE.md`，把整段 style 文字作为每个 prompt 的**前缀**（不要省略，不要改写）
2. 拼接 `MANIFEST.md` 里对应 sprite 的 `**Prompt:**` 字段作为后半段
3. 调你的 image2 工具生成
4. 保存到 MANIFEST 指定路径
5. 在 MANIFEST 把那一行的 `[ ]` 改成 `[x]`，提交一个 commit（`feat(gallery-studio): add A01 chromium-renderer painting`）

### 一致性优先

如果某个 sprite 的风格跟前面 5 个明显不一致（调色板跑偏 / 构图反原则 / 出现禁止元素），**停下来跟用户对齐**，不要硬着头皮往下生。

宁愿生 20 张精品，不要 60 张失控。

---

## ❌ 不要做的事

- ❌ 不要改 `STYLE.md` —— 一改整批就漂
- ❌ 不要改 `MANIFEST.md` 的 prompt 字段或文件名 —— 改了我导入时对不上（加新 sprite 必须先跟用户对齐）
- ❌ 不要在 `output/` 之外创建文件
- ❌ 不要 commit 大体积的中间产物（如果某个 sprite 用了 10 张失败品，删掉只留最终版）
- ❌ 不要修改 `src/` 任何代码 —— 那是 nook agent 的范围
- ❌ 不要在画里写中文/英文标题 —— STYLE.md 明确禁止画内文字
