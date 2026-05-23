# Onboarding · World (3D diorama) Agent

> Copy the prompt below into a fresh Claude Code session to onboard an
> agent maintaining `/world/` — the R3F floating-island diorama scene
> at `src/world/`.
>
> Last updated: 2026-05-24 (after 36+ Sub-A polish iterations).

---

你接手 `/world/` 的所有工作 —— Airing 的 R3F 漂浮森林木屋 diorama。

## 0 · 先读这些（按顺序）

1. `src/world/README.md` — 架构图 + 文件清单 + 自定义事件 + adaptive
   quality tier + 编辑配方
2. `/Users/airing/.claude/projects/-Users-airing-Files-code-airingursb-github-io/memory/MEMORY.md`
   — 看 `reference_world_scene.md` + `feedback_sustain_polish_iteration.md`
3. `src/world/App.tsx` — 顶层组件，了解 mount 顺序 + theme/QUALITY 状态
4. `src/components/WorldGame.astro` — Astro shell + 数据 build-time import
   + 全部 panel CSS

## 1 · 你的范围

✅ 你负责：
- `src/world/*.tsx`, `*.ts`, `*.astro`, `*.md` — 完整 R3F 场景
- `src/components/WorldGame.astro` — Astro shell + panel CSS
- `src/pages/world.astro` — 路由入口
- `public/world/sprites/character/*.png` — Codex 出的 panda billboard

❌ 不要碰：
- `src/grove3d/*` — 另一个 3D scene（不同 agent 在维护）
- `src/lounge/*`, `services/blog-api/lib/companion-*` — nook agent 范围
- `world-studio/` — Codex 出图工作台，不是 runtime

## 2 · 现状（已完成，不要重做）

35+ iter sub-agent reviewed 完成的内容（README 有完整 iter log）：

**几何 / 美学**
- 22-unit-radius 有机岛 + 地形 bump + 多层 cliff
- 5 species 树（pine/birch/oak/maple/cherry）jittered icosahedron canopy
- 详细木屋（堆叠原木 + chinking + 屋顶 5-color shingle + porch + 烟囱
  + smoke）+ Mochi NPC + panda billboard avatar
- gazebo / deck / hammock / easel 四个外景 zone
- water（pond + river + waterfall + transmission material）
- 720+ instanced grass + 120 wildflowers
- Storytelling props (fallen logs, signposts, cairns, woodpile)
- Domestic props (garden + clothesline + mailbox + wreath + feeder
  + dock + 渔具)
- Critters (cat + ducks + deer + bees + butterflies)
- Cloud sea + cirrus + horizon cloud belt
- DistantIslands (2 mini islands + 1 windmill)
- Campfire (animated flame + ember sparkles + point light)

**交互 / 系统**
- ZoneHitboxes + ZonePanel：5 个 zone 点击开 HTML 面板，初始数据
  build-time import from `src/data/articles.json` + `music.json` +
  `highlights.json`
- ChatBox：cabin 真接 `chat.ursb.me/api/ai-companion/chat`，SSE 流式 +
  AbortController + 401/empty-stream 优雅 fallback
- WorldUI：📷 拍照 / 🌙 日夜切换（真切灯+sky）/ 🎯 摄像机复位
- 主题 / hints localStorage 持久化
- ZoneHints：12s 引导箭头，回访不再显示
- Adaptive QUALITY tier（low/medium/high）gates SSAO + DoF
- Suspense + WorldLoader splash + ErrorBoundary
- ESC + 背景点击 + 同 zone 再点 toggle 关闭
- Typed event bus（events.ts emit/on）

**Sub-A critic 共说 SHIP 6+ 次**。Production ready。

## 3 · 决不要做的

- ❌ **不要 reintroduce Rainbow / HotAirBalloon / Scarecrow** —— Sub-A
  iter-10 明确 cut，user 也确认 cabin 要 uncontested hero。文件保留
  在 disk 但 unmounted
- ❌ **不要 push runtime fetches** —— 数据走 WorldGame.astro 的
  build-time import
- ❌ **不要乱加视觉装饰** —— user trimmed ZoneHints 一次又 reintroduced
  一次；加任何 hovering/pulsing/glowing 元素前先确认
- ❌ **不要换 lighting palette** —— 6 轮 Sub-A 调到 cohesive warm
  afternoon + dusk 系列，再动一次可能破坏 cohesion
- ❌ **不要把 cabin pos 改回 [0, 0]** —— 已 shift 到 [-2, -1] 走 rule
  of thirds（iter-10 verdict）

## 4 · 必做的

- **每个 commit 都带 iter 号** + 简短说明（看 git log）
- **build 前 clean dist**（有时 `.prerender/chunks` 间歇性 stale）
- **commit 前自测 `/world/` 在 preview 里能打开** —— 这个是必须的
- 涉及 lighting / palette / 大改之前，spawn Sub-A 给 critique 再动

## 5 · 开发工作流

```bash
npm install
rm -rf dist .astro && npm run build
npx astro preview --port 4321 --host
# 访问 http://localhost:4321/world/
```

## 6 · 上线

`world` 页面是纯 procedural，不需要 GLB。push 到 master → GitHub Pages
自动部署到 https://ursb.me/world/。

## 7 · 改了哪里

- **加一个 zone** → `zones.ts` 加 ZONES 条目，加 panel 内容到
  ZonePanel.tsx `renderZoneContent` switch
- **改时段光** → `ThemeAwareLights` in App.tsx + `Sky.tsx` props
- **加树** → `TREE_POSITIONS` in zones.ts
- **加新建筑** → 写一个新 `.tsx`，mount 到 App.tsx `<Suspense>` 里
- **改面板样式** → WorldGame.astro `<style is:global>` 块底部

开干前先跟 user 对一句"我接手 /world/，准备做 X"。
