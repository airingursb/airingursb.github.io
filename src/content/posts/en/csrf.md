---
title: "Frontend Security | CSRF Attack Techniques and Defenses"
date: 2019-04-08
tags: ["tech"]
description: ""
---

## Types of CSRF Attacks

CSRF, or Cross-Site Request Forgery (also known as XSRF, one-click attack, or session riding), is an attack that hijacks a trusted user and tricks them into sending unintended requests to a server. The attacker lures the victim to a third-party website, which then sends cross-site requests to the target site. By exploiting the victim's existing authentication credentials on the target site, the attacker can bypass backend verification and impersonate the user to perform actions without authorization. Compared to XSS, which exploits a user's trust in a specific website, CSRF exploits a website's trust in the user's browser.

In a typical CSRF attack, the attacker uses the victim's cookie to deceive the server. Without the victim knowing, a forged request is sent to the server in the victim's name, performing privileged operations without authorization.

![CSRF Diagram](https://airing.ursb.me/image/blog/csrf.jpg)

A vivid analogy from a Zhihu answer by Li Xiangtian:

> Anti-theft system engaged:
> Mom: "Watch my clothes, okay?"
> Kid: "Sure!"
> A thief shows up.
> Normal operation:
> Kid: "Who are you?"
> Thief: "I'm Zhang San."
> Kid: "Mom! Someone's stealing your clothes!"
> Mom: "Who?"
> Kid: "Zhang San."
> Thief gets caught.
> With the vulnerability:
> Kid: "Who are you?"
> Thief: "I'm Joking Around."
> Kid: "Mom! Someone's stealing your clothes!"
> Mom: "Who?"
> Kid: "Joking Around."
> Mom: "..."
> CSRF makes the user unknowingly act on the thief's behalf:
> Thief: "Your mom told you to go buy laundry detergent."

CSRF is conceptually simple — arguably more straightforward than XSS. There are three main attack variants:

1. GET-based CSRF
2. POST-based CSRF
3. Link-based CSRF

### GET-based CSRF

This is the simplest type and requires just one HTTP request:

```
<img src="http://a.com/withdraw?amount=10000&for=hacker" >
```

When the victim visits a page containing this `<img>` tag, the browser automatically fires an HTTP request to `a.com`, which receives a cross-domain request that includes the victim's login credentials.

### POST-based CSRF

This type typically uses an auto-submitting form:

```
<form action="http://a.com/withdraw" method=POST>
    <input type="hidden" name="account" value="airing" />
    <input type="hidden" name="amount" value="10000" />
    <input type="hidden" name="for" value="hacker" />
</form>
<script> document.forms[0].submit(); </script>
```

The form submits automatically when the page is loaded, effectively simulating the user submitting a POST request. Like the GET variant, this is request spoofing — so backend APIs cannot be secured merely by restricting to POST requests.

### Link-based CSRF

This is less common than the other two types, since it requires the victim to actually click a link. Attackers typically embed malicious links in forum images or disguise them as advertisements, often with dramatic bait text:

```
<a href="http://a.com/withdraw.php?amount=1000&for=hacker" target="_blank">
  Click to claim your dragon sword!
</a>
```

Since the user is already logged in to the trusted site A and their session is active, simply visiting this link is enough to trigger the attack.

## CSRF Defense Strategies

CSRF attacks typically originate from third-party sites. The targeted website cannot prevent the attack outright; it can only strengthen its own defenses.

The two key characteristics of CSRF are:

1. CSRF attacks **originate from third-party domains**.
2. The attacker **cannot access** the victim's cookies — they can only exploit them.

Based on these characteristics, there are two main defensive approaches:

1. **Passive defense: block requests from untrusted origins**
   - Same-origin detection
   - SameSite Cookie

2. **Active defense: require proof that only the target domain can provide**
   - Synchronizer Tokens
   - Double Cookie Defense
   - Custom Header

Passive defenses leverage built-in HTTP protocol features, while active defenses require custom implementation.

### Passive Defense Strategies

#### Same-Origin Detection

Since CSRF attacks usually come from third-party sites, we can simply block requests from untrusted external origins.

Every asynchronous HTTP request carries two headers that identify the origin:

- `Origin` header
- `Referer` header

By validating these headers, we can detect cross-origin requests. However, this isn't foolproof — the `Referer` value is provided by the browser, and while HTTP specs mandate its behavior, browser implementations may differ. Relying on `Referer` means trusting a third party to provide accurate data, which isn't fully secure. Attackers can sometimes hide or manipulate the `Referer` header — web scrapers commonly do this to bypass same-origin checks. The Meituan Tech Blog's article on CSRF prevention provides a detailed analysis of `Referer` reliability and edge cases.

In summary, same-origin validation is a relatively simple and effective defense that blocks most CSRF attacks — but it's not infallible. For high-security scenarios or sites with significant user-generated content, critical endpoints should be protected by additional active defenses.

#### SameSite Cookie

To address this problem at the source, Google drafted a proposal to add a `SameSite` attribute to the `Set-Cookie` response header. A "SameSite cookie" can only be used as a first-party cookie — it won't be sent with cross-site requests. `SameSite` has two modes:

- `SameSite=Strict`: Strict mode — this cookie will never be sent as a third-party cookie under any circumstances.
- `SameSite=Lax`: Relaxed mode — the cookie is sent with top-level navigations that use safe HTTP methods (like GET), but not with cross-site subrequest embeds.

However, SameSite cookies have limitations:

1. Browser support is inconsistent — at the time of writing, Safari and iOS Safari don't fully support it.
2. **SameSite cookies don't support subdomains**, which is a significant drawback. For example, a cookie set under `blog.ursb.me` cannot use a SameSite cookie from `ursb.me`. This means users would need to log in separately on every subdomain — which isn't practical.

### Active Defense Strategies

There are three main active defense techniques:

1. **Synchronizer Tokens**: Render a CSRF token in the page response, then submit it in a hidden form field.
2. **Double Cookie Defense**: Store the token in a cookie; when submitting POST requests, also include the cookie value in a header or request body, and validate them on the server.
3. **Custom Header**: Trust requests with a specific header like `X-Requested-With: XMLHttpRequest`. This approach can be bypassed, which is why frameworks like Rails and Django have deprecated it.

The following sections cover the first two approaches in detail.

#### Synchronizer Token

The reason CSRF attacks succeed is that the server mistakes forged requests for legitimate ones. By requiring every user request to include a CSRF token that the attacker cannot access, we can tell the difference between real requests and forged ones.

Concretely, this involves three steps:

1. Embed the CSRF token in the page
2. Include the token in every request submission — either as a hidden form field or as a URL query parameter
3. Validate the token on the server side

When the server receives a token, it decrypts it and verifies both the encrypted string and the timestamp. If the encrypted string matches and the token hasn't expired, the request is considered valid. Tokens are typically generated by encrypting a combination of UserID, timestamp, and a random value — providing both user authentication and time-based validation while making tokens hard to crack. Here's an example from a personal project (for reference only):

```javascript
import md5 from 'md5'

export const MESSAGE = {
  OK: {
    code: 0,
    message: 'Request successful',
  },
  TOKEN_ERROR: {
    code: 403,
    message: 'Token invalid',
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

This approach is more secure than checking `Referer` or `Origin`. The token can be stored in a Session, retrieved from the Session on each request, and compared against the submitted token. Two important considerations:

1. **Session vs Cookie**: Storing the token in a Session is the better choice when possible.
2. **Refresh the CSRF token**: If the CSRF token is stored in a Cookie, and a different user logs in using the same browser, the new user will inherit the old token — creating a security risk. Always **refresh the CSRF token on login**.

#### Double Cookie Defense

Storing CSRF tokens in Sessions is cumbersome and hard to apply uniformly across all API endpoints. An alternative is Double Cookie Defense: since CSRF attackers can't read the victim's cookies, we can require that a value from the cookie be included in the request body or URL as well.

1. When the user visits the site, inject a random string into a cookie for the request domain.
2. When the frontend makes a request, read the cookie value and append it as a URL parameter.
3. The backend checks whether the URL parameter matches the cookie value; if not, reject the request.

This approach is simpler to implement than Synchronizer Tokens, can be applied uniformly via interceptors on both frontend and backend, and doesn't require storing tokens server-side. However, it has a significant flaw in large-scale deployments.

Here's an example: since cross-domain access to cookies isn't allowed (even between subdomains), if `me.ursb.me` needs to access the API at `api.ursb.me`, it can't read `api.ursb.me`'s cookie. To work around this, we'd store the cookie on the parent domain `ursb.me`. But if any subdomain like `xxx.ursb.me` has a vulnerability, an attacker could modify cookies at the `ursb.me` domain level, effectively enabling an XSS attack that then leads to CSRF against `me.ursb.me`. Additionally, this approach requires the entire site to use HTTPS to be safe.

Summary from Meituan Tech Blog:

**Pros:**
- **No Session needed** — easier to implement, widely applicable.
- **Token stored client-side** — no extra server load.
- Lower implementation cost than Synchronizer Tokens — can be **intercepted uniformly** rather than applied endpoint by endpoint.

**Cons:**
- Adds an extra field to the cookie.
- If there's another vulnerability like XSS, an attacker could inject a forged cookie value, defeating this defense.
- **Subdomain isolation is difficult** to achieve.
- Requires HTTPS across the entire site to be secure.

## References

- [Security | Egg.js](https://eggjs.org/zh-cn/core/security.html)
- [Frontend Security Series Part 2: How to Prevent CSRF? | Meituan Tech Blog](https://mp.weixin.qq.com/s?__biz=MjM5NjQ5MTI5OA==&mid=2651748960&idx=3&sn=93b468b875ee1e2d72c0a0c3464831a3&chksm=bd12a32d8a652a3b580b1ccac86c98204691dffa8ef1dbef3ac65fe7bca2ac9d6562a45aa501&mpshare=1&scene=1&srcid=12076o2m6iOmEAFUGxuZQg3U%23rd)
- [Defending Against CSRF Attacks | IBM Developer](https://www.ibm.com/developerworks/cn/web/1102_niugang_csrf/)
