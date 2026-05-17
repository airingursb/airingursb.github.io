# Comics Studio — 四格创作工作台

> 用 Codex / Midjourney / Stable Diffusion / 任意图像 AI 出图 → 通过 `publish.mjs` 推送到发布流水线。
> 发布 bot 只接收图片，不再做 AI 生图或文案。

—

## 📁 目录结构

```
comics-studio/
├── README.md          ← 这份（agents 必读）
├── PROMPT.md          ← 主提示词模板（场景描述 + MJ 参数）
├── publish.mjs        ← 发布命令：把草稿推到 Telegram preview
├── package.json       ← deps (@aws-sdk/client-s3, @supabase/supabase-js)
├── refs/              ← 角色 reference 图（不要改）
│   ├── panda.png         (主角 Airing 熊猫)
│   ├── moflow-ink.png    (AI 伙伴 Moflow)
│   └── style-prompt.md   (style 描述参考)
└── drafts/            ← 你的产出区
    └── <YYYY-MM-DD-slug>/
        ├── strip.png       (你画的 2×2 四格图)
        └── meta.json       (标题 + 元数据)
```

—

## 🤝 Drawing Agent 契约

**别的 Agent 负责画画，画完按下面格式落到 `drafts/`，发布流水线就能接住。**

每一期一个独立子目录：`drafts/<YYYY-MM-DD-slug>/`，里面必须有两个文件：

### `strip.png`
- 2×2 grid 四格漫画
- 方形（1:1），建议 1024×1024 或更高
- 已经按 `PROMPT.md` 出过图、角色与 `refs/` 一致
- 图里**不要有文字**（除非那是手写日记艺术效果，但 caption/标题不要画进去）

### `meta.json`
```json
{
  "title": "分号",
  "title_en": "The Semicolon",
  "source_text": "今天 debug 三小时，发现是少了个分号",
  "tags": ["debug", "心情"]
}
```

| 字段 | 必填 | 说明 |
|---|---|---|
| `title` | ✅ | 中文标题（≤12字），也作为 fallback 英文标题 |
| `title_en` | ❌ | 英文标题（≤6词），不填用 `title` 兜底 |
| `source_text` | ❌ | 日记片段，显示在 /comics/[id] 详情页图下方 |
| `tags` | ❌ | 1-3 个短 tag |

—

## 🚀 发布流水线

```
你（或 Agent）DONE 一个 draft
  ↓
$ node comics-studio/publish.mjs drafts/<slug>
  ↓
1. 在 Supabase 建 draft row
2. 上传 strip.png 到 R2 (strip/<rowId>/v1/strip.png)
3. 用 Telegram Bot API 推 preview 到管理员 DM (带 [✅ 发布 | ❌ 删] 按钮)
  ↓
你在 Telegram tap ✅ → 分配 No. N → 触发 GH Actions deploy → ~3min 后 ursb.me/comics/N 上线
```

### 一次性安装 deps

```bash
cd comics-studio && npm install
```

### 运行

```bash
# 从仓库根目录运行
node comics-studio/publish.mjs drafts/2026-05-17-semicolon

# 或者：
# node comics-studio/publish.mjs comics-studio/drafts/2026-05-17-semicolon
```

脚本会自动从下列文件里读取 env vars（先后顺序，先找到的优先）：

1. `comics-studio/.env`
2. `services/blog-api/.env`
3. `.env`（仓库根）

需要的 env keys：
```
BLOG_SUPABASE_URL=
BLOG_SUPABASE_SERVICE_KEY=
R2_ACCOUNT_ID=
R2_ACCESS_KEY_ID=
R2_SECRET_ACCESS_KEY=
R2_BUCKET=
R2_PUBLIC_BASE=
COMICS_TELEGRAM_BOT_TOKEN=
ADMIN_TELEGRAM_USER_ID=
```

—

## 📐 出图规则（agents 也要遵守）

- **2×2 grid 布局**，方形 1:1
- **角色必须与 `refs/` 一致** —— 用 MJ `--cref` / SD IP-Adapter
- **图里不放文字** —— 没有对白气泡、题字、屏幕字
- **水墨手绘风格** —— 不要 3D / 卡通 / vector / 照片质感
- **背景极简** —— 桌角、窗台、一只茶杯就够

## 🎭 起承转合（每期都按这个节奏，避免流水账）

- **Panel 1（起）**：具体感官开场，一个画面不是 label
- **Panel 2（承）**：让画面展开，细节累积
- **Panel 3（转）**：变化（时间过去 / 一个念头打断 / 身体注意到了什么）。不是反转，是转折
- **Panel 4（合）**：余韵。不是包袱。有时甚至全无对白

—

## 🚫 不要做的事

- 不要改 `refs/panda.png` 和 `refs/moflow-ink.png` —— 一旦改了，以前所有漫画在视觉上脱节
- 不要试图让图像模型画对白文字 —— 90% 翻车率
- 不要在 `meta.json.title` 里塞一长串 —— 标题 ≤12 字，源文本放 `source_text`
- 不要在 `drafts/` 之外手工删 R2 / Supabase 数据 —— 走流水线

—

## 🔗 相关

- Bot：`@airing_comics_bot` （Telegram）
- 主站：[ursb.me/comics](https://ursb.me/comics) （nav 入口现在隐藏中）
- DB：Supabase `pcoyocvqfipuydhvdsle`, 表 `comics`
- 图片：Cloudflare R2 `strip/{rowId}/v1/strip.png`
- 发布触发器：Supabase Edge Function `comics-bot` → R2 + Supabase → GH Actions `repository_dispatch`
- 完整 spec：`docs/superpowers/specs/2026-05-16-comics-design.md`
