---
title: "前端安全 | XST 的攻击原理与防御"
date: 2019-04-09
tags: ["tech"]
description: ""
---

## XST 的攻击手段


XST 的全称是 Cross-Site Tracing，中文译作“跨站式追踪攻击”。具体而言，是客户端发 TRACE / TRACK 请求至服务器，如果服务器按照标准实现了 TRACE / TRACK 响应，则在 response body 里会返回此次请求的完整头信息。通过这种方式，客户端可以获取某些敏感的 header 字段，例如 httpOnly 的 Cookie 等。


可见 XST 的攻击原理非常之简单，借由 XST 攻击获取到 Cookie 信息或者其他敏感信息之后，攻击者可以利用这些信息再发动 XSS、CSRF、中间人攻击等，看似无害，但潜在的危险却很巨大。仅根据 XST 攻击并不会对服务器造成实质性的伤害，它真实的影响是暴露了敏感的 header 数据，如拥有 httpOnly 属性的 Cookie，已经禁止前端 JavaScript 访问它（如 document.cookie），防止它被发送给第三方，但即使在这种情况下，TRACE 方法也可用于绕过此保护并访问 cookie。因此 XST 也被称作 Trace 泄露攻击、Trace header 反射、Trace 方法注入（TMI）、Trace Header Cookie 攻击（THC）。


XST 攻击的条件：


1. **需要目标 Web 服务器允许接受 Trace、Track 方法的请求**。
2. 客户端可以发送 Trace、Track 方法的请求。（如今浏览器环境下已经杜绝这种请求）


下面举个栗子，这里我用 Express 搭建了一个简单的 Web 服务器，接受一个 Trace 方法的请求：



```
import express from 'express'
import cookieParser from 'cookie-parser'

const app = express()

app.use(cookieParser())

app.use('/', (req, res, next) => {
  
  res.cookie('account', 'airing', { maxAge: 900000, httpOnly: true })

  return res.json(req.headers)
})

app.listen(3000)

```



我们用 TRACE 方法携带 Cookie 请求，可以发现 Cookie 是可以被发送过去的（Chrome 24 环境下）：



```
var xhr = new XMLHttpRequest();
xhr.open('TRACE', 'http://127.0.0.1:3000/', false);
xhr.withCredentials = true
xhr.setRequestHeader('Cookie', 'account=airingursb');
xhr.send(null);
if(200 == xhr.status) console.log(xhr.responseText);

```



XST 的真正结果是它暴露了 JavaScript 通常无法访问的 HTTP 头，httpOnly 本应该阻止 JavaScript 读取与发送 cookie 到服务器，但 XST 成功绕过了 httpOnly 的限制。另外，用于 HTTP Basic Auth 的 Authentication 头只是 Base64 编码的用户名和密码，不是 DOM 的一部分，理应也不能直接被 JavaScript 读取，但若使用 XST 也可以绕过。这些敏感信息只通过一个 Trace 请求却全都暴露了出来。



## XST 的防御方法


杜绝 XST 非常简单，Web 服务器限制 Trace、Track 方法的请求即可。另如今， XMLHTTPRequest 已经杜绝了 Trace 与 Track 方法的请求（Chrome 25 版本及 FireFox 19 之后），如果尝试用 Trace / Track 方法请求，会抛出 SecurityError 异常，这也从根本上杜绝了 XST 攻击。



```
var xhr = new XMLHttpRequest();
xhr.open('TRACE', 'http://localhost:3000/', false);
xhr.send(null);
if(200 == xhr.status) console.log(xhr.responseText);

```



![image.png](https://cdn.nlark.com/yuque/0/2019/png/99583/1554882839653-7d6117de-40bf-40cb-ba55-c29ab988e8c7.png#align=left&display=inline&height=54&name=image.png&originHeight=54&originWidth=682&size=14323&status=done&width=682)

同时，在 FireFox 43 之后，Cookie 等不安全字段也被禁止携带在请求的 header 中发送。详见 Forbidden header name | MSD


虽说目前现代浏览器已经越来越安全，XST 也成为了历史，但其给我们 web 开发者也留下警示——代码编写时一定要注意安全性和严谨性。



## 参考资料


- [安全 | egg](https://eggjs.org/zh-cn/core/security.html)
- [cross-site tracing XST攻击 | CSDN](https://blog.csdn.net/xysoul/article/details/47830787)
- [Cross-Site Tracing (XST): The misunderstood vulnerability](https://deadliestwebattacks.com/2010/05/18/cross-site-tracing-xst-the-misunderstood-vulnerability/)
