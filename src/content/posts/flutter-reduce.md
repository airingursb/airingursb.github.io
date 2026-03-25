---
title: "Flutter 产物分析与减包方案"
date: 2021-05-01
tags: ["tech"]
description: ""
---

在混合开发场景下，Flutter 的包增量略大一直是被大家诟病的一点，但 Google 官方明确表示了 Flutter 不会支持动态化，而且目前 Flutter SDK 官方还没有提供一套定制方案。因此想要瘦身，那么只能自己动手丰衣足食了。

所谓减包，前提条件是必须知道产物内容有什么？产物里有哪些部分可以减？被减掉的部分我们要怎么加回来？因此本文将围绕“产物分析”与“减包方案”两个主题来分别论述 iOS 与 Android 两端的 Flutter 减包原理与方案。

那么，先从 iOS 端开始吧。

> 注：本文数据与代码片段均来源于一个基于 Flutter 1.17.1 的 Flutter Module 在 Release（AOT Assembly）Mode 下构建后的产物，未经过任何压缩。

## 1. iOS 篇
### 1.1 产物构成
我们知道使用 `flutter build ios-framework` 即可将一个 Flutter  Module 构建成一个 Framework 供 iOS 宿主集成，这种集成方式我们称之为产物集成，这么这个“产物”就是 Flutter 产物，它包含以下几个部分组成：

- App.framework
App: 这个是 Dart 业务代码 AOT 的产物
- flutter_assets: Flutter 静态资源文件

- Flutter.framework
Flutter: Flutter Engine 的编译产物
- icudtl.dat: 国际化支持数据文件

打出产物之后，我们在终端可以显示各个部分的体积，最后整理一下 iOS 端 Flutter 产物结构如下图所示：

![](https://airing.ursb.me/image/blog/media/16185655225058/16185655375361.jpg)> 需要注意的是 Mac Finder 中显示的体积会偏大，其换算倍率是 1000 而非 1024，需要我们用命令行拿到显示的体积之后再手动计算得到真实体积。

> 此外，Engine 产物的体积我们选用的是 profile 模式（arm64+arm32）下的体积，因 Flutter 1.17.1 release 存在 bug，bitcode 无法被压缩，导致体积有 351.47 MB，影响分析。具体原因可见：[Flutter app size is too big · Issue #45519](https://github.com/flutter/flutter/issues/45519)。

### 1.2 减包方案
减包的基本方法有二：

- 删产物：把产物中没用的部分直接删掉
- 挪产物：把可以暂时移除的部分挪走改变为远端下发，同时需要修改产物加载逻辑，使 Flutter 支持动态加载远端下发的部分产物

我们针对前文中总结的产物结构一一来实现产物减包，首先是 App.framework 中的 App 部分。

1.2.1 App.framework/App
在说方案之前，我们先看看 App.framework 下的 App 是如何构建而来的，如下图所示：

![](https://airing.ursb.me/image/blog/media/16185655225058/16185657344614.jpg)首先，frontend_server 会将 Dart 源码编译成一个中间产物 dill，我们通过运行以下命令也可以实现通过的编译效果：

![](https://airing.ursb.me/image/blog/media/16185655225058/16185657004699.jpg)app.dill 是二进制字节码，我们通过 string app.dill 可以发现它其实就是 Dart 代码合并之后的产物：

![](https://airing.ursb.me/image/blog/media/16185655225058/16185657078713.jpg)而 Dart 在开发模式下提供的 Hot Reload 其实也正是通过将变动的代码通过 frontend_server 编译得到新增的 kernel（app.dill.incremental.dill），通过 WS 提交给 Dart VM Update 之后来进行整棵树的 Rebuild，从而实现 Hot Reload。

![](https://airing.ursb.me/image/blog/media/16185655225058/16185657144650.jpg)之后会通过两个平台侧的 gen_snapshot 进行编译得到 IL 指令集和优化代码，最后输出汇编产物。汇编产物通过 xcrun 工具得到单架构的 App 产物，最后经过 lipo 得到最后双 ARM 架构的 App 产物。所以，我们这里展示的 App.framework 下的 App 的体积是双架构的。

> ARMv7: iPhone 5s 之前的 iOS 设备。
> ARM64: iPhone 5s 及其之后的 iOS 设备。

接着，我们从删产物和挪产物两个层面来讲解如何减少该产物的体积。

删产物
![](https://airing.ursb.me/image/blog/media/16185655225058/16185655686811.jpg)这部分体积是 Dart 代码 AOT 之后的产物，体积较大，是我们减包过程中重点关照对象。

按照之前说的减包基本方法，我们首先试试“删产物”，看看有什么可以直接删掉的，使用 Flutter 提供的体积分析工具可以直接得到体积图：

![](https://airing.ursb.me/image/blog/media/16185655225058/16185656005975.jpg)我们发现确实有两个库业务中没有用到，直接删掉依赖即可。

除此之外还有一些优化，可以帮助我们减少代码体积：

- 配置 linter 来禁止不合理的语法：如显示类型转换等，编译前会追加大量的 try catch 导致代码体积变大。
- 混淆 Dart 代码： **0.75MB** (2.5%) ↓

此外，我们还可以删除一些符号来达到减包效果

- 不使用堆栈跟踪符号：**1.8MB** (6.2%) ↓
- 删除 dSYM 符号表信息文件：**5.8MB** (20%) ↓

> 注：dSYM 是保存 16 进制函数地址映射信息的中转文件，包含我们调试的 symbols，用来分析 crash report 文件，解析出正确的错误函数信息。

挪产物
接着，我们再看看如何实现“挪产物”，那就需要对 App.framework/App 中的内容做具体分析了。我们之前说它是 Dart 代码 AOT 之后的产物，没错，因为它主要由四个 AOT 快照库（snapshot）组成：

- **kDartIsolateSnapshotData**: Isolate 快照数据，这是 Dart 堆的初始状态，并包含 isolate 专属的信息。
- **kDartIsolateSnapshotInstructions**: Isolate 快照指令，包含由 Dart isolate 执行的 AOT 指令。
- **kDartVmSnapshotData**: Dart VM 快照数据，isolate 之间共享的 Dart 堆的初始状态。
- **kDartVmSnapshotInstructions**: Dart VM 快照指令，包含 VM 中所有 Dart isolate 之间共享的通用例程的 AOT 指令。

> 详情可以看官方 Wiki 中的介绍：[https://github.com/flutter/flutter/wiki/Flutter-engine-operation-in-AOT-Mode](https://github.com/flutter/flutter/wiki/Flutter-engine-operation-in-AOT-Mode)

同一个进程里可以有很多个 Isolate，但两个 Isolate 的堆是不能共享的。Dart VM 开发团队早就考虑到了交互的问题，于是就设计了一个 VM Isolate，它是运行在 UI 线程中 Isolate 之间交互的桥梁。Dart VM 中 isolate 之间的关系如下图所示：

![](https://airing.ursb.me/image/blog/media/16185655225058/16185656246056.jpg)因此 isolate 对应的 AOT Snapshot 就是 kDartIsolateSnapshot，其又分为指令段和数据段；VM Isolate 对应的 AOT Snapshot 就是 kDartVmSnapshot，其也分为指令段和数据段。

根据以上分析，App.framework 的结构我们可以进一步拆分成下图所示：

![](https://airing.ursb.me/image/blog/media/16185655225058/16185656181856.jpg-h600.jpg)我们知道 **App Store 审核条例不允许动态下发可执行二进制代码**，因此对于以上 4 个快照，我们只能下发数据段的内容（kDartIsolateSnapshotData 与 kDartVmSnapshotData），而指令段的内容（kDartIsolateSnapshotInstructions 与 kDartVmSnapshotInstructions）则依然要留在产物里。

那么，我们要在哪里分离这个快照库呢？

在 Dart VM 启动时的数据加载阶段，如下图所示，修改 settings 里面快照库的读取路径即可：

![](https://airing.ursb.me/image/blog/media/16185655225058/16185657665316.jpg)修改之后的具体实现本文不做讲解，在 [《Q 音直播 Flutter 包裁剪方案 (iOS)》](https://mp.weixin.qq.com/s/mhObltbb3TKTUqb9Rs67-Q) 一文有详细的代码修改介绍。

1.2.2 App.framework/flutter_assets
![](https://airing.ursb.me/image/blog/media/16185655225058/16185657794868.jpg)flutter_assets 是 Flutter Module 中使用到的本地静态资源，对于这部分我们不可能“删”的只能“挪”，我们有两种方案来**挪产物**——常规方案依然是在 Dart VM 启动时的数据加载阶段来修改 settings 里的 flutter_assets 路径，来做到远程加载，常规情况下我们使用这种方式就可以移除 flutter_assets 了。

那么有没有什么方式可以不修改 Flutter Engine 的代码移除 flutter_assets？有的，可以使用 **CDN 图片 + 磁盘缓存 + 预加载**的组合方案实现同样的效果，步骤如下：

- 封装一个 Image 组件，根据编译模式选择使用本地图还是网络图，即开发环境下使用本地图快速开发，生产环境下使用 CDN 图。
- 改造 CI，持续集成时移除 flutter_assets 并发布包内的图片到 CDN 上。
- 扩展增强 Image 组件的能力，引入 cached_network_image，支持磁盘缓存。
- Flutter 模块加载时，使用 `precacheImage` 方法对 CDN 图片进行预加载。

这套方案稍显麻烦了一些，而且还要区分环境，因此还是建议修改 Flutter Engine 来实现远端加载 flutter_assets。

1.2.3 Flutter.framework/icudtl.dat
![](https://airing.ursb.me/image/blog/media/16185655225058/16185657968235.jpg)icudtl.dat 是国际化支持数据文件，不建议直接删掉，而是同上述**挪产物**的方案一样，在 Dart VM 启动时的数据加载阶段修改 settings 里的 icudtl.dat 路径（`icu_data_path`）来实现远端加载：

![](https://airing.ursb.me/image/blog/media/16185655225058/16186330520961.jpg)1.2.4 Flutter.framework/Flutter
![](https://airing.ursb.me/image/blog/media/16185655225058/16186330594150.jpg)引擎修改
这一部分是 Flutter Engine （C++）的编译后的二进制产物，是产物里占据体积最大的部分，目前我们参考字节跳动的分享[《如何缩减接近 50% 的 Flutter 包体积》](https://coffee.pmcaff.com/article/13376800_j)，可优化的部分目前有以下两点：

- **编译优化**
- **引擎裁剪**

Flutter Engine 使用 LLVM 进行编译，其中链接时优化（LTO）有一个 Clang Optimization Level 编译参数，如下图所示（在 buildroot 里）:

![](https://airing.ursb.me/image/blog/media/16185655225058/16186331071422.jpg)我们将这里 iOS 平台的 Engine 编译参数**从 -Os 参数改成使用 -Oz 参数**，最终可以减小 **700 KB** 左右体积。

![](https://airing.ursb.me/image/blog/media/16185655225058/16186331220668.jpg)而引擎裁剪也有两个部分可以裁剪：

- **Skia**: 去掉一些参数，在不影响性能的情况下可以减少 **200KB** 的体积。
- **BoringSSL**: 若使用客户端代理请求，则不需要 Dart HttpClient 模块，这部分可以完全移除，且代理请求会比 HttpClient 的性能更好，这部分可以减少 **500KB** 的体积

> 附: 在 [https://github.com/flutter/flutter/issues/40345](https://github.com/flutter/flutter/issues/40345) 中提及了另一个角度的编译优化，即函数编译优化。同一个加法函数，Dart 实现编译之后有 36 条指令，而 Objective-C 只有 11 条指令，36 条指令中有头部 8 条和尾部 6 条的对齐指令，是可以移除的，中间有 5 条栈溢出检查也是可以移除的，**即 Dart 编译后的 36 条指令可以优化成 13 条指令。**这里需要等 Google 官方来进行优化。

引擎编译
修改完之后我们需要编译引擎，首先先介绍一下 Flutter Engine 编译时需要用到的工具：

- gclient：源码库管理工具，原本是 chromium 使用的，它可以管理源码以及对应的依赖，通过 gclient 来获取编译需要所有源码和依赖。
- gn：负责生成 ninja 编译需要的 build 文件，特别像 Flutter 这种跨多种操作系统平台跨多种 CPU 架构的，就需要通过 gn 生成很多套不同的 ninja build 文件。
- ninja：编译工具，负责最终的编译工作。

> 编译工具介绍具体可见 Flutter 官方 Wiki：[Setting up the Engine development environment - Flutter wiki](https://github.com/flutter/flutter/wiki/Setting-up-the-Engine-development-environment)

具体编译分为三步，首先创建一个 .gclient 文件，来拉取源码和所有对应的依赖，如下图所示：

![](https://airing.ursb.me/image/blog/media/16185655225058/16186331302188.jpeg)第二步，执行 `gclient sync` 下载依赖。

需要注意的是以上几点修改都是依赖（如 buildroot，skia 等）而非源码，因此需要我们 fork 一份 flutter engine，然后先改好依赖之后，获取对应依赖的 commit 号再填进 engine 的 DEPS 文件里，之后提交代码之后获取 engine 仓库最新的 commit 号，填进 .gclient 文件中。

第三步，使用 ninja 配合 gn 生成的配置文件来编译 engine，想编译什么平台架构的 engine 就使用 gn 生成一份配置，之后 ninja 执行编译即可。如下图所示：

![](https://airing.ursb.me/image/blog/media/16185655225058/16186331505464.jpg)最终，我们就能得到若干份（不同平台架构）的定制 Engine，而使用它们也很简单，直接替换本地 Flutter SDK 中的 Engine 即可。

经过以上几步针对各个产物内容的减包处理，我们最终的产物架构如下图所示：

![](https://airing.ursb.me/image/blog/media/16185655225058/16186331663650.jpg)### 1.3 减包成效
iOS App 的体积查看分为以下几种方法，得到的大小都是不同的：

第一种方式是查看本地构建 ipa 之后的分析报告，分析报告里会提供两个体积，但是需要注意的是它们都是**未加密**的：

- 安装包体积：即未加密的，下载大小
- 解压后的体积：即未加密的，占用体积

但是上传 App Store 之后都是会加密的，因此想要知道用户最后看到的体积，需要上传 App Store 查看报告，这里的报告同样会提供两个体积，如下图所示：

![](https://airing.ursb.me/image/blog/media/16185655225058/16186332280907.jpg)分别是：

- Download Size
- Install Size

用户最后在 App Store 看到的是 Install Size。

> 注：但有一种情况例外，即使用 Web 浏览器登录 App Store 去查看 App 的体积，那个时候展示的体积的 Download Size，因为 Apple 认为你此刻关注的并不是安装占用体积。

我们使用空白项目作为宿主工程上传 App Store 查看 Install Size，发现 App 的体积**从 18.7MB 减少到了 11.8MB**。

## 2. Android 篇
Android 侧减包方案则较为简单，因为没有 App Store 的审核条例限制，可以粗暴地挪走全部产物并动态下发。我们依然从产物构成、减包方案、减包成效来看看 Android 侧的 Flutter 减包。

### 2.1 产物构成
首先我们来看看 Android 端 Flutter Module 产物（Release）编译流程，和 iOS 一样，依然是 Dart 源码与 Engine 两部分产物构成：

![](https://airing.ursb.me/image/blog/media/16185655225058/16186332656563.jpg)最终产物 flutter.gradle 里面包括了：

- libapp.so
- flutter.jar

其中，flutter.jar 又含有 libflutter.so，icudtl.dat 与一些 Java 文件，而 libflutter.so 即引擎产物，icudtl.dat 依然是国际化支持文件，最后一些 Java 是暴露给业务侧调用 Flutter 的接口。

那么关键产物构成如下表所示：

![](https://airing.ursb.me/image/blog/media/16185655225058/16186332751892.jpg)### 2.2 减包方案
libflutter.so 是引擎产物，我们依然可以做裁剪定制，但是必要性已经不大了，因为 Flutter 产物在 Android 端可以做到完全动态下发。步骤如下：

- 挪走 libapp.so，libflutter.so，flutter_assets 等文件，发布到云端
- 通过定制 flutter.jar 中的 FlutterLoader.java 逻辑，来加载自定义位置的库路径，从而实现动态加载

具体代码不再演示。

### 2.3 减包成效
使用空白工程作为宿主，测量减包前后 APK 的体积大小，可以发现 6.2MB 的 Flutter 产物体积可以完全减去。

![](https://airing.ursb.me/image/blog/media/16185655225058/16186337044440.jpg-375width.jpg)以上便是双端的 Flutter 减包方案，内容相对简单，都是参考前人的脚步来一步步实践得到的效果，因此强烈建议读者延伸阅读一下文末的两篇文章，以作为进一步学习来加深了解。

> 参考文章：

> 
> - [《Q 音直播 Flutter 包裁剪方案 (iOS)》](https://mp.weixin.qq.com/s/mhObltbb3TKTUqb9Rs67-Q)
> - [《如何缩减接近 50% 的 Flutter 包体积》](https://coffee.pmcaff.com/article/13376800_j)
>
