---
title: "前端安全 | XSS 的攻击手段与防范"
date: 2019-04-07
tags: ["tech"]
description: ""
---

## 1. XSS 的攻击手段


XSS)（Cross-Site Scripting，跨域脚本攻击）攻击是最常见的 Web 攻击，是一种代码注入攻击。攻击者通过在目标网站上注入恶意脚本，使之在用户的浏览器上运行。利用这些恶意脚本，攻击者可获取用户的敏感信息如 Cookie、SessionID 等，进而危害数据安全。其重点是『跨域』和『客户端执行』。


XSS 的本质：


- 恶意代码未经过滤，与网站正常的代码混在一起；
- 浏览器无法分辨哪些脚本是可信的，导致恶意脚本被执行。


XSS 攻击一般存在以下几类：


- **Reflected XSS（反射型 XSS 攻击）**
- **Stored XSS（存储型 XSS 攻击）**
- **DOM XSS**
- **JSONP XSS**


| 类型 | 存储区 | 插入点 |
| --- | --- | --- |
| Reflected XSS | URL | HTML |
| Stored XSS | 后端数据库 | HTML |
| DOM XSS | 后端数据库 / 前端存储 / URL | 前端 JavaScript |
| JSONP XSS | 后端数据库 / 前端存储 / URL | 前端 JavaScript |


### 1.1 Reflected XSS


反射型的 XSS 攻击，主要是由于服务端接收到客户端的不安全输入，在客户端触发执行从而发起 Web 攻击。


具体而言，反射型 XSS 只是简单地把用户输入的数据 “反射” 给浏览器，这种攻击方式往往需要攻击者诱使用户点击一个恶意链接，或者提交一个表单，或者进入一个恶意网站时，注入脚本进入被攻击者的网站。这是一种非持久型的攻击。


比如：在某购物网站搜索物品，搜索结果会显示搜索的关键词。搜索关键词填入<script>alert('handsome boy')</script>，点击搜索。页面没有对关键词进行过滤，这段代码就会直接在页面上执行，弹出 alert。



### 1.2 Stored XSS


基于存储的 XSS 攻击，是通过提交带有恶意脚本的内容存储在服务器上，当其他人看到这些内容时发起 Web 攻击。一般提交的内容都是通过一些富文本编辑器编辑的，很容易插入危险代码。


比较常见的一个场景是攻击者在社区或论坛上写下一篇包含恶意 JavaScript 代码的文章或评论，文章或评论发表后，所有访问该文章或评论的用户，都会在他们的浏览器中执行这段恶意的 JavaScript 代码。这是一种持久型的攻击。



### 1.3 DOM XSS


基于 DOM 的 XSS 攻击是指通过恶意脚本修改页面的 DOM 结构，是纯粹发生在客户端的攻击。


DOM 型 XSS 跟前两种 XSS 的区别：DOM 型 XSS 攻击中，取出和执行恶意代码由浏览器端完成，属于前端 JavaScript 自身的安全漏洞，而其他两种 XSS 都属于服务端的安全漏洞。举个栗子：



```
<input type="text" id="input">
<button id="btn">Submit</button>
<div id="div"></div>
<script>
    const input = document.getElementById('input');
    const btn = document.getElementById('btn');
    const div = document.getElementById('div');
 
    let val;
    
    input.addEventListener('change', (e) => {
        val = e.target.value;
    }, false);
 
    btn.addEventListener('click', () => {
        div.innerHTML = `<a href=${val}>testLink</a>`
    }, false);
</script>

```



点击 Submit 按钮后，会在当前页面插入一个链接，其地址为用户的输入内容。如果用户在输入时构造了如下内容：



```
" onclick=alert(/xss/)
```


用户提交之后，页面代码就变成了：



```
<a href onlick="alert(/xss/)">testLink</a>

```



此时，用户点击生成的链接，就会执行对应的脚本。DOM 型 XSS 攻击，实际上就是网站前端 JavaScript 代码本身不够严谨，把不可信的数据当作代码执行了。在使用 .innerHTML、.outerHTML、document.write() 时要特别小心，不要把不可信的数据作为 HTML 插到页面上，而应尽量使用 .textContent、.setAttribute() 等。


DOM 中的内联事件监听器，如 location、onclick、onerror、onload、onmouseover 等，<a> 标签的 href 属性，JavaScript 的 eval()、setTimeout()、setInterval() 等，都能把字符串作为代码运行。如果不可信的数据拼接到字符串中传递给这些 API，很容易产生安全隐患，请务必避免。



### 1.4 JSONP XSS


JSONP 的 callback 参数非常危险，他有两种风险可能导致 XSS：


1. callback 参数**意外截断 js 代码**，特殊字符单引号双引号，换行符均存在风险。
2. callback 参数**恶意添加标签**，造成 XSS 漏洞。


浏览器为了保证跨域访问的安全性，会默认发一个 callback 参数到后台，接口拿到这个参数之后，需要将返回的 JSON 数据外面包上 callback 参数。


具体的返回格式：



```
CALLBACK(JSON)

```



如果 ajax 请求是 JSONP 请求，返回的内容浏览器还会自动检测，如果不是按这个格式返回或者 callback 的内容不对，这次请求就算失败了。


这里有一个机制，那就是请求的 callback 会被放入返回的内容当中，这也是可能出问题的地方。举个栗子，如果返回的页面，那么 Content-Type: text/html，那么 callback 注入的 html 元素都可以直接放到页面上了。那么，html 页面必然不能支持 callback。支持 JSONP 的链接如果直接放到浏览器里面访问，浏览器就不会做 callback 校验了。



## 2. XSS 的防御方式



### 2.1 防御 XSS 的根本之道


通过前面的介绍可以得知，XSS 攻击有两大要素：


1. 攻击者提交恶意代码。
2. 浏览器执行恶意代码。


根本的解决方法：从输入到输出都需要过滤、转义。



#### 输入


输入指客户端请求参数，具体包括：


- 用户输入
- URL 参数
- POST 参数


针对 HTML 代码的编码方式是 HTMLEncode，它的作用是将字符串转换成 HTMLEntities。目前来说，为了对抗 XSS，需要对以下六个字符进行实体化转义。


| 特殊符号 | 实体编码 |
| --- | --- |
| & | &amp; |
| < | &lt; |
| > | &gt; |
| " | &quot; |
| ' | &#x27; |
| / | &#x2F; |

当然，上面的只是最基本而且是最必要的，HTMLEncode 还有很多很多，具体可以参考：Web安全系列（四）：XSS 的防御 | 掘金 一文中提及的特殊字符。


除此之外，富文本的输入需要额外注意：


1. 首先例行进行输入检查，保证用户输入的是完整的 HTML 代码，而不是有拼接的代码
2. 通过 `htmlParser` 解析出 HTML 代码的标签、属性、事件
3. **富文本的事件肯定要被禁止**，因为富文本并不需要事件这种东西，另外一些危险的标签也需要禁止，例如： `<iframe>`，`<script>`，`<base>`，`<form>`等
4. 利用白名单机制，只允许安全的标签嵌入，例如：`<a>`，`<img>`，`div`等，白名单不仅仅适用于标签，也适用于属性
5. 过滤用户 CSS，检查是否有危险代码



#### 输出


不要以为在输入的时候进行过滤就万事大吉了，恶意攻击者们可能会层层绕过防御机制进行 XSS 攻击，一般来说，所有需要输出到 HTML 页面的变量，全部需要使用编码或者转义来防御。输出需要转义的部分，具体包括：


- **在 HTML 中输出**
- **在 JavaScript 中输出**
- **在 CSS 中输出**
- **在 URL 中输出**



##### 在 HTML 中的输出


HTML 的部分和输入的转义方式相同，使用 HTMLEncode，此处不再复述。



##### 在 JavaScript 中的输出


JavaScript 的部分同样需要编码转义，比如在 JSONP 中可以通过意外截断 JSON 数据或者在页面中玩转引号来造成 XSS 攻击。



```
let a = "我是变量"
// 我是变量 = ";alert(1);//
a = "";alert(1);//"

```



攻击者只需要闭合标签就能实行攻击，目前的防御方法就是 JavaScriptEncode。JavaScriptEncode 与 HTMLEncode 的编码方式不同，它需要用 \ 对特殊字符进行转义。



##### 在 CSS 中的输出


在 CSS 中或者 style 标签中的攻击花样特别多，具体可以参考：Web安全系列（四）：XSS 的防御 | 掘金。此处由于篇幅问题，仅仅谈及一下解决方案。


要解决 CSS 的攻击问题，一方面要严格控制用户将变量输入 style 标签内，另一方面不要引用未知的 CSS 文件，如果一定有用户改变 CSS 变量这种需求的话，可以使用 OWASP ESAPI 中的 encodeForCSS() 函数。



##### 在 URLEncode 中的输出


在 URL 中的输出直接使用 URLEncode 即可，需要转义变量的部分。



### 2.2 其他的 XSS 防御方式



#### JSONP XSS 的防御方式


1. **严格定义 **Content-Type: application / json。浏览器渲染就是靠 Content-Type 来做的。如果返回内容标记是 json，哪怕 body 里面都是 html 的标签，浏览器也不会渲染。所以，如果接口返回的不是 html，千万不要写成 html。所以 **Content-Type 不要乱用**，严格按照标准协议来做。目前的框架默认肯定会检测一下内容类型，如果不是很必要，不要手动设置。因为有可能多转发几次 Content-Type 就被改了。
2. callback 做**长度限制**，这个比较 low，一般对函数名限制在 50 个字符内。
3. **检测 callback 里面的字符**。一般 callback 里面都是字母和数字，别的符号都不能有。函数名只允许 `[`, `]`, `a-zA-Z0123456789_`, $, `.`，防止一般的 XSS，utf-7 XSS等攻击。
4. **过滤 callback 以及 JSON 数据输出**，原理同输出转义。
5. 其他一些比较“猥琐”的方法：如在 Callback 输出之前加入其他字符(如：`/**/`、回车换行)这样不影响 JSON 文件加载，又能一定程度预防其他文件格式的输出。还比如 Gmail 早起使用 AJAX 的方式获取 JSON ，听过在输出 JSON 之前加入 `while(1) ;`这样的代码来防止 JS 远程调用。



#### Web 安全头支持


这是浏览器自带的防范能力，一般是通过开启 Web 安全头生效的。具体有以下几个：


1. **CSP**：W3C 的 Content Security Policy，简称 CSP，主要是用来定义页面可以加载哪些资源，减少 XSS 的发生。要配置 CSP , 需要对 CSP 的 policy 策略有了解，具体细节可以参考 [CSP 是什么](https://www.zhihu.com/question/21979782)。
2. **X-Download-Options: noopen**：默认开启，禁用 IE 下下载框 Open 按钮，防止 IE 下下载文件默认被打开 XSS。
3. **X-Content-Type-Options: nosniff**：禁用 IE8 自动嗅探 mime 功能例如 `text/plain` 却当成 `text/html` 渲染，特别当本站点 server 的内容未必可信的时候。
4. **X-XSS-Protection**：IE 提供的一些 XSS 检测与防范，默认开启



#### HTTP-only Cookie


HttpOnly 最早由微软提出，至今已经成为一个标准。浏览器将禁止页面的 Javascript 访问带有 HttpOnly 属性的 Cookie。
攻击者可以通过注入恶意脚本获取用户的 Cookie 信息。通常 Cookie 中都包含了用户的登录凭证信息，攻击者在获取到 Cookie 之后，则可以发起 Cookie 劫持攻击。所以，严格来说，HttpOnly 并非阻止 XSS 攻击，而是能阻止 XSS 攻击后的 Cookie 劫持攻击。



```
// 利用 express 设置 cookie 并开启 httpOnly
res.cookie('myCookie', 'test', {
  httpOnly: true
})

```




#### 添加验证码机制


防止脚本冒充用户提交危险操作。



## 3. XSS 的经验总结


整体的 XSS 防范是非常复杂和繁琐的，我们不仅需要在全部需要转义的位置，对数据进行对应的转义。而且要防止多余和错误的转义，避免正常的用户输入出现乱码。虽然很难通过技术手段完全避免 XSS，但我们可以总结以下原则减少漏洞的产生：


> 以下经验总结摘自《【基本功】 前端安全系列之一：如何防止XSS攻击？ | 美团技术团队》


- 利用模板引擎
开启模板引擎自带的 HTML 转义功能。例如：在 ejs 中，尽量使用 <%= data %> 而不是 <%- data %>；在 doT.js 中，尽量使用 {{! data } 而不是 {{= data }；在 FreeMarker 中，确保引擎版本高于 2.3.24，并且选择正确的 freemarker.core.OutputFormat。
- 避免内联事件
尽量不要使用 onLoad="onload('{{data}}')"、onClick="go('{{action}}')" 这种拼接内联事件的写法。在 JavaScript 中通过 .addEventlistener() 事件绑定会更安全。
- 避免拼接 HTML
前端采用拼接 HTML 的方法比较危险，如果框架允许，使用 createElement、setAttribute 之类的方法实现。或者采用比较成熟的渲染框架，如 Vue/React 等。
- 时刻保持警惕
在插入位置为 DOM 属性、链接等位置时，要打起精神，严加防范。
- 增加攻击难度，降低攻击后果
通过 CSP、输入长度配置、接口安全措施等方法，增加攻击的难度，降低攻击的后果。
- 主动检测和发现
可使用 XSS 攻击字符串和自动扫描工具寻找潜在的 XSS 漏洞。



## 参考资料


- [安全 | egg](https://eggjs.org/zh-cn/core/security.html)
- [【基本功】 前端安全系列之一：如何防止XSS攻击？ | 美团技术团队](https://mp.weixin.qq.com/s?__biz=MjM5NjQ5MTI5OA==&mid=2651748921&idx=2&sn=04ee8977545923ad9b485ba236d7a126&chksm=bd12a3748a652a628ecb841f78e00ccf5eb002117236e18a7d947ae824c2cc75841c1f7c0455&mpshare=1&scene=1&srcid=1207x3nOs3EpM656HYO5UcYL%23rd)
- [JSONP 安全攻防技术](http://blog.knownsec.com/2015/03/jsonp_security_technic/)
- [说说 JSONP 和 XSS](https://blog.cyeam.com/json/2017/10/27/jsonp-xss?utm_source=juejin&utm_medium=article)
