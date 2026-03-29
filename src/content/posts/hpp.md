---
title: "前端安全 | HPP 的攻击举例与防范"
date: 2019-04-10
tags: ["tech"]
description: ""
---

## HPP 的攻击原理


HPP，即 HTTP Parameter Pollution，HTTP 参数污染。在 HTTP 协议中是运行同样名称的参数出现多次，攻击者通过传播参数的时候传输 key 相同而 value 不同的参数，从而达到绕过某些防护与参数校验的后果。它是一种注入型的漏洞，攻击者通过在 HTTP 请求中插入特定的参数来发起攻击。


举一个栗子：


2015 年，有人发现了 HackerOne 社交分享按钮的 HPP 漏洞。


漏洞报告中是将 URL：


https://hackerone.com/blog/introducing-signal


修改为：


https://hackerone.com/blog/introducing-signal?&u=https://me.ursb.me


当通过社交媒体链接分析内容时，此链接就会变成：


https://www.facebook.com/sharer.php?u=https://hackerone.com/blog/introducing-signal?&u=https://me.ursb.me


这里，最后的参数 u 就会拥有比第一个更高的优先级，在 Facebook 分享时，Facebook 会跳转到 https://me.ursb.me 而非 hackerone。


这里来一个小 demo，更形象化的复现这个问题：



```
const express = require('express')
const bodyParser = require('body-parser')
const app = express()

app.use(bodyParser.json())

app.post('/login', (req, res, next) => {
  const { account } = req.body
  return res.json({ message: `login sccessful: ${account}` });
})

app.listen(3000)

```



请求一下这个模拟的登录接口，假设这里用户在前端输入了 airing，预想登录账户 airing。但是请求被篡改，这里附带了两个一样的 account 参数，一个值为 airing，另一个为 ursb，在后端不做校验的情况下，最终登录的是 ursb 而非 airing。



```
POST /login HTTP/1.1
Host: localhost:3000
Content-Type: application/json

{
    "account": "airing",
    "account": "ursb"
}

```




```
HTTP/1.1 200 OK
X-Powered-By: Express
Content-Type: application/json; charset=utf-8
Content-Length: 35
ETag: W/"23-/iZ+yuhJ7IhuWOkYuK395opzCZI"
Date: Thu, 11 Apr 2019 13:09:53 GMT
Connection: close

{
  "message": "login sccessful: ursb"
}

```




## HPP 的防范措施


HPP 的行为主要取决于后端收到多个名称相同的参数时会如何处理。不同服务器处理方式不同：


![image.png](https://cdn.nlark.com/yuque/0/2019/png/99583/1554987043586-d0373afc-bdef-414f-a0cc-3c2c8179abfb.png#align=left&display=inline&height=403&name=image.png&originHeight=403&originWidth=691&size=80164&status=done&width=691)

我们需要注意 HTTP 协议是允许同名的参数的，在整个应用的处理过程中要意识到这一点从而根据业务的特征对这样的情况作正确的处理。当然要防止 HPP 漏洞，最重要的是后端一定要做好对输入参数的校验。



## 参考资料


- [安全 | egg](https://eggjs.org/zh-cn/core/security.html)
- [Web 应用里的 HTTP 参数污染（HPP）漏洞 | CSDN](https://blog.csdn.net/eatmilkboy/article/details/6761407)
- [HPP | Web Hacking 101](https://github.com/wizardforcel/web-hacking-101-zh/blob/master/6.md)
