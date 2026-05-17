# Comics Studio — 四格创作工作台

> 用 Codex / Midjourney / Stable Diffusion / 任意图像 AI 出图 → 发给 Telegram bot 发布。
> Bot 只负责发布，**不再做任何 AI 生图或文案**。你拿到的图就是最终上线的图。

## 📁 目录结构

```
comics-studio/
├── README.md          ← 这份（工作流 + 规则）
├── PROMPT.md          ← 主提示词模板（填 4 格场景即可用）
├── refs/              ← 角色 reference 图（每次生图都要喂给模型）
│   ├── panda.png         (主角 Airing 熊猫)
│   ├── moflow-ink.png    (AI 伙伴 Moflow)
│   └── style-prompt.md   (style 描述参考)
├── drafts/            ← 你的工作区（gitignored，随便扔）
└── .gitignore
```

## 🎨 工作流

1. 想一个主题——一句话日记片段（"今天 debug 三小时发现是少了个分号"）
2. 让 Codex / 你自己 写 4 格的具体场景描述
3. 把场景描述填进 `PROMPT.md` 的 `{PANEL_1..4}` 占位符
4. 调你选的图像模型生图，挂上 `refs/panda.png` + `refs/moflow-ink.png`
   - Midjourney：`--cref <panda url> --cref <moflow-ink url> --cw 100`
   - Stable Diffusion：用 IP-Adapter 加角色参考
   - GPT-image / DALL-E：用 images.edit API 传 reference
5. 多试几次（一般 4-8 张里能挑到满意的），存到 `drafts/{slug}.png`
6. 满意了 → Telegram DM `@airing_comics_bot`：
   - **发图（必须）**：直接发图片
   - **caption（可选）**：就是标题。**只写一行字**。不填的话标题用"未命名"
7. bot 回 `*草稿就绪* · 「标题」` + [✅ 发布 | ❌ 删]
8. ✅ 一下 → 分配 No. N → 触发 GH Actions deploy → ~3min 后 `ursb.me/comics/N` 上线

## 📐 出图硬性规则

- **2×2 grid 布局**，方形（1:1 比例）
- **角色必须跟 refs/ 里的一致** —— 用 character reference 功能锁死
- **图里不放文字** —— 没有对白气泡、没有题字、没有标签、没有屏幕上的字。bot 不会处理图里的文字
- **水墨手绘风格** —— 避免 3D / 卡通 / vector / 照片质感
- **背景极简** —— 桌角、窗台、一只茶杯就够，不要复杂场景

## 🎭 起承转合（剧本结构建议）

每一期都按这个节奏走，避免流水账：

- **Panel 1（起 qǐ）**：具体感官的开场。一个画面，不是一个 label。
- **Panel 2（承 chéng）**：让画面展开。细节累积。
- **Panel 3（转 zhuǎn）**：某种变化。时间过了 / 一个念头打断 / 身体注意到了什么。**不是反转**，是转折。
- **Panel 4（合 hé）**：余韵。**不是包袱**。一个安静的画面、一句没答出来的话、有时甚至全无对白。

## 🚫 不要做的事

- 不要试图让图像模型画出对白文字 —— 90% 翻车率，特别是中文
- 不要为同一个想法发两次 —— 用 ❌ 删掉再发新的
- 不要改 `refs/panda.png` 和 `refs/moflow-ink.png` —— 一旦改了，所有以前的漫画在视觉上就脱节了
- 不要在 caption 里写一长串源文本 —— caption 就是标题。源文本以后会做成 markdown 自定义字段

## 🔗 相关链接

- Bot: `@airing_comics_bot` （Telegram）
- 主站：[ursb.me/comics](https://ursb.me/comics) （目前 nav 入口隐藏中，模块还在开发）
- DB：Supabase 项目 `pcoyocvqfipuydhvdsle`, 表 `comics`
- 图片存储：Cloudflare R2 `strip/{rowId}/v1/strip.png`
- 部署 pipeline：bot → Supabase Edge Function `comics-bot` → R2 + Supabase → GH Actions `repository_dispatch`
