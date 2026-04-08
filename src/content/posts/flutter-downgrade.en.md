---
title: "Flutter Exception Handling: Canary Rollout and Graceful Degradation"
date: 2021-02-18
tags: ["tech"]
description: ""
---

## 1. Flutter Exception Overview

There's plenty of content online about Flutter exception types and how to catch them, so I'll keep this brief — just enough to ensure the article is self-contained.

Flutter exceptions fall into a few categories:

- Dart exceptions
  - App exceptions
    - Synchronous exceptions
    - Asynchronous exceptions
  - Framework exceptions
- Engine exceptions

**Dart exceptions** are subdivided into App exceptions and Framework exceptions based on their origin. App exceptions, based on execution timing, are either:

- **Synchronous** — caught with `try-catch`
- **Asynchronous** — caught using `Future.catchError`

Flutter provides `Zone.runZoned`, which creates a sandboxed execution scope. The `onError` callback in `runZoned` intercepts all uncaught exceptions — both synchronous and asynchronous — so it's common practice to wrap `runApp` in `runZoned` to catch all App exceptions:

```dart
runZoned<Future<Null>>(() async {
  runApp(MyApp());
}, onError: (error, stackTrace) async {
 //Do sth for error
});
```

**Framework exceptions** are typically [thrown during Widget build](https://github.com/flutter/flutter/blob/master/packages/flutter/lib/src/widgets/framework.dart#L4579). The default `ErrorWidget` is the red error screen you see during development, and it can be overridden. You can intercept Framework exceptions by registering a callback on `FlutterError.onError`:

```dart
FlutterError.onError = (FlutterErrorDetails details) {
	reportError(details.exception, details.stack);
};
```

**Flutter Engine exceptions** correspond to crashes in `libflutter.so` on Android, or `Flutter.framework` on iOS. These are handled at the platform level by crash collection SDKs like Firebase Crashlytics or Bugly — more on that below.

## 2. Canary Rollout Strategy

Out of respect for production stability — and sometimes for operational requirements — any Flutter feature going to production needs a solid canary strategy and fallback mechanism. This section covers the canary approach.

The logic is straightforward: configure canary rules → backend delivers config + client fetches config → client applies config.

### 2.1 Canary Configuration

We define canary configuration fields on our internal config platform. These include:

- `key`: The Flutter page (route) this config applies to
- `appkey`: The host app for this config
- `minVersion` / `maxVersion`: Version range for the config to take effect
- `type`: Canary strategy type — options include tail-digit bucketing, region-based, device blacklist, OS blacklist, hybrid mode, and whitelist mode. Whitelist is for testing; hybrid supports combining multiple strategies into a union.
- `action`: Rollout scope — full rollout, fully disabled, or partial canary
- `url`: The fallback URL for degradation, with support for placeholder syntax that lets the client map Flutter route params to URL query parameters

### 2.2 Backend Delivery and Client Config Loading

Config is fetched on both cold and warm starts. Failures retry up to three times. A singleton manages the config locally, and this config is checked every time the business layer is about to open a Flutter page. To guard against three consecutive fetch failures at deploy time, a default degradation config map is bundled locally. In extreme scenarios, degradation is triggered automatically.

### 2.3 Client Config Processing

Every time the business layer is about to open a Flutter page, the canary config is checked to determine whether to show the Flutter page. If the user doesn't hit the canary (i.e., they fall into the degradation bucket), the client fetches the fallback URL from the config and opens the corresponding H5 page in WebView.

An important note: in our case, most Flutter pages were originally H5 pages, so there's always a working H5 fallback. For future Flutter-only features without an H5 counterpart, we're exploring isomorphic Flutter Web solutions.

## 3. Degradation Mechanisms

Timely degradation is what keeps Flutter features reliable. Canary rollout and degradation both come down to the same thing: deciding whether to show Flutter or H5. The difference is that canary is manually configured, while degradation triggers automatically. A local config — versioned by app version — is maintained, and it's checked before each page open. There are several scenarios where automatic degradation kicks in:

### 3.1 Missing Canary Hit

As described above, if a canary strategy is configured but the current user doesn't hit the canary, the corresponding Flutter page is degraded and the event is logged.

### 3.2 Framework Exception Degradation

If a Flutter Framework exception is caught, the affected page is flagged as "needs degradation." We display a custom `ErrorWidget` to inform the user that something went wrong and ask them to re-enter. On their next visit, degradation fires and redirects them to the H5 version.

For Dart exceptions, since Dart's event loop model keeps each task independent, an exception in one task doesn't affect others. The user can still use other parts of the page. Because the impact is limited, we don't force degradation for Dart exceptions — we only log the error.

### 3.3 Engine Crash Degradation

An engine-level crash inevitably causes an app crash. Beyond reporting the crash log, we also set a flag. On the next app launch, the Flutter Engine is not started, and all Flutter pages are degraded across the board.

### 3.4 Artifact Load Failure Degradation

We use a custom engine and perform artifact trimming on the Flutter output. At release time, the `App.framework` includes an MD5 hash for the trimmed zip package. On first launch, the app downloads the trimmed artifacts before starting the engine, then verifies the integrity of the downloaded package. If the download fails — even with retry logic — the engine can't start, and all Flutter pages are degraded and the event is reported.

### 3.5 Flutter-related Crash Degradation

We've also encountered crashes related to Flutter that aren't engine crashes, aren't artifact load failures, and aren't Flutter exceptions — typically issues with Flutter plugins themselves (e.g., a bug in a plugin's native implementation). These crashes don't contain "Flutter" in Bugly's logs, because the process isn't crashing inside Flutter or the engine.

To handle these, we track the `topViewController` at the time of a crash or ANR and trace back the navigation history. If the current route stack contains a Flutter Activity or `FlutterViewController`, we degrade anyway as a precaution.

## 4. Operational Reports

The Flutter operations report is sourced from performance metrics and exception reports. Crash alerting is handled by Bugly on the client side. The report tracks each Flutter page across different app versions, with metrics like:

- PV (page views)
- Success rate
- Crash rate and affected user count
- Time-to-interactive rate (sub-300ms threshold)
- Degradation rate and canary rate
- And more...

Finally, here's the startup flow diagram combining dynamic artifact loading with the degradation strategy:

![Startup Flow](https://airing.ursb.me/image/flutter-start-flowchart-bg.png)

## References

- [Flutter Exception Handling | Flutter Developer](http://flutter.link/2020/07/01/Flutter%E4%B8%AD%E7%9A%84%E5%BC%82%E5%B8%B8%E5%A4%84%E7%90%86/)
- [Capturing and Reporting Flutter App Crash Logs | Yrom's Blog](https://yrom.net/blog/2019/07/05/dump-crash-log-for-flutter/#Flutter-App-%E4%BB%A3%E7%A0%81%E5%BC%82%E5%B8%B8%E6%8D%95%E8%8E%B7)
