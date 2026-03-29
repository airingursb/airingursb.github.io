---
title: "Flutter 异常处理方案——灰度与降级"
date: 2021-02-18
tags: ["tech"]
description: ""
---

## 1. Flutter 异常概述

关于 Flutter 异常类型与捕获的文章网上已经有许多了，本文不再详细赘述，此处仅做个小结以保证文章的完整性。

Flutter 异常具体可分为以下几类：

- Dart 异常
   - App 异常
      - 同步异常
      - 异步异常
   - Framework 异常
- Engine 异常

所谓 Dart 异常，根据来源又可以细分为 App 异常和 Framework 异常，而 App 异常指的是。根据异常代码的执行时序，App 异常可以分为两类，即同步异常和异步异常：

- 同步异常可以通过 try-catch 机制捕获
- 异步异常则需要采用 Future 提供的 catchError 语句捕获

而在 Flutter 中提供了 Zone.runZoned 方法，在 Dart 中，Zone 表示一个代码执行的环境范围，类似于沙盒，可以使用其提供的 onError 回调函数来拦截所有未被捕获的异常。因为无论是同步异常还是异步异常都可以被拦截到，所以我们经常在 runApp 层来捕获所有的 App 异常。

```dart
runZoned<Future<Null>>(() async {
  runApp(MyApp());
}, onError: (error, stackTrace) async {
 //Do sth for error
});
```

所谓 Framework 异常，一般是[Widget 在 build 时抛出的](https://github.com/flutter/flutter/blob/master/packages/flutter/lib/src/widgets/framework.dart#L4579)，其中默认的 ErrorWidget 就是开发时报错的红屏页面，它也支持被重写。

业务中，我们可以通过注册 `FlutterError.onError` 的回调来拦截 Flutter framework 外抛的异常：

```dart
FlutterError.onError = (FlutterErrorDetails details) {
	reportError(details.exception, details.stack);
};
```

所谓 Flutter Engine 异常，以 Android 为例就是 libflutter.so 发生错误，对应到 iOS 就是 Flutter.framework 发生错误，这部分的错误我们直接交给平台侧崩溃收集的 SDK 来处理，比如 firebase crashlytics、bugly 等，后文再详解。

## 2. 灰度策略

出于对线上业务的敬畏和某些运营要求，为了保障运营的稳定性，对于线上的 Flutter 业务，我们也需要提供一套较为完备的灰度策略和降级方案。首先，本小节中先谈谈灰度策略。

灰度的逻辑流程较为简单：配置灰度策略——后台下发配置&客户端加载配置——客户端处理配置。

### 2.1 灰度策略配置

我们在内部的配置平台上定义了一些 Flutter 灰度所需要的配置字段，具体包括：

- `key`：对应的 Flutter 页面（route）
- `appkey`：该配置对应的宿主 App
- `minVersion`：最小生效版本
- `maxVersion`：最大生效版本
- `type`：灰度策略，具体包括尾号灰度，地域灰度，设备禁用，系统禁用，混合模式，白名单模式等，其中白名单模式出于测试考虑，混合模式则是支持配置各种策略取并集生效。
- `action`：生效范围，如全量生效，全量不生效，灰度生效等。
- `url`：降级的链接，支持参数替换符写法，客户端能够将 Flutter route 的入参拼接成 url query parameters。

### 2.2 后台下发与客户端加载配置

冷热启动都会拉配置，考虑到失败会有3次重试，本地会维护一份单例，在业务侧要打开 Flutter 页面时都需要检查灰度配置，来决定是否打开 Flutter 页面。 当然为了拉配置时防止 3 次重试都失败了，发版的时候本地会存一份各 Flutter 页面的降级配置 Map，极端场景下，会自动开启降级。

### 2.3 客户端处理配置

在业务侧要打开 Flutter 页面时都需要检查灰度配置，来决定是否打开 Flutter 页面。若判断非灰度，即命中降级，则拉配置的降级链接，配好 url 参数后使用 WebView 打开降级后的 H5。

需要注意的是，我们目前的业务基本都是 H5 改 Flutter，所以默认都有降级版本，而且降级版本的可靠性是可以保证的。对于未来只上 Flutter 的新业务，我们也正在预研 Flutter Web 的同构方案。

## 3. 降级方案

我们需要及时的降级来保证 Flutter 业务的可靠性，灰度和降级其实本质上都是来区分业务是使用 Flutter 还是 H5，只是前者是手动配置的，后者是自动生效的。在本地会维护根据 App 版本来维护一份降级配置，打开页面前会检查是否需要降级。有以下几种需要及时降级的场景：

### 3.1 未命中灰度降级

如前文所述，若业务方配置了灰度策略配置，在未命中灰度降级的场景下打开对应的 Flutter 页面，该页面需要降级并做上报。

### 3.2 框架异常降级

如果捕获到 Flutter Framework 异常，则将该页面置为「需要降级」，提供自定义的 ErrorWidget 提醒用户页面出错需要重新进入，之后在用户下次进入该页面时触发降级，定向到 H5 页面。

而对于 Dart 异常，由于Dart 采用事件循环的机制来运行任务，所以各个任务的运行状态是互相独立的。也就是说发生异常只会导致当前任务后续的代码不会被执行，用户仍可以继续使用页面中的其他功能，影响面不会太大，此处没有去强制降级处理，仅仅做了错误上报。

### 3.3 引擎崩溃降级

但如果是引擎发生了错误必定会导致 App Crash，这种情况下不仅需要上报日志，也会置好标志位，在用户下次打开 App 时不再启动 Flutter Engine，并全量降级 Flutter 所有页面。

### 3.4 产物加载失败降级

技术上我们使用了定制引擎并做了 Flutter 产物裁剪，每次发版时 App.framework 中会存一份对应的减包 zip 的 md5 值，在用户首次启动 App 时会下载减包产物再去启动引擎，之后校验产物完整性无问题后，定制引擎再去加载减包产物。但是存在着产物下载失败的情况，除了阶段性重试以外，这种情况也不能启动 Flutter Engine，并做所有页面的全量降级并上报。

### 3.5 Flutter 相关崩溃降级

除此以外，我们也遇到过 Flutter 导致的崩溃，不属于引擎崩溃也不是产物加载问题，也不是 Flutter 异常，仅仅是 Flutter Plugin 的问题，如插件原生侧的实现逻辑问题导致的崩溃，这也属于 Flutter 相关崩溃，但是在 Bugly 上报的日志中无法找到 Flutter 字样，因为程序退出时并非中断在 Flutter 内部或者引擎侧。

对于这种情况，我们会记录崩溃或 ANR 上报时的 topViewController 并溯源路径，如果当前路由栈内存在 Flutter Activity 或者 FlutterViewController，保险起见，发生崩溃依然降级。

## 4. 运营日报

Flutter 运营日报数据源为性能上报和异常上报。而至于崩溃的监控和告警，我们则交给了客户端的 Bugly 来处理了。日报记录了各 Flutter 页面在不同 App 版本的表现情况，有以下几个指标供读者参考：

- pv
- 访问成功率
- Crash 率，Crash 影响用户数
- 秒开率（300ms界限）
- 降级率，灰度率
- ……

最后，结合产物动态加载与降级策略的启动流程图如下所示：

![启动流程图](https://airing.ursb.me/image/flutter-start-flowchart-bg.png)

## 参考文章

- [Flutter 中的异常处理 | Flutter 开发者](http://flutter.link/2020/07/01/Flutter%E4%B8%AD%E7%9A%84%E5%BC%82%E5%B8%B8%E5%A4%84%E7%90%86/)
- [捕获 flutter app 的崩溃日志并上报 | Yrom's](https://yrom.net/blog/2019/07/05/dump-crash-log-for-flutter/#Flutter-App-%E4%BB%A3%E7%A0%81%E5%BC%82%E5%B8%B8%E6%8D%95%E8%8E%B7)

