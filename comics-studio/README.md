# Comics Studio — 四格创作工作台

> 用 Codex / Midjourney / Stable Diffusion / 任意图像 AI 出图 → 通过 `publish.mjs` 推送到发布流水线。
> 发布 bot 只接收图片，不再做 AI 生图或文案。

—

## 📁 目录结构

```
comics-studio/
├── README.md          ← 这份（agents 必读）
├── PROMPT.md          ← 主提示词模板（固定角色 + 四格场景、旁白与对白）
├── publish.mjs        ← 发布新一期：把草稿推到 Telegram preview
├── replace.mjs        ← 替换已发布期数的图（重画、修图），不新建期号
├── strip-assets.mjs   ← 两个脚本共用：读 env、PNG→WebP、上传 R2
├── package.json       ← deps (@aws-sdk/client-s3, @supabase/supabase-js)
├── refs/              ← 新版角色与画风标准，出图时必须附参考
│   ├── panda.png         (Airing 正、侧、背全身 + 三种表情)
│   ├── moflow-ink.png    (Moflow 正、侧、背全身 + 三种表情；兼容旧文件名)
│   ├── character-height.png (同框身高比，Airing : Moflow 约 2 : 1)
│   ├── style-prompt.md   (彩铅 + 蜡笔 Q 版固定前缀)
│   ├── generation-prompts.md (来源与角色设定图生图提示词)
│   └── sources/         (高清头像、No.2 / No.9 v2 漫画参考)
└── drafts/            ← 你的产出区
    └── <YYYY-MM-DD-slug>/
        ├── strip.png       (你画的 2×2 四格图)
        └── meta.json       (标题 + 元数据)
```

—

## 新版角色参考的使用顺序

以后每次出图同时使用这三张设定图：

1. [`refs/panda.png`](refs/panda.png)：Airing 的正面、侧面、背面全身，以及开心、惊讶、困倦。大圆白脸，无黑眼圈，小黑点眼睛、ω 形嘴、橙色椭圆腮红、黑耳朵；必戴深蓝带小柄贝雷帽和橙色三角领巾。黑色四肢、白肚子、矮胖，卡其背包款式可换。
2. [`refs/moflow-ink.png`](refs/moflow-ink.png)：Moflow 的正面、侧面、背面全身，以及开心、惊讶、困倦。淡蓝毛绒圆团，头顶固定 3 撮羽毛状呆毛，黑点眼睛带高光、粉腮红、小嘴，可有小手；不画鸟形、鸟嘴、翅膀，不带或抱爱心。文件名仅为兼容保留，图片已替换。
3. [`refs/character-height.png`](refs/character-height.png)：两人同一地面、同一距离的身高比。含帽柄与呆毛，Moflow 约为 Airing 全高的 1/2。

再附 [`refs/sources/no02-v2.webp`](refs/sources/no02-v2.webp)、[`refs/sources/no09-v2.webp`](refs/sources/no09-v2.webp)，参考彩铅与蜡笔颗粒、断续黑线、暖光、完整背景和文字布局。设定图的素纸底只用于看清角色，漫画必须画完整场景。历史图与固定设定有差异时，以本次设定为准；No.17 的 3:2 横版是例外，新漫画固定正方形四格。

Airing 与 [`src/assets/airing-avatar-48.png`](../src/assets/airing-avatar-48.png) 是同一角色，高清头像存于 [`refs/sources/airing-avatar-hd.png`](refs/sources/airing-avatar-hd.png)。参考来源与生成记录见 [`refs/generation-prompts.md`](refs/generation-prompts.md)。本轮三张设定图另存于 `~/Desktop/comics-character-sheets/`，文件名分别为 `airing-character-sheet.png`、`moflow-character-sheet.png`、`character-height.png`。

## 🤝 Drawing Agent 契约

**别的 Agent 负责画画，画完按下面格式落到 `drafts/`，发布流水线就能接住。**

每一期一个独立子目录：`drafts/<YYYY-MM-DD-slug>/`，里面必须有两个文件：

### `strip.png`
- 2×2 grid 四格漫画
- 方形（1:1），建议 1024×1024 或更高
- 已经按 `PROMPT.md` 出过图、角色与 `refs/` 一致
- 图中文字使用**黑色手写中文**；每格左上角放一至两行旁白。对白只用一根小短线指向说话人，**不画对白框**。标题保留在元数据里。

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
2. 上传到 R2 的 strip/<rowId>/v1/：
   - strip.png  原图，存档用，也用作 og:image 和 Telegram 预览
   - strip.webp 压缩版（质量 85，尺寸不变，约为 PNG 的 1/8），网站上显示的就是它
   panels = { url: webp, original: png, width, height, alt }
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

### 替换已发布的期数

```bash
# 期号=图片路径（strip.png 或包含 strip.png 的目录），可以一次给多期
node comics-studio/replace.mjs 3=~/Downloads/comics-redraw/no03 17=./no17/strip.png
node comics-studio/replace.mjs 3=./no03 --dry-run     # 只看会改什么
```

每一期：上传 PNG + WebP 到下一个版本目录 `strip/<rowId>/v<N+1>/`（旧版本留在 R2 不删），
把 `panels.url` 指过去，旧地址记在 `panels.previous` 里方便回滚。全部换完后触发一次部署
（有 `GH_DISPATCH_TOKEN` 用它，没有就用本机已登录的 `gh`），约 3 分钟后上线。
只需要 Supabase 和 R2 的 env，不需要 Telegram。

> Telegram 直接发图给 bot 的那条路（`supabase/functions/comics-bot`）仍只存 PNG，不生成 WebP。

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

- **2×2 grid 布局，1:1 正方形**；No.17 的 3:2 横版仅为历史例外，不沿用。
- **角色必须与上述三张设定图一致**；使用支持参考图的模型，同时附角色图、比例图和新版漫画场景参考。
- **彩铅 + 蜡笔质感手绘 Q 版**，黑线故意断续，上色有颗粒感；不使用 3D、vector 或照片质感。
- **完整背景、暖光和场景细节**，保持空间、道具与角色的连续性，并预留可读文字区。
- **黑色手写中文**；每格左上角一至两行旁白；对白只用一根小短线指向说话人，无对白框。按脚本可以没有对白，旁白仍须保留。
- **逐字校对文字和逐格核对角色**：帽子、领巾、脸型、呆毛、身高比出现漂移就先修图。

## 🎭 起承转合（每期都按这个节奏，避免流水账）

- **Panel 1（起）**：具体感官开场，一个画面不是 label
- **Panel 2（承）**：让画面展开，细节累积
- **Panel 3（转）**：变化（时间过去 / 一个念头打断 / 身体注意到了什么）。不是反转，是转折
- **Panel 4（合）**：余韵。不是包袱。有时甚至全无对白

—

## 🚫 不要做的事

- 不要自行改变固定画风、角色识别点或身高比；需要修订设定时同步更新三张设定图、`PROMPT.md` 和 `refs/style-prompt.md`。
- 不要沿用旧的角色形象或空白背景规则；中文旁白和短线对白按新版模板绘制，并逐字校对。
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
