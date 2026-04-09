---
title: "Frontend Security | HPP Attack Examples and Prevention"
date: 2019-04-10
tags: ["tech"]
description: ""
---

## How HPP Attacks Work

HPP stands for HTTP Parameter Pollution. The HTTP protocol allows the same parameter name to appear multiple times in a request, and attackers exploit this by sending multiple parameters with the same key but different values. This can bypass certain security checks and parameter validation. It's an injection-type vulnerability where attackers insert specially crafted parameters into HTTP requests to launch an attack.

Here's a real-world example:

In 2015, someone discovered an HPP vulnerability in HackerOne's social sharing button.

The vulnerability report showed that modifying the URL:

https://hackerone.com/blog/introducing-signal

to:

https://hackerone.com/blog/introducing-signal?&u=https://me.ursb.me

would cause the social sharing link to become:

https://www.facebook.com/sharer.php?u=https://hackerone.com/blog/introducing-signal?&u=https://me.ursb.me

Here, the last `u` parameter takes higher priority than the first. When sharing on Facebook, users would be redirected to `https://me.ursb.me` instead of HackerOne.

Let me put together a small demo to illustrate this more concretely:

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

Say a user types "airing" in the frontend and intends to log in as `airing`. But the request is tampered with — two `account` parameters are sent, one with value `airing` and one with `ursb`. Without backend validation, the server ends up logging in `ursb` instead:

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

## Preventing HPP

How HPP behaves depends entirely on how the server handles multiple parameters with the same name. Different servers handle it differently:

![image.png](https://cdn.nlark.com/yuque/0/2019/png/99583/1554987043586-d0373afc-bdef-414f-a0cc-3c2c8179abfb.png#align=left&display=inline&height=403&name=image.png&originHeight=403&originWidth=691&size=80164&status=done&width=691)

Keep in mind that the HTTP protocol does allow duplicate parameter names. Throughout the entire request processing pipeline, developers should be aware of this and handle such cases correctly based on their application's business logic. The most important defense against HPP is thorough backend validation of all input parameters.

## References

- [Security | egg](https://eggjs.org/zh-cn/core/security.html)
- [HTTP Parameter Pollution (HPP) Vulnerabilities in Web Applications | CSDN](https://blog.csdn.net/eatmilkboy/article/details/6761407)
- [HPP | Web Hacking 101](https://github.com/wizardforcel/web-hacking-101-zh/blob/master/6.md)
