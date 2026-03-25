---
title: "Mac 小众软件推荐与工作流分享(2024)"
date: 2024-11-04
tags: ["tech"]
description: ""
---

这篇文章分享了我在工作这几年遇到过的好用的 Mac 软件，其中有不少我还在使用，它们在我工作道路上帮到了我很多，部分软件组合起来形成的工作流甚至让我的工作本身也变得愉悦起来。我希望能够把这些分享给大家。

## 一、笔记篇
首先出场的是笔记赛道的诸多产品们，实话说，其中的产品我都折腾过，最后选择了 Heptabase，除了偶尔作图或者写草稿的时候在用 Excalidraw。选择 Heptabase 只是因为它的设计最适合我自己的场景，并非其他产品不够好。

本节将笔记产品粗略分为常规笔记、双链笔记、数据库笔记、画板笔记，分类也并不是很严谨，只是它的主要功能在某个范畴内就这么划分了，比如 Obsidian Canvas 和 Logseq 都可以做白板，但这并非是它们的特色功能，因此没有分到画板笔记中。

### 0x01 常规笔记
1.1 Drafts
[Drafts](https://getdrafts.com/)，作为开篇的第一款软件，把尊重留给 Drafts。这是十几年的老牌产品，同时有移动端，搭配快捷键和桌面置顶功能，我常用作临时笔记或者桌面便签。非常良心，基础功能免费可用，也可以用商城里预制的 Action。付费则可以自己用 JS 写定制脚本做一些 Action，扩展性非常强，蛮酷的。缺点是仅支持纯文本输入，不支持图片插入。

![](https://airing.ursb.me/images/blog/20240925/20240921225942@2x.png)1.2 Bear
[Bear](https://bear.app/zh/)，中文名熊掌记，挺可爱的一款笔记软件，功能完善，将笔记导出成图片/PDF 的功能非常实用。缺点是不支持 CDN 图片解析，在写一些需要发布到网站的文章时则不太方面。

![](https://airing.ursb.me/images/blog/20240925/20240921230357@2x.png)1.3 Typora
[Typora]，程序员们钟爱的笔记软件，支持完整的 Markdown 和流程图语法，简洁易用，功能完备。缺点是存储库不支持标签管理，本质上只是一个 Markdown 编辑器。

![](https://airing.ursb.me/images/blog/20240925/20240921230343@2x.png)1.4 iA Writer
[iA Writer](https://ia.net/writer)，一款 wysiwyg 的写作编辑器，主打文字创作，写作时容易进入心流。

![](https://airing.ursb.me/images/blog/20240925/20240921230744@2x.png)1.5 Apple Notes
一款被低估的软件，配合 ProNotes 插件可以支持 Markdown 输入、模板定义、AI 输入与 Deeplink 拷贝，配合 Hookmark 可以做任意软件的双链，此外再配合 Raycast 的 Apple Notes 插件可以做全文检索和快速打开。

![](https://airing.ursb.me/images/blog/20240925/Pasted%20image%2020240921231315.png)1.6 Obsidian
[Obsidian](https://obsidian.md/)，笔记软件的集大成者，社区非常活跃，软件本身除了功能齐全、稳定之外，配合插件可以做到许多意想不到的事情。优点是支持全平台，文件完全本地存储。

![](https://airing.ursb.me/images/blog/20240925/20240921231439@2x.png)1.7 NotePlan
[NotePlan](https://noteplan.co/)，除了传统的笔记功能外，特点是支持非常完备的日程和任务管理。但因为 AI 合规问题，退出了中国区的 App Store。

![](https://airing.ursb.me/images/blog/20240925/Pasted%20image%2020240921231939.png)1.8 Agenda
[Agenda](https://agenda.com/)，好几年前 App Store 的年度产品，特点也是支持完备的日程和任务管理。

![](https://airing.ursb.me/images/blog/20240925/20240921232040@2x.png)1.9 Mem
[Mem](https://get.mem.ai/)，海外比较火的 AI 笔记软件，支持快速裁剪、快速录入、AI Q&A 功能。缺点是数据云存储，并且编辑器输入体验比较差。

![](https://airing.ursb.me/images/blog/20240925/Pasted%20image%2020240921232158.png)1.10 Flomo
[Flomo](https://flomoapp.com/)，身边很多产品朋友在用的软件，简单易用，理念是让记录回归到内容本身。开源社区还有像素级的复刻产品 memo，Obsidian 中也有相关的集成插件。

![](https://airing.ursb.me/images/blog/20240925/Pasted%20image%2020240921232411.png)1.11 Raycast Notes
Raycast 内置的 Notes，想对标 Bear 和 Drafts，目前还在内测中，体验了下偏简易版的 Drafts。后续还需要利用 Raycast 的存量生态好好打磨。

![](https://airing.ursb.me/images/blog/20240925/20240921232609@2x.png)1.12 Lazy
[Lazy](https://lazy.so/)，前两周刚发布的笔记软件，仍在内测中。体验之后发现它和 Mem 的趋于同质化，都是主打快速记录，只是 Lazy 做的更加极端，能从任意软件创建笔记（有点类似于 Hookmark + Drafts）。和现代主流软件一样，内置了较为齐全的 AI 功能。

![](https://airing.ursb.me/images/blog/20240925/20240926103101@2x.png)### 0x02 双链笔记
双链笔记是 2020 年开始出现的概念，由 Roam Research 提出，后来被许多产品借鉴、效仿、集成、改进。

2.1 Roam Research
[Roam Research](https://roamresearch.com/)，虽然被追随者效仿并超越，但是不得不提一下。在 2020 年 Roam Research 刚出来的时候就付费深度使用了，摸索了一套双链笔记的使用方法，可以见我写的这篇文章[Roam Research 最佳实践——知识管理与任务管理](https://blog.ursb.me/posts/roam-research/)。

![](https://airing.ursb.me/images/blog/20240925/Pasted%20image%2020240921232835.png)2.2 Logseq
[Logseq](https://logseq.com/)，可以非常简单粗暴的理解成 Roam Research 的免费本地客户端版，但后续出了白板功能、插件市场、PDF 标注等能力，总体来说是当下体验双链笔记最好的选择，没有之一。但这一年来被 Obsidian 蚕食过多，商业化是个问题，开源社区堆积了很多 Issue 没有处理。

![](https://airing.ursb.me/images/blog/20240925/Pasted%20image%2020240921233208.png)2.3 Reflect
[Reflect](https://reflect.app/)，也是一款双链笔记，但突出日程管理、任务安排以及 AI 编辑功能，海外用户画像偏商务人士。

![](https://airing.ursb.me/images/blog/20240925/20240921233421@2x.png)2.4 Tana
[Tana](https://tana.inc/)，是我个人非常偏爱的一款产品，在双链的概念之上更进一步，万物皆 Node，每一个 Node 都可以定义多个 Supertag，而每个 Supertag 又是一个数据表定义，因此被套上 Supertag 的 Node 转瞬变成了 Notion 的 Database。并且 Supertag 本身存在继承关系，而 Supertag 内的 Field 也有属性和复用的能力。AI 功能和语音输入非常好用，提供的 API 也比较完备，其中 AI Workflow 的可玩性非常高，再结合 Perplexity 的 AI 可以在 Node 内自行实现 AI 搜索。

缺点是这个软件着实太复杂了，如果不花多点时间研究下是搞不懂的，对新手很不友好。适合喜欢掌控、整理、秩序的同学。内测了两年，目前在公测中，还是邀请制加入，每周五晚上它会更新个小版本。

![](https://airing.ursb.me/images/blog/20240925/20240921233650@2x.png)### 0x03 数据库笔记
3.1 Notion
[Notion](https://www.notion.so/)，在 2017 年的时候开始使用，给了我永久的 Plus 会员。国内还有很多类 Notion 的软件，这里就不展开说了。去年 Notion 出了 AI Q&A 的功能，因此可以基于自己的内容直接生成了 RAG，非常强大和易用。但是我在 beta 版使用之后觉得 AI 的能力还是太弱，不知最近是否有所改善。

![](https://airing.ursb.me/images/blog/20240925/20240921234249@2x.png)3.2 Anytype
[Anytype](https://anytype.io/)，很早提出基于 Object(Type) 的 All in One 软件，但是研发进度着实太慢太慢，过了两年理念先被 Capacities 实现出来了，而且即便今天，Anytype 的完成度依然不高。

![](https://airing.ursb.me/images/blog/20240925/20240921234722@2x.png)3.3 Capacities
[Capacities](https://capacities.io/)，基于 Object 的笔记软件（或者叫收集软件？），你可以像面向对象编程那样，定义很多很多对象的原型，之后每有一个 item 产生，那么都需要归类到某个对象之下。Item 之间也支持双链，因此可以搭建一个资源网络。AI 功能也比较好用，API 的存在也衍生了不少玩法。月更大版本，每个月看他们的 Changlog 还是蛮期待的。缺点是他们的服务基本上每个月都会挂一次，服务挂了或者网络不好就完全不可用，迫使他们今年开始做离线存储的改造。

![](https://airing.ursb.me/images/blog/20240925/Pasted%20image%2020240921234537.png)### 0x04 画板笔记
4.1 Heptabase
[Heptabase](https://heptabase.com/)，近三年来一直在用的笔记软件，特点是卡片笔记+画板，数据本地存储+云同步，我也把它作为 PDF 阅读器，因为 PDF 阅读期间的标注也会自动转成卡片（类似于 MarginNote）以便我后续统一处理。同时它也支持我在用的 Readwise，在网页上标注的片段也会自动同步成卡片。一般我会收集很多卡片，在写文章或者做分享需要输出的时候，使用画板功能整理、发散、创新。最近新出的 AI Insight 功能对我而言用处不大，一般来说笔记在记录的时候就已经梳理好内容了，不需要再 AI 帮忙做大纲了，除非是无脑复制的长文才可能有这个场景。期待后续 Heptabase 在 AI 上的探索。

PS. 如果需要试用的话，可以使用我的邀请链接 [https://join.heptabase.com?invite-acc-id=4cbb8101-41a9-4961-a447-a423f080f288](https://join.heptabase.com/?invite-acc-id=4cbb8101-41a9-4961-a447-a423f080f288)，你转成付费用户之后我们各得 $5。

我在内测阶段开始使用这款软件，至今近 3 年 5000+ 卡片。喜欢这款软件不仅仅是因为它本身足够好用，而且这个台湾小哥的开发者(Alan)我非常佩服，在大学毕业就创业做这款产品，并且写了四篇文章介绍自己的愿景（[My Vision: The Context](https://medium.com/heptabase/my-vision-the-context-c73e29981685)、[My Vision: A New City](https://medium.com/heptabase/my-vision-a-new-city-c7010f5871d)、[My Vision: A Forgotten History](https://medium.com/heptabase/my-vision-a-forgotten-history-67ee77e969da)、[My Vision: The Knowledge Lifecycle](https://medium.com/heptabase/my-vision-project-meta-e0bedd1467b2)）。功能开发非常尊重用户，关键细节点会发投票，并咨询用户这么选的原因。中间有一年多的时间，我每天早上上班时打开 Heptabase，都会有版本更新，而且每个更新都是 Feature，可见作者对这款产品的热情。

![](https://airing.ursb.me/images/blog/20240925/Pasted%20image%2020240921235857.png)4.2 AFFiNE
[AFFiNE](https://affine.pro)，雪碧(ewind)团队创业打造的产品，特点是文档直接转画板、以及多人协作，每个笔记也支持 Notion 那样内置 Database。创意非常好，但是目前产品的编辑体验个人觉得欠佳。

![](https://airing.ursb.me/images/blog/20240925/20240921235612@2x.png)4.3 Excalidraw
[Excalidraw](https://excalidraw.com/)，严格来说不是笔记软件，而是作图软件，非常适合程序员做各种架构图、流程图，我平时开发的时候也会单独开一个画板来当成草稿本。

分享一个小技巧，Obsidian 的 Excalidraw 插件比网页版好用很多，相当于有一个画本客户端。之前在做复杂项目的时候，一个多月都在同一个画本里打草稿，最后项目做完后，一个画布文件有上百 MB 的大小，但是一点儿也不卡。作者也一直在精心维护着它，偶尔还会有使用的小功能，比如两周前还出了个 PDF 标注能力，可以把画本改造成 MarginNote。

![](https://airing.ursb.me/images/blog/20240925/Pasted%20image%2020240922001312.png)## 二、效率篇
### 0x01 时间管理
1.1 Apple Calendar、Google Calendar
系统级应用，服务稳定，功能齐全，也是免费的。iOS 18 的 Apple Calendar 也支持集成提醒事项，非常易用。Google Calendar 的优势则在于丰富的三方集成。

1.2 Fantastical
[Fantastical](https://flexibits.com/fantastical)，可以整合多种日历源和任务源，设计精美。

![](https://airing.ursb.me/images/blog/20240925/Pasted%20image%2020240922121249.png)### 0x02 时间追踪
2.1 Rize
[Rize](https://rize.io/) 是一个时间追踪软件，曾经在我的[《月刊（第23期）：多任务中的时间管理》](https://blog.ursb.me/posts/weekly-23/) 介绍过它。

除了时间追踪，它更是一个培养专注的工具，同一软件或是保持在同一工作上下文中保持一段时间，会进入 Focus 状态（类似心流），这个时间会统计 Focus 时间。而如果你突然切出上下文，如打开微信或者用浏览器浏览了这个上下文无关的网页，Rize 会认为此刻你分心了，从而弹出保持 Focus 提示并退出此轮 Focus 计时。

整个软件设计地异常简单，整个流程不需要去配置任何东西，结合 AI 进行全自动的监测，只有在娱乐或者是打断 Focus 的时候才会感知到它的存在。（PS: 这不是广告，但如果想体验可以用 [https://rize.io?code=291287](https://rize.io/?code=291287&utm_source=refer&name=Airing) 链接来注册…）

![](https://airing.ursb.me/images/blog/20240925/Pasted%20image%2020240922121633.png)### 0x03 任务
任务软件有非常多，相信读者们也有自己用的顺手的任务管理软件。只要用的顺手，最基础的系统的提醒事项就足够用了。本节只列举 3 个具有代表性的产品。

3.1 Todoist
[Todoist](https://todoist.com/zh-CN)，老牌的任务工具，免费 5 个项目的限制足够使用。我之所以一直使用它，是因为它的 API 丰富，同时支持丰富的筛选语法，可以做很多集成，配合工作流使用。

比如能和 Obsidian 集成，这样 Daily Note 就能直接展示今天的待办事项，或者在项目笔记里可以做项目任务的集成，服务稳定、扩展性非常强，技术支持也很友善、积极。

![](https://airing.ursb.me/images/blog/20240925/20240922121912@2x.png)3.2 滴答清单
[滴答清单](https://dida365.com/)，适合中国宝宝体质的任务软件（工作事项繁多、存在多线程并行场景），功能丰富，但是始终保持着易用。

![](https://airing.ursb.me/images/blog/20240925/Pasted%20image%2020240922115729.png)3.3 Linear
[Linear](https://linear.app/)，适合研发项目管理，集成能力多、可以同步跟进多个项目的工作量进展与进度预测。软件设计非常出众，设计圈内称之为 Linear 风格。

![](https://airing.ursb.me/images/blog/20240925/20240922115941@2x.png)### 0x04 研发
研发软件每个技术领域都有不同，这里列举一下

- Warp，开箱即用，颜值也不错，最重要的是完全不需要自己去折腾各种配置和插件，代替了之前自己使用了很久的 iTerms。也直接生成分享链接给他人展示自己的终端内容，发给他人定位问题的时候比较好用。
- Cursor，最近大火的代码编辑器，AI 功能强大，比 GitHub Copilot 体验好很多。虽然 GitHub Copilot 对我的账号一直是免费使用，但我转 Cursor 付费了，后者甚至有和 AI 结对编程的感觉。
- Apifox，API 文档、接口文档工具。
- **oh-my-zsh**，用的比较多的是 git alias、git 插件、zsh-autosuggestions 插件。
- **tig**，命令行 Git 增强工具，非常使用。
- **Homebrew**，Mac 必备的软件管理工具，也不算小众了。
- **musicfox**，命令行听歌工具，因此电脑上没有装音乐软件，通过 Vim 快捷键可以操作，还可以连接 Last.fm。
- **Scrcpy**，安卓开发时使用，一般使用真机配合 Scrcpy 投屏，方便电脑操作或录制。
- **iPhone Mirrors**，新系统支持的功能，算是姗姗来迟，着实非常好用，可以用来 iOS 开发直接操作真机，不需要再低头操作了。
- **Git Kraken**，一般较复杂的项目和场景下才会用，比如大仓里包括很多 submodule，或者需要溯源很长的 commit 的历史去查某个地方的变动，否则直接用 tig。

### 0x05 AI
5.1 Perplexity
AI 搜索软件这一年来因为门槛降低，涌现了不少产品，之前整理过一波：

- [askan](https://www.askan.ai/)
- [arc](https://arc.net/)
- [Bing](https://www.bing.com/)
- [everypixel](https://www.everypixel.com/)
- [genspark](https://www.genspark.ai/)
- [gptgo](https://gptgo.ai/)
- [Globe](https://explorer.globe.engineer/)
- [komo](https://komo.ai/)
- [perplexity](https://www.perplexity.ai/)
- [phind](https://www.phind.com/search?home=true)
- [rosebud](https://www.rosebud.ai/)
- [searcholic](https://searcholic.com/#gsc.tab=0)
- [songtell](https://www.songtell.com/)
- [scite](https://scite.ai/)
- [you](https://you.com/)
- [秘塔AI](https://metaso.cn/)
- [Perplexica](https://github.com/ItzCrazyKns/Perplexica)
- [devv](https://devv.ai/zh)
- [360搜索脑图](http://so.360.com/)
- [ChatGLM](https://chatglm.cn/)
- [天工开物](https://www.tiangong.cn/)
- [trackaianswers](https://trackaianswers.com/PEOPLE?from_site=hibe)
- [maester](https://maester.app/)
- [morphic](https://www.morphic.sh/)
- [jeeves](https://jeeves.ai/)
- [bookabout](https://bookabout.io/)
- [dorkgpt](https://www.dorkgpt.com/)
- [miku](https://hellomiku.com/index)
- [lepton](https://search.lepton.run/)
- [aisearch](https://www.aisearch.vip/#)
- [flowith](https://flowith.io/sub)
- [thinkany](https://thinkany.ai/zh)

这里重点推一下 [Perplexity](https://www.perplexity.ai)，基本上它在我这里已经取代了 Google，它会结合搜索引擎的结果进行回答，同时也支持识别 PDF 文件和图像，回答质量对比同类产品来看是非常之高，最近出了 Mac 客户端版本非常方便。

PS: Perplexity 的免费版也足够使用（免费版只是不能用 GPT-4 而已），如过注册的话可以使用这个链接 → [https://perplexity.ai/pro?referral_code=0ZSAD0VT](https://perplexity.ai/pro?referral_code=0ZSAD0VT) ，未来如果想要付费的话可以得到 $5 的抵扣。

![](https://airing.ursb.me/images/blog/20240925/Pasted%20image%2020240922102256.png)5.2 Raycast AI
AI Chat 客户端也非常多了，较上面的 AI 搜索而言更是不胜枚举。这里提一下 Raycast AI。

结合 Raycast 使用很方便，可以通过 Prompt 自定义 AI Command，以下是我常用的一些命令：比如提取 WeChat Bot 返回的 JSON 配置、JSON 压缩、输入 URL 总结网页内容、根据 JCE 协议转 ts 声明或者直接 Mock 出数据配合 Whilstle 构造请求的响应体。

![](https://airing.ursb.me/images/blog/20240925/Pasted%20image%2020240922103635.png)5.3 Dify
[Dify](https://dify.ai/zh)，我愿称之为成年人的大玩具！各种小模型基于组件节点自己搭起来，和小时候搭积木的感觉一样，再配合知识库、API 服务等能力，可玩性取决于你的创意。有开源版本，自己部署在服务端的话比较吃机器配置，可以本地部署或者直接使用 Cloud 版本。

![](https://airing.ursb.me/images/blog/20240925/20240922104021@2x.png)### 0x06 工作流

- IFTTT，自动化服务，支持 AI、Webhook，并且支持 JS 编程处理信息格式和过滤操作，可以做各种记录的聚合、整理和转发，可以作为常驻稳定的中转服务。
- Zapier，类似 IFTTT 的自动化服务，价格较前者更贵，但更加易用，适合不想写过滤脚本的场景。
- **n8n**，类似于 IFTTT 的自动化平台，开源免费，自己部署即可。

有了自动化之后，可以做很多有意思的事：

- GitHub Star 总结：GitHub 点了 Star 之后，自动请求发给 Perplexity  API 让 AI 去总结仓库内容，拿到结果之后再调用 API 同步到 Tana / Capacities 等笔记软件内收集。
- RSS 监控舆情周报：订阅的 RSS 渠道如果触发到某个关键词，就请求 Perplexity  API 拿到文章总结，之后同步到笔记软件内收集，调用通知接口提醒，并发到 TG 的个人频道里。最后利用 Email 做 Weekly 收集，每周发送汇总邮件，汇总触发到这个关键词的文章和对应的简介。特别适合用来做舆情监控。
- 豆瓣书影音收集：类似于 GitHub Star，豆瓣评分了某个作品之后，收藏到笔记软件里。
- 微博动态订阅：类似于 GitHub Star 订阅。
- 听歌记录周报：实用 Musicfox 命令行软件听歌，之后配合 Last.fm 可以汇总听歌数据，每周发给你本周的听歌记录。
- 工作专注日报：Rize 每日的专注邮件讲给 IFTTT 监听，如果有 Rize 的邮件，就会使用 IFTTT AI 自动总结今日的时间报告发送给自己。
![](https://airing.ursb.me/images/blog/20240925/Pasted%20image%2020240922114741.png)

### 0x07 阅读

- **Readwise Reader**，和 Readwise 的集成做的非常好，体验流畅，支持快捷键、RSS 订阅、NewsLetter 订阅、也可以高亮图片。
- **Inoreader**，RSS 订阅源管理，配合邮箱、IFTTT & AI、Telegram 订阅、关键词监控做一些自动化提醒和总结。
- **微信读书**，AI 大纲和 AI 解读十分好用，阅读完之后配合 Readwise 保存书摘。
- **Cubox**，网页收藏箱，配合 IFTTT 使用，各订阅渠道最终都会收录到 Cubox 里。
- **Instapaper**，因为免费+集成化做的很好，配合 IFTTT、浏览器插件、Inoreader 做网页收藏的中转服务。
- **Follow**，基于 Web3 和 RSSRub 搭建的阅读器，前几周新出产品，目前还在内测中，需要邀请码可以找我要。
- **Reeder**，老牌 RSS 阅读器，前几天出了新的大版本转订阅制了，也是开始转型主打多信息媒介订阅。
- **Me.bot**，前段时间新出的一款网页收藏工具，基础功能类似于 My Mind，但是它基于角色卡做的 AI 助理还是蛮有意思的，性格鲜明。

![](https://airing.ursb.me/images/blog/20240925/20240926102553@2x.png)![](https://airing.ursb.me/images/blog/20240925/20240926102631@2x.png)![](https://airing.ursb.me/images/blog/20240925/20240926102742@2x.png)
### 0x08 系统
8.1 截图
CleanShot X
[CleanShot X](https://cleanshot.com/) ，一款老牌 & 功能强大的 MacOS 平台的截图软件，以上两款软件的功能它都有，除此之外，还有录制视频、录制 GIF、上传图片到云端、顺序标注等独有的能力，界面也很美观，和 Raycast 的联动做的也很好，还有独创的「all in one」模式。

![](https://airing.ursb.me/images/blog/20240925/20240922001821@2x.png)Snipaste
[Snipaste](http://zh.snipaste.com/) ，Windows 和 MacOS 平台皆有，最喜欢的是可以把截图贴在桌面上的能力，如同便签一样，方便我贴重构稿、关键信息、对比代码、二维码等信息到桌面上。

![](https://airing.ursb.me/images/blog/20240925/20240922001946@2x.png)Shottr
[Shottr](https://shottr.cc/#/) 是最近新出的又一款 MacOS 平台的截图 App，功能强大、界面美观、而且免费，较于 Snipaste 多了滚动截图、窗口截图、OCR 等能力。

![](https://airing.ursb.me/images/blog/20240925/20240922001938@2x.png)8.2 翻译

- **Bob**，翻译软件，有不错的快捷键支持，用的较少，大多数情况下会用 Raycast + AI Command 翻译。
- **沉浸式翻译**，比较好用的网页翻译，可以指定翻译接口。
- **Monica**，是一个 AI 工具软件，类似于工具箱集合，内置的翻译则是像素级借鉴沉浸式翻译的功能，此外它还内置了网页总结、PDF 总结、视频总结、博客总结、搜索总结等等 AI 小工具。

8.3 其他

- [Arc](https://arc.net/)，强大、易用的浏览器。(但是前几天官宣停止更新新功能了)
![](https://airing.ursb.me/images/blog/20240925/20240922114859@2x.png)

- **Stats**，状态栏展示设备 CPU、内存、网络、磁盘、电源灯信息。

- **Bartender 5**，也属于 Mac 必装软件了，可以控制状态栏展示。

- **RunCat**，用小猫猫的状态来表示 CPU 的状态，挺可爱的。

- **Vimac**，使用 Vim 快捷键控制 Mac。

- **NinjaMouse**，配合 Vimac 使用，切软件的时候会自动把鼠标指针挪到激活窗口的正中间。

- **Input Source Pro**，切换软件时自动切换输入法，做研发时很常用，如切到 IDE 或终端时自动切英文输入法，而切到文档或者企业微信时则自动切中文输入法。

- **微信输入法**，非常好用的输入法。

- **AltTab**，软件切换工具。

- **Hookmark**，配合 Drafts 使用，方便做任意书签的笔记。

- **Geekbench 6**，本机性能测试软件。

- **AlDente**，电源充放电管理软件，可以更精准的、个性化的控制电源策略。

- **Tencent Lemon**，硬盘清理软件，小巧实用。

- Paste，比较知名的剪切板软件，特点是支持移动端、优秀的检索能力，缺点是价格较贵、竞品也较多。

- [Raycast](https://www.raycast.com/)，入了 Raycast Pro + GPT 4 扩展包，最常用的功能是 HotKey 快捷打开软件 、AI Chat 与 Clipboard History。下面是一些常用的插件：

**AI Chat & Quick AI**，电脑上一键呼出 AI，这就显得微软的 Copilot 独立按键很蠢了。
- **AI Command**，根据自定义的预制 Prompt 执行复制的文本，一般我会让它提取 CI 结果中关键的信息，然后生成我需要的配置；或者让它格式化压缩 JSON；分析堆栈信息；英汉互译等等。
- **Clipboard History**，之前入过 Rewind，发现完全没有必要，直接 Clipboard History 效率更高
- **My IP**，研发原因经常要看内网 IP，快捷键直接查看+复制。
- **Google Search**，因为 Arc 默认搜索设置成了 Perplexity，当明确想用 Google 搜索的时候会按下这个快捷键。
- **QR Code Generator**，工作原因有时需要 URL 转二维码，这个就很实用，不需要打开浏览器利用插件或三方工具转。
- **Todoist**，配合 Todoist 使用，可以在状态栏或弹窗显示今日任务。
- **Format JSON**，有了 AI Command 之后这个插件很少用了。
- **Linear**，配合 Linear 使用。
- **Scrcpy**，配合 Scrcpy 使用。

![](https://airing.ursb.me/images/blog/20240925/Pasted%20image%2020240922115130.png)
