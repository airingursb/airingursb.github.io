---
title: "Flutter 核心原理与混合开发模式"
date: 2020-06-30
tags: ["tech"]
description: ""
---

在 「Fan 直播」的 Flutter 混合开发实践中，我们总结了一些 Flutter 混合开发的经验特此分享。本文将从 Flutter 原理出发，详细介绍 Flutter 的绘制原理，借由此来对比三种跨端方案；之后再进入第三篇章 Flutter 混合开发模式的讲解，主要是四种不同的 Flutter 混合模式的原理分析；最后简单分享一下混合工程的工程化探索。


“唯有深入，方能浅出”，对于一门技术，只有了解的深入，才能用最浅显、通俗的话语描述出。在此之前，我写过一些 Flutter 的文章，但性质更偏向于学习笔记与源码阅读笔记，因此较为晦涩，且零碎繁乱。本文作为阶段性的总结，我尽可能以浅显易懂的文字、循序渐进地来分享 Flutter 混合开发的知识，对于关键内容会辅以源码或源码中的关键函数来解读，但不会成段粘贴源码。源码学习的效果主要在于自身，所以若对源码学习感兴趣的，可以自行阅读 Framework 与 Engine 的源码，也可以阅读我过往的几篇文章。

好了，那废话不多说，直接开始吧！

## 1. Flutter 核心原理

### 1.1 Flutter 架构

![flutter 架构](https://airing.ursb.me/image/flutter/flutter架构.png)

> 注：此图引自 [Flutter System Overview](https://flutter.dev/docs/resources/technical-overview)


传统惯例，只要说到 Flutter 原理的文章，在开头都会摆上这张图。不论讲的好不好，都是先摆出来，然后大部分还是靠自行领悟。因为这张图实在太好用了。

摆出这张图，还是简单从整体上来先认识了一下什么是 Flutter，否则容易陷入“盲人摸象”的境地。

Flutter 架构采用分层设计，从下到上分为三层，依次为：Embedder、Engine、Framework。

1. **Embedder**：操作系统适配层，实现渲染 Surface 设置、线程设置等。
2. **Engine**：实现 FLutter 渲染引擎、文字排版、事件处理、Dart 运行时等功能。包括了 Skia 图形绘制库、Dart VM、Text 等，其中 Skia 和 Text 为上层接口提供了调用底层渲染和排版的能力。
3. **Framework**：是一个用 Dart 实现的 UI SDK，从上之下包括了两大风格组件库、基础组件库、图形绘制、手势识别、动画等功能。

至于更多详情，这张图配合源码食用体验会更好。但由于本文不是源码解析，所以这个工作本文就不展开了。接下来，我会以 Flutter 绘制流程为例，来讲解 Flutter 是如何工作的。这也能更好地帮助你理解源码的思路。

### 1.2 Flutter 绘制原理

Flutter 绘制流程总结了一下大体上如下图所示：

![flutter-render.png](https://airing.ursb.me/image/flutter/flutter-render.png)

首先是用户操作，触发 Widget Tree 的更新，然后构建 Element Tree，计算重绘区后将信息同步给 RenderObject Tree，之后实现组件布局、组件绘制、图层合成、引擎渲染。

作为前置知识，我们先来看看渲染过程中涉及到的数据结构，再来具体剖析渲染的各个具体环节。

### 1.3 Flutter 渲染过程中的数据结构

![Data Model](https://airing.ursb.me/image/flutter/data-model.png)

渲染过程中涉及到的关键的数据结构包括三棵树和一个图层，其中 RenderObject 持有了 Layer，我们重点先看一下三棵树之间的关系。

举个栗子，比如有这么一个简单的布局：

![布局](https://airing.ursb.me/image/flutter/布局.png)

那么对应的三棵树之间的关系如下图所示：

![三棵树](https://airing.ursb.me/image/flutter/三棵树.png)

#### 1.3.1 Widget Tree

![Widget Tree](https://airing.ursb.me/image/flutter/Widget-tree.png)

第一棵树，是 Widget Tree。它是控件实现的基本逻辑单位，是用户对界面 UI 的描述方式。

需要注意的是，**Widget 是不可变的（immutable）**，当视图配置信息发生变化时，Flutter 会重建 Widget 来进行更新，以数据驱动 UI 的方式构建简单高效。

那为什么将 Widget Tree 设计为 immutable？Flutter 界面开发是一种响应式编程，主张“simple is fast”，而由上到下重新创建 Widget Tree 来进行刷新，这种思路比较简单，不用额外关系数据更变了会影响到哪些节点。另外，Widget 只是一个配置是数据结构，创建是轻量的，销毁也是做过优化的，不用担心整棵树重新构建带来的性能问题。

#### 1.3.2 Element Tree

![Element Tree](https://airing.ursb.me/image/flutter/element-tree.png)

第二棵树，Element Tree。它是 Widget 的实例化对象（如下图，Widget 提供了 `createElement` 工厂方法来创建 Element），持久存在于运行时的 Dart 上下文之中。它承载了构建的上下文数据，是连接结构化的配置信息到最终完成渲染的桥梁。

之所以让它持久地存在于 Dart 上下文中而不是像 Widget 重新构建，**因为 Element Tree 的重新创建和重新渲染的开销会非常大，**所以 Element Tree 到 RenderObject Tree 也有一个 Diff 环节，来计算最小重绘区域。

![code](https://airing.ursb.me/image/flutter/code-3.png)

需要注意的是，Element 同时持有 Widget 和 RenderObject，**但无论是 Widget 还是 Element，其实都不负责最后的渲染，它们只是“发号施令”，真正对配置信息进行渲染的是 RenderObject。**


#### 1.3.3 RenderObject Tree

![RenderObject Tree](https://airing.ursb.me/image/flutter/RenderObject-tree.png)


第三棵树，RenderObject Tree，即渲染对象树。RenderObject 由 Element 创建并关联到 `Element.renderObject` 上（如下图），它接受 Element 的信息同步，同样的，**它也是持久地存在 Dart Runtime 的上下文中，是主要负责实现视图渲染的对象。**

![code](https://airing.ursb.me/image/flutter/code-2.png)

RenderObject Tree 在 Flutter 的展示过程分为四个阶段：

1. 布局
2. 绘制
3. 合成
4. 渲染

其中，布局和绘制在 RenderObject 中完成，Flutter 采用深度优先机制遍历渲染对象树，确定树中各个对象的位置和尺寸，并把它们绘制到不同的图层上。绘制完毕后，合成和渲染的工作则交给 Skia 处理。

那么问题来了，为什么是三棵树而不是两棵？为什么需要中间的 Element Tree，由 Widget Tree 直接构建 RenderObject Tree 不可以吗？


理论上可以，但实际不可行。因为如果直接构建 RenderObject Tree 会极大地增加渲染带来的性能损耗。因为 Widget Tree 是不可变的，但 Element 却是可变的。**实际上，Element 这一层将 Widget 树的变化做了抽象（类似 React / Vue 的 VDOM Diff），只将真正需要修改的部分同步到 RenderObject Tree 中，由此最大程度去降低重绘区域，提高渲染效率。**可以发现，Flutter 的思想很大程度上是借鉴了前端响应式框架 React / Vue。

![对比](https://airing.ursb.me/image/flutter/对比虚拟dom.png)

此外，再扩展补充一下 VDOM。我们知道，Virtual DOM 的几个优势是：

1. **Diff 算法，保证操作尽可能少的 DOM 节点**。这里在 Flutter 的 Element Tree 中体现了出来。
2. **UI 声明式编程，代码可维护性强**。这一点在 Dart 声明式编写 UI 组件的时候可以体现出来。
3. **将真实的节点抽象出来，可以方便实现跨平台**。这一点在 Flutter 侧没有体现，因为 Flutter 本身就是跨端的自绘引擎。但换个思路，我们构建 Element 的 Widget Tree 能否不用 Dart 构建，专用其他支持运行时编译的语言构建（如 JavaScript），那这样不就可以实现动态化了吗？是的，目前 MXFlutter 就是以这种思路来实现动态化的。

#### 1.3.4 Layers

![layers](https://airing.ursb.me/image/flutter/layers.png)


最后，看看 Layer，它依附于 RenderObject（通过 `RenderObject.layer` 获取），是绘图操作的载体，也可以缓存绘图操作的结果。Flutter 分别在不用的图层上绘图，然后将这些缓存了绘图结果的图层按照规则进行叠加，得到最终的渲染结果，也就是我们所说的图像。

![code](https://airing.ursb.me/image/flutter/code-4.png)

如上图代码所示，Layer 的基类上有两个属性 `_needsAddToScene` 和 _`subtreeNeedsAddToScene`，前者表示需要加入场景，后者表示子树需要加入场景。通常，只有状态发生了更新，才需要加入到场景，所以这两个属性又可以直观理解为「自己需要更新」和「子树需要更新」。

Layer 提供了 `markNeedsAddToScene()` 来把自己标记为「需要更新」。派生类在自己状态发生变化时调用此方法把自己标记为「需要更新」，比如 ContainerLayer 的子节点增删、OpacityLayer 的透明度发生变化、PictureLayer 的 picture 发生变化等等。

### 1.4 Flutter 绘制流程拆解

绘制流程分为以下六个阶段：

1. Build
2. Diff
3. Layout
4. Paint
5. Composite
6. Render

抛开 Diff 和 Render 我们本文不讲解，因为这两部分稍稍繁琐一些，我们来关注下剩下的四个环节。

![绘制流程](https://airing.ursb.me/image/flutter/绘制流程.png)

> 注：此流程图出自 [复杂业务如何保证Flutter的高性能高流畅度？| 闲鱼技术](https://zhuanlan.zhihu.com/p/134024247)，可以较为清晰的表达 Flutter 核心的绘制流程了。

#### 1.4.1 Build

执行 build 方法时，根据组件的类型，存在两种不同的逻辑。

我们知道，Flutter 内的 Widget 可以分为 StatelessWidget 与 StatefulWidget，即无状态组件与有状态组件。

所谓 StatelessWidget，就是它 build 的信息完全由配置参数（入参）组成，换句话说，**它们一旦创建成功就不再关心、也不响应任何数据变化进行重绘。**

![StatelessWidget](https://airing.ursb.me/image/flutter/stateless.png)

所谓 StatefulWidget，除了父组件初始化时传入的静态配置之外，还要处理用户的交互与内部数据变化（如网络数据回包）并体现在 UI 上，这类组件就需要以 State 类打来 Widget 构建的设计方式来实现。它由 State 的 build 方法构建 UI， 最终调用 `buildScope` 方法。其会遍历 `_dirtyElements`，对其调用 rebuild/build。

![StatefulWidget](https://airing.ursb.me/image/flutter/stateful.png)

> 注：以上两图出自 [《Flutter 核心技术与实战 | 陈航》](https://time.geekbang.org/column/article/108576)

#### 1.4.2 Layout

只有布局类 Widget 会触发 layout（如 Container、Padding、Align 等）。

每个 RenderObject 节点需要做两件事：

1. 调用自己的 performLayout 来计算 layout
2. 调用 child 的 layout，把 parent 的限制传入

![code](https://airing.ursb.me/image/flutter/carbon%20(14).png)

如此递归一轮，每个节点都受到父节点的约束并计算出自己的 size，然后父节点就可以按照自己的逻辑决定各个子节点的位置，从而完成整个 Layout 环节。

![layout](https://airing.ursb.me/image/flutter/layout.png)

#### 1.4.3 Paint

渲染管道中首先找出需要重绘的 RenderObject，如果有实现了 CustomPainter 则调用 CustomPainter paint 方法
再调用 child 的 paint 方法；如果未实现 CustomPainter，则直接调用 child 的 paint。

在调用 paint 的时候，经过一串的转换后，`layer->PaintingContext->Canvas`，最终 paint 就是描绘在 Canvas 上。

![code](https://airing.ursb.me/image/flutter/code-paint.png)

#### 1.4.4 Composite

合成主要做三件事情：

1. 把所有 Layer 组合成 Scene
2. 通过 `ui.window.render` 方法，把 Scene 提交给 Engine。
3. Engine 把计算所有的 Layer 最终的显示效果，渲染到屏幕上。

![code](https://airing.ursb.me/image/flutter/carbon%20(15).png)

## 2. 跨端方案对比

跨端开发是必然趋势，从本质上来说，它增加业务代码的复用率，减少因为适配不同平台带来的工作量，从而降低开发成本。在各平台差异抹平之前，要想“多快好省”地开发出各端体验接近一致的程序，那便是跨端开发了。

总得来说，业内普遍认同跨端方案存在以下三种：

1. Web 容器方案
2. 泛 Web 容器方案
3. 自绘引擎方案

下面来一一讲解。

### 2.1 Web 容器

![跨端方案1](https://airing.ursb.me/image/flutter/跨端方案1.png)

所谓 Web 容器，即是基于 Web 相关技术通过浏览器组件来实现界面和功能，包括我们通常意义上说的基于 WebView 的 “H5”、Cordova、Ionic、微信小程序。

这类 Hybrid 开发模式，只需要将开发一次  Web，就可以同时在多个系统的浏览器组件中运行，保持基本一致的体验，是迄今为止热度很高的跨端开发模式。而 Web 与 原生系统之间的通信，则通过 JSBridge 来完成，原生系统通过 JSBridge 接口暴露能力给 Web 调用。而页面的呈现，则由浏览器组件按照标准的浏览器渲染流程自行将 Web 加载、解析、渲染。

这类方案的优点：简单、天然支持热更新、生态繁荣、兼容性强、开发体验友好。

当然，缺点也很明显，否则就没有后面两个方案什么事了，主要是体验上的问题：

1. 浏览器渲染流程复杂，页面需要在线加载，体验受限于网络。所以 Web 存在白屏时间（PWA 例外）、且**交互上体验上与原生体验有着非常非常明显区别。**
2. 双端需要分别实现 JSBridge 接口，且 JSBridge 的通信效率一般。

### 2.2 泛 Web 容器

![跨端方案2](https://airing.ursb.me/image/flutter/跨端方案2.png)

所以轮到泛 Web 容器方案出场了，代表性框架是 React Native，Weex，Hippy。

- **它放弃了浏览器渲染，而采用原生控件，从而保证交互体验；**
- **它支持内置离线包，来规避加载耗时避免长时间白屏；**
- **它依然采用前端友好的 JavaScript 语言，来保证开发体验。**

在跨端通信上，React Native 依然通过 Bridge 的方式来调用原生提供的方法。

这套方案理想是美好的，但现实确实骨感的，它在实践下来之后也依然发现了问题：

1. 直接调用原生控件虽然提升了体验和性能，但是**不同端相同的原生控件的渲染结果是存在差异的，跨端的差异需要巨大的工作量来抹平。**
2. **Bridge 的通信效率一般，在需要高频通信的场景下会造成丢帧。**

### 2.3 自绘引擎

那我们究竟能不能既简单地抹平差异，又同时保证性能呢？


答案是可以，那就是自绘引擎。不调用原生控件，我们自己去画。那就是 Flutter。好比警察问 React Native 嫌疑犯长什么样子，React Native 只能绘声绘色地去描绘嫌疑犯的外观，警察画完之后再拿给 React Native 看，React Native 还要回答像不像；但 Flutter 自己就是一个素描大师，它可以自己将嫌疑犯的画像画好然后交给警察看。这两者的效率和表现差异，不言而喻。

1. **其通过 Skia 图形库直接调用 OpenGL 渲染，保证渲染的高性能，同时抹平差异性。**
2. **开发语言选择同时支持 JIT 和 AOT 的 Dart**，保证开发效率的同时，较 JavaScript 而言，更是提升了数十倍的执行效率。

![跨端方案3](https://airing.ursb.me/image/flutter/跨端方案3.png)

通过这样的思路，Flutter 可以尽可能地减少不同平台之间的差异, 同时保持和原生开发一样的高性能。并且对于系统能力，可以通过开发 Plugin 来支持 Flutter 项目间的复用。所以说，Flutter 成了三类跨端方案中最灵活的那个，也成了目前业内受到关注的框架。

至于通信效率，Fluter 跨端的通信效率也是高出 JSBridge 许许多多。Flutter 通过 Channel 进行通信，其中：

1. BasicMessageChannel，用于传递字符串和半结构化的信息，是全双工的，可以双向请求数据。
2. MethodChannel，**用于传递方案调用**，即 Dart 侧可以调用原生侧的方法并通过 Result 接口回调结果数据。
3. EventChannel：**用户数据流的通信**，即 Dart 侧监听原生侧的实时消息，一旦原生侧产生了数据，立即回调给 Dart 侧。

其中，MethodChannel 在开发中用的比较多，下图是一个标准的 MethodChannel 的调用原理图：

![MethodChannel](https://airing.ursb.me/image/flutter/MethodChannel.png)

但为什么我们说 Channel 的性能高呢？梳理一下 MethodChannel 调用时的调用栈，如下图所示：

![通信效率](https://airing.ursb.me/image/flutter/通信效率.png)

可以发现，整个流程中都是机器码的传递，而 JNI 的通信又和 JavaVM 内部通信效率一样，整个流程通信的流程相当于原生端的内部通信。但是也存在瓶颈。我们可以发现，**methodCall 需要编解码，其实主要的消耗都在编解码上了，因此，MethodChannel 并不适合传递大规模的数据。**

比如我们想调用摄像头来拍照或录视频，但在拍照和录视频的过程中我们需要将预览画面显示到我们的 Flutter UI中，如果我们要用 MethodChannel 来实现这个功能，就需要将摄像头采集的每一帧图片都要从原生传递到 Dart 侧中，这样做代价将会非常大，因为将图像或视频数据通过消息通道实时传输必然会引起内存和 CPU 的巨大消耗。为此，Flutter 提供了一种基于 Texture 的图片数据共享机制。

Texture 和 PlatformView 不在本文的探讨范围内，这里就不再深入展开了，有兴趣的读者可以自行查阅相关资料作为扩展知识了解。

那接下来，我们就进入本文的第三篇章吧，Flutter 混合开发模式的探索。

## 3. Flutter 混合开发模式

### 3.1 混合模式

Flutter 混合工程的结构，主要存在以下两种模式：

1. 统一管理模式
1. 三端分离模式

![两种混合模式](https://airing.ursb.me/image/flutter/两种混合模式.png)


所谓统一管理模式，就是一个标准的 Flutter Application 工程，而其中 Flutter 的产物工程目录（`ios/` 和 `android/` ）是可以进行原生混编的工程，如 React Native 进行混合开发那般，在工程项目中进行混合开发就好。但是这样的缺点是当原生项目业务庞大起来时，Flutter 工程对于原生工程的耦合就会非常严重，当工程进行升级时会比较麻烦。因此这种混合模式只适用于 Flutter 业务主导、原生功能为辅的项目。但早期 Google 未支持 Flutter Module 时，进行混合开发也只存在这一种模式。

后来 Google 对混合开发有了更好的支持，除了 Flutter Application，还支持 Flutter Module。所谓 Flutter Module，恰如其名，就是支持以模块化的方式将 Flutter 引入原生工程中，**它的产物就是 iOS 下的 Framework 或 Pods、Android 下的 AAR，原生工程就像引入其他第三方 SDK 那样，使用 Maven 和 Cocoapods 引入 Flutter Module 即可。**从而实现真正意义上的三端分离的开发模式。

### 3.2 混合栈原理

![混合栈](https://airing.ursb.me/image/flutter/混合栈.png)


为了问题的简洁性，我们这里暂时不考虑生命周期的统一性和通信层的实现，而除此之外，混合导航栈主要需要解决以下四种场景下的问题：

1. Native 跳转 Flutter
2. Flutter 跳转 Flutter
3. Flutter 跳转 Native
4. Native 跳转 Native

#### 3.2.1 Native 跳转 Flutter

Native -> Flutter，这种情况比较简单，Flutter Engine 已经为我们提供了现成的 Plugin，即 iOS 下的 FlutterViewController 与 Android 下的 FlutterView（自行包装一下可以实现 FlutterActivity），所以这种场景我们直接使用启动了的 Flutter Engine 来初始化 Flutter 容器，为其设置初始路由页面之后，就可以以原生的方式跳转至 Flutter 页面了。

![code](https://airing.ursb.me/image/flutter/code-1.png)

#### 3.2.2 Flutter 跳转 Flutter

Flutter -> Flutter，业内存在两种方案，后续我们会详细介绍到，分别是：

1. 使用 Flutter 本身的 Navigator 导航栈
2. 创建新的 Flutter 容器后，使用原生导航栈

#### 3.2.3 Flutter 跳转 Native 

Flutter -> Native，需要注意的时，这里的跳转其实是包含了两种情况，一是打开原生页面（open，包括但不限于 push），二是回退到原生页面（close，包括但不限于 pop）。

![flutter->native](https://airing.ursb.me/image/flutter/flutter-native.png)

如上图，这种情况相对复杂，我们需要使用 MethodChannel 让 Dart 与 Platform 侧进行通信，Dart 发出 open 或 close 的指令后由原生侧执行相应的逻辑。

#### 3.2.4 Native 跳转 Native 

Native -> Native，这种情况没有什么好说的，直接使用原生的导航栈即可。

### 3.3 混合模式

为了解决混合栈问题，以及弥补 Flutter 自身对混合开发支持的不足，业内提出了一些混合栈框架，总得来说，离不开这四种混合模式：

1. Flutter Boost 为代表的类 WebView 导航栈
2. Flutter Thrio 为代表的 Navigator 导航栈
3. 多 Engine 混合模式
4. View 基本的混合模式

下面，一一来谈谈它们的原理与优缺点。

#### 3.3.1 Flutter Boost

Flutter Boost 是闲鱼团队开源的 Flutter 混合框架，成熟稳定，业内影响力高，在导航栈的处理思路上没有绕开我们在 3.2 节中谈及的混合栈原理，但需要注意的是，当 Flutter 跳转 Flutter 时，它采用的是 new 一个新的 FlutterViewController 后使用原生导航栈跳转的方式，如下图所示：

![flutter boost](https://airing.ursb.me/image/flutter/flutterboost.png)

这么做的好处是使用者（业务开发者）操作 Flutter 容器就如同操作 WebView 一样，而 Flutter 页面就如同 Web 页面，逻辑上简单清晰，将所有的导航路由逻辑收归到原生侧处理。如下图，是调用 open 方法时 Flutter Boost 的时序图（关键函数路径），这里可以看到两点信息：

1. 混合导航栈的逻辑主要包括原生层、通信层、Dart 层。
2. Flutter Boost 的 open 方法实现逻辑相对简单。

![flutter boost open 时序图](https://airing.ursb.me/image/flutter/flutter-boost时序图.png)


但是它也有缺点，就是每次打开 Flutter 页面都需要 new 一个 ViewController，**在连续的 Flutter 跳转 Flutter 的场景下有额外的内存开销**。针对这个问题，又有团队开发了 Flutter Thrio。

#### 3.3.2 Flutter Thrio

上面我们说到，Flutter 跳转 Flutter 这种场景 Flutter Boost 存在额外的内存开销，故哈啰出行团队今年4月开源了 Flutter Thrio 混合框架，其针对 Flutter Boost 做出的最重要的改变在于：Flutter 跳转 Flutter 这种场景下，Thrio 使用了 Flutter Navigator 导航栈。如下图所示：

![flutter thrio](https://airing.ursb.me/image/flutter/flutter-thrio.png)


在连续的 Flutter 页面跳转场景下，内存测试图表如下：

![内存增量](https://airing.ursb.me/image/flutter/内存增量2.png)

从这张图表中我们可以得到以下几点信息：

1. 红色区域是启动 Flutter Engine 的内存增量，基本接近 30MB，Flutter Engine 是一个比较重的对象。
2. FlutterViewController 带来的内存增量普遍在 12~15MB 左右。

可见，在这种场景下，Thrio 还是做出了一定的优化的。但与之带来的，就是实现的复杂性。我们谈到 Flutter
Boost 的优点是简单，路由全部收归原生导航栈。而 Flutter Thrio 混用了原生导航栈和 Flutter Navigator，因此实现会相对更复杂一下。这里我梳理了一下 Flutter Thrio open 时关键函数路径，可以看到，Thrio 的导航管理确实是复杂了一些。

![thrio 时序图](https://airing.ursb.me/image/flutter/thrio时序图.png)


#### 3.3.3 多 Engine 模式

以上我们谈及的两种混合框架都是单引擎的，对应的，也存在多引擎的框架。在谈多引擎之前，还是需要先介绍一下关于 Engine、Dart VM、isolate 几个前置知识点。

在第一篇章中我们没有涉及到 Engine 层的源码分析，而着重篇幅去讲解 Framework 层的原理，一是为了第一章的连贯性，二是此处也会单独说到 Engine，还是最好放在此时讲解会更便于记忆与理解。

##### Dart VM、Engine 与 isolate

（a）Dart 虚拟机创建完成之后，需要创建 Engine 对象，然后会调用 `DartIsolate::CreateRootIsolate()` 来创建 isolate。
（b）每一个 Engine 实例都为 UI、GPU、IO、Platform Runner 创建各自新的 Thread。
（c）isolate，顾名思义，内存在逻辑上是隔离的。
（d）isolate 中的 code 是按顺序执行的，任何 Dart 程序的并发都是运行多个 isolate 的结果。当然我们可以开启多个 isolate 来处理 CPU 密集型任务。

根据 (a) 我们可以推出：**(1) 每个 Engine 对应一个 isolate 对象，即 Root Isolate**。
根据 (b) 我们可以推出：**(2) Engine 是一个比较重的对象**（前文也有所提及）。
根据 (c) 和 (1) 我们可以推出：**(3) Engine 与 Engine 之间相互隔离**。
根据 (d) 和 (3) 我们可以推出：**(4) Engine 没有共享内存的并发，没有竞争的可能性，不需要锁，也就不存在死锁问题。**

好啦，记住这四个结论，我们再来看看 window。

##### Window

window 是绘图的窗口，也是连接 Flutter Framework（Dart）与 Flutter Engine（C++）的窗口 (5)。

从类的定义上来看，window 是连接 Framework 与 Engine 的窗口。在 Framework 层，window 指的是 `ui.window` 单例对象，源码文件是 window.dart。而在 Engine 层，源码文件是 window.cc，两者交互的 API 很少，但是一一对应：

![code](https://airing.ursb.me/image/flutter/carbon%20(19).png)

![code](https://airing.ursb.me/image/flutter/carbon%20(18).png)

可以发现，这些主要是 Framework 层调用 Engine 层中 Skia 库封装后的相关 API。那就不得不说说它的第二层含义——作为绘图的窗口。

从功能上来看，在界面绘制交互意义上，window 也是绘图的窗口。在 Engine 中，绘图操作输出到了一个 `PictureRecorder` 的对象上；在此对象上调用 `endRecording()` 得到一个 `Picture` 对象，然后需要在合适的时候把 `Picture` 对象添加（add）到 `SceneBuilder` 对象上；调用 `SceneBuilder` 对象的 `build()` 方法获得一个 `Scene` 对象；最后，在合适的时机把 `Scene` 对象传递给 `window.render()` 方法，最终把场景渲染出来。

![window](https://airing.ursb.me/image/flutter/window.png)

> 该图出自：[Flutter Framework 源码解析（ 1 ）—— 开篇和绘图引擎的用法](https://xieguanglei.github.io/blog/post/flutter-code-chapter-01.html)

实例代码如下：

![code](https://airing.ursb.me/image/flutter/carbon%20(17).png)

##### 多 Engine 模式

综上，根据（1）（3）（5）我们可以得出下图的多引擎模式：

![多 engine 模式](https://airing.ursb.me/image/flutter/多engine模式.png)

它有以下几个特征：

1. **App 内存在多个引擎**
2. **每个引擎内有若干个 FlutterVC**
3. **Engine 与 Engine 之间是隔离的**

根据这三个特征，我们可以设想一下其通信层的实现，假设存在两个引擎，每个引擎内又存在两个 FlutterVC，每个 FlutterVC 内又存在两个 Flutter 页面，那这种场景下的跳转就会变得非常复杂（下图出自 Thrio 开源仓库中的README）：

![多 engine 模式](https://airing.ursb.me/image/flutter/多engine模式2.png)

所以显而易见的，我们不可否认 Engine 之间的逻辑隔离带来了模块间天然的隔离性，但是问题也有许多：

首先如上图所示，**通信层设计会异常复杂**，而且通信层的核心逻辑依然是需要放在原生侧来实现，如此便一定程度上失去了跨端开发的优势。

其次，我们反复提到 Engine 是一个比较重的对象，启动多个 Flutter Engine 会导致**资源消耗过多**。


最后，由于 Engine 之间没有共享内存，这种天然的隔离性其实弊大于利，在混合开发的视角下，一个 App 需要维护两套缓存池——原生缓存池与 DartVM 所持有的缓存池，但是随着开启多 Engine 的介入，后者缓存池的资源又互不相通，**导致资源开销变得更加巨大**。

为了解决传统的多 Engine 模式所带来的这些问题，又有团队提出了基于 View 级别的混合模式。

#### 3.3.4 View 级别的混合模式

基于 View 级别的混合模式，核心是为每个 window 加入 windowId 的概念，以便它们去共享同一份 Root Isolate。我们刚才说到，一个 isolate 具有一个 `ui.window` 单例对象，那么只需要做一点修改，把 Flutter Engine 加入 ID 的概念传给 Dart 层，让 Dart 层存在多个 window，就可以实现多个 Flutter Engine 共享一个 isolate 了。

如下图所示：

![View 级别的混合模式](https://airing.ursb.me/image/flutter/多view模式.png)

这样就可以真正实现 View 级别的混合开发，**可以同时持有多份 FlutterViewController，且这些 FlutterVC 可以内存共享**。

那缺点也比较明显，我们需要对 Engine 代码做出修改，**维护成本会很高**。其次，多 Engine 的资源消耗问题在这种模式下也是需要通过对 Engine 不断裁剪来解决的。


## 4. 工程化探索

### 4.1 编译模式

Dart 天然支持两种编译模式，JIT 与 AOT。

#### 4.1.1 JIT 与 AOT

所谓 JIT，Just In Time，即时编译/运行时编译，在 Debug 模式中使用，可以动态下发和执行代码，但是执行性能受运行时编译影响。

![JIT](https://airing.ursb.me/image/flutter/JIT.png)

所谓 AOT，Ahead Of Time，提前编译/运行前编译，在 Release 模式中使用，可以为特定平台生成二进制代码，执行性能好、运行速度快，但每次执行都需要提前编译，开发调试效率低。

![AOT](https://airing.ursb.me/image/flutter/AOT.png)


#### 4.1.2 Debug、Release、Profile

对应的 Flutter App 存在三种运行模式：

- Debug
- Release
- Profile

![运行模式](https://airing.ursb.me/image/flutter/运行模式.png)

因此，我们可以看出，在开发调试过程中，我们需要使用支持 JIT 的 Debug 模式，而在生产环境中，我们需要构建包为支持 AOT 的 Release 模式以保证性能。

那么，这对我们的集成与构建也提出了一定的要求。

### 4.2 集成与构建

所谓集成，指的是混合项目中，将 Flutter Module 的产物集成到原生项目中去，存在两种集成方式，区别如下：

![源码集成 vs 产物集成](https://airing.ursb.me/image/flutter/两种集成.png)

可以发现源码集成是 Flutter dev 分支需要的，但是产物集成是 Flutter dev 以外的分支需要的。在这里，我们的混合项目需要同时支持两种不同的集成工程，在 Flutter dev 分支上进行源码集成开发，然后依赖抽取构建产物发布到远程，如 iOS 构建成 pods 发布到 Cocoapods 对应的仓库，而 Android 构建成 AAR 发布到 Maven 对应的云端。于是，其他分支的工程直接 gradle 或者 pod install 就可以更新 Flutter 依赖模块了。

![构建](https://airing.ursb.me/image/flutter/构建.png)

当然，我们说到运行模式存在 Debug、Release、Profile 三种，其对应的集成产物也会区分这三种版本，但由于产物集成无法调试，集成 Debug 版本和 Profile 版本没有意义，因此依赖抽取发布时只需要发布 Release 版本的产物就好。

### 4.3 工作流

在整套「Fan 直播」Flutter 混合项目搭建之后，我们形成了一套初具雏形的 Flutter 工作流。在未来，我们也会不断完善 Flutter 混合开发模式，积极参与到 Flutter 的生态建设中去。

![Flutter 工作流](https://airing.ursb.me/image/flutter/工作流.png)

> 扩展阅读：
> [Flutter 混合开发模式探索](https://zhuanlan.zhihu.com/p/133477746)
> [Flutter Boost 混合开发实践与源码解析](https://zhuanlan.zhihu.com/p/111783390)
