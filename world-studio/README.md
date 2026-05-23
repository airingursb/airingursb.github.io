# World Studio — 2.5D 箱庭场景资产工作台

> 用 Codex / Image2 / 任意图像 AI 出图 → 放到 `output/` 对应分类 → 我接管导入 Phaser 场景。
> 类比 `comics-studio/`，**Codex 只画 sprite，不写代码**。

—

## 📁 目录结构

```
world-studio/
├── README.md          ← 这份（agents 必读，工作流契约）
├── STYLE.md           ← 不可改的风格锚（每个 prompt 必须以此开头）
├── MANIFEST.md        ← 资产清单 + 每个 sprite 的 prompt（你按这个清单逐一生成）
├── refs/              ← 角色参考图（用 panda.png 作为主角 anchor）
│   ├── panda.png         （主角 Airing 熊猫，跟 comics-studio 同一只）
│   └── style-prompt.md   （style 描述参考，可附加到 prompt）
└── output/            ← 你的产出区
    ├── tiles/         ← 地面瓦片（A 系列）
    ├── character/     ← 主角立绘（B 系列，每帧一个 PNG）
    ├── buildings/     ← 作品区域建筑（C 系列）
    └── decorations/   ← 装饰小品（D 系列）
```

—

## 🤝 Drawing Agent 契约

**你的工作 = 看 `MANIFEST.md`，从上到下挨个 sprite 生成 PNG。每生成一个就在 MANIFEST 里把 `[ ]` 改成 `[x]`，不要跳着做。**

## 输出规范（每个 sprite）

- **格式**：PNG，**透明背景**（无白底、无棋盘格）
- **分辨率**：按 MANIFEST 中每个 sprite 标注的尺寸（瓦片 128×128，主角 256×256，建筑 256×256，装饰 128×128）
- **命名**：完全按 MANIFEST 里给出的文件名（如 `A01-grass.png`），不要改名
- **存放路径**：按 MANIFEST 中 `**File:**` 字段（如 `output/tiles/A01-grass.png`）
- **不在图里加文字 / 水印 / signature**——除非 MANIFEST 明确要求
- **保持透视一致**：所有资产都是 **isometric 45°（俯视斜视角，类似 Stardew Valley / Animal Crossing）**，不要换角度
- **保持光照一致**：光源始终在**左上方**（西北），阴影投向**右下方**（东南）

## 生成流程

1. 打开 `STYLE.md`，把整段 style 文字作为每个 prompt 的**前缀**（不要省略，不要改写）
2. 拼接 `MANIFEST.md` 里对应 sprite 的 `**Prompt:**` 字段作为后半段
3. 主角相关的 sprite（B 系列）一律附加 `refs/panda.png` 作为参考图（如果你的 image2 工具支持 image-to-image）；不支持就用 STYLE.md 里的角色描述作为兜底
4. 调 image2 生成
5. 保存到 MANIFEST 指定路径
6. 在 MANIFEST 把那一行的 `[ ]` 改成 `[x]`，提交一个 commit（`feat(world-studio): add A01 grass tile`）

## 一致性优先

如果某个 sprite 的风格跟前面 5 个明显不一致（色调跑偏 / 透视错 / 比例不对），**停下来跟用户对齐**，不要硬着头皮往下生。

## 不要做的事

- ❌ 不要改 `STYLE.md` —— 一改整批就漂
- ❌ 不要改 `MANIFEST.md` 的 prompt 字段或文件名 —— 改了我导入时对不上
- ❌ 不要在 `output/` 之外创建文件
- ❌ 不要 commit 大体积的中间产物（如果某个 sprite 用了 10 张失败品，删掉只留最终版）
- ❌ 不要修改 `src/` 任何代码 —— 那是 3D agent / nook agent 的范围

## 完成后

整个 MVP batch（A1-A5 + B1-B4 + C1-C5 + D1-D5 = 19 张）全 `[x]` 后，通知用户。用户会让我接管，把 PNG 导入 `public/world/sprites/` 并接 Phaser 场景。

后续 batch（walk cycle 动画帧、更多 tile variants）会在新一版 MANIFEST 里加。
