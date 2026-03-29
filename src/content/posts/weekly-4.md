---
title: "周刊（第4期）：个人博客演变史"
date: 2022-05-27
tags: ["weekly"]
description: ""
---

## 个人博客演变史
熟悉我的朋友都知道我记录的会比说的多，很多人觉得言语比文字更有力量和情感，而我却不这么觉得。情感是真情的投入，和呈现载体无关。这篇周刊，我想谈谈我个人博客的演进记录。

**第一阶段：Wordpress**

2014 年上半年接触编程，之后想搭建个人网站来承载 QQ 空间上的文章，上小学中学时 QQ 空间上写了蛮多东西的。之后淘到了 ursb.me 这个域名，因为那会应该舍友之间经常会对骂“你是 s* 吗?”，结果一搜还真有这个域名。因此，这四个有含义字母组成的域名，对我来说弥足珍贵。

之后域名提交备案，然后搞了个“虚拟空间”搭建个人网站（对，当时叫虚拟空间，其实就是和别人同租一台服务器，用户只有某个目录的权限），第一版博客用的框架是 Wordpress，花了很多时间折腾了贼多插件，结果半年过去了文章一篇也没写。

![](https://airing.ursb.me/image/blog/20220527231246.png)**第二阶段： Hexo**

反思了一下不能这么搞，于是 2015 年由繁入简，改用 Hexo + GitHub Pages 去部署博客，那段时间基本上周更写了蛮多内容的。但折腾劲一点儿也没有消退，还是搞了很多网站分析和评论的插件，这个静态网页的秒开想必也好不到哪去。折腾了这么多，结果一看站点分析，其实根本没有人评论也没有人阅读，pv 少的可怜，那点 pv 还基本都是我自己点的。饶是如此，我还是坚持在更新，没有有人也没关系，重点在于记录。

> 2014-2016 的具体经历可以看 [从 WordPress 到 Hexo：ursb.me——个人博客折腾笔记](https://zhuanlan.zhihu.com/p/61714125) （PS. 这篇文章已经 out 了，2017 年又改了技术方案）

**第三阶段： Typecho**

直到 2017 年，我一直用的评论插件 “多说” 停止服务了，之后转用难用的网易云评论，结果没两个月也停止服务了。如果用国外的服务，又会影响读者的评论。之后思来想去，找个了轻量级的动态框架 typecho 来搭建新博客——也就是现在的 [Airing 的小屋](https://me.ursb.me)。

![](https://airing.ursb.me/image/blog/20220527231211.png)老博客近百篇文章没有迁移到新博客，仅存留本地了。新博客目标是不再灌水，记录之上输出自己的思考，所以更新频率很慢，基本上 1-2 个月才有更新，上班之后更新的就更慢了，毕竟平时工作写的技术方案也不可能发表到博客上。

新博客技术文的评论区冷冷清清，但是 pv 其实和非技术文是差不多的、甚至更高，可能开发者都喜欢白嫖吧。有时候搜 Flutter 的问题，结果发现搜索结果中的第一篇文章就是自己写的，那种成就感还是挺满的。

**第四阶段： Typecho + Hugo**

但其实非技术文并不要求那么高的严谨性，如果控制发文的质量反而会减少产出，减少记录的频率，迷失记录本身的目的。因此前段时间开始启动周刊项目（具体可见 [WJ.1: 开刊，为什么写周刊](https://weekly.ursb.me/posts/weekly-1/)），也希望自己能用输出倒逼输入。因此用 Hugo 简单弄了个静态网页才存下周刊的文件，同时同步发下公众号：

![](https://airing.ursb.me/image/blog/20220527231119.png)前两天重构下的个人首页 [Hi, folks | Airing](https://ursb.me)，它同时指向了我新搭建的 [Airing Weekly](https://weekly.ursb.me/) 和  [Airing 的小屋](https://me.ursb.me)。

![](https://airing.ursb.me/image/blog/20220527231137.png)在搭建 Airing Weekly 的时候使用了 Hugo 和一些 PaaS，工作日晚上忘记了时间折腾到一点多，折腾的时候才发现原来 Web 前端 还是这么有意思。回想起来，这份折腾的初心也恰我当年决定选这个岗位就业的原因呀！

## 每周推荐
### 技术：Web 浏览器原理解密
四篇 Chrome 开发者官网上关于浏览器原理的讲解，图文并茂、深入浅出，值得学习。

- [Inside look at modern web browser (part 1) - Chrome Developers](https://developer.chrome.com/blog/inside-browser-part1/)
- [Inside look at modern web browser (part 2) - Chrome Developers](https://developer.chrome.com/blog/inside-browser-part2/)
- [Inside look at modern web browser (part 3) - Chrome Developers](https://developer.chrome.com/blog/inside-browser-part3/)
- [Inside look at modern web browser (part 4) - Chrome Developers](https://developer.chrome.com/blog/inside-browser-part4/)

### 技术：触发 Reflow/Repaint/Composite 的样式
上周偶然间看到的一个报告——《 [CSS Triggers](https://csstriggers.com/)》，记录了各主流浏览器内核（Blink、Gecko、WebKit、EdgeHTML）会触发回流、重绘、合成的样式。

这里可以发现不同内核针对不同样式的处理是存在差异的：

![](https://airing.ursb.me/image/blog/20220527223520.png)

### 小说：《恶意》
上周日二刷了《恶意》，即便是二刷仍然惊叹于其独特的写作手法与峰回路转的剧情发展。

在不剧透的前提小结一下写作手法的创新点：

- **书信式第一人称自述**：融入大量细节与心理描写，代入感强。全程推理紧贴我们读者前文看到的内容，并在最后来一脚绝杀，以至于被绝杀之后仍沉浸于剧情中回味不穷。
- **交叉递进式的书信推动剧情**：剧情推动依然靠书信的交替，交替时会承接上文文末的内容，所以并不突兀。然而每封书信的内容里皆在合理的前提下有着巨大的剧情转变，紧扣心弦，不断激发着读者的好奇心。
- **杀人不是目的，而是手段**：聪明的读者可以很快推理出凶手，甚至于 1/4 篇幅时就抓住了凶手。但杀人动机的推理才是本篇的核心内容，先抓凶手再推理杀人动机，在推理小说中不常见，其中夹杂了嫌疑人的心机诡计，这让被害人的死亡并不是“结束”，而是“开始”。

### 纪实：《桶川跟踪狂杀人事件》
看之前未曾想到纪实文可以写的比电影还惊心动魄、剧情比小说还跌宕起伏，而恰恰是纪实文，对被害人的遭遇才更有共情、对现实的无奈更感愤懑；而正因为是纪实，我才更加钦佩于作者这样的记者，胸怀正义地投入事业，在黑暗的现实里永远追逐光芒。

### 番剧：《间谍过家家》
最近逢人就安利《Spy x Family》，剧中一家三口设定立体、各有萌点，三者身份的冲突，混合在一起之后奇迹般的爆发出魔法般的效果，轻松、诙谐，又带点小温暖。

![](https://airing.ursb.me/image/blog/20220527222729.png)扩展阅读：[【影评】间谍过家家：日常与非日常的二重奏](https://www.bilibili.com/read/cv16616137?from=category_4)

### 先行者（Pioneers）思想
1970 年代的先行者思想的三个要点：

- 放大想象力（Amplify Imagination） ——Alan Kay
- 增强智力（Augment Intellect）——Douglas Engelbart
- 让思想不限于载体（Expand our Thoughts far beyond text on paper） ——Ted Nelson

前两点也是我很看重的，而第三点我没有特别多的感觉，应该指的是要懂得从书本之外会获取知识。

如果要我写三点：

- 知识
- 敏感
- 想象力
