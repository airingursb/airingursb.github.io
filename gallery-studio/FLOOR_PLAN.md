# Gallery — Master Floor Plan

> 美术馆是**一栋楼，一张地图**。玩家自由漫游，camera 跟着 scroll，没有 loading 切换。
> 内部所有"门" = 墙上的拱形缺口（装饰 + 可通行），**不是 portal**。
> 唯一的真 portal：lobby ↔ gallery 入口、south pavilion ↔ grove pocket world。
> 这份文档是 nook agent 建 .tmj 的蓝图，也是 Codex 生成素材时的位置感知参考。

---

## 总体布局（top-down）

```
                       ┌─────────────────┐
                       │   NORTH HALL    │
                       │   Networks      │
                       │  A05 A11 + ...  │
                       └────────┬────────┘
                                │  ↑↓ door
                       ┌────────┴────────┐
                       │                 │
            ←─door─────┤    ROTUNDA      ├──door─→
                       │   (central)     │
            ┌──────────┤  B01 grove      ├──────────┐
            │          │  centerpiece    │          │
            │          │  + columns      │          │
            │          │  + info desk    │          │
            │          │  + statues x2   │          │
            │          │                 │          │
            │          └────────┬────────┘          │
            │                   │ ↑↓                │
            │                   │                   │
    ┌───────┴────┐      ┌───────┴───────┐    ┌──────┴────┐
    │ WEST WING  │      │ SOUTH PAVILION│    │ EAST WING │
    │ Performance│      │   Comics +    │    │   Web     │
    │ & Memory   │      │ Grove door    │    │ Internals │
    │            │      │               │    │           │
    │ A03 GC     │      │ comic panels  │    │ A01 Chrom │
    │ A04 Helio  │      │ (loaded from  │    │ A02 CSS   │
    │ A07 Jank   │      │  supabase)    │    │ A10 React │
    │ A08 LLM    │      │               │    │ A14 WebGPU│
    │ A09 QuickJS│      │ B01 grove     │    │ A13 WASM  │
    │ A12 V8     │      │ portal door   │    │ A06 Image │
    └────────────┘      └───────┬───────┘    └───────────┘
                                │
                          ┌─────┴─────┐
                          │  GROVE    │
                          │  (existing│
                          │  3D scene)│
                          └───────────┘

                                ↑
                          entry door
                          from lobby
                       (existing portal)
```

---

## 一张 .tmj，多个 zone 拼在同一坐标系

`gallery.tmj` —— 整张 **64 × 56 tile = 1024 × 896 px**（约 lobby 的 6 倍面积）

zone 在地图里的物理位置（左上角 0,0 为基准）：

| Zone | tile bbox | px bbox | exhibits |
|---|---|---|---|
| **North Hall** | (24,0)–(40,16) | (384,0)–(640,256) | A05, A11 + 1 sculpture |
| **Rotunda** (center) | (17,16)–(47,36) | (272,256)–(752,576) | B01 centerpiece + 4 columns + 2 statues + info desk |
| **East Wing** | (44,20)–(64,44) | (704,320)–(1024,704) | A01, A02, A10, A14, A13, A06 (Web Internals · 6 件) |
| **West Wing** | (0,20)–(20,44) | (0,320)–(320,704) | A03, A04, A07, A08, A09, A12 (Performance & Memory · 6 件) |
| **South Pavilion** | (17,36)–(47,56) | (272,576)–(752,896) | 4格漫画动态阵列 + grove portal arch |

zone 之间用**拱门 + 墙缺口**连通，不是 portal。
zone 与 zone 之间留 walkway tile（cream marble 地砖），玩家随便走。
墙体（collision）只在 zone 边界画，留 ~3 tile 宽的通道。

---

## Rotunda 详图

```
y=0   ──────────────────────────────────────
      │                                    │
y=2   │     [door north→ North Hall]       │
      │                                    │
y=4   │   C04 statue           C04 statue  │
      │                                    │
y=6   │  C01 col   B01 CENTERPIECE   C01 col │
y=8   │             (3D Grove          │
y=10  │              poster)           │
y=12  │  C01 col                       C01 col │
      │                                    │
y=14  │   C04 statue           C04 statue  │
      │                                    │
y=16  │[door←West]                [door→East]│
      │                                    │
y=18  │       C03 info desk                │
y=20   ──── [door↓ South] ─── [door↑ Lobby] ───
```

- 5 个门：lobby 入口（南）、East（东）、West（西）、North（北）、South Pavilion（南）
- 中央 B01 centerpiece 居正中（约 x=240, y=160）
- 4 根 C01 marble columns 围绕中央，形成"圆厅"感
- 2 对 C04 statue 在中央两侧的对称位置
- C03 info desk 在入口附近

---

## East Wing · Web Internals 详图

```
y=0  ─────────────────
     │     [door↑]    │
y=2  │  A01      A02  │  ← Pair 1 (Chromium, CSS)
y=5  │                │
y=8  │  A10      A14  │  ← Pair 2 (React, WebGPU)
y=11 │                │
y=14 │  A13      A06  │  ← Pair 3 (WASM, Image-formats)
y=17 │                │
y=20 │   C02 bench    │  ← rest area mid-corridor
y=22 │                │
y=23 │─door→ Rotunda──│
```

- 20×24 tile = 320×384 px（窄长走廊型）
- 3 对 paintings 在左右墙上（每个 painting 占 2×3 tile, 32×48 px in-game）
- 每幅画头顶挂 C07 picture light
- 走廊中段一张 C02 bench
- 入口/出口都通向 Rotunda

## West Wing · Performance & Memory 详图

同 East Wing 结构（镜像），里面挂 A03/A04/A07/A08/A09/A12 共 6 幅。

## North Hall · Networks 详图

```
y=0  ────────────────
     │   [door↓]    │
y=2  │ A05    A11   │  ← Pair 1 (HTTP/3, TLS)
y=5  │              │
y=8  │  C06         │  ← display case w/ small sculpture
y=11 │              │
y=14 │  C04 statue  │
y=17 │              │
y=19 │────door↓────│
```

- 16×20 tile = 256×320 px（较小厅）
- 只有 1 对 paintings（A05/A11）—— 留白多，强调"专题厅"感
- 加 1 个 C06 display case + 1 个 C04 statue 撑场子

## South Pavilion · Comics + Grove Door 详图

```
y=0  ─────────────
     │ [door↑]    │
y=2  │ comic comic│  ← 漫画 frame 阵列（从 supabase）
y=5  │ comic comic│
y=8  │ comic comic│
y=11 │            │
y=12 │ comic comic│
y=14 │ ┌────────┐ │
y=15 │ │GROVE   │ │  ← 通往 3D 园子的拱门
y=16 │ │ DOOR   │ │
y=17 │ └────────┘ │
y=18 │            │
y=19 │──door↑─────│
```

- 漫画 = 现有 comics 表里的所有 issue，每个 issue 一个 frame（4格漫画的封面板）
- 数量由数据决定（可能 8 张可能 30 张），动态布局
- 底部一个 C05 arch door 通向 grove

---

## Portal 连接表（只 2 个真 portal）

| From | To | From spawn | To spawn |
|---|---|---|---|
| `room_lobby` (top wall, 现有) | `room_gallery` 整张地图的入口 spawn point | `to_gallery` | `from_lobby` (Rotunda 入口处) |
| `room_gallery` (South Pavilion 内的拱门) | grove pocket world (iframe) | dispatch `open-pocket-world`, slug `mochi-grove` | (现有 bridge) |

**没有任何 zone-to-zone portal**。zone 之间靠物理通道相连，玩家直接走。

---

## 实现优先级（nook agent 收到素材后，按这个顺序建）

1. **写 gallery.tmj 整张地图骨架**（floor + 所有墙 collision + spawn + lobby portal + 6 zone 的分区拱门）
2. **rotunda 内容**（centerpiece + columns + statues + info desk + docent NPC）
3. **east wing 6 件 paintings + picture lights + bench**
4. **west wing 镜像**
5. **south pavilion**（comics 阵列 + grove portal arch）
6. **north hall**（最小）
7. **整体细节** —— spotlight pool、地毯延展、装饰小品、ambient sfx

---

## NPC 部署

- 1 个 D01-D04 docent NPC，在 **rotunda 信息台后**，玩家走近可对话（"欢迎来到 ursb 美术馆…"）
- 后期可拓展：每个 wing 入口一个介绍 NPC

---

## 待对齐的 open question

1. 漫画在 south pavilion 是用现有 comic panel 图片直接做 frame 内容，还是也用 Saul Bass 风重画封面？（建议：直接用现有 panel —— 漫画本身就是作品，包 Saul Bass 框会脱节）
2. North hall 这么空怎么办？建议：未来新 immersive demo 默认进 north hall（留扩展位）
3. Grove portal 从 south pavilion 进，还是 rotunda 中央直接放 portal？建议：south pavilion，跟 grove "园子" 主题契合
