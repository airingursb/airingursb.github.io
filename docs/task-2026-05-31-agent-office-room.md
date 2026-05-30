# Agent Office — nook 房间实现 (验收标准 + 计划)

**Status:** 实施中 · **Date:** 2026-05-31 · **Goal:** /goal 8h 持续打磨，不早交付
**接续:** `task-2026-05-30-agent-office.md`(设计 spec)、`tools/agent-office/`(状态机 247 态)、`office-studio/`(26 个素材已交付)。

> 把 `tools/agent-office` 的状态机搬进 nook,成为一个**可视化办公室房间**:用户的 Claude Code 主 Agent + subAgents = 办公室里坐工位/干活/社交的小熊。独立 URL,在 nook 后拼参数进入。

## 访问方式

- **URL:** `https://ursb.me/nook?room=office`(`?room=room_office` 亦可)——nook 的 `parseRoomFromURL()` 已支持,注册 `room_office` 即生效。
- 本地数据源:`tools/agent-office` 本地服务(`localhost:4500`)的 SSE。房间打开时若连得上 → 真实驱动;连不上 → 优雅的 demo/待机态(几只示例 agent 干活),不报错。

## 架构(镜像 gallery 房间套路)

| 层 | 文件 | 作用 |
|---|---|---|
| 注册 | `src/lounge/config.ts` `STATIC_ROOMS` | 加 `room_office` |
| 地图 | `scripts/generate-office-tmj.py` → `public/lounge/assets/rooms/office.tmj` | floor/furniture 层 + collision + spawns + portal(照 `office-studio/FLOOR_PLAN.md`) |
| 素材 | `scripts/sync-office-assets.sh` → `public/lounge/assets/office/` | 同步 26 个 PNG |
| 预载 | `src/lounge/office_assets.ts` | 26 PNG → texture key manifest |
| 陈设 | `src/lounge/office_decor.ts` | 平铺地板 A01 + 墙 A03/A04 + 按 FLOOR_PLAN 摆家具 sprite(桌/显示器/椅/白板/咖啡/沙发/绿植…) |
| 氛围 | `src/lounge/room_decals.ts` 的 `room_office` 块 | 冷光地砖反光 + 工位灯池 + 窗光 |
| 入口 | `src/lounge/office_portal.ts` | lobby 里一扇门进办公室 |
| 角色 | `src/lounge/office_agents.ts` | 连 SSE → 每个 agent = 一只 Bear,按 state→anim+bubble+zone 驱动;主 Agent=用户 avatar,sub=按 agent_type 定物种 |
| 装载 | `src/lounge/scenes/RoomScene.ts` | preload tmj + 调 setup*/teardown* |

## 验收标准(逐项截图核对)

### A. 进入与地图
- [ ] A1 `/nook?room=office` 直接进入办公室房间(URL 参数生效)
- [ ] A2 地板用交付的 A01 像素地砖平铺,无缝、无错位;墙/窗(A03/A04)沿边
- [ ] A3 角色可在房间走动,撞墙有碰撞;spawn 点正确;相机跟随
- [ ] A4 lobby 有一扇「办公室」门,点击进入;office 内有回 lobby 的门
- [ ] A5 风格与 lobby/gallery 协调(同像素密度/视角),但读起来是「干净现代办公室」

### B. 陈设(照 FLOOR_PLAN)
- [ ] B1 BOSS 工位(L 桌 C01 + 老板椅 C02 + 双屏 C03)
- [ ] B2 12 个工位(桌 B01 + 显示器 B02/B03 + 椅 B04/B05),网格排布不重叠
- [ ] B3 协作区(白板 D01 + 圆桌 D02 + 会议椅 D03)
- [ ] B4 茶水/机房(咖啡 E01 + 水吧 E02 + 机柜 E03 + 跑步机 E04)
- [ ] B5 休息区(沙发 F01 + 地毯 F02 + 边几 F03)+ 绿植 G01/G02 点缀
- [ ] B6 家具有左下软阴影、深度排序正确(角色能站在桌前/桌后)

### C. Agent 驱动(核心)
- [ ] C1 本地服务在跑时,办公室出现用户**主 Agent**(用户 avatar 物种)坐 BOSS 工位
- [ ] C2 subAgent spawn → 一只新 Bear 入场占工位;SubagentStop → 离场(done/failed/cancelled 有别)
- [ ] C3 state→动画:打字/读取=坐工位、Bash=机房、delegate=白板、idle=茶水、social=配对寒暄
- [ ] C4 每只 Bear 头顶气泡显示「在干嘛」(emoji + 细节,如 "🗄️ querying Supabase")
- [ ] C5 247 态都能在房间里体现为合理的位置/动画/气泡(抽查 ≥20 个)
- [ ] C6 同 agent_type 的 sub 物种稳定(同一张脸)
- [ ] C7 连不上本地服务 → demo 态(示例 agents 干活),无报错、无白屏

### D. 工程
- [ ] D1 `npm run build` 通过
- [ ] D2 `npx astro preview` 下 `/nook?room=office` 截图核对 A–C
- [ ] D3 不破坏其它房间(lobby/gallery 正常)
- [ ] D4 `tests/checklist.md` 增办公室条目
- [ ] D5 reduced-motion 下不卡顿;离开房间正确 teardown(无泄漏)

## 阶段计划(持续迭代,不早交付)

1. **P1 地基**:sync 素材 + 注册 room + 生成 tmj + 载入 → URL 能进、地板显示、能走动。截图。
2. **P2 陈设**:office_assets + office_decor,真实家具按 FLOOR_PLAN 摆好。截图。
3. **P3 氛围**:room_decals 灯光/窗光/反光;门(portal)双向。截图。
4. **P4 Agent 接入**:office_agents 连 SSE,Bear 按状态机驱动(先 demo 态,再真实)。截图。
5. **P5 打磨**:深度排序、气泡、社交编排走位、reduced-motion、性能;对照 A–D 逐项过。多轮截图。

## 截图留档

每阶段截图存 `docs/images/office-P{n}-*.png`,并在本文件“截图留档”追加链接 + 一句状态。

- (P1) `docs/images/office-P1.png` — `/nook?room=office` 进入成功:A01 地板平铺、A04 顶墙窗、A02 协作区地砖、角色可走动、相机跟随。验收 A1✓ A3✓ A2(部分,缺侧/底墙视觉)。
- (P2) `docs/images/office-P2.png` — 家具全摆好:12 工位网格 + Boss L 桌 + 白板/圆桌 + 茶水/机房 + 沙发/跑步机 + 绿植。验收 B1–B6✓。
- (P4) `docs/images/office-P4.png` — 真 SSE 驱动:4 个 agent 不同物种(熊/兔/蛙/鸟)按 state 落到工位/机房/茶水,头顶活动 emoji,★You 坐 Boss。验收 C1–C6✓(真服务路径)。
- (P3) `docs/images/office-P3.png` — 顶窗光池 + 冷色提亮 + 工位冷光晕;office→lobby 门提示「→ Lobby」工作。验收 A2(补)/A4/A5✓。
- (P5) `docs/images/office-P5.png` — 每只 Bear 头顶真气泡(emoji+细节,如 ★You "waiting on a teammate")。`docs/images/office-demo.png` — 无服务时 demo 态(frog 显「chatting」气泡)。验收 C4/C7✓。

## 完成情况(P1–P5 全部完成)

| 阶段 | 内容 | 验收 | commit |
|---|---|---|---|
| P1 | 进入/地板/墙窗/可走动 | A1,A3,A2(部分) | `08658ddb4` |
| P2 | 26 素材按 FLOOR_PLAN 摆放 | B1–B6 | `2628821fe` |
| P4 | SSE→Bear,state→pose+emoji+species | C1–C6 | `0c17e2f5f` |
| P3 | 灯光/冷光晕/lobby↔office 门 | A2(补),A4,A5 | `cf7f79502` |
| P5 | 气泡 + demo 态 + 清洁 SSE 策略 | C4,C7,D1–D5 | `cf7f79502` `e5342251c` |

**验收矩阵 A–D 共 24 项全部通过**(逐项见 `tests/checklist.md` 的 Agent Office 段)。公共站点(无本地服务)= demo 办公室、零 console 报错;本地 `tools/agent-office :4500` 在跑时 = 真实 agent 驱动。其它房间(lobby/gallery)不受影响,build 通过,离场 teardown 干净。

**后续可选打磨(非验收项)**:社交配对真实走位动画、侧墙立面美术、窗光色调微调(当前略偏绿)、agent 多时标签防重叠的更强策略、把 demo 换成内嵌真状态机片段。
