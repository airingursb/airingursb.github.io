---
title: "月刊（第35期）：我和 Claude 老师 Vibe Coding 的周末"
date: 2026-05-23
tags: ["weekly"]
description: "记录六个周末疯狂Vibe Coding的成果：博客新增运动与摄影模块及漫画流水线、记账App MoneyWise多端上架、写出14篇沉浸式技术长文、自制编程语言Penelope，以及正在打造的活的像素世界与3D禅意游戏。"
cover: "https://r2.airingdeng.com/blog/wj35/multitask-phone.webp"
---

本篇是对二〇二六年四月至五月的记录与思考。

## 周末的 Vibe Coding

最近一个月疯狂 VIBE，一共花了 Claude Code 257 亿 Token：

![Claude Code token 用量](https://r2.airingdeng.com/blog/wj35/tokens-stats.webp)

这些 Token 基本都是在 6 个周末消耗的，因为也只有周末有时间瞎搞（不然一个 20x 的号只够我用 3 天的）。

我一般会启 7 个以上的长任务让 Claude Code 跑，也不是一直坐在电脑前 —— 我三星小折叠手机在这个时候就很好用，我可以在任意地方拿着手机一边刷视频、一边盯着这几个任务的进度。一旦有 Agent 停下来了，手机第一时间能发现，并操作 —— 语音输入让它们接着干，一刻也不能停（无情的资本家）：

![手机上多任务管理 Claude Code](https://r2.airingdeng.com/blog/wj35/multitask-phone.webp)

那这一个多月以来的周末（我数了下也就 6 个周末），做了哪些好玩的东西呢？

在这篇文章里分享给你们。

## 一些小玩具

给[博客](https://ursb.me/)润色了下，支持了下多语言，另外做了下这些模块：

运动记录：

![运动记录模块](https://r2.airingdeng.com/blog/wj35/mod-workouts.webp)

摄影墙：

![摄影墙模块](https://r2.airingdeng.com/blog/wj35/mod-photos.webp)

以及漫画流水线：搭建了一个 workspace，固定了我的形象和漫画风格，于是只要每天对 Agent 说一句话（也可以配上一些图片，会风格化脱敏处理），他就能自动生成四格漫画并发布 ——

![漫画流水线](https://r2.airingdeng.com/blog/wj35/mod-comics.webp)

分享做的也不错：

![漫画分享 1](https://r2.airingdeng.com/blog/wj35/comics-share-1.webp)
![漫画分享 2](https://r2.airingdeng.com/blog/wj35/comics-share-2.webp)
![漫画分享 3](https://r2.airingdeng.com/blog/wj35/comics-share-3.webp)

还补充了下埋点， 目前一个月大概只有 1 万 PV：

![Umami PV 统计](https://r2.airingdeng.com/blog/wj35/umami-pv.webp)

## App

上期周刊说的理财 App，后来做了一些完善 —— 集成了 AI 语音录账单、OCR 拍小票、持仓录入与分析，以及调试了很久的家庭共享账单能力。

![MoneyWise 主界面](https://r2.airingdeng.com/blog/wj35/moneywise-app.webp)

最终 MoneyWise 上架了 iOS、Android、macOS，以及完全替代了我之前付费多年的 MoneyWiz 了。

![MoneyWise 上架](https://r2.airingdeng.com/blog/wj35/moneywise-stores.webp)

这个 App 从开发到上架没用多少时间，从设计、到开发、到运维、到上架的物料准备，全都是 Claude 老师帮我完成的。

## 深度文章 x14 篇

这段时间一共新增了 14 篇沉浸式技术长文，每篇都是深度的百科全书系列，配了很多可视化的表达与学习互动，发现通过这种方式深入学习非常高效：

- [字节码到像素的一生 — Chromium 渲染流水线全景](https://ursb.me/immersive/chromium-renderer/)：这个是 2022 年当年耗时一个月写的文章，当时写这篇文章我要把工程运行起来一行行断点，手绘逻辑链路 —— 但现在不需要了，Claude 一天就帮我把原来的文章做了更优秀的可视化表达，讲解也更深入了。

![Chromium 渲染流水线沉浸式文章](https://r2.airingdeng.com/blog/wj35/immersive-chromium.webp)

还有另外 13 篇，也是边写边学，学习效率 max，产出也 max：

- [测量「流畅」 — 从 FrameTime 到 Stutter](https://ursb.me/immersive/jank-stutter/)
- [JS 极致性能优化 — V8 优化原理与一段热点函数的重生](https://ursb.me/immersive/v8-fast-js/)
- [沉积的像素 — 50+ 图片格式全谱百科](https://ursb.me/immersive/image-formats/)
- [一次请求的一生 — HTTP/3 协议全景](https://ursb.me/immersive/http3/)
- [从 Rust 到 SIMD — WebAssembly 的一生](https://ursb.me/immersive/webassembly/)
- [一行 JS 的一生 — QuickJS 源码详解](https://ursb.me/immersive/quickjs/)
- [一次 setState 的一生 — React 渲染流水线全景](https://ursb.me/immersive/react-internals/)
- [Helio：高性能小游戏容器的进化之路](https://ursb.me/immersive/helio/)
- [一段内存的多重死亡 — 11 个 GC 家族的家谱](https://ursb.me/immersive/gc/)
- [一次 dispatch 的八重翻译 — WebGPU 全栈源码深读](https://ursb.me/immersive/webgpu/)
- [一段 CSS 的一生 — Chromium 样式引擎全景](https://ursb.me/immersive/css-engine/)
- [一次 LLM 推理的一生](https://ursb.me/immersive/llm-inference-life/)
- [一次 TLS 握手的一生 — TLS 1.3 协议全景](https://ursb.me/immersive/tls-handshake/)

甚至 GC 那篇文章 Claude 还帮我做了个 3D 的游戏，通过游戏来讲解各种 GC 策略的区别：

![GC 3D 游戏 1](https://r2.airingdeng.com/blog/wj35/gc-game-1.jpg)

![GC 3D 游戏 2](https://r2.airingdeng.com/blog/wj35/gc-game-2.jpg)

## 自制编程语言 —— [Penelope](https://penelope.ursb.me/)

在荷马的史诗里，珀涅罗珀等了奥德修斯整整二十年。她每天纺织一件寿衣，每夜把白天的进度悄悄拆掉——她不是不能选，是不愿意选。她在等一个还没回来的人。

这个故事在 Claude 脑子里转了很久之后，推荐我把它做成了一门编程语言。

写代码的人大概都熟悉这种处境：你写下的程序，是一个没有耐心等待的东西。一个进程一旦中断，它脑子里所有的东西——栈、变量、走到了哪一行——就全部消失了。要让程序挺过等待，我们就在外面套一圈支架：checkpoint 文件、消息队列、幂等键、重试逻辑、Temporal/Inngest 这些 durable execution 框架。它们是有效的，但它们也都在向程序员索取同一件代价——你必须把我想做的事翻译成框架允许我说的话，把代码切成 activity、step、await 一段一段。

Penelope 想做的事很朴素——把这些东西收回到语言里面。

```jsx
let x = 10;
let y = pause;          // 进程在这里退出，状态写到磁盘
print(to_str(x + y));   // 一小时后、一周后、一年后，另一个进程接着跑，打印 15
```

没有 await，没有 checkpoint，没有装饰器。就一个 pause 关键字，和 let 平起平坐。它背后只有一句公理——

> 执行即数据。一个运行中的程序，本身是一个值。

支持自实现的字节码 + VM 执行，也支持了调试器和 LSP、VSCode 插件，为了性能机制还支持了 JIT 和 WASM 后端；基于这些甚至还实现了自举 —— 新版本的 lexer、parser、compiler 目前都用 Penelope 自己写了。

![Penelope 语言官网](https://r2.airingdeng.com/blog/wj35/penelope-site.webp)

Penelope 将 pause 作为一等表达式，把一个工程问题，重新还原成一个语义问题。

在这个过程中不仅巩固了自己的编程基础，其实还发现 Claude 老师的推理能力很强：推演能力够强的时候，或许更高阶的用法可能是去做减法——往回逼到那个最 solid 的基点，再反过来和它一起往上推、做加法。这样摄取的知识价值密度更高，也更牢固。

![Penelope 公理推导](https://r2.airingdeng.com/blog/wj35/penelope-axiom.webp)

## 活的星露谷

这个项目的起因是我给博客做了多语言适配，以及同时在线人数统计的功能，发现博客来访的外国友人挺多的，有些友人也很乐于评论，因此博客也一直有访问量 —— 甚至有几天免费版的 supabase 都扛不住了：

![Supabase 限额告警](https://r2.airingdeng.com/blog/wj35/supabase-limit.webp)

于是想到我要不要直接做个游戏，用小动物的形象展示下访客，让大家都在一个房间里互动，有点世界大同的感觉：

![小世界初稿](https://r2.airingdeng.com/blog/wj35/world-idea.webp)

因为 image2 效果很好，又斥巨资买了 codex，让 Claude Code 和 Codex 强强联手给我做游戏：

![Claude Code 和 Codex 强强联合](https://r2.airingdeng.com/blog/wj35/codex-claude.webp)

小游戏越做越大，每个 NPC 不仅接入了 AI，还参考 OpenClaw 的架构设计了 SOUL 和独立的记忆系统，如果注册了还会为你存储专属的记忆，并偶尔主动发邮件问候你，就类似一个活的星露谷：

![NPC SOUL 记忆系统](https://r2.airingdeng.com/blog/wj35/npc-soul.webp)

这一切还挺有意思的，迸发而出的创意源源不断。例如现在在搭建我乱七八糟的作品展，改了好几版一直不满意：

![作品展画廊](https://r2.airingdeng.com/blog/wj35/gallery-exhibit.webp)

2D 小世界的链接先不放出来啦，因为还有很多需要我这个创世神来完善的地方。

## 3D 游戏的探索

如果上面是 2D 游戏的探索，那接下来是的 3D 游戏的探索。除了前面说的 GC 游戏，其实还做了个 3D 的禅意小世界：

![3D 禅意小世界](https://r2.airingdeng.com/blog/wj35/zen-world.jpg)

目前还在打磨，但是以及可以初步看看效果了：[https://ursb.me/world/](https://ursb.me/world/)。可以播一些白噪音，设置专注的番茄钟等等，里面做了一些微风的动效，还是挺有意境的。

做 3D 游戏的时候其实走了很多弯路，比如想做这个"树下静谈"的场景，搞了很久才只有这个效果：

![树下静谈早期效果](https://r2.airingdeng.com/blog/wj35/tree-chat-fail.webp)

Avatar 这块废了我不少时间和金钱，扩散模型生成的效果和抽盲盒似的，一直不满意。

![Avatar 扩散模型尝试](https://r2.airingdeng.com/blog/wj35/avatar-diffusion.webp)

但如果直接让编码模型做去美术资产，那就这样了：

![编码模型生成美术资产](https://r2.airingdeng.com/blog/wj35/code-art.webp)

后面想做的其实还有很多很多，留着之后有机会再分享吧！

## 🌺 生活点滴

**⛰️ 麦里芝徒步**

[https://ursb.me/workouts/521415AA-9098-4F05-96D8-AF11B5893821/](https://ursb.me/workouts/521415AA-9098-4F05-96D8-AF11B5893821/)

![麦里芝徒步](https://r2.airingdeng.com/blog/wj35/macritchie.webp)

**🗡️ 圣剑 + 麦克风**

组了个圣剑麦克风：

![圣剑麦克风](https://r2.airingdeng.com/blog/wj35/mic-sword.webp)

**⌨️ ZSA Voyager + Navigator + ZSA Moonlander**

最近舍弃了我用了十几年的 HHKB 系列，买了个 ZSA Voyager + Navigator，分体键盘上手了两周我才勉强能够打字……但习惯之后用起来真的很爽，于是又买了个 ZSA Moonlander。

我桌面有点乱，这期先配个网图吧，大概长这样子：

![ZSA 分体键盘](https://r2.airingdeng.com/blog/wj35/zsa-voyager.webp)

**🎮 洛克王国**

最近沉迷洛克王国，抓了个炫彩粉色的异色雪影娃娃：

![洛克王国异色雪影娃娃](https://r2.airingdeng.com/blog/wj35/rock-kingdom.webp)

## 🎬 书影音

以下是本周期的书影音记录。

- 看过：剧集 |《夺命许愿》| ★★★★★
- 看过：剧集 |《非常律师禹英禑》| ★★★★★ | 二刷
- 看过：电影 |《杀木地》| ★★★★☆
- 看过：剧集 |《黑袍纠察队 5》| ★★★☆☆，烂尾了。
