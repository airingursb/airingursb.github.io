---
title: "Flutter Boost 混合开发实践与源码解析"
date: 2020-03-07
tags: ["tech"]
description: ""
---

## 1. 简介


Flutter Boost 是闲鱼团队开发的一个 Flutter 混合开发框架，项目背景可以看看闲鱼的这篇文章：码上用它开始Flutter混合开发——FlutterBoost。


文章中主要讲述了多引擎存在一些实际问题，所以闲鱼目前采用的混合方案是共享同一个引擎的方案。而 Flutter Boost 的 Feature 如下：


- 可复用通用型混合方案
- 支持更加复杂的混合模式，比如支持主页Tab这种情况
- 无侵入性方案：不再依赖修改Flutter的方案
- 支持通用页面生命周期
- 统一明确的设计概念


Flutter Boost 采用共享引擎的模式来实现，主要思路是由 Native 容器 Container 通过消息驱动 Flutter 页面容器 Container，从而达到 Native Container 与 Flutter Container 的同步目的。简单的理解，闲鱼想做到把 Flutter 容器做成浏览器的感觉。填写一个页面地址，然后由容器去管理页面的绘制。在 Native 侧我们只需要关心如果初始化容器，然后设置容器对应的页面标志即可。


鉴于网上没有相关的接入文档和使用教程，我这几天也恰好抽空研究了一下，遂整理成文，仅供参考。由于篇幅原因，本文只研究 Android 端的接入与源码，iOS 的部分后续有机会则补充文章来讲解。


> 注：本文接入的 Flutter Boost 版本为 1.12.13，对应支持的 Flutter SDK 版本为 1.12.13-hotfixes，是目前最新的版本。但 Flutter Boost 版本更新之后，接入方式和使用方式可能会有一些改变，故参考本文时请认准 1.12.13 版本。



## 2. 接入



### 2.1 创建 Flutter Module


在开始之前，我们需要保证工程目录如下结构所示：



```
--- flutter_hybrid
--- flutter_module
--- FlutterHybridAndroid 
--- FlutterHybridiOS
```


即，iOS 工程与 Android 工程与 flutter_module 目录在同一层级。如此，方便管理，同时也保证后续集成代码中路径的一致性。


接着，我们来创建 Flutter Module：



```
cd flutter_hybrid
flutter create -t module flutter_module

```



需要注意的是，如果要创建支持 Android X 的 flutter module，命令上需要加上 --androidx 参数，即：



```
flutter create --androidx -t module flutter_module

```



注：如果安装依赖过慢，可以切换为国内的依赖镜像源。



```
export PUB_HOSTED_URL=https://pub.flutter-io.cn
export FLUTTER_STORAGE_BASE_URL=https://storage.flutter-io.cn

```



当然我们也可以通过新版的 Android Studio 来可视化创建一个 Flutter Module （需 3.6.1 以上版本，并给 IDE 装上 Flutter 与 Dart 插件），具体方法可以见官网介绍（https://flutter.dev/docs/development/add-to-app/android/project-setup），此处不再赘述。但个人建议使用本文介绍的更为通用的方法去创建并集成 Flutter Module。



### 2.2 集成 Flutter Module


创建好 Flutter Module 之后，需要在 Native 工程中集成 flutter_module。具体有两种方式：


1. 源码依赖
2. arr 依赖



#### 2.2.1 源码依赖集成


源码依赖的优点是开发、调试方便，也就是在 Android 工程的 settings.gradle 和 app 目录下的 build.gradle 文件中加入对 flutter_module 的依赖即可。


首先，在 settings.gradle 文件中，增加以下代码：



```
include ':app'                                     // 已存在的内容

setBinding(new Binding([gradle: this]))                                
evaluate(new File(                                                     
  settingsDir.parentFile,                                               
  'flutter_module/.android/include_flutter.groovy'                      
))

```



setBinding 与 evaluate 增加之后我们就可以在 app/build.gradle 中增加 :flutter 依赖：



```
...
dependencies {
  implementation project(':flutter')
...
}

```



同时也需要在该文件中的 android() 配置指定一下编译时的 Java 版本为 Java 8，否则会报错



```
compileOptions {
  sourceCompatibility 1.8
  targetCompatibility 1.8
}

```



最后执行一下 gradle sync 下载依赖库。如果集成成功，会在左侧的项目目录中看到与项目同级的 flutter_module 文件夹。



#### 2.2.2 arr 依赖集成


如果需要用远程打包，而远程的机器上没有 flutter 环境，就可以把 flutter 打包成 arr 文件进行依赖。生成 aar 文件之后再在主工程里引用，flutter aar 中包含了 flutter sdk 的代码，所以这种方式是不需要flutter 环境的，也适合第三方快速接入。



```
cd .android/
./gradlew flutter:assembleDebug

```




### 2.3 添加 Flutter Boost 依赖


首先在 Flutter Module 项目中加入 flutter-boost 依赖，即在 pubspec.yaml 文件中的 dev_dependencies 配置增加 flutter-boost 依赖：



```
dev_dependencies:
  flutter_boost:
     git:
        url: 'https://github.com/alibaba/flutter_boost.git'
        ref: '1.12.13'

```



以上 flutter boost 支持 AndroidX，如果想支持 support，则需要切换分支：



```
flutter_boost:
    git:
        url: 'https://github.com/alibaba/flutter_boost.git'
        ref: 'task/task_v1.12.13_support_hotfixes'

```



编辑完之后在 flutter_module 目录下执行以下命令安装依赖。



```
flutter packages get
```


之后在 Android 工程中的 app 目录下的 build.gradle 文件中增加 :flutter_boost 依赖，



```
dependencies {
    ...
    implementation project(':flutter')
    implementation project(':flutter_boost')
}

```



因为 Flutter Boost 是以 Flutter Plugin 的形式集成到我们的项目中来的，所以我们还需要做一些工作，首先在 app 目录下的 build.gradle 文件的头部增加以下代码：



```
def localProperties = new Properties()
def localPropertiesFile = rootProject.file('local.properties')
if (localPropertiesFile.exists()) {
    localPropertiesFile.withReader('UTF-8') { reader ->
        localProperties.load(reader)
    }
}

def flutterRoot = localProperties.getProperty('flutter.sdk')
if (flutterRoot == null) {
    throw new GradleException("Flutter SDK not found. Define location with flutter.sdk in the local.properties file.")
}

def flutterVersionCode = localProperties.getProperty('flutter.versionCode')
if (flutterVersionCode == null) {
    flutterVersionCode = '1'
}

def flutterVersionName = localProperties.getProperty('flutter.versionName')
if (flutterVersionName == null) {
    flutterVersionName = '1.0'
}

```



这需要我们在 Android 工程下的 local.properties 文件中指定以下我们本地的 Flutter SDK 的位置（没有该文件就新建一个）：



```
flutter.sdk = /Users/airing/flutter

```



最后再在工程目录下的  settings.gradle 中增加以下代码引入 flutter-plugin：



```
def flutterProjectRoot = rootProject.projectDir.parentFile.toPath()

def plugins = new Properties()
def pluginsFile = new File(flutterProjectRoot.toFile(), '.flutter-plugins')
if (pluginsFile.exists()) {
    pluginsFile.withReader('UTF-8') { reader -> plugins.load(reader) }
}

plugins.each { name, path ->
    def pluginDirectory = flutterProjectRoot.resolve(path).resolve('android').toFile()
    include ":$name"
    project(":$name").projectDir = pluginDirectory
}

```



同样的，修改完 Android 工程的依赖之后，需要 gradle sync 一下。


至此，Flutter Boost 集成成功。接下来，我们使用 Flutter Boost 进行混合开发。而混合开发，主要涉及到两个场景：


1. 在 Native 项目中加入 Flutter 页面，即 Add a single Flutter screen。
2. 在 Native 页面中嵌入 Flutter 模块，即 Add a Flutter Fragment。


这两种方式在 Flutter 的官网上都有实践讲解，我们这里主要看看如果使用 Flutter boost 究竟要如何实现的，并顺便探究一下其实现原理。



## 3. 混合开发1： Flutter View


![](https://airing.ursb.me/image/blog/flutterboost/1.png)


### 3.1 在 Flutter Module 中使用 Flutter Boost


首先引入依赖



```
import 'package:flutter_boost/flutter_boost.dart';

```



随后在 main 方法中运行的 rootWidget 中注册两个新的页面，以便 Native 工程可以跳转过来。



```
import 'package:flutter/material.dart';
import 'package:flutter_boost/flutter_boost.dart';
import 'simple_page_widgets.dart';

void main() {
  runApp(MyApp());
}

class MyApp extends StatefulWidget {
  @override
  _MyAppState createState() => _MyAppState();
}

class _MyAppState extends State<MyApp> {
  @override
  void initState() {
    super.initState();

    FlutterBoost.singleton.registerPageBuilders({
      'first': (pageName, params, _) => FirstRouteWidget(),
      'second': (pageName, params, _) => SecondRouteWidget(),
    });
  }

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
        title: 'Flutter Boost example',
        builder: FlutterBoost.init(),
        home: Container(
            color:Colors.white
        ));
  }
}

```



代码很简单：


1. 在 initState 的时候使用 `FlutterBoost.singleton.registerPageBuilders`  注册页面
2. 在 bulider 中初始化 FlutterBoost。



### 3.2 在 Android 工程中使用 Flutter Boost


在 Android 项目中增加一个 Flutter 页面，即是添加一个  Flutter Activity（iOS 即是添加一个新的 FlutterViewController，这里不再花篇幅去讲解 iOS 的实现了，有兴趣的同学可以自己去阅读 Flutter Boost 的示例代码和源码）。


这里我们在 AndroidManifest.xml 的 Application 配置中添加一个 Flutter Boost Activity：



```
<activity
  android:name="com.idlefish.flutterboost.containers.BoostFlutterActivity"
  android:theme="@style/Theme.AppCompat"
  android:configChanges="orientation|keyboardHidden|keyboard|screenSize|locale|layoutDirection|fontScale|screenLayout|density"
  android:hardwareAccelerated="true"
  android:windowSoftInputMode="adjustResize" >
  <meta-data android:name="io.flutter.embedding.android.SplashScreenDrawable" android:resource="@drawable/page_loading"/>
</activity>

```



除此之外还需要在 AndroidManifest.xml 中添加 flutterEmbedding 版本设置：



```
<meta-data android:name="flutterEmbedding"
android:value="2">
</meta-data>

```



接着要进行初始化 FlutterBoost 的工作，建议在 Application 的 onCreate 方法中初始化：



```
public class MyApplication extends Application {

    @Override
    public void onCreate() {
        super.onCreate();

        INativeRouter router = new INativeRouter() {
            @Override
            public void openContainer(Context context, String url, Map<String, Object> urlParams, int requestCode, Map<String, Object> exts) {
               String  assembleUrl=Utils.assembleUrl(url,urlParams);
                PageRouter.openPageByUrl(context,assembleUrl, urlParams);
            }

        };

        FlutterBoost.BoostLifecycleListener boostLifecycleListener= new FlutterBoost.BoostLifecycleListener(){

            @Override
            public void beforeCreateEngine() {

            }

            @Override
            public void onEngineCreated() {

            }

            @Override
            public void onPluginsRegistered() {

            }

            @Override
            public void onEngineDestroy() {

            }

        };

        Platform platform = new FlutterBoost
                .ConfigBuilder(this,router)
                .isDebug(true)
                .whenEngineStart(FlutterBoost.ConfigBuilder.ANY_ACTIVITY_CREATED)
                .renderMode(FlutterView.RenderMode.texture)
                .lifecycleListener(boostLifecycleListener)
                .build();
        FlutterBoost.instance().init(platform);
    }
}

```



FlutterBoost 在 Android 工程中初始化需要进行 4 步工作：


1. 注册路由跳转方法（后续会说 PageRouter 的实现）
2. 增加 flutter boost 的生命周期监听函数，可以在 Flutter Engine 创建之前、创建之后、销毁之后与 Flutter Plugin 注册之后回调事件。
3. 声明 Flutter boost 配置，把路由和生命周期函数配置上。
4. 初始化 Flutter boost。


接着要在 Android 工程中实现一个页面路由的工具类 PageRouter，这里直接摆上 Flutter Boost 示例代码中的实现了，比较全面：



```
public class PageRouter {

    public final static Map<String, String> pageName = new HashMap<String, String>() {{

        put("first", "first");
        put("second", "second");
        put("tab", "tab");
        put("sample://flutterPage", "flutterPage");
    }};

    public static final String NATIVE_PAGE_URL = "sample://nativePage";
    public static final String FLUTTER_PAGE_URL = "sample://flutterPage";
    public static final String FLUTTER_FRAGMENT_PAGE_URL = "sample://flutterFragmentPage";

    public static boolean openPageByUrl(Context context, String url, Map params) {
        return openPageByUrl(context, url, params, 0);
    }

    public static boolean openPageByUrl(Context context, String url, Map params, int requestCode) {

        String path = url.split("\\?")[0];

        Log.i("openPageByUrl",path);

        try {
            if (pageName.containsKey(path)) {
                Intent intent = BoostFlutterActivity.withNewEngine().url(pageName.get(path)).params(params)
                        .backgroundMode(BoostFlutterActivity.BackgroundMode.opaque).build(context);
                if(context instanceof Activity){
                    Activity activity=(Activity)context;
                    activity.startActivityForResult(intent,requestCode);
                }else{
                    context.startActivity(intent);
                }
                return true;
            } else if (url.startsWith(FLUTTER_FRAGMENT_PAGE_URL)) {
                context.startActivity(new Intent(context, FlutterFragmentPageActivity.class));
                return true;
            } else if (url.startsWith(NATIVE_PAGE_URL)) {
                context.startActivity(new Intent(context, NativePageActivity.class));
                return true;
            }

            return false;

        } catch (Throwable t) {
            return false;
        }
    }
}

```




### 3.3 在 Native 项目中打开 Flutter 页面


调用比较简单，在 Native 页面上的按钮绑定上 onClick 监听来实现点击打开我们注册的 Flutter 中的 first 页面，还可以顺便传上一个 map 参数：



```
@Override
public void onClick(View v) {
    Map params = new HashMap();
    params.put("test1","v_test1");
    params.put("test2","v_test2");

    PageRouter.openPageByUrl(this, "first", params);
}

```



我们回顾一下我们在 3.1 中 Flutter 中注册页面的代码，发现有一个 params 参数，没错那就是 Native 打开 Flutter 时传过来的参数，我们可以打印出来或者传给 widget 做额外的处理：



```
FlutterBoost.singleton.registerPageBuilders({
      'first': (pageName, params, _) => {
        print("flutterPage params:$params");

        return FirstRouteWidget(params:params);
      },
      'second': (pageName, params, _) => SecondRouteWidget(),
});

```




### 3.4 在 Flutter 页面中打开 Native 页面


同样的，我们可能还会遇到一种场景，在 Native 中打开 Flutter 页面之后，我们 Flutter 中的业务又需要再打开一个新的 Native 页面，那需要怎么做？在 Flutter 中使用 FlutterBoost.singleton.open 即可，如下：



```
// 后面的参数会在native的IPlatform.startActivity方法回调中拼接到url的query部分。
// 例如：sample://nativePage?aaa=bbb
onTap: () => FlutterBoost.singleton
     .open("sample://nativePage", urlParams: <dynamic,dynamic>{
      "query": {"aaa": "bbb"}
}),

```



当然，这个方法不单单支持打开 Native 页面，也可以打开一个新的 Flutter 页面，只需要写好路由名就好，这里不再赘述。


> 注：得益于 Flutter 的 JIT 编译模式，我们可以通过 flutter attach 命令来实现 hot reload 功能，在开发 Flutter 页面时无需重新编译工程。



## 4. 混合开发2：Flutter Fragment


![](https://airing.ursb.me/image/blog/flutterboost/2.png)

我们假设工程中存在一个 Activity，配置如下：



```
<activity
     android:name=".FlutterFragmentPageActivity"
     android:theme="@style/Theme.AppCompat"
     android:configChanges="orientation|keyboardHidden|keyboard|screenSize|locale|layoutDirection|fontScale|screenLayout|density"
     android:hardwareAccelerated="true"
     android:windowSoftInputMode="adjustResize">
     <meta-data android:name="io.flutter.embedding.android.SplashScreenDrawable" android:resource="@drawable/page_loading"/>
</activity>

```



而对应 layout 中我们要加入一个 FrameLayout 组件作为占位符：



```
<FrameLayout
        android:layout_width="match_parent"
        android:layout_height="0dp"
        android:layout_weight="1"
        android:id="@+id/fragment_stub"/>

```



最后，在代码中拿到对应 url 的 Flutter widget，塞到占位组件里即可：



```
@Override
public void onClick(View v) {
    FlutterFragment mFragment = new FlutterFragment.NewEngineFragmentBuilder().url("flutterFragment").build();
    getSupportFragmentManager()
        .beginTransaction()
        .replace(R.id.fragment_stub, mFragment)
        .commit();
}

```




## 5. Flutter Boost 源码解析


本节主要简单分析一下 Flutter Boost 的原理，只有知根知底才能用得得心应手。由于篇幅问题，不可能全部的源码都分析一遍，本节只分析具有代表性的源码，其余的原理基本一致，留给读者自行阅读。


那本节就从 Dart 端切入，关注其中两个 api，一个是注册页面的 registerPageBuilders，另一个是打开页面的 open，看看 Flutter Boost 是如何实现它们的。



### 5.1 注册页面


我们在使用 Flutter Boost 的流程中，第一步是要在 Flutter 中注册页面，调用了 registerPageBuilders 函数，那我们来看一下这个函数是如何实现的。


在 flutter_boost.dart 文件中，我们很容易就找到了这个函数的入口：



```
///Register a map builders
void registerPageBuilders(Map<String, PageBuilder> builders) {
  ContainerCoordinator.singleton.registerPageBuilders(builders);
}

```



它调用了 ContainerCoordinator 单例的 registerPageBuilders，那我们接着看 container_coordinator.dart 文件中这个函数的实现：



```
final Map<String, PageBuilder> _pageBuilders = <String, PageBuilder>{};
  PageBuilder _defaultPageBuilder;

///Register page builder for a key.
void registerPageBuilder(String pageName, PageBuilder builder) {
  if (pageName != null && builder != null) {
    _pageBuilders[pageName] = builder;
  }
}

```



其中 PageBuilder 我们可以找到定义，是一个 Widget，那么这个函数其实就将我们注册的 Widget 塞到一个 Map 里，而我们指定的路由名，就是它的 key。那我们接着要关注的是 _pageBuilders 定义好之后会怎么被使用？



```
BoostContainerSettings _createContainerSettings(
      String name, Map params, String pageId) {
    Widget page;

    final BoostContainerSettings routeSettings = BoostContainerSettings(
        uniqueId: pageId,
        name: name,
        params: params,
        builder: (BuildContext ctx) {
          //Try to build a page using keyed builder.
          if (_pageBuilders[name] != null) {
            page = _pageBuilders[name](name, params, pageId);
          }

          //Build a page using default builder.
          if (page == null && _defaultPageBuilder != null) {
            page = _defaultPageBuilder(name, params, pageId);
          }

          assert(page != null);
          Logger.log('build widget:$page for page:$name($pageId)');

          return page;
        });

    return routeSettings;
  }

```



可以发现，它在 _createContainerSettings 中 build widget 之后返回一个 routeSetting，该变量在 _nativeContainerWillShow 中被 pushContainer 调用，而 _nativeContainerWillShow 会在 _onMethodCall 中被调用。



```
bool _nativeContainerWillShow(String name, Map params, String pageId) {
    if (FlutterBoost.containerManager?.containsContainer(pageId) != true) {
      FlutterBoost.containerManager
          ?.pushContainer(_createContainerSettings(name, params, pageId));
    }
    return true;
  }

```




```
Future<dynamic> _onMethodCall(MethodCall call) {
    Logger.log("onMetohdCall ${call.method}");

    switch (call.method) {
      // 省略无关代码
      case "willShowPageContainer":
        {
          String pageName = call.arguments["pageName"];
          Map params = call.arguments["params"];
          String uniqueId = call.arguments["uniqueId"];
          _nativeContainerWillShow(pageName, params, uniqueId);
        }
        break;
    }
  // 省略无关代码
}

```



以上两段代码的作用是当 Dart 端监听到来自 Native 的通信之后，如果 Native 传递了一个要打开一个页面容器的信息（willShowPageContainer）之后，FlutterBoost 的容器管理器就会根据用户注册配置的路由页面去打开一个新的容器。而这里的 pushContainer 主要做一些路由管理和绑定监听等操作，我们就不再细看这部分的逻辑了，主要还是看看 _onMethodCall 的 Native 与 Dart 的互相通信。



### 5.2 通信



```
ContainerCoordinator(BoostChannel channel) {
    assert(_instance == null);

    _instance = this;

    channel.addEventListener("lifecycle",
        (String name, Map arguments) => _onChannelEvent(arguments));

    channel.addMethodHandler((MethodCall call) => _onMethodCall(call));
  }

```



Flutter Boost 中负责通信的是 BoostChannel，它的本质上是 MethodChannel 的一层封装，而 MethodChannel 是 Native 与 Flutter 通信的方案之一，有兴趣的同学可以自己查阅 MethodChannel 相关的资料加以了解。


![](https://airing.ursb.me/image/blog/flutterboost/3.png)

> 可以阅读 Flutter 官网对 MethodChannel 的介绍：https://flutter.dev/docs/development/platform-integration/platform-channels



### 5.3 打开页面


最后我们再来看一个打开页面的函数 open，它的实现在库中也容易找到：



```
Future<Map<dynamic, dynamic>> open(String url,
      {Map<dynamic, dynamic> urlParams, Map<dynamic, dynamic> exts}) {
    Map<dynamic, dynamic> properties = new Map<dynamic, dynamic>();
    properties["url"] = url;
    properties["urlParams"] = urlParams;
    properties["exts"] = exts;
    return channel.invokeMethod<Map<dynamic, dynamic>>('openPage', properties);
  }

```



可以发现，它的工作其实就是包装好参数后把 openPage 的消息发送给 Native。那我们再来看看 Native 侧接受到这个消息之后作何处理吧！在 Android 侧的 Flutter Boost 源码中可以找到 FlutterBoostPlugin.java 这个文件，其中有 MethodChannel 的逻辑来监听 Dart 侧的消息：



```
class BoostMethodHandler implements MethodChannel.MethodCallHandler {

        @Override
        public void onMethodCall(MethodCall methodCall, final MethodChannel.Result result) {

            FlutterViewContainerManager mManager = (FlutterViewContainerManager) FlutterBoost.instance().containerManager();
            switch (methodCall.method) {
                // 省略无关的分支
                case "openPage": {
                    try {
                        Map<String, Object> params = methodCall.argument("urlParams");
                        Map<String, Object> exts = methodCall.argument("exts");
                        String url = methodCall.argument("url");

                        mManager.openContainer(url, params, exts, new FlutterViewContainerManager.OnResult() {
                            @Override
                            public void onResult(Map<String, Object> rlt) {
                                if (result != null) {
                                    result.success(rlt);
                                }
                            }
                        });
                    } catch (Throwable t) {
                        result.error("open page error", t.getMessage(), t);
                    }
                }
                break;
                default: {
                    result.notImplemented();
                }
            }
        }
    }

```



在收到来自 Dart 的 openPage 消息后，Android 侧的容器管理器（FlutterViewContainerMananger）会根据 Dart 侧携带来的配置数据打开一个容器，而这个 openContainer 通过阅读源码，可以发现它最后是一个抽象方法，需要我们自己在业务侧实现。回看我们在 3.2 节中在 Android 中初始化 Flutter Boost 第一步工作，做的就是实现这个 openContainer，而它最后交由我们封装的 PageRouter 工具类来实现了，即 context.startActivity()。


至此，我们在 Android 工程中集成了 Flutter Boost 来实现 Flutter 在 Android 项目中的混合开发。本文只是初步分析了下 Flutter Boost 的源码，后续有机会会补上详细的分析和 iOS 侧的接入使用。敬请期待。



## 附：Flutter Boost 接入实践（iOS 篇）



### 1. 前言


我们给 Android 接入 Flutter Boost 之后，现在我们来看看如何给 iOS 工程（OC）接入 Flutter Boost。


本文将简单梳理一下 iOS 工程接入的 Flutter Boost 的流程，以作为前文的补充。


> 参见前文：Flutter Boost 混合开发实践与源码解析（以 Android 为例），Flutter Module 也依旧用前文生成的，目录结构依旧如前文所述，不再赘述。



### 2. 接入



#### 2.1 工程准备


准备一个配有 Cocoapods 的空白工程，在 Podfile 中配置我们之前准备好的 Flutter Module 作为依赖：



```
flutter_application_path = '../flutter_module'
load File.join(flutter_application_path, '.ios', 'Flutter', 'podhelper.rb')

target 'FlutterHybridiOS' do
install_all_flutter_pods(flutter_application_path)
end
```


接着在工程根目录下运行 pod install ，即可集成上 Flutter Module。看到我们的 Pods 中多了以下几个模块，即说明集成成功。


![image.png](https://airing.ursb.me/image/blog/1585189850410-c1b92b89-ccff-447d-9b0a-49ec821696db.png)

> 如不了解 Cocoapods，请参见 CocoaPods 使用指南



#### 2.2 实现路由类


这一块直接参照 Flutter Boost 官方提供的 example 就好了：https://github.com/alibaba/flutter_boost/blob/master/example/ios/Runner/PlatformRouterImp.h


PlatformRouterImp.h：



```
#import <Foundation/Foundation.h>
#import <UIKit/UIKit.h>
#import <flutter_boost/FlutterBoost.h>

NS_ASSUME_NONNULL_BEGIN

@protocol FLBPlatform;

/**
 * 实现平台侧的页面打开和关闭，不建议直接使用用于页面打开，建议使用FlutterBoostPlugin中的open和close方法来打开或关闭页面；
 * FlutterBoostPlugin带有页面返回数据的能力
 */
@interface PlatformRouterImp : NSObject<FLBPlatform>
@property (nonatomic,strong) UINavigationController *navigationController;
@end

NS_ASSUME_NONNULL_END

```



PlatformRouterImp.m：



```
#import "PlatformRouterImp.h"
#import <flutter_boost/FlutterBoost.h>

@interface PlatformRouterImp()
@end

@implementation PlatformRouterImp

#pragma mark - Boost 1.5
- (void)open:(NSString *)name
   urlParams:(NSDictionary *)params
        exts:(NSDictionary *)exts
  completion:(void (^)(BOOL))completion
{
    BOOL animated = [exts[@"animated"] boolValue];
    FLBFlutterViewContainer *vc = FLBFlutterViewContainer.new;
    [vc setName:name params:params];
    [self.navigationController pushViewController:vc animated:animated];
    if(completion) completion(YES);
}

- (void)present:(NSString *)name
   urlParams:(NSDictionary *)params
        exts:(NSDictionary *)exts
  completion:(void (^)(BOOL))completion
{
    BOOL animated = [exts[@"animated"] boolValue];
    FLBFlutterViewContainer *vc = FLBFlutterViewContainer.new;
    [vc setName:name params:params];
    [self.navigationController presentViewController:vc animated:animated completion:^{
        if(completion) completion(YES);
    }];
}

- (void)close:(NSString *)uid
       result:(NSDictionary *)result
         exts:(NSDictionary *)exts
   completion:(void (^)(BOOL))completion
{
    BOOL animated = [exts[@"animated"] boolValue];
    animated = YES;
    FLBFlutterViewContainer *vc = (id)self.navigationController.presentedViewController;
    if([vc isKindOfClass:FLBFlutterViewContainer.class] && [vc.uniqueIDString isEqual: uid]){
        [vc dismissViewControllerAnimated:animated completion:^{}];
    }else{
        [self.navigationController popViewControllerAnimated:animated];
    }
}
@end

```



可以看到，Flutter Boost 支持常规 push，也支持打开模态弹窗，也支持手动 pop。



#### 2.3 绑定路由管理


AppDelegate.h：



```
#import <UIKit/UIKit.h>
#import <flutter_boost/FlutterBoost.h>

@interface AppDelegate : UIResponder <UIApplicationDelegate>
@property (nullable, nonatomic, strong) UIWindow *window;
@end

```



AppDelegate.m：



```
#import "AppDelegate.h"
#import "PlatformRouterImp.h"
#import <flutter_boost/FlutterBoost.h>

@interface AppDelegate ()

@end

@implementation AppDelegate

- (BOOL)application:(UIApplication *)application didFinishLaunchingWithOptions:(NSDictionary *)launchOptions {
    
    PlatformRouterImp *router = [PlatformRouterImp new];
    [FlutterBoostPlugin.sharedInstance startFlutterWithPlatform:router
                                                        onStart:^(FlutterEngine *engine) {
                                                            
                                                        }];
UITabBarController *tabVC = [[UITabBarController alloc] init];
UINavigationController *rvc = [[UINavigationController alloc] initWithRootViewController:tabVC];
    router.navigationController = rvc;
    
return YES;
}

```




### 3. 使用



```
- (void)openClick:(UIButton *)button
{
    [FlutterBoostPlugin open:@"first" urlParams:@{kPageCallBackId:@"MycallbackId#1"} exts:@{@"animated":@(YES)} onPageFinished:^(NSDictionary *result) {
        NSLog(@"call me when page finished, and your result is:%@", result);
    } completion:^(BOOL f) {
        NSLog(@"page is opened");
    }];
}

- (void)openPresentClick:(UIButton *)button
{
    [FlutterBoostPlugin open:@"second" urlParams:@{@"present":@(YES),kPageCallBackId:@"MycallbackId#2"} exts:@{@"animated":@(YES)} onPageFinished:^(NSDictionary *result) {
        NSLog(@"call me when page finished, and your result is:%@", result);
    } completion:^(BOOL f) {
        NSLog(@"page is presented");
    }];
}

```



同样的，这里可在 Native 端用两种不同的方式去打开我们在 Flutter Module 中注册好的路由名。


至此，我们成功在 iOS 工程中接入了 Flutter Boost，那就开启我们的混编之旅吧~
