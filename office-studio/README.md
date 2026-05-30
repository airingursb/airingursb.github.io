# Office Studio — 美术工作空间(交付契约)

> 这是 **Agent Office**(把用户 Claude Code 的主 Agent + subAgents 可视化成办公室里干活的小角色)的**美术产出工作区**。
> 镜像 `gallery-studio/` / `world-studio/` 的协作模式:**你(设计师)只产 sprite,不碰代码**;我(nook agent)拿到 `output/` 后接管导入 Phaser、建 `.tmj`、接 hooks。
> 设计语境见 `docs/task-2026-05-30-agent-office.md`。

---

## 你要做的事(设计师)

1. 先读 **`STYLE.md`** —— 不可改的风格锁。每张图的 prompt 都必须以它整段为前缀。
2. 再读 **`FLOOR_PLAN.md`** —— 知道每件家具在办公室哪个区、是干嘛的(有位置感,画起来才对味)。
3. 按 **`MANIFEST.md`** 一张张产出,共 **26 个 sprite**(A–G 七个系列)。
4. 每产出一个:
   - 存到 MANIFEST 指定的 `File` 路径(`output/tiles/…` 或 `output/furniture/…`)。
   - 把那一行的 `[ ]` 改成 `[x]`。
   - commit(信息写清是哪个 sprite)。

**就这些。你不需要写任何代码、不需要建地图、不需要管角色** —— 角色用游戏现成的 Bear 像素角色,不在你的范围。

---

## 硬性规格(每张图都要满足)

| 项 | 要求 |
|---|---|
| 风格 | 必须以 `STYLE.md` 的 STYLE PREFIX 整段作为 prompt 前缀 |
| 尺寸 | 严格按 MANIFEST 每行给的 px(如 16×16 / 48×32),对齐 16px 网格 |
| 背景 | 家具/道具 = **透明 PNG**;floor/wall = 不透明且**四边无缝平铺** |
| 视角 | 轻俯视 3/4(看得到桌面 + 一点正面),和 nook 现有 lobby/gallery 一致 |
| 阴影 | 软像素投影,方向**左下**,1–2px,#c9c6bf 系 |
| 调色 | 浅中性铺底(白/浅灰/off-white),暖色只做点缀;**不要**暖木屋(lobby)、**不要**美术馆大理石(gallery) |
| 禁忌 | 无文字/数字/logo、无 3D 渲染感、无高光塑料感、无整片渐变、无粗黑描边、无水印、家具里不画角色 |

---

## 目录结构

```
office-studio/
├── STYLE.md          # 风格锁(prompt 前缀)— 不可改
├── FLOOR_PLAN.md     # 办公室布局 + 区域→agent状态映射
├── MANIFEST.md       # 26 个 sprite 清单(File/Size/Prompt + 复选框)
├── README.md         # 本文件:交付契约
├── refs/             # (可选)风格参考图,放进来找感觉,不进 prompt
└── output/
    ├── tiles/        # 地板/墙/窗/隔断/地毯(无缝平铺类)
    └── furniture/    # 桌椅/显示器/白板/咖啡机/沙发/绿植…(透明背景类)
```

> `output/tiles/` 和 `output/furniture/` 目录请按需创建;产出物直接落到 MANIFEST 写明的路径。

---

## 交付后我(nook agent)接管的部分(你不用管,列出来让你心里有数)

- `scripts/sync-office-assets.sh`:把 `output/` 同步到 `public/lounge/assets/office/`。
- `scripts/generate-office-tmj.py`:照 `FLOOR_PLAN.md` 生成 `public/lounge/assets/rooms/office.tmj`。
- `src/lounge/office_*.ts`:Phaser preload manifest + 工位/区域站位锚点 + 状态→动画映射。
- Claude Code hooks → 本地事件服务 → 办公室场景(主 Agent + subAgents 出现/干活/离场)。

---

## 验收(我拿到素材后会逐项核对)

- [ ] 26 个 sprite 全部产出,MANIFEST 全勾 `[x]`
- [ ] floor/wall 在引擎里平铺无缝(无接缝、无错位)
- [ ] 家具透明背景干净(无白边、无残底)
- [ ] 一帧里家具 + Bear 角色同框风格协调(视角/阴影/像素密度一致)
- [ ] 整体读起来是"干净现代初创办公室",和 lobby/gallery 明显区分
