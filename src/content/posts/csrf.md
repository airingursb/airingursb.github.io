---
title: "前端安全 | CSRF 的攻击手段与防范"
date: 2019-04-08
tags: ["tech"]
description: ""
---

## CSRF 的攻击类型


CSRF，全称 Cross Site Request Forgery，跨站请求伪造，也被称为 XSRF、one-click attack 或者 session riding，是一种劫持受信任用户向服务器发送非预期请求的攻击方式。攻击者诱导受害者进入第三方网站，在第三方网站中，向被攻击网站发送跨站请求。利用受害者在被攻击网站已经获取的注册凭证，绕过后台的用户验证，达到冒充用户对被攻击的网站执行某项操作的目的。与 XSS 相比，XSS 利用的是用户对指定网站的信任，CSRF 利用的是网站对用户网页浏览器的信任。


通常情况下，CSRF 攻击是攻击者借助受害者的 Cookie 骗取服务器的信任，可以在受害者毫不知情的情况下以受害者名义伪造请求发送给受攻击服务器，从而在并未授权的情况下执行在权限保护之下的操作。


![CSRF 原理](https://airing.ursb.me/image/blog/csrf.jpg)

来自知乎 李向天 的回答中有一段关于 CSRF 的生动描述：


> 防盗系统启动：
> 妈妈: 给我看着衣服呀
> 小孩: 好的
> 小偷来了
> 正常工作:
> 小孩: 你是谁?
> 小偷: 我是张三
> 小孩:妈妈,有人偷衣服
> 妈妈: 谁?
> 小孩: 张三
> 小偷被抓
> 漏洞:
> 小孩: 你是谁?
> 小偷: 我叫逗你玩
> 小孩: 妈妈有人偷衣服呀
> 妈妈: 谁?
> 小孩: 逗你玩
> 妈妈: ...
> CSRF 是让用户在不知情的情况下，冒用其身份发起了一个请求：
> 小偷: 你妈妈喊你去买洗衣粉


CSRF 原理很简单，甚至较于 XSS 显得更为单调。具体而言，包括以下 3 种攻击类型：


1. GET 类型的 CSRF
2. POST 类型的 CSRF
3. 链接类型的 CSRF



### GET 类型的 CSRF


这类攻击非常简单，只需要一个HTTP请求：



```
<img src="http://a.com/withdraw?amount=10000&for=hacker" >

```



在受害者访问含有这个 img 的页面后，浏览器会自动向 a.com 发出一次HTTP请求。a.com 就会收到包含受害者登录信息的一次跨域请求。



### POST 类型的 CSRF


这种类型的 CSRF 利用起来通常使用的是一个自动提交的表单，如：



```
<form action="http://a.com/withdraw" method=POST>
    <input type="hidden" name="account" value="airing" />
    <input type="hidden" name="amount" value="10000" />
    <input type="hidden" name="for" value="hacker" />
</form>
<script> document.forms[0].submit(); </script>

```



访问该页面后，表单会自动提交，相当于模拟用户完成了一次 POST 操作。可见这种类型的 CSRF 与第一种一样，都是模拟请求，所以后端接口也不能将安全寄托在仅允许 POST 请求上。



### 链接类型的 CSRF


链接类型的CSRF并不常见，比起其他两种用户打开页面就中招的情况，这种需要用户点击链接才会触发，但本质上与前两种一样。这种类型通常是在论坛中发布的图片中嵌入恶意链接，或者以广告的形式诱导用户中招，攻击者通常会以比较夸张的词语诱骗用户点击，例如：



```
<a href="http://a.com/withdraw.php?amount=1000&for=hacker" taget="_blank">
 屠龙宝刀，点击就送！ 
 <a/>

```



由于之前用户登录了信任的网站A，并且保存登录状态，只要用户主动访问上面的这个页面，则表示攻击成功。



## CSRF 的防御方法


CSRF 通常从第三方网站发起，被攻击的网站无法防止攻击发生，只能通过增强自己网站针对 CSRF 的防护能力来提升安全性。


上文中讲了 CSRF 的两个特点：


1. CSRF（通常）**发生在第三方域名**。
2. CSRF 攻击者不能获取到 Cookie 等信息，**只是使用**。


针对以上特点，CSRF 可制定以下两种防御策略：


1. **自动防御：阻止不明外域的访问**


- 同源检测
- Samesite Cookie


1. **主动防御：提交时要求附加本域才能获取的信息**


- Synchrogazer Tokens
- Double Cookie Defense
- Custom Header


自动防御即利用 HTTP 协议固有的特性进行自动防护，而主动防御则需要通过编程手段进行防御。



### CSRF 自动防御策略



#### 同源检测


既然 CSRF 大多来自第三方网站，那么我们就直接禁止外域/不信任的域对我们发起请求。


在 HTTP 协议中，每一个异步请求都会携带两个 Header，用于标记来源域名：


- Origin Header<□ />
- Referer Header<□ />


通过验证这两个 Header 是否受信任从而实现同源检测。但这种方法并非万无一失，Referer 的值是由浏览器提供的，虽然 HTTP 协议上有明确的要求，但是每个浏览器对于 Referer 的具体实现可能有差别，并不能保证浏览器自身没有安全漏洞。使用验证 Referer 值的方法，就是把安全性都依赖于第三方来保障，从理论上来讲，这样并不是很安全。在部分情况下，攻击者可以隐藏，甚至修改自己请求的 Referer。我们在写爬虫之时，也通常会修改 Header 去绕过服务器的同源检测。在【基本功】 前端安全系列之二：如何防止CSRF攻击？ | 美团技术团队 一文中具体分析了 Referer 的可信度与危险场景，这里限于篇幅便不再赘述。


综上所述，同源验证是一个相对简单的防范方法，能够防范绝大多数的 CSRF 攻击。但这并不是万无一失的，对于安全性要求较高，或者有较多用户输入内容的网站，我们就要对关键的接口做额外的防护措施，也就是下文即将说到的主动防御策略。



#### Samesite Cookie


为了从源头上解决这个问题，Google 起草了一份草案 来改进 HTTP 协议，那就是为 Set-Cookie 响应头新增 Samesite 属性，它用来标明这个 cookie 是个“同站 cookie”，同站 cookie 只能作为第一方 cookie，不能作为第三方 cookie。SameSite 有两个属性值，分别是 Strict 和 Lax。


- Samesite=Strict：严格模式，表明这个 cookie 在任何情况下都不可能作为第三方 cookie，绝无例外。
- Samesite=Lax：宽松模式，比 Strict 放宽了点限制。假如这个请求是同步请求（改变了当前页面或者打开了新页面）且同时是个 GET 请求，则这个 cookie 可以作为第三方 cookie。


但 Samesite Cookie 也存在着一些问题：


1. Samesite 的兼容性不是很好，现阶段除了从新版 Chrome 和 Firefox 支持以外，Safari 以及 iOS Safari 都还不支持，现阶段看来暂时还不能普及。
2. 而且，SamesiteCookie 目前有一个致命的缺陷，**不支持子域**。例如，种在 blog.ursb.me 下的 Cookie，并不能使用 ursb.me 下种植的 SamesiteCookie。这就导致了当我们网站有多个子域名时，不能使用SamesiteCookie 在主域名存储用户登录信息。每个子域名都需要用户重新登录一次。这是不实际的。



### CSRF 主动防御策略


CSRF 主动防御措施有以下三种：


1. **Synchronizer Tokens**：通过响应页面时将 token 渲染到页面上，在 form 表单提交的时候通过隐藏域提交上来。
2. **Double Cookie Defense**：将 token 设置在 Cookie 中，在提交 POST 请求的时候提交 Cookie，并通过 header 或者 body 带上 Cookie 中的 token，服务端进行对比校验。
3. **Custom Header**：信任带有特定的 header（例如 `X-Requested-With: XMLHttpRequest`）的请求。这个方案可以被绕过，所以 rails 和 django 等框架都放弃了该防范方式。


所以下文主要讲讲前面两种防御方式。



#### Synchrogazer Token


Synchrogazer Token，即同步表单的 CSRF 校验。CSRF 攻击之所以能够成功，是因为服务器误把攻击者发送的请求当成了用户自己的请求。那么我们可以要求所有的用户请求都携带一个 CSRF 攻击者无法获取到的 Token。服务器通过校验请求是否携带正确的 Token，来把正常的请求和攻击的请求区分开，也可以防范 CSRF 的攻击。


具体而言，分为以下三个步骤：


1. 将 CSRF Token 输出到页面中
2. 页面提交的请求携带这个 Token，通常隐藏在表单域中作为参数提交，或拼接在 URL 后作为 query 提交。
3. 服务器验证 Token 是否正确


当用户从客户端得到了 Token，再次提交给服务器的时候，服务器需要判断 Token 的有效性，验证过程是先解密 Token，对比加密字符串以及时间戳，如果加密字符串一致且时间未过期，那么这个 Token 就是有效的。这种 Token 的值通常是使用 UserID、时间戳和随机数，通过加密的方法生成。这样的加密既能验证请求的用户、请求的时间，又能保证 Token 不容易被破解。个人在项目中使用以下加密方式，仅供参考：



```
import md5 from 'md5'

export const MESSAGE = {
  OK: {
    code: 0,
    message: '请求成功',
  },
  TOKEN_ERROR: {
    code: 403,
    message: 'TOKEN失效',
  },
}

const md5Pwd = (password) => {
  const salt = 'Airing_is_genius'
  return md5(md5(password + salt))
}

export const validate = (res, check, ...params) => {

  for (let param of params) {
    if (typeof param === 'undefined' || param === null) {
      return res.json(MESSAGE.PARAMETER_ERROR)
    }
  }

  if (check) {
    const uid = params[0]
    const timestamp = params[1]
    const token = params[2]

    if (token !== md5Pwd(uid.toString() + timestamp.toString() + KEY))
      return res.json(MESSAGE.TOKEN_ERROR)
  }
}

```



这种方法要比之前检查 Referer 或者 Origin 要安全一些，Token 可以在产生并放于 Session 之中，然后在每次请求时把 Token 从 Session 中拿出，与请求中的 Token 进行比对。但是有以下两点需要注意。


1. **Session Vs Cookie**若可以将 token 存放到 Session 中，却是一个不错的选择**。
2. **刷新 CSRF Token**：当 CSRF token 存储在 Cookie 中时，一旦在同一个浏览器上发生用户切换，新登陆的用户将会依旧使用旧的 token（之前用户使用的），这会带来一定的安全风险，因此在每次用户登陆的时候都**必须刷新 CSRF token**。



#### Double Cookie Defence


Double Cookie Defence，中文译作双重 Cookie 验证。


在 Session 中存储 CSRF Token 比较繁琐，而且不能在通用的拦截上统一处理所有的接口。那么另一种防御措施是使用双重提交 Cookie。利用 CSRF 攻击不能获取到用户 Cookie 的特点，我们可以要求 Ajax 和表单请求携带一个 Cookie 中的值。


1. 在用户访问网站页面时，向请求域名注入一个Cookie，内容为随机字符串。
2. 在前端向后端发起请求时，取出Cookie，并添加到URL的参数中。
3. 后端接口验证Cookie中的字段与URL参数中的字段是否一致，不一致则拒绝。


此方法相对于 CSRF Token 就简单了许多。可以直接通过前后端拦截的的方法自动化实现。后端校验也更加方便，只需进行请求中字段的对比，而不需要再进行查询和存储 Token。但是它并没有被大规模应用，尤其在大型网站上，存在着严重的缺陷。举一个栗子：


由于任何跨域都会导致前端无法获取 Cookie 中的字段（包括子域名之间），所以当用户访问我的 me.ursb.me 之时，由于我的后端 api 部署在 api.ursb.me 上，那么在 me.ursb.me 用户拿不到 api.ursb.me 的 Cookie，也就无法完成双重 Cookie 验证。依此，我们的 Cookie 放在了 ursb.me 主域名下，以保证每个子域名都可以访问。但 ursb.me 下其实我还部署了很多其他的子应用，如果某个子域名 xxx.ursb.me 存在漏洞，虽然这个 xxx.ursb.me 可能没有什么值得窃取的信息，但是攻击者可以修改 ursb.me 下的 Cookie，从而实现 XSS 攻击，并利用篡改的 Cookie 对 me.ursb.me 发起 CSRF 攻击。同时，为了确保 Cookie 传输安全，采用这种防御方式的最好确保用整站 HTTPS 的方式，如果还没切 HTTPS 的使用这种方式会有风险。


以下是来自 【基本功】 前端安全系列之二：如何防止CSRF攻击？ | 美团技术团队 的关于双重 Token 验证的总结：


优点：


- **无需使用 Session**，适用面更广，易于实施。
- **Token 储存于客户端中**，不会给服务器带来压力。
- 相对于 Token，实施成本更低，**可以在前后端统一拦截校验**，而不需要一个个接口和页面添加。


缺点：


- Cookie 中增加了额外的字段。
- 如果有其他漏洞（例如 XSS），攻击者可以注入 Cookie，那么该防御方式失效。
- 难以做到子域名的隔离。
- 为了确保 Cookie 传输安全，采用这种防御方式的最好确保用整站 HTTPS 的方式，如果还没切 HTTPS 的使用这种方式也会有风险。



## 参考资料


- [安全 | egg](https://eggjs.org/zh-cn/core/security.html)
- [【基本功】 前端安全系列之二：如何防止CSRF攻击？ | 美团技术团队](https://mp.weixin.qq.com/s?__biz=MjM5NjQ5MTI5OA==&mid=2651748960&idx=3&sn=93b468b875ee1e2d72c0a0c3464831a3&chksm=bd12a32d8a652a3b580b1ccac86c98204691dffa8ef1dbef3ac65fe7bca2ac9d6562a45aa501&mpshare=1&scene=1&srcid=12076o2m6iOmEAFUGxuZQg3U%23rd)
- [CSRF 攻击的应对之道 | IBM Developer](https://www.ibm.com/developerworks/cn/web/1102_niugang_csrf/)
