---
title: "Flutter 混合开发框架模式探索"
date: 2020-04-18
tags: ["tech"]
description: ""
---

由于 Google 官方提供的 Flutter 混合式开发方案过于简单，仅支持打开一个 Flutter View 的能力，而不支持路由间传参、统一的生命周期、路由栈管理等业务开发中必要的能力，因此我们需要借助第三方混合开发框架（如 Flutter Boost、Thrio、QFlutter 等）的整合能力才能将 Flutter 混合开发模式投入与生产环境。本文中，我们来研究一下这类混合开发框架的职能、架构与源码。



## 1. 核心职能与框架目标


![15867692757044.jpg](https://airing.ursb.me/image/blog/flutter-hybrid/1587271835471-a4231e7b-1562-4f22-8be9-31443ed39eca.jpeg)

一个合格的混合开发框架至少需要支持到以下能力：


1. 混合路由栈的管理：支持打开任意 Flutter 或 Native 页面。
2. 完善的通知机制：如统一的生命周期，路由相关事件通知机制。


对于以上几点目标，我们以 iOS 为例，来逐步挖掘 Flutter 混合开发模式的最佳实现。


> 注：因为篇幅问题，本文不探究 Android 的实现，从 iOS 切入只是分析问题的一个角度，因 Android 与 iOS 的实现原理一致，具体实现则大同小异。其次因 Channel 通信层代码实现比较繁杂，此文对于 Channel 通信层的讲解仅停留在使用层面上，具体实现读者可以自行研究。
> 注：本文的 Flutter Boost 版本为 1.12.13，Thrio 的版本为 0.1.0



## 2. 从 FlutterViewController 开始


在混合开发中，我们使用 Flutter 作为插件化开发，需要起一个 FlutterViewController，这是一个 UIViewController 的实现，其依附于 FlutterEngine，给 Flutter 传递 UIKit 的输入事件，并展示被 FlutterEngine 渲染的每一帧 Flutter views。而这个 FlutterEngine 则充当 Dart VM 和 Flutter 运行时的环境。


需要注意的是，一个 Flutter Engine 只能最多同时运行一个 FlutterViewController。


> FlutterEngine: The FlutterEngine class coordinates a single instance of execution for a FlutterDartProject. It may have zero or one FlutterViewController at a time.


启动 Engine：



```
self.flutterEngine = [[FlutterEngine alloc] initWithName:@"my flutter engine"];
[self.flutterEngine run];

```



创建 FlutterViewController 并展示



```
FlutterViewController *flutterViewController =
        [[FlutterViewController alloc] initWithEngine:flutterEngine nibName:nil bundle:nil];
[self presentViewController:flutterViewController animated:YES completion:nil];

```



创建一个 FlutterViewController 我们既可以用已经运行中的 FlutterEngine 去初始化，也可以创建的时候同时去隐式启动一个 FlutterEngine（不过不建议这样做，因为按需创建 FlutterEngine 的话，在 FlutterViewController 被 present 出来之后，第一帧图像渲染完之前，将会引入明显的延迟），这里我们用前者的方式去创建。


> FlutterEngine: https://api.flutter.dev/objcdoc/Classes/FlutterEngine.html
> FlutterViewController: https://api.flutter.dev/objcdoc/Classes/FlutterViewController.html


至此，我们通过官方提供的方案在 Native 工程中启动 Flutter Engine 并通过 FlutterViewController 展示 Flutter 页面。


在 Flutter 页面中，我们可以使用 Navigator.push 在打开另一个 Flutter 页面（Route）：


![image.png](https://airing.ursb.me/image/blog/flutter-hybrid/1587288531775-e5bf0b72-2914-4b1b-a7c3-c0fe7d893806.png)

因此对于这种路由栈我们很容易实现：


![image.png](https://airing.ursb.me/image/blog/flutter-hybrid/1587288108427-06b9a808-397a-454a-9ef3-5041074c64e7.png)

即整个 Flutter 运行在一个单例的 FlutterViewController 容器里，Flutter 内部的所有页面都在这个容器中管理。但如果要实现下面这种 Native 与 Flutter 混合跳转的这种混合路由栈，我们要如何实现呢？


![15867693180281.jpg](https://airing.ursb.me/image/blog/flutter-hybrid/1587272118213-2c50eb77-04db-4b8d-9da6-7088b151bf9a.jpeg)

最基本的解决思路是，把这个 FlutterViewController 与 NativeViewController 混合起来，直接让 FlutterViewController 在 iOS 的路由栈中来回移动，如下图所示：


![image.png](https://airing.ursb.me/image/blog/flutter-hybrid/1587287329547-8c87af32-4ebc-4063-a71c-6661ae9ba136.png)

这种方案相对复杂，回到我们上面混合栈的场景，这需要精准记录每个 Flutter 页面和 Native 容器所处的位置，得知道自己 pop 之后应该回到上一层 Flutter 页面，还是切换另一个 NativeViewController，这就得维护好页面索引，并改造原生的pop 时间与 Navigator.pop 事件，使两者统一起来。


我们来看看业界的一些解决方案吧！



## 3. Flutter Boost


对于混合栈问题，Flutter Boost 会将每个 Flutter 页面用 FlutterViewController 包装起来，使之成为多例，用起来就如同 Webview 一样：


![image.png](https://airing.ursb.me/image/blog/flutter-hybrid/1587287353326-71130245-471b-4540-8b1b-b603f101554e.png)

Flutter Boost 的源码之前在另一篇文章中梳理过《Flutter Boost 混合开发实践与源码解析（以 Android 为例）》，那篇文章中梳理了一下 Android 侧打开页面流程的源码，本文中则尽量不重复介绍源码，并且将以 iOS 侧来重点梳理一下 Flutter Boost 究竟是如何实现的。



### 3.1 从 Native 打开页面


本节分析 Flutter Boost 如何从 Native 打开页面吗，即包含以下两种情况：


1. Native -> Flutter
2. Native -> Native


在工程中，我们需要接入以下代码集成 Flutter Boost：



```
// AppDelegate.m

- (BOOL)application:(UIApplication *)application didFinishLaunchingWithOptions:(NSDictionary *)launchOptions
{
    PlatformRouterImp *router = [PlatformRouterImp new];
    [FlutterBoostPlugin.sharedInstance startFlutterWithPlatform:router
                                                        onStart:^(FlutterEngine *engine) {
                                                        }];
    self.window = [[UIWindow alloc] initWithFrame: [UIScreen mainScreen].bounds];

    [self.window makeKeyAndVisible];
   
    UINavigationController *rvc = [[UINavigationController alloc] initWithRootViewController:tabVC];

    router.navigationController = rvc;
    self.window.rootViewController = rvc;

    return YES;
}


// PlatformRouterImp.m

- (void)openNativeVC:(NSString *)name
           urlParams:(NSDictionary *)params
                exts:(NSDictionary *)exts{
    UIViewController *vc = UIViewControllerDemo.new;
    BOOL animated = [exts[@"animated"] boolValue];
    if([params[@"present"] boolValue]){
        [self.navigationController presentViewController:vc animated:animated completion:^{
        }];
    }else{
        [self.navigationController pushViewController:vc animated:animated];
    }
}

- (void)open:(NSString *)name
   urlParams:(NSDictionary *)params
        exts:(NSDictionary *)exts
  completion:(void (^)(BOOL))completion
{
    if ([name isEqualToString:@"native"]) { // 模拟打开native页面
        [self openNativeVC:name urlParams:params exts:exts];
        return;
    }
    
    BOOL animated = [exts[@"animated"] boolValue];
    FLBFlutterViewContainer *vc = FLBFlutterViewContainer.new;
    [vc setName:name params:params];
    [self.navigationController pushViewController:vc animated:animated];
    if(completion) completion(YES);
}

```



可以发现，我们在工程中首先要启动引擎，对应的 Flutter Boost 源码如下：



```
// FlutterBoostPlugin.m
- (void)startFlutterWithPlatform:(id<FLBPlatform>)platform
                          engine:(FlutterEngine *)engine
           pluginRegisterred:(BOOL)registerPlugin
                         onStart:(void (^)(FlutterEngine * _Nonnull))callback{
    static dispatch_once_t onceToken;
    __weak __typeof__(self) weakSelf = self;
    dispatch_once(&onceToken, ^{
        __strong __typeof__(weakSelf) self = weakSelf;
        FLBFactory *factory = FLBFactory.new;
        self.application = [factory createApplication:platform];
        [self.application startFlutterWithPlatform:platform
                                     withEngine:engine
                                      withPluginRegisterred:registerPlugin
                                       onStart:callback];
    });
}


// FLBFlutterApplication.m

- (void)startFlutterWithPlatform:(id<FLBPlatform>)platform
                      withEngine:(FlutterEngine* _Nullable)engine
                        withPluginRegisterred:(BOOL)registerPlugin
                         onStart:(void (^)(FlutterEngine *engine))callback
{
    static dispatch_once_t onceToken;
    dispatch_once(&onceToken, ^{
        self.platform = platform;
        self.viewProvider = [[FLBFlutterEngine alloc] initWithPlatform:platform engine:engine];
        self.isRunning = YES;
        if(registerPlugin){
            Class clazz = NSClassFromString(@"GeneratedPluginRegistrant");
            FlutterEngine *myengine = [self.viewProvider engine];
            if (clazz && myengine) {
                if ([clazz respondsToSelector:NSSelectorFromString(@"registerWithRegistry:")]) {
                    [clazz performSelector:NSSelectorFromString(@"registerWithRegistry:")
                                withObject:myengine];
                }
            }
        }
        if(callback) callback(self.viewProvider.engine);
    });
}

```



可以发现启动引擎时 startFlutterWithPlatform 需要传入路由管理类，而在 FLBPlatform.h 中可以看到 open 接口是由业务侧 Native 传过来的实现。



```
// PlatformRouterImp.m

- (void)open:(NSString *)name
   urlParams:(NSDictionary *)params
        exts:(NSDictionary *)exts
  completion:(void (^)(BOOL))completion
{
    if ([name isEqualToString:@"native"]) { // 模拟打开native页面
        [self openNativeVC:name urlParams:params exts:exts];
        return;
    }
    
    BOOL animated = [exts[@"animated"] boolValue];
    FLBFlutterViewContainer *vc = FLBFlutterViewContainer.new;
    [vc setName:name params:params];
    [self.navigationController pushViewController:vc animated:animated];
    if(completion) completion(YES);
}

```



之后要在业务侧 AppDelegate.m 中初始化一个 UINavigationController，之后在路由管理类中实现 open 方法，即在这个 navigationContainer 中 push 一个 FLBFlutterViewContainer 容器，它的父类其实就是我们第一章节所说的 FlutterViewController。核心流程的代码如下：



```
// FLBFlutterViewContainer.m

- (instancetype)init
{
    [FLUTTER_APP.flutterProvider prepareEngineIfNeeded];
    if(self = [super initWithEngine:FLUTTER_APP.flutterProvider.engine
                            nibName:_flbNibName
                            bundle:_flbNibBundle]){
        self.modalPresentationStyle = UIModalPresentationFullScreen;

        [self _setup];
    }
    return self;
}

```



没错，它调用的便是我们第一章节所说的，通过 initWithEngine 来创建 FlutterViewController。


那 Native 页面如何打开 Flutter 页面？业务侧调用 FlutterBoostPlugin 的 open 方法：



```
- (IBAction)pushFlutterPage:(id)sender {
    [FlutterBoostPlugin open:@"first" urlParams:@{kPageCallBackId:@"MycallbackId#1"} exts:@{@"animated":@(YES)} onPageFinished:^(NSDictionary *result) {
        NSLog(@"call me when page finished, and your result is:%@", result);
    } completion:^(BOOL f) {
        NSLog(@"page is opened");
    }];
}

```



Flutter Boost 对应的处理如下：



```
// FlutterBoostPlugin.m
+ (void)open:(NSString *)url urlParams:(NSDictionary *)urlParams exts:(NSDictionary *)exts onPageFinished:(void (^)(NSDictionary *))resultCallback completion:(void (^)(BOOL))completion{
    id<FLBFlutterApplicationInterface> app = [[FlutterBoostPlugin sharedInstance] application];
    [app open:url urlParams:urlParams exts:exts onPageFinished:resultCallback completion:completion];
}

// FLBFlutterApplication.m
- (void)open:(NSString *)url
   urlParams:(NSDictionary *)urlParams
        exts:(NSDictionary *)exts
       onPageFinished:(void (^)(NSDictionary *))resultCallback
  completion:(void (^)(BOOL))completion
{
    NSString *cid = urlParams[kPageCallBackId];
   
    if(!cid){
        static int64_t sCallbackID = 1;
        cid = @(sCallbackID).stringValue;
        sCallbackID += 2;
        NSMutableDictionary *newParams = [[NSMutableDictionary alloc]initWithDictionary:urlParams];
        [newParams setObject:cid?cid:@"__default#0__" forKey:kPageCallBackId];
        urlParams = newParams;
    }
    _previousViewController = [self flutterViewController];
    _callbackCache[cid] = resultCallback;
    if([urlParams[@"present"]respondsToSelector:@selector(boolValue)] && [urlParams[@"present"] boolValue] && [self.platform respondsToSelector:@selector(present:urlParams:exts:completion:)]){
        [self.platform present:url
                  urlParams:urlParams
                       exts:exts
                 completion:completion];
    }else{
        [self.platform open:url
                  urlParams:urlParams
                       exts:exts
                 completion:completion];
    }
}

```



而 Platform 的 open 就是业务侧传过来的路由类中实现的 open，之后就走到了我们本章开头分析的部分，前文分析过了，后文也有总结，这里不再赘述了。


小结一下，Native 无论打开 Native 还是 Flutter，都需要业务侧调用 Flutter Boost 的 open 方法，而 Flutter Boost 的 open 方法的实现最后其实还是回到了业务侧路由管理类中实现的 open 方法，那么：


1. Native 打开 Native：通过路由管理类拦截注册的 Native 路由，实例化 viewController 之后 push。
2. Native 打开 Flutter：实例化 FLBFlutterViewContainer 后 push，而 FLBFlutterViewContainer 本质上是 FlutterViewController。



### 3.2 从 Flutter 打开页面


本节分析 Flutter Boost 如何从 Native 打开页面吗，即包含以下两种情况：


1. Flutter-> Flutter
2. Flutter-> Native


Dart 业务侧直接调用 open 方法打开 Native 或者 Flutter 页面：



```
FlutterBoost.singleton.open("native").then((Map value) {
    print("call me when page is finished. did recieve native route result $value");
});

FlutterBoost.singleton.open("flutterPage").then((Map value) {
    print("call me when page is finished. did recieve native route result $value");
});

```



open 的源码如下，可见它的核心是使用 MethodChannel 向 Native 侧发送 openPage 消息：



```
// flutter_boost.dart
Future<Map<dynamic, dynamic>> open(String url,
  {Map<dynamic, dynamic> urlParams, Map<dynamic, dynamic> exts}) {
    Map<dynamic, dynamic> properties = new Map<dynamic, dynamic>();
    properties["url"] = url;
    properties["urlParams"] = urlParams;
    properties["exts"] = exts;
    return channel.invokeMethod<Map<dynamic, dynamic>>('openPage', properties);
}

// boost_channel.dart
final MethodChannel _methodChannel = MethodChannel("flutter_boost");

Future<T> invokeMethod<T>(String method, [dynamic arguments]) async {
    assert(method != "__event__");
    
    return _methodChannel.invokeMethod<T>(method, arguments);
}

```



iOS 侧监听 Dart 侧来的消息，针对 openPage 做处理，核心是调用 FLBFlutterApplication 中的 open 方法：



```
- (void)handleMethodCall:(FlutterMethodCall*)call result:(FlutterResult)result {
    if([@"openPage" isEqualToString:call.method]){
        NSDictionary *args = [FLBCollectionHelper deepCopyNSDictionary:call.arguments
        filter:^bool(id  _Nonnull value) { 
            return ![value isKindOfClass:NSNull.class];
        }];
        NSString *url = args[@"url"];
        NSDictionary *urlParams = args[@"urlParams"];
        NSDictionary *exts = args[@"exts"];
        NSNull2Nil(url);
        NSNull2Nil(urlParams);
        NSNull2Nil(exts);
        [[FlutterBoostPlugin sharedInstance].application open:url
                                                    urlParams:urlParams
                                                         exts:exts
                                                        onPageFinished:result
                                                   completion:^(BOOL r) {}];
    }
}

// FLBFlutterApplication.m

- (FlutterViewController *)flutterViewController
{
    return self.flutterProvider.engine.viewController;
}

- (void)open:(NSString *)url
   urlParams:(NSDictionary *)urlParams
        exts:(NSDictionary *)exts
       onPageFinished:(void (^)(NSDictionary *))resultCallback
  completion:(void (^)(BOOL))completion
{
    NSString *cid = urlParams[kPageCallBackId];
   
    if(!cid){
        static int64_t sCallbackID = 1;
        cid = @(sCallbackID).stringValue;
        sCallbackID += 2;
        NSMutableDictionary *newParams = [[NSMutableDictionary alloc]initWithDictionary:urlParams];
        [newParams setObject:cid?cid:@"__default#0__" forKey:kPageCallBackId];
        urlParams = newParams;
    }
    _previousViewController = [self flutterViewController];
    _callbackCache[cid] = resultCallback;
    if([urlParams[@"present"]respondsToSelector:@selector(boolValue)] && [urlParams[@"present"] boolValue] && [self.platform respondsToSelector:@selector(present:urlParams:exts:completion:)]){
        [self.platform present:url
                  urlParams:urlParams
                       exts:exts
                 completion:completion];
    }else{
        [self.platform open:url
                  urlParams:urlParams
                       exts:exts
                 completion:completion];
    }
}

```



同前文分析的一样，监听到这个 openPage 之后会调用 Flutter Boost 的 open 方法，而它最后还是会走到 Native 业务侧传来的路由管理类中实现的 open 方法，也是就说从 Flutter 打开页面，最终也是交由 Native 去负责 push。


小结一下，Flutter 无论的打开 Flutter 还是 Native 页面，都需要给 iOS 侧发送 openPage 的消息，iOS 侧收到消息后会执行 Flutter Boost 的 open 方法，而它的实现就是业务侧的路由管理类中的open 方法，即最终仍然交由业务侧的路由去实现。


1. Flutter 打开 Flutter：iOS 侧收到消息后执行 open。即实例化 FLBFlutterViewContainer 后 push，而 FLBFlutterViewContainer 本质上是 FlutterViewController。同 Native 打开 Flutter。
2. Flutter 打开 Native：iOS 侧收到消息后执行 open。通过路由管理类拦截注册的 Native 路由，实例化 viewController 之后 push。同 Native 打开 Native。



### 3.3 Flutter 容器切换


我们前文说到路由管理统一收归给 Native 侧去实现，每 push 一个 page （无论 Flutter 还是 Native）都是 push 一个容器。统一收归的好处是由 Native 业务侧控制，使用起来直接、简单；每次 push 一个容器的好处是直观、简单。


但是我们之前说到 Flutter Engine 只能最多同时挂载一个 FlutterViewController，那每次打开 Flutter Page 的时候都会生成一个 vc 会导致问题吗？我们来看看 Flutter Boost 是如何处理的：



```
// FLBFlutterViewContainer.m
- (void)viewWillAppear:(BOOL)animated
{
    //For new page we should attach flutter view in view will appear
    [self attatchFlutterEngine];
    [BoostMessageChannel willShowPageContainer:^(NSNumber *result) {}
                                            pageName:_name
                                              params:_params
                                            uniqueId:self.uniqueIDString];
    //Save some first time page info.
    [FlutterBoostPlugin sharedInstance].fPagename = _name;
    [FlutterBoostPlugin sharedInstance].fPageId = self.uniqueIDString;
    [FlutterBoostPlugin sharedInstance].fParams = _params;
    
 
    
    [super bridge_viewWillAppear:animated];
    [self.view setNeedsLayout];
}

- (void)attatchFlutterEngine
{
    [FLUTTER_APP.flutterProvider atacheToViewController:self];
}

```



可以看到在容器 willAppear 的时候会调用 attatchFlutterEngine 方法，其用于切换 engine 的 viewController。即，每次打开 Flutter Page 的时候，刚生成的承载它的容器 FlutterViewController 都会被挂载在 engine 上。是的，Flutter Boost 是通过不断切换 engine 的 viewController 来展示 Flutter 容器和页面的。



```
// FLBFlutterEngine.m
- (BOOL)atacheToViewController:(FlutterViewController *)vc
{
    if(_engine.viewController != vc){
        _engine.viewController = vc;
        return YES;
    }
    return NO;
}

```




### 3.4  统一生命周期与路由事件通知


那 Flutter Boost 是如何解决 Native 与 Dart 页面生命周期不一致的问题呢？


我们还是以 2.4 中 FLBFlutterViewController viewWillAppear 来举例吧，可以看到在这个函数中会执行 willShowPageContainer，它的实现在 BoostMessageChannel.m 中。



```
// BoostMessageChannel.m

 + (void)willShowPageContainer:(void (^)(NSNumber *))result pageName:(NSString *)pageName params:(NSDictionary *)params uniqueId:(NSString *)uniqueId
 {
     if ([pageName isEqualToString:kIgnoreMessageWithName]) {
         return;
     }
     
     NSMutableDictionary *tmp = [NSMutableDictionary dictionary];
     if(pageName) tmp[@"pageName"] = pageName;
     if(params) tmp[@"params"] = params;
     if(uniqueId) tmp[@"uniqueId"] = uniqueId;
     [self.methodChannel invokeMethod:@"willShowPageContainer" arguments:tmp result:^(id tTesult) {
         if (result) {
             result(tTesult);
         }
     }];
 }

```



它只做了一件事情，就是通过 methodChannel 向 Dart 侧发送 willShowPageContainer 这个消息。Dart 侧在 container_coordinator.dart 中接受消息：


> Flutter Boost 的 Dart 侧代码比较简单，container_coordinator.dart 顾名思义，就是协同 Native 侧容器的类，它负责监听 Native 来的消息，并使用 container_manager.dart 容器管理类来进行一些处理。



```
// container_coordinator.dart

Future<dynamic> _onMethodCall(MethodCall call) {
    Logger.log("onMetohdCall ${call.method}");

    switch (call.method) {
      case "willShowPageContainer":
        {
          String pageName = call.arguments["pageName"];
          Map params = call.arguments["params"];
          String uniqueId = call.arguments["uniqueId"];
          _nativeContainerWillShow(pageName, params, uniqueId);
        }
        break;
    }
}

bool _nativeContainerWillShow(String name, Map params, String pageId) {
    if (FlutterBoost.containerManager?.containsContainer(pageId) != true) {
      FlutterBoost.containerManager
          ?.pushContainer(_createContainerSettings(name, params, pageId));
    }
    // ...省略一些优化代码
    return true;
}

```



核心是执行 FlutterBoost.containerManager?.pushContainer，它在 container_manager.dart 容器管理类中实现：



```
// container_manager.dart

final List<BoostContainer> _offstage = <BoostContainer>[];
BoostContainer _onstage;
enum ContainerOperation { Push, Onstage, Pop, Remove }

void pushContainer(BoostContainerSettings settings) {
    assert(settings.uniqueId != _onstage.settings.uniqueId);
    assert(_offstage.every((BoostContainer container) =>
        container.settings.uniqueId != settings.uniqueId));

    _offstage.add(_onstage);
    _onstage = BoostContainer.obtain(widget.initNavigator, settings);

    setState(() {});

    for (BoostContainerObserver observer in FlutterBoost
        .singleton.observersHolder
        .observersOf<BoostContainerObserver>()) {
      observer(ContainerOperation.Push, _onstage.settings);
    }
    Logger.log('ContainerObserver#2 didPush');
}

```



在执行 BoostContainer.obtain 的过程中，内部会出发生命周期的监听。除此之外还执行了  observer(ContainerOperation.Push, _onstage.settings); ，以此来触发 Push 事件的通知。


其实在 FlutterBoost 中，框架一共注册了 3 种类型的事件监听：


1. 容器变化监听：BoostContainerObserver
2. 生命周期监听：BoostContainerLifeCycleObserver
3. Navigator push 和 pop 监听：ContainerNavigatorObserver


它们都伴随着混合路由栈的跳转来触发相关的事件，至于通信层的源码本文不再研究，留给有兴趣的同学自己看看。


下图是本章 Flutter Boost 打开页面的流程总结：


![image.png](https://airing.ursb.me/image/blog/flutter-hybrid/1587287247737-2a18ab06-2714-4565-9261-cf9bf143dbb4.png)

> 注：此方案频繁地去创建 FlutterViewController，在 pop 某些 FlutterViewController 之后，这些内存并没有被 engine  释放，造成内存泄露：https://github.com/flutter/flutter/issues/25255，这是 engine 的 bug，貌似至今仍未得到很好的解决。



## 4. Thrio


Thrio 是上个月（2020.03） Hellobike 开源的又一款 Flutter 混合栈框架，这个框架处理的核心问题也依然是我们在第一章抛出来的两个点：


1. 混合路由栈的管理：支持打开任意 Flutter 或 Native 页面
2. 完善的通知机制：如统一的生命周期，路由相关事件通知机制。


在本文中，我们主要来看看 Thrio 是如何实现混合栈管理的，至于通信层的逻辑，我们依然只是顺带讲解一些，具体实现比较繁杂因此本文不再分析其源码。


我们可以先看一下时序图来宏观上有一个流程的了解：


![thrio-push.png](https://airing.ursb.me/image/blog/flutter-hybrid/1587282557375-6c4de4c2-444b-4bd8-981f-8afb5d7c12cf.png)


### 4.1 调用



#### 4.1.1 从 Native 打开页面


从 iOS 业务侧调用 openUrl 即可打开 Native 或 Flutte 页面：



```
- (IBAction)pushNativePage:(id)sender {
  [ThrioNavigator pushUrl:@"native1"];
}

- (IBAction)pushFlutterPage:(id)sender {
  [ThrioNavigator pushUrl:@"biz1/flutter1"];
}

```



openUrl 最终会调用 thrio_pushUrl：



```
// ThrioNavigator.m
+ (void)_pushUrl:(NSString *)url
         params:(id _Nullable)params
       animated:(BOOL)animated
         result:(ThrioNumberCallback _Nullable)result
   poppedResult:(ThrioIdCallback _Nullable)poppedResult {
  [self.navigationController thrio_pushUrl:url
                                    params:params
                                  animated:animated
                            fromEntrypoint:nil
                                    result:^(NSNumber *idx) {
    if (result) {
      result(idx);
    }
  } poppedResult:poppedResult];
}

```




#### 4.1.2 从 Flutter 打开页面


那我们转过头来看看，Thrio 究竟如何实现从 Dart 业务侧打开页面的：



```
InkWell(
  onTap: () => ThrioNavigator.push(
    url: 'biz1/flutter1',
    params: {
      '1': {'2': '3'}
    },
    poppedResult: (params) =>
    ThrioLogger.v('biz1/flutter1 popped:$params'),
  ),
  child: Container(
    padding: const EdgeInsets.all(8),
    margin: const EdgeInsets.all(8),
    color: Colors.yellow,
    child: Text(
      'push flutter1',
      style: TextStyle(fontSize: 22, color: Colors.black),
    )),
),

```



Thrio 处理的处理如下，它会向 Native 侧通过 MethodChannel 发一条 push 消息：



```
// thrio_navigator.dart
static Future<int> push({
    @required String url,
    params,
    bool animated = true,
    NavigatorParamsCallback poppedResult,
  }) =>
      ThrioNavigatorImplement.push(
        url: url,
        params: params,
        animated: animated,
        poppedResult: poppedResult,
      );



// thrio_navigator_implement.dart
static Future<int> push({
    @required String url,
    params,
    bool animated = true,
    NavigatorParamsCallback poppedResult,
  }) {
    if (_default == null) {
      throw ThrioException('Must call the `builder` method first');
    }
    return _default._sendChannel
        .push(url: url, params: params, animated: animated)
        .then<int>((index) {
      if (poppedResult != null && index != null && index > 0) {
        _default._pagePoppedResults['$url.$index'] = poppedResult;
      }
      return index;
    });
  }


// navigator_route_send_channel.dart
Future<int> push({
    @required String url,
    params,
    bool animated = true,
  }) {
    final arguments = <String, dynamic>{
      'url': url,
      'animated': animated,
      'params': params,
    };
    return _channel.invokeMethod<int>('push', arguments);
  }

```



Native 侧接受到 push 消息后，同样会调用 thrio_pushUrl，即，从 Native 或 Flutter 打开页面的逻辑，都统一收归到 Native 侧进行处理了：



```
- (void)_onPush {
  __weak typeof(self) weakself = self;
  [_channel registryMethodCall:@"push"
                        handler:^void(NSDictionary<NSString *,id> * arguments,
                                      ThrioIdCallback _Nullable result) {
    NSString *url = arguments[@"url"];
    if (url.length < 1) {
      if (result) {
        result(nil);
      }
      return;
    }
    id params = [arguments[@"params"] isKindOfClass:NSNull.class] ? nil : arguments[@"params"];
    BOOL animated = [arguments[@"animated"] boolValue];
    ThrioLogV(@"on push: %@", url);
    __strong typeof(weakself) strongSelf = weakself;
    [ThrioNavigator.navigationController thrio_pushUrl:url
                                                params:params
                                              animated:animated
                                        fromEntrypoint:strongSelf.channel.entrypoint
                                                result:^(NSNumber *idx) { result(idx); }
                                          poppedResult:nil];
  }];
}

```




#### 4.1.3 thrio_pushUrl


那我们看看这个  thrio_pushUrl 究竟做了什么事情：



```
// UINavigationController+Navigator.m
- (void)thrio_pushUrl:(NSString *)url
               params:(id _Nullable)params
             animated:(BOOL)animated
       fromEntrypoint:(NSString * _Nullable)entrypoint
               result:(ThrioNumberCallback _Nullable)result
         poppedResult:(ThrioIdCallback _Nullable)poppedResult {
  @synchronized (self) {
    UIViewController *viewController = [self thrio_createNativeViewControllerWithUrl:url params:params];
    if (viewController) {
    // 4.2 中分析
    } else {
      // 4.3 中分析
    }
  }
}

```



可以发现它做的第一件事情就是调用 thrio_createNativeViewControllerWithUrl 创建一个 viewController，thrio_createNativeViewControllerWithUrl 实现如下：



```
- (UIViewController * _Nullable)thrio_createNativeViewControllerWithUrl:(NSString *)url params:(NSDictionary *)params {
  UIViewController *viewController;
  NavigatorPageBuilder builder = [ThrioNavigator pageBuilders][url];
  if (builder) {
    viewController = builder(params);
    // 省略一些额外处理的代码
  }
  return viewController;
}

```



理解这段代码要结合 Thrio 的路由注册流程，Native 业务侧注册了路由之后，Thrio 中会维护一个 map 来管理这些注册的路由，key 为注册的路由名，value 为对应的 builder。那么 thrio_createNativeViewControllerWithUrl  其实就是尝试去根据路由名去创建一个 NativeViewController 容器，如果注册过的就肯定会返回 viewController，若在 Native 侧没有注册过这个路由，就返回 nil。因此也就有了下面根据 viewController 存在与否走的两套逻辑了。那么我们看看什么时候会创建成功呢？那就是业务侧 pushUrl 打开的是一个在 Native 注册的页面就会返回 NativeController，否则没有注册过去调用 pushUrl，意味着业务侧打开的路由名是从 Flutter 侧注册的，那它要打开的就是一个 FlutterViewController。


> Thrio 作者 @稻子 指出：这里还包含 Flutter 侧也没有注册的逻辑，这样写是为了判断路由是否在 Native 侧注册了，如果注册了就打开原生页面，否则就交由 Flutter 处理。如果 Flutter 侧注册了，就会打开 Flutter 页面，否则就返回 null。这里后面也会说到，其实咱们说想要打开 Flutter 页面，也包括了这个页面没有被注册的情况了。


因此：


1. viewController 存在，即要打开的是 Native 页面。
2. viewController 不存在，即要打开的是 Flutter 页面（注：这里主要是为了交由 Flutter 处理，Flutter 也可能没有注册这个路由）。


接下来我们来继续分析这两段逻辑。


> 注：Thrio 将容器分为两类，一类是 NativeViewController，即承载 Native 页面的容器；另一类是 FlutterViewController，即承载 Flutter 页面的容器。



### 4.2 打开 Native 页面


viewController 存在，即要打开的是 Native 页面：



```
if (viewController) {
      [self thrio_pushViewController:viewController
                                 url:url
                              params:params
                            animated:animated
                      fromEntrypoint:entrypoint
                              result:result
                        poppedResult:poppedResult];
 }

```



thrio_pushViewController 实现如下：



```
- (void)thrio_pushViewController:(UIViewController *)viewController animated:(BOOL)animated {
  // ...省略处理 navigatorbar 的代码
  [self thrio_pushViewController:viewController animated:animated];
}

```



我们打开的是 NativeViewController，因此走的是下面的分支，调用 thrio_pushViewController：



```
- (void)thrio_pushViewController:(UIViewController *)viewController
                             url:(NSString *)url
                          params:(id _Nullable)params
                        animated:(BOOL)animated
                  fromEntrypoint:(NSString * _Nullable)entrypoint
                          result:(ThrioNumberCallback _Nullable)result
                    poppedResult:(ThrioIdCallback _Nullable)poppedResult {
  if (viewController) {
    NSNumber *index = @([self thrio_getLastIndexByUrl:url].integerValue + 1);
    __weak typeof(self) weakself = self;
    [viewController thrio_pushUrl:url
                            index:index
                           params:params
                         animated:animated
                   fromEntrypoint:entrypoint
                           result:^(NSNumber *idx) {
      if (idx && [idx boolValue]) {
        __strong typeof(weakself) strongSelf = weakself;
        [strongSelf pushViewController:viewController animated:animated];
      }
      if (result) {
        result(idx);
      }
    } poppedResult:poppedResult];
  }
}

```



这里主要做了两件事：


1. 调用 thrio_pushUrl。
2. 调用 pushViewController，UINavigationViewController 的 pushViewController 将直接在 Native 中 push 一个容器。


其实这里就已经打开了容器，但是我们还是要看看第一步调用 thrio_pushUrl 做了什么：



```
- (void)thrio_pushUrl:(NSString *)url
                index:(NSNumber *)index
               params:(id _Nullable)params
             animated:(BOOL)animated
       fromEntrypoint:(NSString * _Nullable)entrypoint
               result:(ThrioNumberCallback _Nullable)result
         poppedResult:(ThrioIdCallback _Nullable)poppedResult {
  NavigatorRouteSettings *settings = [NavigatorRouteSettings settingsWithUrl:url
                                                                       index:index
                                                                      nested:self.thrio_firstRoute != nil
                                                                      params:params];
  if (![self isKindOfClass:NavigatorFlutterViewController.class]) { // 当前页面为原生页面
    [ThrioNavigator onCreate:settings];
  }
  NavigatorPageRoute *newRoute = [NavigatorPageRoute routeWithSettings:settings];
  newRoute.fromEntrypoint = entrypoint;
  newRoute.poppedResult = poppedResult;
  if (self.thrio_firstRoute) {
    NavigatorPageRoute *lastRoute = self.thrio_lastRoute;
    lastRoute.next = newRoute;
    newRoute.prev = lastRoute;
  } else {
    self.thrio_firstRoute = newRoute;
  }
  if ([self isKindOfClass:NavigatorFlutterViewController.class]) {
  // 打开 Flutter 页面的逻辑，4.3.1 中分析
  }
}

```



关键是调用了 onCreate 函数，至于剩下的业务，是对页面指针的处理，这里不做分析了。我们来看看 onCreate 做了什么事情：



```
- (void)onCreate:(NavigatorRouteSettings *)routeSettings {
  NSDictionary *arguments = [routeSettings toArguments];
  [_channel invokeMethod:@"__onOnCreate__" arguments:arguments];
}

```



这里是使用 MethodChannel 向 Dart 侧发送一条 onOnCreate 消息，Dart 侧收到之后会交由相关的事件进行处理：



```
NavigatorPageObserverChannel() {
    _on(
      'onCreate',
      (pageObserver, routeSettings) => pageObserver.onCreate(routeSettings),
    );
}

void _on(String method, NavigatorPageObserverCallback callback) =>
      _channel.registryMethodCall(
          '__on${method[0].toUpperCase() + method.substring(1)}__', (
              [arguments]) {
        final routeSettings = NavigatorRouteSettings.fromArguments(arguments);
        final pageObservers = ThrioNavigatorImplement.pageObservers;
        for (final pageObserver in pageObservers) {
          if (pageObserver is NavigatorPageObserverChannel) {
            continue;
          }
          callback(pageObserver, routeSettings);
        }
        return Future.value();
      });

```



即 Thrio 在这里完成了生命周期的统一处理，其实现方式与 FlutterBoost 其实是一致，都是在混合栈跳转的过程中顺带通知相关事件，至于通信层的具体逻辑这里也不再具体分析了。另外，Thrio Dart 侧的代码比较简洁，推荐有兴趣的同学自行阅读。



### 4.3 打开 Flutter 页面


若 viewController 不存在，即业务侧要打开的是 Native 页面：



```
if (viewController) {
  // 4.2
} else {
      NSString *entrypoint = @"";
      if (ThrioNavigator.isMultiEngineEnabled) {
        entrypoint = [url componentsSeparatedByString:@"/"].firstObject;
      }

      __weak typeof(self) weakself = self;
      ThrioIdCallback readyBlock = ^(id _){
        ThrioLogV(@"push entrypoint: %@, url:%@", entrypoint, url);
        __strong typeof(weakself) strongSelf = weakself;
        if ([strongSelf.topViewController isKindOfClass:NavigatorFlutterViewController.class] &&
            [[(NavigatorFlutterViewController*)strongSelf.topViewController entrypoint] isEqualToString:entrypoint]) {
         // 4.3.1 中分析
        } else {
         // 4.3.2 中分析
      };

      [NavigatorFlutterEngineFactory.shared startupWithEntrypoint:entrypoint readyBlock:readyBlock];
};

```



这里开头有一些多引擎的标志处理，因 Thrio 的多引擎目前还在开发完善中，因此我们本节就不看它多引擎部分的代码了，看看主体部分吧。根据容器类型，如果当前（最上层）的 viewController 是 FlutterViewController（NavigatorFlutterViewController 是它的一层封装）就走某逻辑，否则就是 NativeViewController 走另一端逻辑。


因此在要打开的页面是 Flutter 页面是，Thrio 和 Flutter Boost 不同，它不会一股脑的去创建容器，而是区分情况处理，这其实也是 Thrio 与 Flutter Boost 最大的不同：


1. Flutter 打开 Flutter
2. Native 打开 Flutter



#### 4.3.1 Flutter 打开 Flutter



```
if ([strongSelf.topViewController isKindOfClass:NavigatorFlutterViewController.class] &&
            [[(NavigatorFlutterViewController*)strongSelf.topViewController entrypoint] isEqualToString:entrypoint]) {
          NSNumber *index = @([strongSelf thrio_getLastIndexByUrl:url].integerValue + 1);
          [strongSelf.topViewController thrio_pushUrl:url
                                                index:index
                                               params:params
                                             animated:animated
                                       fromEntrypoint:entrypoint
                                               result:^(NSNumber *idx) {
            if (idx && [idx boolValue]) {
              [strongSelf thrio_removePopGesture];
            }
            if (result) {
              result(idx);
            }
          } poppedResult:poppedResult];
} else {
 // Native 打开 Flutter 4.3.2 中分析
}

```



这里又会走到我们 4.2 中分析到 thrio_pushUrl：



```
- (void)thrio_pushUrl:(NSString *)url
                index:(NSNumber *)index
               params:(id _Nullable)params
             animated:(BOOL)animated
       fromEntrypoint:(NSString * _Nullable)entrypoint
               result:(ThrioNumberCallback _Nullable)result
         poppedResult:(ThrioIdCallback _Nullable)poppedResult {
  NavigatorRouteSettings *settings = [NavigatorRouteSettings settingsWithUrl:url
                                                                       index:index
                                                                      nested:self.thrio_firstRoute != nil
                                                                      params:params];
   // ...省略 4.2 中的代码
  if ([self isKindOfClass:NavigatorFlutterViewController.class]) {
  NSMutableDictionary *arguments = [NSMutableDictionary dictionaryWithDictionary:[settings toArguments]];
    [arguments setObject:[NSNumber numberWithBool:animated] forKey:@"animated"];
    NSString *entrypoint = [(NavigatorFlutterViewController*)self entrypoint];
    NavigatorRouteSendChannel *channel = [NavigatorFlutterEngineFactory.shared getSendChannelByEntrypoint:entrypoint];
    if (result) {
      [channel onPush:arguments result:^(id _Nullable r) {
        result(r && [r boolValue] ? index : nil);
      }];
    } else {
      [channel onPush:arguments result:nil];
    }
  }
}

```



核心是使用 MethodChannel 向 Dart 侧发送 onPush 消息：



```
- (void)onPush:(id _Nullable)arguments result:(FlutterResult _Nullable)callback {
  [self _on:@"onPush" arguments:arguments result:callback];
}

- (void)_on:(NSString *)method
  arguments:(id _Nullable)arguments
     result:(FlutterResult _Nullable)callback {
  NSString *channelMethod = [NSString stringWithFormat:@"__%@__", method];
  [_channel invokeMethod:channelMethod arguments:arguments result:callback];
}

```



Dart 侧收到消息后，根据路由名找到 builder 生成一个 Route，之后会使用 Flutter 的 Navigator 去 push 这个 widget：



```
void _onPush() => _channel.registryMethodCall('__onPush__', ([arguments]) {
        final routeSettings = NavigatorRouteSettings.fromArguments(arguments);
        ThrioLogger.v('onPush:${routeSettings.name}');
        final animatedValue = arguments['animated'];
        final animated =
            (animatedValue != null && animatedValue is bool) && animatedValue;
        return ThrioNavigatorImplement.navigatorState
            ?.push(routeSettings, animated: animated)
            ?.then((it) {
          _clearPagePoppedResults();
          return it;
        });
      });

```



因此，Thrio 这种场景下没有像 Flutter Boost 那样去创建一个 FlutterViewController，而是在已有的容器上使用 Navigator 去 push。所以在连续打开 Flutter 页面这种场景下，Thrio 的内存占用会低一些。



#### 4.3.2 Native 打开 Flutter



```
if ([strongSelf.topViewController isKindOfClass:NavigatorFlutterViewController.class] &&
            [[(NavigatorFlutterViewController*)strongSelf.topViewController entrypoint] isEqualToString:entrypoint]) {
// 4.3.1，Flutter 打开 Flutter
} else {
          UIViewController *viewController = [strongSelf thrio_createFlutterViewControllerWithEntrypoint:entrypoint];
          [strongSelf thrio_pushViewController:viewController
                                           url:url
                                        params:params
                                      animated:animated
                                fromEntrypoint:entrypoint
                                        result:result
                                  poppedResult:poppedResult];
}

```



从 Native 页面打开 Flutter，会先执行 thrio_createFlutterViewControllerWithEntrypoint，顾名思义，其实它就是创建一个 FlutterViewController：



```
- (UIViewController *)thrio_createFlutterViewControllerWithEntrypoint:(NSString *)entrypoint {
  UIViewController *viewController;
  NavigatorFlutterPageBuilder flutterBuilder = [ThrioNavigator flutterPageBuilder];
  if (flutterBuilder) {
    viewController = flutterBuilder();
  } else {
    viewController = [[NavigatorFlutterViewController alloc] initWithEntrypoint:entrypoint];
  }
  return viewController;
}

```



需要注意的是，这里框架会维护一个对象，如果之前创建过 FlutterViewController，它就会从缓存里去取出来，否则才会新建一个 FlutterViewController。


之后调用 thrio_pushViewController，这段逻辑和之前分析的 4.2 打开 Native 页面是一样的：



```
- (void)thrio_pushViewController:(UIViewController *)viewController
                             url:(NSString *)url
                          params:(id _Nullable)params
                        animated:(BOOL)animated
                  fromEntrypoint:(NSString * _Nullable)entrypoint
                          result:(ThrioNumberCallback _Nullable)result
                    poppedResult:(ThrioIdCallback _Nullable)poppedResult {
  if (viewController) {
    NSNumber *index = @([self thrio_getLastIndexByUrl:url].integerValue + 1);
    __weak typeof(self) weakself = self;
    [viewController thrio_pushUrl:url
                            index:index
                           params:params
                         animated:animated
                   fromEntrypoint:entrypoint
                           result:^(NSNumber *idx) {
      if (idx && [idx boolValue]) {
        __strong typeof(weakself) strongSelf = weakself;
        [strongSelf pushViewController:viewController animated:animated];
      }
      if (result) {
        result(idx);
      }
    } poppedResult:poppedResult];
  }
}

```



1. 调用 thrio_pushUrl，同样是发通知的逻辑，这里不赘述了。
2. 调用 pushViewController，pushViewController 将直接在 Native 中 push FlutterViewController。


Thrio 的源码当然不止分析的这一点，还有很多索引维护、边界处理、多引擎逻辑、场景性能优化、生命周期与路由事件通知等逻辑没有分析到，鉴于篇幅问题，仅分析一下主流程打通框架的脉络，剩下的过于细节，本文不再一一分析。


下图是本节 Thrio 打开页面的一个流程总结：


![image.png](https://airing.ursb.me/image/blog/flutter-hybrid/1587286318899-9b6202e0-cd70-4ee4-ac27-4701ae74e76d.png)

虽然框架的实现上我们发现 Thrio 较 Flutter Boost 要复杂一些，但是混合栈的容器更简洁了——对于连续的 Flutter 页面（Widget）只需要在当前 FlutterViewController 打开即可，无需去创建新的容器。



## 5. 多 engine 模式


多引擎的架构如图所示：


![](https://airing.ursb.me/image/blog/flutter-hybrid/1587290502005-ed3901b3-6fd8-4a38-8116-b0e413f6da62.png)

官方设计是 FlutterEngine 对应四个线程（Task Runner）：


- Platform Task Runner
- UI Task Runner
- GPU Task Runner
- IO Task Runner


因此 Engine 是一个比较重的对象，之前笔者测试过，启动一个 engine 主线程会耗时 30ms 左右，内存占用增加 30MB。虽然内存不占优，但主线程只占用 30ms 相比 RN 与 Webview 动辄初始化 100~200 ms 是好了不少。


多 engine 可能会带来一些问题：


1. 启动和运行需要消耗额外资源：这里可以通过裁剪 engine 来进行优化。
2. 冗余的资源问题：多引擎模式下每个引擎之间的 Isolate 是相互独立的，在逻辑上这并没有什么坏处，但是引擎底层其实是维护了图片缓存等比较消耗内存的对象。每个引擎都维护自己一份图片缓存，内存压力会增大。
3. 通信层紊乱问题：多 engine 会使得通信层的逻辑变得尤其复杂，需要设计好通信层的逻辑。这里可以学习一下 Thrio 的实现。


Thrio 有一套索引维护机制，结合多引擎和多 FlutterViewController，可以定位到每一个页面的位置：


![thrio-architecture.png](https://airing.ursb.me/image/blog/flutter-hybrid/1587282687774-e2e6297e-f33b-48d8-a637-35285f38e297.png)

不可否认，多引擎带来的隔离是一个好处，至于能带来多少性能提升，还需要再测试一下。不过，多引擎模式是值得期待的混合开发框架模式。


> 参考资料：
> 
> Adding Flutter to exist app：https://flutter.dev/docs/development/add-to-app
> 闲鱼基于Flutter的移动端跨平台应用实践  http://www.cocoachina.com/cms/wap.php?action=article&id=24859
> 今日头条 | 让Flutter真正支持View级别的混合开发：https://www.msup.com.cn/share/details?id=226
> hellobike/thrio：https://github.com/hellobike/thrio/blob/master/doc/Feature.md
> alibaba/flutter_boost：https://github.com/alibaba/flutter_boost
