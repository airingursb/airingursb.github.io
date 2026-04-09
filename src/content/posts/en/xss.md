---
title: "Frontend Security | XSS Attack Techniques and Prevention"
date: 2019-04-07
tags: ["tech"]
description: ""
---

## 1. XSS Attack Techniques

XSS (Cross-Site Scripting) is one of the most common web attacks — a type of code injection attack. Attackers inject malicious scripts into a target website, which then run in users' browsers. These malicious scripts can steal sensitive information like cookies and session IDs, putting data security at risk. The key characteristics are *cross-domain* execution and *client-side* execution.

The essence of XSS:

- Malicious code slips through unfiltered and gets mixed in with the site's legitimate code
- The browser can't tell which scripts are trustworthy, so it executes the malicious ones

XSS attacks generally fall into these categories:

- **Reflected XSS**
- **Stored XSS**
- **DOM XSS**
- **JSONP XSS**

| Type | Storage Location | Injection Point |
| --- | --- | --- |
| Reflected XSS | URL | HTML |
| Stored XSS | Backend database | HTML |
| DOM XSS | Backend database / client storage / URL | Frontend JavaScript |
| JSONP XSS | Backend database / client storage / URL | Frontend JavaScript |

### 1.1 Reflected XSS

Reflected XSS happens when a server accepts unsafe input from a client and reflects it back to trigger execution. In other words, the user's input is simply "reflected" back to the browser. This type of attack usually requires the attacker to trick the user into clicking a malicious link, submitting a form, or visiting a malicious site that injects a script into the target site. It's a non-persistent attack.

For example: on a shopping website, searching for a product displays the search keyword. If the keyword contains `<script>alert('handsome boy')</script>` and the page doesn't filter it, that code will execute directly in the browser and trigger an alert.

### 1.2 Stored XSS

Stored XSS involves injecting malicious content into the server, which then attacks other users who view that content. Content is often submitted through rich text editors, which makes it easy to embed dangerous code.

A common scenario: an attacker posts an article or comment containing malicious JavaScript on a community or forum. Every user who views that post will have the malicious code execute in their browser. This is a persistent attack.

### 1.3 DOM XSS

DOM-based XSS attacks manipulate the page's DOM structure through malicious scripts — it's a purely client-side attack.

The key difference from the other two types: DOM XSS is carried out entirely by the browser (front-end JavaScript), rather than being a server-side vulnerability. Here's an example:

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

Clicking Submit inserts a link whose `href` is whatever the user typed. If a user enters:

```
" onclick=alert(/xss/)
```

The page code becomes:

```
<a href onclick="alert(/xss/)">testLink</a>
```

Clicking the generated link executes the script. DOM XSS happens because the front-end JavaScript isn't careful enough — it treats untrusted data as code. Be especially careful with `.innerHTML`, `.outerHTML`, and `document.write()`. Don't insert untrusted data as HTML; use `.textContent` or `.setAttribute()` instead.

Inline event listeners like `location`, `onclick`, `onerror`, `onload`, `onmouseover`, the `href` attribute of `<a>` tags, and JavaScript's `eval()`, `setTimeout()`, `setInterval()` can all execute strings as code. Concatenating untrusted data into strings passed to these APIs is a serious security risk — always avoid it.

### 1.4 JSONP XSS

The JSONP `callback` parameter is particularly dangerous and poses two XSS risks:

1. The callback parameter **accidentally breaks JS code** — single quotes, double quotes, and newline characters all create vulnerabilities.
2. The callback parameter **injects malicious HTML tags**, creating an XSS hole.

Browsers use the `callback` parameter to wrap JSON responses for cross-origin access. The response format should be:

```
CALLBACK(JSON)
```

If an AJAX request uses JSONP, the browser validates the response format. But here's the problem — the request's callback gets embedded in the response content, which is where things can go wrong. For instance, if the response has `Content-Type: text/html`, any HTML injected via the callback gets rendered directly on the page.

## 2. XSS Defense Strategies

### 2.1 The Fundamental Defense

From what we've seen, XSS attacks rely on two things:

1. The attacker submits malicious code
2. The browser executes it

The fundamental solution: filter and escape at every point from input to output.

#### Input

Input includes client request parameters:

- User input
- URL parameters
- POST parameters

For HTML encoding, the method is HTMLEncode, which converts strings into HTML entities. At a minimum, the following six characters need to be escaped:

| Special Character | HTML Entity |
| --- | --- |
| & | &amp; |
| < | &lt; |
| > | &gt; |
| " | &quot; |
| ' | &#x27; |
| / | &#x2F; |

These are just the basics. There are many more HTMLEncode characters to consider.

Rich text input needs extra care:

1. Validate the input to ensure the user is submitting complete HTML, not spliced fragments
2. Parse the HTML using `htmlParser` to extract tags, attributes, and events
3. **Block all events in rich text** — rich text doesn't need event handlers, and dangerous tags like `<iframe>`, `<script>`, `<base>`, and `<form>` must be blocked
4. Use a whitelist approach — only allow safe tags like `<a>`, `<img>`, `div`, etc. Whitelists apply to attributes too
5. Filter user CSS to check for dangerous code

#### Output

Filtering input alone isn't enough — attackers can layer their attacks to bypass defenses. As a general rule, all variables output to an HTML page need to be encoded or escaped. Output locations that need escaping include:

- **HTML output**
- **JavaScript output**
- **CSS output**
- **URL output**

##### In HTML

Same approach as input — use HTMLEncode.

##### In JavaScript

JavaScript output also needs escaping. In JSONP, for example, attackers can break out of JSON data or play with quotes to trigger XSS:

```
let a = "I'm a variable"
// I'm a variable = ";alert(1);//
a = "";alert(1);//"
```

Closing the tag is all an attacker needs. The defense here is JavaScriptEncode, which differs from HTMLEncode by escaping special characters with `\`.

##### In CSS

CSS and `<style>` tag attacks are surprisingly diverse. The defense: strictly control whether users can inject variables into `<style>` tags, and avoid loading unknown CSS files. If users absolutely need to customize CSS variables, use the `encodeForCSS()` function from OWASP ESAPI.

##### In URLs

For URL output, simply URLEncode the variable portions.

### 2.2 Other XSS Defenses

#### Defending Against JSONP XSS

1. **Strictly set `Content-Type: application/json`**. Browsers render content based on Content-Type. Even if the body contains HTML tags, a JSON Content-Type prevents rendering. If an API doesn't return HTML, never set it as HTML. Let your framework handle this automatically — don't override it manually, as Content-Type can change across multiple redirects.
2. **Limit callback length** — generally restrict function names to 50 characters.
3. **Validate callback characters** — callbacks should only contain letters and numbers. Only allow `[`, `]`, `a-zA-Z0123456789_`, `$`, `.`.
4. **Filter callback and JSON output** — same principles as output escaping.
5. Other clever tricks: prepend `/**/` or a newline before callback output — this doesn't break JSON loading but prevents certain other file format exploits. Gmail once used `while(1);` before JSON output to prevent remote JS calls.

#### Web Security Headers

These are browser-native defenses, activated by setting HTTP security headers:

1. **CSP** (Content Security Policy): Defines which resources the page can load, significantly reducing XSS risk. Learn more at [What is CSP?](https://www.zhihu.com/question/21979782).
2. **X-Download-Options: noopen**: Disables the "Open" button in IE download dialogs, preventing downloaded files from being auto-opened with XSS potential.
3. **X-Content-Type-Options: nosniff**: Prevents IE8 from sniffing MIME types — stops `text/plain` from being rendered as `text/html`, especially useful when the site serves potentially untrusted content.
4. **X-XSS-Protection**: IE's built-in XSS detection and prevention, enabled by default.

#### HttpOnly Cookie

HttpOnly was originally proposed by Microsoft and is now a standard. Browsers will refuse to let JavaScript access cookies marked with the HttpOnly attribute.

Attackers can steal cookie data by injecting malicious scripts. Since cookies typically contain login credentials, obtaining them enables cookie hijacking attacks. Strictly speaking, HttpOnly doesn't prevent XSS itself — it prevents the cookie hijacking that can follow a successful XSS attack.

```
// Setting an HttpOnly cookie with Express
res.cookie('myCookie', 'test', {
  httpOnly: true
})
```

#### CAPTCHA Verification

Prevents scripts from impersonating users to submit dangerous actions.

## 3. Lessons Learned

Comprehensive XSS defense is complex and painstaking. You need to escape data at every output point correctly, while avoiding unnecessary or incorrect escaping that would garble legitimate user input. While it's impossible to eliminate XSS entirely through technical means alone, following these principles helps minimize vulnerabilities:

> The following principles are adapted from *Front-End Security Series: How to Prevent XSS Attacks? | Meituan Tech Blog*

- **Use template engines**: Enable the built-in HTML escaping features. In ejs, prefer `<%= data %>` over `<%- data %>`; in doT.js, prefer `{{! data }` over `{{= data }}`; in FreeMarker, ensure version >= 2.3.24 and use the correct `OutputFormat`.
- **Avoid inline events**: Don't use patterns like `onLoad="onload('{{data}}')"` or `onClick="go('{{action}}')"`. Binding events with `.addEventListener()` in JavaScript is safer.
- **Avoid HTML string concatenation**: Building HTML by concatenation is risky. Use `createElement` and `setAttribute` instead, or mature rendering frameworks like Vue or React.
- **Stay vigilant**: When inserting data into DOM attributes, links, or similar contexts, pay extra attention and be strict.
- **Raise the cost of attacks**: Use CSP, input length limits, and API security measures to make attacks harder and reduce their impact.
- **Proactively detect**: Use XSS attack strings and automated scanning tools to find potential XSS vulnerabilities.

## References

- [Security | egg](https://eggjs.org/zh-cn/core/security.html)
- [Front-End Security Series: How to Prevent XSS Attacks? | Meituan Tech Blog](https://mp.weixin.qq.com/s?__biz=MjM5NjQ5MTI5OA==&mid=2651748921&idx=2&sn=04ee8977545923ad9b485ba236d7a126&chksm=bd12a3748a652a628ecb841f78e00ccf5eb002117236e18a7d947ae824c2cc75841c1f7c0455&mpshare=1&scene=1&srcid=1207x3nOs3EpM656HYO5UcYL%23rd)
- [JSONP Security Attack and Defense Techniques](http://blog.knownsec.com/2015/03/jsonp_security_technic/)
- [On JSONP and XSS](https://blog.cyeam.com/json/2017/10/27/jsonp-xss?utm_source=juejin&utm_medium=article)
