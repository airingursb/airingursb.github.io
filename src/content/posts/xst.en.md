---
title: "Frontend Security | XST Attack Principles and Prevention"
date: 2019-04-09
tags: ["tech"]
description: ""
---

## How XST Works

XST stands for Cross-Site Tracing. In practice, a client sends a TRACE or TRACK request to a server, and if the server has implemented TRACE/TRACK responses according to the standard, it returns the complete request headers in the response body. This allows a client to obtain sensitive header fields — including `httpOnly` cookies.

The attack mechanism is remarkably simple. Once an attacker obtains cookie data or other sensitive information via XST, they can use it to launch further attacks: XSS, CSRF, man-in-the-middle attacks, and more. It may seem harmless on its own, but the potential damage is significant.

XST's real impact is exposing HTTP headers that JavaScript normally can't access. `httpOnly` cookies are supposed to prevent JavaScript from reading or sending them to third parties — but TRACE can bypass this protection entirely. Similarly, `Authentication` headers used for HTTP Basic Auth are only Base64-encoded username/password, not part of the DOM, so they should be inaccessible to JavaScript directly. But XST can bypass that too. All this sensitive information gets exposed through a single TRACE request.

For this reason, XST is also known as Trace Disclosure Attack, Trace Header Reflection, Trace Method Injection (TMI), or Trace Header Cookie Attack (THC).

Conditions for an XST attack:

1. **The target web server must accept TRACE or TRACK method requests.**
2. The client must be able to send TRACE or TRACK requests. (Modern browsers have since blocked this.)

Here's a demo — an Express server that accepts a TRACE request:

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

Using TRACE with cookies, you can see the cookie being sent across (tested in Chrome 24):

```
var xhr = new XMLHttpRequest();
xhr.open('TRACE', 'http://127.0.0.1:3000/', false);
xhr.withCredentials = true
xhr.setRequestHeader('Cookie', 'account=airingursb');
xhr.send(null);
if(200 == xhr.status) console.log(xhr.responseText);
```

## Preventing XST

Prevention is straightforward: simply configure your web server to reject TRACE and TRACK requests.

Additionally, modern browsers have already blocked this vector at the network level. `XMLHttpRequest` no longer allows TRACE or TRACK methods (since Chrome 25 and Firefox 19). Attempting to make such a request now throws a `SecurityError`, which effectively eliminates XST at its root.

```
var xhr = new XMLHttpRequest();
xhr.open('TRACE', 'http://localhost:3000/', false);
xhr.send(null);
if(200 == xhr.status) console.log(xhr.responseText);
```

![image.png](https://cdn.nlark.com/yuque/0/2019/png/99583/1554882839653-7d6117de-40bf-40cb-ba55-c29ab988e8c7.png#align=left&display=inline&height=54&name=image.png&originHeight=54&originWidth=682&size=14323&status=done&width=682)

Since Firefox 43, unsafe header fields like `Cookie` are also forbidden from being sent in request headers. See: Forbidden header name | MDN.

While XST has largely become a historical footnote as modern browsers grow more secure, it still serves as a reminder to web developers: always write code with security and rigor in mind.

## References

- [Security | egg](https://eggjs.org/zh-cn/core/security.html)
- [cross-site tracing XST attack | CSDN](https://blog.csdn.net/xysoul/article/details/47830787)
- [Cross-Site Tracing (XST): The misunderstood vulnerability](https://deadliestwebattacks.com/2010/05/18/cross-site-tracing-xst-the-misunderstood-vulnerability/)
