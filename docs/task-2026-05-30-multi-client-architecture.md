# nook 多端架构蓝图 — 桌面客户端(Tauri) + 网页查看器

**Status:** 蓝图 / 动客户端前的设计 · **Date:** 2026-05-30
**门闸:** 本蓝图**不立即实施**。先让活世界 Demo 跑 1–2 周验 kill 指标(早上是否愿意点开简报);客户端工作在 Demo 留存验住后启动。

> 关联:`task-2026-05-30-npc-depth-and-desktop-plan.md`(Phase B 原始规划)、`2026-05-30-nook-agent-envoy-design.md`(device-flow 接入)、DT「nook 活世界 · 你领养你自己」(产品方向)、`superpowers/specs/2026-05-30-nook-living-world-demo-design.md`(已上线的 Demo)。

---

## 0. 核心定位

**最终形态 = 桌面客户端;网页 = 临时查看处。** 理由很硬:**行为镜像 + 持续在场天生需要本地**——浏览器沙箱看不到你在 IDE 里敲什么,要"你写什么、常驻自我就在世界里干什么",信号源只能来自本地(IDE 插件 / 桌面 agent)。

**三层模型**(贯穿全文):

```
┌─ 核心：blog-api + Supabase ──────────────────────┐  唯一真相源，已 client-agnostic，不重构
└────────────────────────────────────────────────┘
                  ▲ 同一套 HTTP API
┌─ nook 前端 bundle：src/lounge/* + Phaser boot ───┐  抽成独立可挂载包，导出 mountNook(el, host)
│  只依赖 HostBridge 接口，不直接碰 cookie/window    │  两端各自加载同一份
└────────────────────────────────────────────────┘
        ▲ WebHost(薄)              ▲ TauriHost(全)
   Astro 页面 mountNook(div,WebHost)   Tauri webview mountNook(div,TauriHost)
```

- **核心**:两端共享。两端打同样端点,**唯一差别是身份头**(网页 cookie / 桌面钥匙串 Bearer token)。
- **nook bundle**:同一份 Phaser 场景 + UI + API 逻辑,~90% 共享。
- **HostBridge**:唯一按平台各写一份的 ~10%。

桌面 app 特殊在于它**同时是查看器 + 信号源 + agent 宿主**;网页只是查看器;IDE 插件只是信号源。

---

## 1. 选型:为什么 Tauri

### 我们这个 app 的三条硬约束
1. **常驻**——24h 挂托盘替你"持续在场",所以**内存/体积是第一约束**。
2. **复用现有 Phaser 前端**——nook 场景已写好,桌面端跑同一套,不重写。
3. **要本地能力**——存 token 进系统钥匙串、探测编码、宿主本地 agent/MCP、可能透明无边框窗(桌面精灵)、托盘、全局快捷键。

### 往这三条上套

| | 复用 Phaser? | 常驻 footprint | 本地能力 | 结论 |
|---|---|---|---|---|
| **Tauri**(Rust + 系统 WebView)| ✅ | **~3–10MB 包,空闲几十 MB RAM**(用系统 WebView,不打包 Chromium)| ✅ Rust 层全有 | **选它** |
| **Electron**(打包 Chromium+Node)| ✅ | ❌ ~150MB 包,100–300MB 常驻 RAM | ✅ | 体积毙掉——常驻死穴 |
| **原生**(SwiftUI 等)| ❌ 逐平台重写场景 | ✅ | ✅ | 复用毙掉 |
| **Flutter** | ❌ Dart 重写 | 中 | ✅ | 复用毙掉 |

**决定性一刀 = footprint × 常驻。** 偶尔打开的工具用 Electron 无所谓;要它永远挂着保持在场,那坨 Chromium 就是错配。Tauri 用系统自带 WebView(mac WKWebView / Win WebView2),又小又省,且不像原生那样逼你放弃 Phaser 复用。三条全中的只有 Tauri(和近亲 Wails)。

### 唯一真风险 + 备选
- **WebView 碎片化**:Tauri 渲染靠各平台不同的系统 WebView(WKWebView / WebView2 / Linux WebKitGTK),而我们跑 **Phaser + WebGL**。Electron 打包统一 Chromium = 处处一致;Tauri 可能在某平台 WebView 有渲染怪癖(Linux WebKitGTK 最弱)。**→ 这是 Gate 1 的 spike(见 §6)。**
- **备选 = Wails**(Go + 系统 WebView):footprint 同量级,原生层 Go 不 Rust。选 Tauri 是因为**生态/势头**(Tauri 2.0 插件体系、文档、社区更厚,是事实标准的轻量 Electron 替代)。除非更想写 Go,Tauri 赢在生态。
- **什么时候翻供 Electron**:仅当 spike 发现 Phaser 在目标 WebView 渲染有坑、又没精力逐平台 QA——用 100MB 体积换确定性。除此之外 Tauri 是最优解。

---

## 2. nook 前端 bundle

把现在的 `src/lounge/*` + Phaser 启动从 Astro 里解耦成**独立、可 Vite 打包**的包,对外导出一个挂载函数:

```ts
// @nook/app
export function mountNook(el: HTMLElement, host: HostBridge): NookInstance
```

- Astro 的 `LoungeGame.astro`:`mountNook(div, new WebHost())`
- Tauri 的 webview `index.html`:`mountNook(div, new TauriHost())`

**同一份代码,两个壳加载。** bundle 只负责渲染世界 + 调 API;一切平台差异走 `host`。

---

## 3. HostBridge 接口

唯一按平台各写一份的东西。把所有"跟 OS/浏览器打交道"的缝收敛到这里:

```ts
interface HostBridge {
  // 1. 身份：网页 cookie / 桌面钥匙串 token
  fetch(path: string, opts?: RequestInit): Promise<Response>
  // 2. 在场信号源：网页拿不到 / 桌面从 OS·IDE 拿
  onActivity?(cb: (a: 'coding' | 'idle') => void): void
  // 3. 通知：网页 DOM 卡片 / 桌面原生通知 + 托盘
  notifyBriefing(b: Briefing): void
  // 4. 窗口/视口：browser viewport / Tauri 窗（可能透明无边框）
  viewport(): { w: number; h: number }
  // 5. 本地 agent/MCP：网页无 / 桌面宿主
  agent?: AgentBridge
}
```

| 缝 | WebHost | TauriHost |
|---|---|---|
| `fetch` 身份 | `credentials:'include'`(cookie)| `Authorization: Bearer <keychain token>`(`invoke('get_token')`)|
| `onActivity` | 无(降级)| Rust sidecar 探测 IDE/编码 → 推前端 |
| `notifyBriefing` | 现有 DOM 卡片 | 原生通知 + 托盘 badge |
| `viewport` | `window.innerWidth/Height` | Tauri 窗口 API |
| `agent` | 无 | 本地 agent/MCP 宿主 |

**活例子**:现在的简报卡片写死 `fetch('https://chat.ursb.me/...', {credentials:'include'})`——Tauri 里 cookie 不通,要换 Bearer。抽出来后变成 `host.fetch('/api/nook-world/briefing/latest')`,两端各填对身份。**这就是复用的全部秘密。**

---

## 4. Tauri 如何加载 bundle

**把构建好的 nook bundle 打进 Tauri app 本地**,webview 指向本地 `index.html`(**不是**去 load 线上 `ursb.me/nook`)。原因:
- 线上 URL:CSP/跨域、离线即废、注入原生桥别扭;
- 本地 bundle:启动快、干净注入 `TauriHost`、断网也能显示世界框架(数据仍走 blog-api)。
- 数据永远来自核心 blog-api,**bundle 只是渲染层**。

---

## 5. 连接机制(客户端怎么"登进来")

复用 envoy 设计(`2026-05-30-nook-agent-envoy-design.md`):
- **认证**:device-flow → 拿一个短时 scoped token 存进系统钥匙串(替掉 Demo 现在的共享密钥)。
- **在场信号**:桌面/IDE 插件把"在敲代码 / idle(+ 可选项目/语言上下文)"POST 到 `/api/nook-world/presence`(带 Bearer)。比现在的 `pgrep claude` 丰富得多。
- **IDE 插件 = 客户端 v0**:最轻的"信号源",几天能出,立刻把镜像从 pgrep 升级成真上下文;是通往完整桌面 app 的踏脚石。

---

## 6. 门闸与顺序

- **Gate 1 · Tauri × Phaser spike(动客户端的第一道闸)**:把现在的 nook Phaser 场景塞进 Tauri 的 webview,在目标系统(至少 mac;若要 Win/Linux 各跑)上看渲染顺不顺。**顺 → 锁 Tauri;不顺 → 重新评估 Electron。** 半天的活,决定整个选型是否成立。
- **不在 Demo 验完前重构前端。** 现在只记耦合点(§7),不抽 bundle。
- **客户端 v0 = IDE 插件**(信号源),先于完整桌面 app。
- **完整 Tauri 客户端** = Demo 留存验住后:抽 bundle(§2)+ 填 HostBridge 缝(§3)+ Tauri 壳(webview 本地 bundle + invoke 命令:keychain/presence/agent)。**届时"复用"= 抽一次 bundle + 填几个 host 缝,不是重写。**
- 之后**网页降级为纯查看器**(只看世界 + 简报,不做镜像)。

---

## 7. C.2 耦合点清单(起头,持续追加)

抽 bundle 时要把这些"直接碰 cookie / window / DOM"的地方改成走 `host.*`。每发现一个就追加:

| 文件 | 耦合点 | 迁移到 |
|---|---|---|
| `src/lounge/companion_api.ts` | `API_BASE='https://chat.ursb.me'` + `fetch(...,{credentials:'include'})`(cookie 身份)| `host.fetch()` |
| `src/components/LoungeGame.astro`(简报卡片脚本)| 写死 URL + `credentials:'include'` + `localStorage` | `host.fetch()` + `host.notifyBriefing()` |
| `src/lounge/lobby_returning_pill.ts` | `camera.width/height` 算位置(假设 browser viewport)| `host.viewport()` |
| `src/lounge/companion_ui.ts` | fixed-position overlay(假设浏览器全屏)| host 提供窗口尺寸/层级 |
| 各 modal | 假设有 backdrop click 关闭 | 桌面窗行为可能不同,走 host |
| (待补)… | … | … |

> 维护方式:开发期每碰到一个新的"浏览器假设",就往这张表加一行。等真抽 bundle 时照着改,不会漏。

---

## 8. 一页结论

- **客户端终态、网页查看器**——方向定了,因为镜像/在场天生在本地。
- **复用 = 同一份 nook bundle + 薄 HostBridge**:~90% 共享,~10% 平台层。后端已中立、不动。
- **选 Tauri**:常驻 + 复用 Phaser + 本地能力,三条同时满足且体积小的只有它;唯一风险(WebView 渲染一致性)用半天 spike 消掉。
- **顺序**:Demo 验留存 → IDE 插件(客户端 v0)→ Gate 1 spike → 抽 bundle + HostBridge → Tauri 壳 → 网页降级为查看器。**现在只记耦合点,不重构。**
