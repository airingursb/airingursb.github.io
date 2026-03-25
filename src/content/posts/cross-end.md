---
title: "大厂自研跨端框架技术揭秘"
date: 2023-02-25
tags: ["tech"]
description: ""
---

## 导言
本文将围绕跨端框架技术的主题，分析其技术目标和 3 种演进方向，接着揭秘业内的自绘跨端方案的技术实现——包括 Kun、WebF、TDF、Weex 2.0、Waft 与 MiniX 等方案，分析各自的特点与不足，总结跨端框架的研发思路与技术要点，最终分享对跨端框架发展趋势的思考。

分享过程中，会穿插介绍跨端框架的脚本引擎的选型与技术难点、业内各跨端框架各自的困境、分享 Debugger 原理以及一核多生态的工程化思路。

大纲如下：

- 跨端框架的技术目标（略）
- 跨端框架的技术方向
- 跨端框架的技术揭秘
- 跨端框架的技术要点
- 跨端框架的发展趋势（略）

> 注 1：本文系线下分享的文字总结版，将省略前情提要、技术背景（如第1节、第5节）与部分技术细节的扩展（如第3-4节部分内容），仅保留核心内容。

> 注 2：本文材料源于 GMTC 大会跨端主题的公开分享、部分企业的公开微信公众号文章、框架公开源代码与个人历史分享素材，其余内部分享与内部框架等材料做脱敏处理。

## 跨端框架的技术方向
我略微总结了一下，跨端框架有以下 4 种技术方向。

### 方向 1：基于 WebView 的增强
基于 WebView 的增强是一个偏前端往客户端方向靠拢的技术方向，即上层生态依然使用 Web 技术，但是需要依靠客户端对 WebView 做一些能力补充。

比如：

- Ionic、Cordova 等 Hybrid 框架。
- 业内一众基于 WebView 的小程序。
- Sonic 等客户端预加载 WebView 资源的方案。
- App 厂商针对 Web 做的离线包方案。

这类框架都有这几个特点：

- 基于 WebView 渲染，但补充了一些原生能力增强
- 开发生态基于 Web 前端生态（严格来说，小程序也是）
- 想方设法增强 Web 的用户体验

### 方向 2：基于 DSL 的 Native 增强
基于 DSL 的 Native 增强属于偏客户端但往前端方向靠拢的技术方向，即开发生态基于 Native，但是框架设计上参考了 WebView 的一些特性。这些框架总体上都是自定义了 DSL 来实现跨端与动态化的。

比如手淘的无障碍框架 DinamicX、美团的 MTFlexbox、阿里的 [Tangram](http://tangram.pingguohe.net/)(七巧板)。

浏览这些框架的文档可以发现，它们的设计比较像 React Native，只是上层需要开发者使用 DSL 来接入组件。

### 方向 3：代码共享
代码共享是终端的开发方案，目前业内熟知的方案是 KMM（Kotlin Multiplatform Mobile），通过 K2 编译器将 kotlin 源码编译成各个平台的目标代码，从而实现跨端。具体而言，kotlin 通过编译器前端生成带有语义信息的 FIR，之后 FIR 交给各个平台的编译器后端来进行优化和生成，如 JVM/LLVM 等，最终生成各平台可执行的目标代码。

KMM 的工程结构也比较简单，包括跨端代码(Shared module)与壳工程(Android/iOS App)两部分组成。

![](https://airing.ursb.me/images/blog/20230225222623.png)目前来看这套方案在生成 iOS 代码时，对多线程的逻辑处理不是特别好，需要业务方优化。

### 方向 4：基于 GPL 的 Native 增强
基于 GPL 的 Native 增强我将其视为大终端的开发方案。所谓大终端是一个融合之后的产物，在早年 PC 时代，大家使用 .NET、JVM、Qt 来开发桌面应用，我们将其称为终端开发；随后进入移动端时代，Native 方向的客户端开发在不断追逐动态化之路，而跨平台方向的前端开发在不断追逐性能之路，这两条道路最终融合成如今这些跨端框架。无论是小程序、Flutter、DSL 开发框架、WASM 均属于融合演进的产物。

总结一下，方向 4 有以下几类方案：

- 原生渲染组件：如 React Native / Hippy 1.0 / Weex 1.0 等。
- 自绘引擎：Flutter。暂且将其单独算作一档。
- 基于 Flutter 的自绘框架：这里业内有诸多框架（曾整理过 20+ 框架），如 WebF(Kraken)，Kun，FMP，基于 Skyline 的小程序等等。
- 基于系统图形库（Skia / Vulkan / Metal / OpenGL）的自绘框架：这里业内也有不少框架，如 TDF，Hippy 3.0，Weex 2.0，Waft 等等。严格来说 Flutter 也属此类。

前 3 个方向以及第 4 个方向的前两类框架都是开源的，且业内也有不少文章介绍了它们的原理，这里就不赘述了。本文主要介绍第 4 个方向后两类框架的技术方案。

## 跨端框架的技术揭秘
本节将挑选几个有代表性的框架做技术揭秘：

- Kun
- WebF
- Weex 2.0
- TDF（需脱敏，略过）
- Waft
- MiniX（略）

之所以在芸芸框架中挑这几个，是因为他们的方案在领域细节中属于典型框架，可关注这些框架的应用开发体系、脚本引擎与渲染引擎的选型。

### Kun
Kun 是闲鱼基于 Flutter 开发的一个跨端框架，目前并未开源，网上能学习到的文章只有闲鱼公众号上发表的三篇文章。架构设计比较简单，虽然没有源码也能分析一二，架构图这里就不放了，有兴趣的同学可以自行点进文章了解。

Kun 的整体设计思路是基于 Flutter 开发一个 JS Runtime，开发者使用前端生态进行页面开发，JS 解释器作为胶水层会将源码翻译成 Flutter Widget，之后交给 Flutter Engine 做渲染。

JS 引擎他们采用了 QuickJS，但猜测应该是阿里内部的 QKing 引擎（基于 QuickJS）。

Debugger 支持 CDP，Test 基于 Flutter Golden test。

CSS 解析他们先使用 Yoga 做 polyfill，将样式处理成 css in js，之后解析模块挪用了 Kraken 的遗产 CSSLib，通过 Dart FFI 将 JS 测的内链样式传递给 Dart 侧做处理，最终解析成 Flutter Widget。

但是 CSS 的盒模型与文档流毕竟与 Flutter Widget 的样式标准格格不入，他们则采用了 Widget 拼接的方式，每一层 Widget 特定处理某类样式，最终通过层层套娃拼接的方式实现组件样式。如下图所示，这是一个 div element 所对应的拼接方式：

![](https://airing.ursb.me/images/blog/20230225222654.png)总结一下特点：

- 不支持完备的 W3C 标准（也不可能支持，比如 css in js 无法实现伪类），只支持各标准子集，包括：HTML 标签、CSS 样式集、WebAPI 标准
- 提供了一些定制的 Element 组件，由 Dart 侧实现，业务方也能使用 Dart 侧来开发一些定制的 Element。
- 组件的实现上采用 Widget 拼接的方式

本节参考资料：

- 大终端领域的新物种-KUN
- [三代终端容器 KUN 的首次大考【架构演进】](https://mp.weixin.qq.com/s/26SCEM6QPhAazydRUq9h3Q)
- 双十一｜探索KUN的加载性能与增强体验

### WebF
[WebF](https://github.com/openwebf/webf) 前身是阿里的 Kraken，后团队解散部分遗产交接给了 Kun，剩余同学出走在开源社区成立了 openwebf，将 Kraken 改名 WebF 继续维护。

这个是 WebF 的架构图：

![](https://airing.ursb.me/images/blog/20230225224007.png)可以看到与 Kun 不同的地方在于除了提供了 JSBinding 之外，团队还在 Flutter 的 Dart 侧做了一些开发，将 RenderObject 的能力做了丰富，以适应 W3C 标准——即在 Dart 层来实现 CSS，C++ 层实现 WebAPI，对标 W3C 标准。

脚本引擎依然是 QuickJS，但是目前做了一些[优化](https://github.com/openwebf/quickjs)，值得学习一波。

其实对比一下 Kun 和 WebF，我们可以发现他们对 CSS 的处理采用了两种不同的思路。

先说说 Kun 吧，它的方案存在几个问题：

- 一条渲染链路存在两次 Layout，这是完全没有必要的，而且 Layout 的更新频率本身也非常高，两次 Layout 会带来额外的性能开销
- Dart FFI 不足以支撑样式更新的信息传递，样式更新的数据量很大，会触及 FFI 的瓶颈
- 内联样式的开发体验不好，很多 CSS 的属性也会无法实现

那么 CSS 应该如何实现呢？有两种比较好的解法：

- CSS 在 Dart 层实现，样式更新依靠 RenderObject 的 Layout，无需走 FFI
- DOM 与 CSS 全使用 C++ 实现，剥离 Dart 层

解法 1 便是 WebF，解法 2 是后文的 Weex 2.0 与 TDF 等框架。

但解法 1 也存在技术难点，因为引入了 CSS 会导致 RenderObject Tree 难以维护，那么我们应该如何管理 RenderObject Tree？这也有两种思路：

- 把 RenderObject 做薄：即 Flutter Widget 做原子级渲染组件，不对 RenderObject 做修改，上层通过组合 RenderObject 来实现复杂功能和样式。就像 Kun 那样。
- 把 RenderObject 做厚：集成大量的布局渲染能力于一身，上层通过样式表驱动 RenderObject 渲染。

显而易见的，把 RenderObject 做厚会是更好的方案，因为前者复杂度太高（看前面那段层层嵌套的代码也可以直观感受到），每个样式规则的计算都需要一层一层检查推断，导致维护效率下降。

因此，这里我比较看好 WebF 的方案，并且 WebF 也是目前众多跨端框架中唯一一个拥抱开源的方案，呼吁有兴趣的同学加入 [TSC](https://github.com/openwebf/webf/blob/main/GOVERNANCE.zh-CN.md) 一起共建。

本节参考资料：

- [https://github.com/openwebf/webf](https://github.com/openwebf/webf)
- 晟怀：《WebF 是如何高性能实现 Flutter + Web 融合》（2022 QCon）

### Weex 2.0
Weex 2.0 是阿里内部开源的跨端方案，目前基本上实现了阿里内部的一核多生态体系。技术架构上完全推倒 1.0 重新研发，期间他们也走了不少探索之路。从分享来看，整套方案比较完备，工作量也很大。

这个是 Weex 2.0 的结构图：

![](https://airing.ursb.me/images/blog/20230225225458.png)重点介绍一下这几个组件：

- WeexAbility：容器和能力扩展，URL 拦截、缓存、基础 API、三方扩展等。
- WeexFramework：通用基础框架。封装页面实例，实现 DOM、CSSOM、WebAPI 标准，解耦脚本引擎和渲染引擎。
- QKing：脚本引擎，基于 QuickJS 的魔改。
- Unicorn：自绘渲染引擎。实现 CSS 能力，包括完整的节点构建、动画、手势、布局、绘制、合成、光栅化渲染管线，可跨平台。
- WeexUIKit：原生 UI 渲染引擎，封装了原生组件。

2.0 源码产物和前几个框架一样是基于 jsbundle 打出来的 bytecode，但是编译做了一些 SSA 的优化，此外 JS 运行时也做了许多优化，全链路使用 C++开发，没有额外的通信开销、没有冗余的抽象、链路更短，同时基于自研的 Unicorn，有着精简布局算法、精细的操控手势和动画，直通系统图形库。整套方案与 1.0 毫无关系，解决了 1.0 的跨语言通信问题、双端渲染差异问题、布局算法问题、脚本执行效率问题。

基于 Weex 2.0，阿里解决了烟囱式方案的问题，基于多核同构的内核，推动了基础能力的统一，以此来支持差异化的业务场景：

![](https://airing.ursb.me/images/blog/20230225230055.png)本节参考资料：

- 门柳：《淘宝新一代自绘渲染引擎的架构与实践》（2023 GMTC）

注：腾讯的 TDF 也在致力于类似的工作，此处脱敏不再介绍。

### Waft
Waft 全称 WebAssembly Framework for Things，是天猫精灵团队基于 WebAssembly Runtime 与 Skia 开发的一套自绘框架，没有开源。虽然它目前没有实现框架，只支持 AIoT 的场景，但是原理上是可以跨端的，因此放在这里介绍下，以开阔思路。

天猫精灵早期在 AIoT 上有过一些尝试，最开始做 Android App，但无奈运存太低，只有几百兆，所以性能受限；后续他们开发了云应用，效果虽然还可以，但是服务器成本太高，被叫停；于是继续探索端渲染的道路，研发了 Waft。

这个是 Waft 的架构图：

![](https://airing.ursb.me/images/blog/20230225230654.png)他们也重新设计了加载流程和渲染流程：

![](https://airing.ursb.me/images/blog/20230225230717.png)可见整体工作量比较大，并且也不契合前端标准和生态。

这里脚本引擎选型 WebAssembly 他们提供了一张对比图：

![](https://airing.ursb.me/images/blog/20230225230748.png)这里我对这个脚本引擎的选型是存疑的，想了想有以下不足之处（也可能他们内部有其他考量）：

- fib 的用例太简单，无法充分发挥 JS 引擎的优势
- AOT 来对比解释执行，是明显不公平
- QuickJS 应该用的原始版本，它还有很大的优化空间
- 用力也没有去对比其他有 JIT 模式的引擎，比如 V8 和 JSCore 这些
- 这里没有说明使用了什么 wasm 的框架，因为不同 wasm 的实现性能表现是不同的，有的侧重于解释执行的效率，有的则侧重于 AOT / JIT 的效率

Waft 本身也有的问题，期待他们后续能优化：

- CSS 仅支持部分子集
- W3C 标准（DOM Elememt、WebAPI）实现欠缺
- 包体积可能偏大，这部分先存疑

所以目前的 Waft 的实现也决定了应用场景，暂且只能支持简单的 IoT 页面。

参考资料：

- 聂鑫鑫：《Waft：基于 WebAssembly 和 Skia 的 AIoT 应用开发框架》（2023 GMTC）

## 跨端框架的技术要点
### 动态化
介绍了以上框架，可以总结下跨端框架的应用场景：

- 动态化
- IoT
- Desktop
- 车机
- 一核多生态

所谓“没有动态化能力的跨端技术是没有灵魂的”，其实我们也可以发现动态化框架和跨端框架很多部分其实是完全重叠的，我之前总结过动态化的五种实现思路：

- 基于 WebView 的增强
- 基于 DSL 的 Native 增强
- 基于 GPL 的 Native 增强
- 插件化（Android）
- 利用 OC 运行时动态化特性（iOS）

我还画了一张图来补充说明：

![](https://airing.ursb.me/images/blog/20230225231814.png)> 注：这张图我画的比较早，其实左上角可以换成 “Flutter 与其他自绘框架”。

他们的核心其实都是要在 Runtime 期间加载可执行代码，并调用。可以发现前三个动态化的思路和我们总结的跨端框架的技术方向是一模一样的。

技术要点个人以为有以下几点：

- 脚本引擎
- 渲染引擎
- 调试器
- 工程化

一一来介绍。

### 脚本引擎
脚本引擎的选型思路有以下三个：

- JS 引擎：仅用于胶水语言，对 JIT 不强依赖
- Dart VM：主要是为了利用 Flutter Engine 来渲染，因此使用 Dart 生态
- WARM: 需要设计 DSL 和实现渲染引擎，完善整个生态

如果选择 JS 引擎，那么也有以下几个选型思路：

- 使用双引擎：即各端使用自己的优势引擎，Android 使用 V8，引入 j2v8 即可，而 iOS 使用 JSCore 则完全无包增量。但可惜的是直接使用 JSCore 无法开启 JIT。
- 使用 Hermes 单引擎：Meta 为 React Native 这类 Hybrid 框架专门开发的脚本引擎，开箱即用。
- 使用 QuickJS 单引擎：大神开发的 JS 引擎，胜在体积极小，性能优秀。
- 使用自研 JS 引擎：基本上业内都是基于 QuickJS 做优化的。

小结了一下 QuickJS 目前存在一些问题：

- 没有 JIT，这个按需实现吧，有 JIT 虽然执行效率上了一个数量级，但是作为胶水语言而言看重的不是这些。JIT 会导致冷启动耗时增加、内存占用变大、体积变大，而且 iOS 还不能用。
- 手动 GC，难以管理和维护，可优化
- 缺失行号记录
- 缺失 Debugger，目前 github 有一些开源插件实现了
- 缺少 code cache
- 缺少 inline cache
- 缺少内存泄露检测能力
- Bytecode 有许多优化的空间

### 渲染引擎
渲染引擎选型思路有二：

- 基于 Flutter Engine
- 基于系统图形库，如 Skia / OpenGL / Metal / Vulkan

不管基于啥，框架的整体思路都是精简管线，并使用同步光栅化。

### 调试器
Debugger 一种可以让 JavaScript Runtime 进行中断，并可以实时查看内部运行状态的应用，是提供开发者使用的工具，作为框架而言必不可少。

目前主要有三种调试协议，刚才介绍的框架都至少实现了其中一种：

- CDP: Chrome DevTools Protocol
- DAP: Debug Adapter Protocol
- 自建协议：微信小程序早期就是自建协议

### 工程化方案
工程化至少包括以下工作：

- 资源加载方案
- 降级处理
- 版本管理
- 研发模式

这里之前 Q 音开发的 Kant 在工程化上有过详细的设计与实现，此处不展开说了。

## 总结
自绘框架常遇到的问题与解题思路：

- 开发体验差：生态使用前端生态，即提供 JS Runtime；需要提供 Debugger；IDE 需要支持语言服务。
- 文档写的不好：写好文档。
- CSS 能力不够用：对齐标准；如果 Dart 侧实现 CSS，需要把 RenderObject 做厚。
- 样式和 H5 不一样：堆测试用例，配合 WPT 验证
- Android 和 iOS 不一致：利用已有资源，可基于 Flutter
- 组件太少，没有生态：对齐 W3C 标准，尽可能完备
- JS 执行性能差：自研 JS 引擎
- 不够标准，无法复用社区库：对齐 W3C 标准，尽可能完备

值得学习的一些经验：

- 标准至上
- 提供丰富的文档
- 少自研，合理利用已有资源
- 开发体验很重要
- 关注低端机表现

## 参考资料与扩展阅读

- PPT(已脱敏): [https://weekly.ursb.me/slide/cross-end/](https://weekly.ursb.me/slide/cross-end/)
- 门柳：《淘宝新一代自绘渲染引擎的架构与实践》（2023 GMTC）
- 聂鑫鑫：《Waft：基于 WebAssembly 和 Skia 的 AIoT 应用开发框架》（2023 GMTC）
- 晟怀：《WebF 是如何高性能实现 Flutter + Web 融合》（2022 QCon）
- 吉丰：《大终端领域的新物种-KUN》
- [openwebf/WebF](https://github.com/openwebf/webf/pull/227/files)
- Airing：《Kant 在「QQ 音乐」的实践》（未公开）
- Airing：《Flutter 动态化方案》（未公开）
