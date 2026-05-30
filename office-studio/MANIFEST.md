# Office Studio — Asset Manifest

> 共 **26 个 sprite**。挨个生成,生成完把对应行 `[ ]` 改 `[x]` 并 commit。
> 每个 prompt = `STYLE.md 整段前缀` + 下面 `**Prompt:**` 那段。
> **角色不在清单里**(主 agent / subAgents 用游戏现成的 Bear 像素角色)。studio 只产房间 + 家具 + 道具。
> 透明背景 PNG;floor/wall 必须无缝平铺。视角:轻俯视 3/4,阴影朝**左下**,与 nook 现有房间一致。

总览:

| Series | 类别 | 数量 | 用途 |
|---|---|---|---|
| A | Floor & Walls — 地板墙面 | 5 | 办公室地砖/墙/窗 |
| B | Workstations — 工位 | 6 | 桌/显示器/椅 |
| C | Boss — 主 Agent 工位 | 3 | L 形大桌/老板椅/双屏 |
| D | Collaboration — 协作区 | 3 | 白板/圆桌/会议椅 |
| E | Pantry & Infra — 茶水/机房 | 4 | 咖啡/水吧/机柜/跑步机 |
| F | Lounge — 休息区 | 3 | 沙发/地毯/边几 |
| G | Decor — 装饰道具 | 2 | 绿植大/小 |

---

## A · Floor & Walls(5 · 16×16 · 无缝平铺)

### A01 — Office floor(主地砖)  `[x]`
- **File:** `output/tiles/A01-floor.png` · 16×16 · 不透明、可平铺
- **Prompt:** A seamless 16×16 office floor tile: light warm-grey #e6e3dc with a very subtle lighter #f2f0ec speckle, like clean matte vinyl/concrete office flooring. Almost flat, just 1-2 shades of soft pixel noise. Must tile seamlessly on all 4 edges. Clean and bright.

### A02 — Office floor accent(分区地砖 / 地毯下衬)  `[x]`
- **File:** `output/tiles/A02-floor-accent.png` · 16×16 · 可平铺
- **Prompt:** A seamless 16×16 floor tile, a slightly warmer light tone #ece8df with a faint thin grid line (like large light tiles), to mark a zone (e.g. meeting area). Same brightness family as A01, just a hint of structure. Tiles seamlessly.

### A03 — Office wall(墙面)  `[x]`
- **File:** `output/tiles/A03-wall.png` · 16×16 · 可平铺(横向)
- **Prompt:** A seamless 16×16 office wall tile: soft off-white #f2f0ec upper section with a thin light-grey #d8d6d0 baseboard along the bottom 3px. Clean painted drywall. Minimal. Tiles horizontally.

### A04 — Window wall(落地窗墙段)  `[x]`
- **File:** `output/tiles/A04-window.png` · 16×32(墙高两格) · 透明背景外缘
- **Prompt:** A 16×32 floor-to-near-ceiling office window segment: a thin charcoal #2a2a30 frame around a pale sky-blue #cfe4ee glass pane with one soft diagonal light streak. Bright daylight feel. Wall #f2f0ec around the frame. Should sit in the top wall, repeatable side by side.

### A05 — Glass partition(工位隔断,半透)  `[x]`
- **File:** `output/tiles/A05-partition.png` · 16×16 · 透明背景
- **Prompt:** A 16×16 low frosted-glass desk partition panel seen 3/4 top-down: a thin light-grey #d8d6d0 frame with a translucent pale panel #eef0ee. Short (desk-divider height). Soft shadow down-left.

---

## B · Workstations(6)

### B01 — Desk(工位桌,俯视)  `[x]`
- **File:** `output/furniture/B01-desk.png` · 48×32 · 透明背景
- **Prompt:** A clean white #fafafa rectangular office desk seen from a slight 3/4 top-down angle: bright top surface with a thin light-grey #d8d6d0 front edge and 4 simple thin legs hinted. Empty top (monitor/keyboard are separate sprites placed on it). Soft shadow down-left. Minimal, modern.

### B02 — Monitor · active(显示器·开机冷光)  `[x]`
- **File:** `output/furniture/B02-monitor-on.png` · 16×16 · 透明背景
- **Prompt:** A 16×16 slim desktop monitor on a small stand, 3/4 top-down, dark charcoal #2a2a30 bezel, the screen glowing a soft cyan #6cc8e8 with 2-3 faint abstract horizontal light blocks (NO readable text). Looks "on / working". Tiny shadow.

### B03 — Monitor · off(显示器·关机)  `[x]`
- **File:** `output/furniture/B03-monitor-off.png` · 16×16 · 透明背景
- **Prompt:** Same 16×16 monitor as B02 but screen is dark #1a1a1f matte (off / idle), no glow. Charcoal #2a2a30 bezel. For empty/idle desks.

### B04 — Office chair · front(办公椅·朝下)  `[x]`
- **File:** `output/furniture/B04-chair-down.png` · 16×16 · 透明背景
- **Prompt:** A 16×16 modern ergonomic office chair seen 3/4 top-down, facing toward the viewer (down): graphite #3a3a42 seat + mesh back with a single thin accent-color stripe on the backrest, five-star base hinted. Soft shadow.

### B05 — Office chair · back(办公椅·朝上,背对)  `[x]`
- **File:** `output/furniture/B05-chair-up.png` · 16×16 · 透明背景
- **Prompt:** Same ergonomic chair as B04 but facing away (up) — we see the mesh back from behind, graphite #3a3a42 with the accent stripe. For a desk where the character sits facing their monitor.

### B06 — Desk props(键盘+鼠标+杯+便签,桌面小物组)  `[x]`
- **File:** `output/furniture/B06-desk-props.png` · 32×16 · 透明背景
- **Prompt:** A small 32×16 cluster of desk-top items, 3/4 top-down, to scatter on desks: a slim light-grey keyboard, a tiny mouse, a coffee mug with a mustard #d8b048 rim, and one yellow #e8c020 sticky note. Soft, tiny. No text.

---

## C · Boss · 主 Agent 工位(3)

### C01 — Executive L-desk(L 形大桌)  `[x]`
- **File:** `output/furniture/C01-boss-desk.png` · 64×48 · 透明背景
- **Prompt:** A larger L-shaped executive desk, white #fafafa with a subtle warm-wood #8a6a44 top accent strip along one edge, 3/4 top-down. Roomier than a normal desk, an L corner. Empty top. Soft shadow down-left. Still clean/minimal, just bigger and a touch nicer.

### C02 — Executive chair(老板椅)  `[x]`
- **File:** `output/furniture/C02-boss-chair.png` · 20×24 · 透明背景
- **Prompt:** A high-back executive office chair, 3/4 top-down, graphite #3a3a42 leather-look (matte, no gloss) with a chrome-hint base, taller back than the normal chair. The "lead / boss" seat. Soft shadow.

### C03 — Dual monitor(双屏)  `[x]`
- **File:** `output/furniture/C03-dual-monitor.png` · 32×16 · 透明背景
- **Prompt:** Two slim monitors side by side on one stand, 3/4 top-down, charcoal #2a2a30 bezels, both screens glowing soft cyan #6cc8e8 with faint abstract blocks (no text). The boss workstation display.

---

## D · Collaboration · 协作区(3)

### D01 — Whiteboard(白板,靠墙)  `[x]`
- **File:** `output/furniture/D01-whiteboard.png` · 48×24 · 透明背景
- **Prompt:** A wall-mounted whiteboard, 3/4 top-down/front, white #fafafa surface in a thin light-grey #d8d6d0 frame, with a few faint abstract scribbles / boxes-and-arrows in light blue #3a7fd0 and a couple of small sticky notes (yellow #e8c020, no text). A marker on the tray.

### D02 — Round meeting table(圆桌)  `[x]`
- **File:** `output/furniture/D02-round-table.png` · 32×32 · 透明背景
- **Prompt:** A small round meeting table, 3/4 top-down, white #fafafa top with a thin light-grey edge and a slim central leg. Maybe a tiny plant or coffee cup in the center. Soft shadow down-left.

### D03 — Meeting chair(简约会议椅)  `[x]`
- **File:** `output/furniture/D03-meeting-chair.png` · 16×16 · 透明背景
- **Prompt:** A simple light-grey #d8d6d0 4-leg meeting chair, 3/4 top-down, minimal Scandinavian look, one soft accent on the seat. Smaller/simpler than the office chair. Soft shadow.

---

## E · Pantry & Infra · 茶水/机房(4)

### E01 — Coffee station(咖啡机 + 杯)  `[x]`
- **File:** `output/furniture/E01-coffee.png` · 32×24 · 透明背景
- **Prompt:** A small pantry coffee corner, 3/4 top-down: a stainless-look (matte light-grey #d8d6d0, no gloss) espresso machine on a white counter, with 2-3 little terracotta-brown #8a6a44 cups beside it. A warm cozy accent in the clean office. Soft shadow. (Echoes the Marvis coffee station.)

### E02 — Water bar / counter(水吧台)  `[x]`
- **File:** `output/furniture/E02-counter.png` · 48×16 · 透明背景
- **Prompt:** A long low white #fafafa pantry counter, 3/4 top-down, with light-grey cabinet fronts, a small water dispenser and a tiny potted succulent on top. Clean. Soft shadow.

### E03 — Server rack(机柜,机房角)  `[x]`
- **File:** `output/furniture/E03-server-rack.png` · 24×32 · 透明背景
- **Prompt:** A slim dark charcoal #2a2a30 server rack cabinet, 3/4 top-down, with a column of tiny status LEDs glowing soft cyan #6cc8e8 and green #5a8f4a (no text), a couple of thin cables hinted at the base. The "infra / running code" corner. Soft shadow.

### E04 — Treadmill(跑步机,彩蛋)  `[x]`
- **File:** `output/furniture/E04-treadmill.png` · 24×40 · 透明背景
- **Prompt:** A modern white #fafafa walking-pad / treadmill, 3/4 top-down, light-grey running belt, slim minimalist console with a tiny dark screen. A charming office-amenity prop (echoes the Marvis treadmill). Soft shadow.

---

## F · Lounge · 休息区(3)

### F01 — Couch(沙发)  `[x]`
- **File:** `output/furniture/F01-couch.png` · 48×24 · 透明背景
- **Prompt:** A low 2-seat lounge sofa, 3/4 top-down, soft light-grey #d8d6d0 upholstery (matte) with two small accent cushions (one mustard #d8b048, one muted blue #3a7fd0). Clean Scandinavian. Soft shadow down-left.

### F02 — Rug(地毯)  `[ ]`
- **File:** `output/tiles/F02-rug.png` · 48×32 · 透明背景
- **Prompt:** A soft rectangular area rug, 3/4 top-down/flat, off-white #f2f0ec with a simple thin muted-blue #3a7fd0 border line and a faint geometric motif. Lays under the lounge. Very subtle, no harsh contrast.

### F03 — Side table + lamp(边几 + 落地灯)  `[ ]`
- **File:** `output/furniture/F03-side-table.png` · 16×24 · 透明背景
- **Prompt:** A small white #fafafa round side table with a slim minimalist floor lamp beside it (thin graphite #3a3a42 stem, warm soft #d8b048 light from the shade). 3/4 top-down. Cozy lounge accent. Soft shadow.

---

## G · Decor · 装饰道具(2)

### G01 — Plant · tall(高绿植,落地盆栽)  `[ ]`
- **File:** `output/furniture/G01-plant-tall.png` · 16×32 · 透明背景
- **Prompt:** A tall potted office plant (monstera / fiddle-leaf vibe), 3/4 top-down, lush green #5a8f4a leaves in 2-3 shades, in a simple white #fafafa or terracotta #8a6a44 pot. The main warm/living accent in the clean office. Soft shadow down-left.

### G02 — Plant · small(桌面/角落小绿植)  `[ ]`
- **File:** `output/furniture/G02-plant-small.png` · 16×16 · 透明背景
- **Prompt:** A small desktop succulent or pothos in a tiny white pot, 3/4 top-down, green #5a8f4a, to scatter on desks/counters. Soft tiny shadow.
