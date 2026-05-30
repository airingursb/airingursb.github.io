# Office — Master Floor Plan

> 一间**干净现代的初创办公室**,俯视像素,~**40×26 tile(640×416 px)**。
> 这是 nook agent 建 `.tmj` 的蓝图,也是绘图 agent 产素材时的位置感知参考。
> **角色不画**(主 agent / subAgents 用游戏现成的 Bear 像素角色);studio 只产房间 + 家具 + 道具。
> 每个区还标了它在 Agent Office 里对应 agent 的**什么状态**(状态→位置/动画的依据)。

---

## 总体布局(top-down,40×26 tiles)

```
 (0,0)────────────────────── 顶墙：整排落地窗 ──────────────────────(40,0)
 │  ☕ PANTRY 茶水区              · · · 落地窗 · · ·            🖥 INFRA 机房角  │
 │  咖啡机/水吧台/马克杯          (明亮自然光)                  server rack / 线缆   │
 │  〔idle agent 来这〕                                        〔Bash/运行 时〕  │
 │                                                                              │
 │   ┌── WORKSTATION GRID 工位区(核心)──────────────┐    ┌─ BOSS 工位 ─┐  │
 │   │  desk+monitor+chair  ×  3 行 × 4 列 = 12 工位   │    │  用户的主 Agent  │  │
 │   │  〔每个 sub agent 占一个工位 = 它在干活〕        │    │  L 形大桌+老板椅  │  │
 │   │  ▢🖥 ▢🖥 ▢🖥 ▢🖥                              │    │  面向全屋        │  │
 │   │  ▢🖥 ▢🖥 ▢🖥 ▢🖥                              │    │ 〔SessionStart  │  │
 │   │  ▢🖥 ▢🖥 ▢🖥 ▢🖥                              │    │  时坐这〕       │  │
 │   └────────────────────────────────────────────────┘    └──────────────┘  │
 │                                                                              │
 │   ┌─ WHITEBOARD / MEETING 协作区 ─┐        🌿        ┌─ LOUNGE 休息区 ─┐  │
 │   │  白板 + 圆桌 + 几把椅子          │       绿植        │  沙发 + 地毯 + 边几 │  │
 │   │  〔agent 互相对话 / Task 交接〕   │                  │ 〔空闲/串门/打盹〕 │  │
 │   └───────────────────────────────┘   🏃 跑步机(彩蛋)  └────────────────┘  │
 (0,26)──────────────────────── 底墙 ────────────────────────(40,26)
```

---

## 区域 → agent 状态映射

| 区域 | 家具 | 对应 agent 状态 / 行为 |
|---|---|---|
| **BOSS 工位** | L 形大桌 + 老板椅 + 双屏 | 用户**主 Agent**的位置(SessionStart 坐下);它派 Task 时转身把活交给新来的 sub |
| **WORKSTATION GRID** | desk + monitor + 椅 ×12 | 每个 **subAgent** spawn 时入场占一个空工位;按它当前工具出动画(打字/翻书/查网) |
| **WHITEBOARD/MEETING** | 白板 + 圆桌 + 椅 | 两个 agent **对话 / Task 交接**时走到这儿面对面 |
| **PANTRY 茶水区** | 咖啡机 + 水吧台 + 杯 | agent **空闲**时来这"喝咖啡"(idle 动画) |
| **INFRA 机房角** | server rack + 线缆 + 监控墙 | agent 跑 **Bash / 执行代码**时去机房旁 |
| **LOUNGE 休息区** | 沙发 + 地毯 + 边几 | 长时间空闲 / 等用户输入 → 去沙发"打盹"(SubagentStop 后短暂停留再离场) |
| **跑步机(彩蛋)** | treadmill | 纯装饰小品(呼应 Marvis 那种办公室细节,增添 charm) |

---

## 给建 .tmj 的 nook agent 的提示(美术产出后)

- 楼层 = 单张地图,camera 跟随主 Agent / 用户视角,无 loading 切换(同 gallery 的做法)。
- 工位排布留 tile 间距,角色站进去不重叠(参考 lobby 的 `LOBBY_POINTS` 取站位)。
- 用 `generate-*-tmj.py` 那套脚本生成 `public/lounge/assets/rooms/office.tmj`(layout 照本文件)。
- 角色站位锚点(boss 椅、12 工位、白板圆桌、咖啡区、沙发)由 nook agent 在代码里定,**不进美术**。
