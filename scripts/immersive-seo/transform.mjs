import { parse } from 'parse5';
import { escapeHtml, immersiveHead } from './metadata.mjs';

const languageKeys = 'ursb-immersive-lang|ursb-lang|article_lang|perfdog-lang|img-formats-lang|llm-lang|pi-agent-lang';
const attr = (node, key) => node.attrs?.find(item => item.name === key)?.value;
const relativeUrl = value => value && !/^(?:[a-z][a-z\d+.-]*:|\/|#|\?)/i.test(value);

function localeControl(node) {
  if (!['button', 'a'].includes(node.tagName)) return undefined;
  if (['lang-zh', 'langZh'].includes(attr(node, 'id'))) return 'zh';
  if (['lang-en', 'langEn'].includes(attr(node, 'id'))) return 'en';
  if (attr(node.parentNode, 'class')?.split(/\s+/).includes('lang-toggle')) return attr(node, 'data-lang');
  return undefined;
}

function localizedScript(text, locale, title) {
  const quotedKey = new RegExp(`localStorage\\.getItem\\((['"])(?:${languageKeys})\\1\\)`, 'g');
  const hasLanguageKey = quotedKey.test(text) || new RegExp(`(?:var|const|let) KEY\\s*=\\s*['"](?:${languageKeys})['"]`).test(text);
  if (!hasLanguageKey) return text;
  return text.replace(quotedKey, JSON.stringify(locale))
    .replace(/localStorage\.getItem\(KEY\)/g, JSON.stringify(locale))
    .replace(/document\.title\s*=\s*[^;]+;/g, `document.title = ${JSON.stringify(title)};`)
    .replaceAll('.lang-toggle button', '.lang-toggle [data-immersive-locale]');
}

export function transformImmersivePage(article, locale, { dateModified } = {}) {
  if (locale !== 'zh' && locale !== 'en') throw new TypeError(`Unsupported immersive locale: ${locale}`);
  const source = article.source;
  const edits = [];
  const base = `/immersive/${article.slug}/`;
  const edit = (start, end, text) => edits.push({ start, end, text });
  const resource = value => {
    if (!relativeUrl(value)) return value;
    const url = new URL(value, `https://ursb.me${base}`);
    return url.pathname + url.search + url.hash;
  };
  const cssResources = text => text.replace(/url\(\s*(['"]?)([^)'"\s]+)\1\s*\)/g, (match, quote, url) => relativeUrl(url) ? `url(${quote}${resource(url)}${quote})` : match);

  function walk(node, inBody = false) {
    const location = node.sourceCodeLocation;
    const body = inBody || node.tagName === 'body';
    if (location) {
      const key = attr(node, 'name') ?? attr(node, 'property') ?? '';
      const oldSeo = node.tagName === 'title'
        || (node.tagName === 'meta' && /^(?:description|author|og:.*|twitter:.*|article:.*)$/.test(key))
        || (node.tagName === 'link' && ['canonical', 'alternate'].includes(attr(node, 'rel')))
        || (node.tagName === 'script' && attr(node, 'type') === 'application/ld+json');
      if (oldSeo && !inBody) { edit(location.startOffset, location.endOffset, ''); return; }
      if (node.tagName === 'head') {
        const charset = node.childNodes.find(child => child.tagName === 'meta' && attr(child, 'charset'));
        const offset = charset?.sourceCodeLocation?.endOffset ?? location.startTag.endOffset;
        edit(offset, offset, immersiveHead(article, locale, dateModified));
      }
      if (node.tagName === 'script') {
        const text = source.slice(location.startTag.endOffset, location.endTag?.startOffset ?? location.endOffset);
        if (text.includes("p.get('lang')") && text.includes("localStorage.setItem('article_lang'")) {
          edit(location.startOffset, location.endOffset, '');
          return;
        } else {
          const localized = localizedScript(text, locale, article.locales[locale].title);
          if (localized !== text) edit(location.startTag.endOffset, location.endTag.startOffset, localized);
        }
      }
      if (node.tagName === 'style') {
        const text = source.slice(location.startTag.endOffset, location.endTag.startOffset);
        const updated = cssResources(text.replaceAll('.lang-toggle button', '.lang-toggle :is(button, a)'));
        if (updated !== text) edit(location.startTag.endOffset, location.endTag.startOffset, updated);
      }
      if (location.startTag) {
        const attributes = new Map(node.attrs.map(item => [item.name, item.value]));
        let changed = false;
        const set = (name, value) => { attributes.set(name, value); changed = true; };
        if (node.tagName === 'html') set('lang', locale === 'en' ? 'en' : 'zh-CN');
        if (node.tagName === 'body') {
          const classes = (attr(node, 'class') ?? '').split(/\s+/).filter(value => value && !['lang-en', 'lang-zh'].includes(value));
          if (locale === 'en' || attr(node, 'class')?.includes('lang-zh')) classes.push(`lang-${locale}`);
          set('class', classes.join(' '));
        }
        const opposite = locale === 'en' ? 'zh' : 'en';
        if (body && (attr(node, 'lang')?.startsWith(opposite) || attr(node, 'class')?.split(/\s+/).includes(`lang-${opposite}-only`))) set('data-pagefind-ignore', '');
        const control = localeControl(node);
        if (control === 'zh' || control === 'en') {
          set('href', `${control === 'en' ? '/en' : ''}${base}`);
          set('hreflang', control === 'en' ? 'en' : 'zh-CN');
          set('data-immersive-locale', control);
          set('aria-current', control === locale ? 'page' : 'false');
          set('style', `${attr(node, 'style') ?? ''};display:inline-block;text-align:center;text-decoration:none`);
          set('class', [...(attr(node, 'class') ?? '').split(/\s+/).filter(value => value && value !== 'active'), ...(control === locale ? ['active'] : [])].join(' '));
          attributes.delete('type'); attributes.delete('aria-pressed');
          if (location.endTag) edit(location.endTag.startOffset, location.endTag.endOffset, '</a>');
        }
        for (const name of ['src', 'href', 'poster']) {
          const value = attributes.get(name);
          if (relativeUrl(value)) set(name, resource(value));
        }
        const href = attributes.get('href');
        if (locale === 'en' && !control && /^(?:https:\/\/ursb\.me)?\/(?:en\/)?immersive\/[^/]+\//.test(href ?? '')) {
          const target = new URL(href, 'https://ursb.me');
          target.pathname = target.pathname.replace(/^\/(?:en\/)?immersive\//, '/en/immersive/');
          if (['en', 'zh'].includes(target.searchParams.get('lang'))) target.searchParams.delete('lang');
          set('href', href.startsWith('https:') ? target.href : target.pathname + target.search + target.hash);
        }
        if (locale === 'en' && attr(node, 'class')?.split(/\s+/).includes('ursb-backlink')
            && /^(?:https:\/\/ursb\.me)?\/notes\//.test(href ?? '')) {
          const target = new URL(href, 'https://ursb.me');
          target.pathname = target.pathname === `/notes/${article.slug}/` && article.locales.en.notePath
            ? article.locales.en.notePath : '/en/notes/';
          set('href', href.startsWith('https:') ? target.href : target.pathname + target.search + target.hash);
        }
        const style = attributes.get('style');
        if (style && cssResources(style) !== style) set('style', cssResources(style));
        const srcset = attributes.get('srcset');
        if (srcset && !srcset.includes('data:')) set('srcset', srcset.split(',').map(candidate => candidate.trim().replace(/^\S+/, resource)).join(', '));
        // Language links explicitly choose their target and must not inherit the page locale.
        if (control === 'zh') set('href', base);
        if (changed) edit(location.startTag.startOffset, location.startTag.endOffset, `<${control ? 'a' : node.tagName}${[...attributes].map(([name, value]) => ` ${name}="${escapeHtml(value)}"`).join(' ')}>`);
      }
    }
    for (const child of node.childNodes ?? []) walk(child, body);
  }
  walk(parse(source, { sourceCodeLocationInfo: true }));
  let output = source;
  for (const change of edits.sort((a, b) => b.start - a.start || b.end - a.end)) output = output.slice(0, change.start) + change.text + output.slice(change.end);
  return output;
}
