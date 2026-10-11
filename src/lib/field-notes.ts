// Shared data helpers for the "Field Notes" look of /notes (index + detail).
import { readFileSync } from 'node:fs';
import path from 'node:path';

export const TOPICS = ['ai', 'browser', 'runtime', 'net', 'gfx', 'eng', 'play'] as const;
export type Topic = (typeof TOPICS)[number];

const TOPIC_LABELS: Record<'zh' | 'en', Record<Topic, string>> = {
  zh: { ai: 'AI 与 Agent', browser: '浏览器', runtime: '运行时', net: '网络', gfx: '图形', eng: '工程实践', play: '小品' },
  en: { ai: 'AI & Agents', browser: 'Browser', runtime: 'Runtimes', net: 'Networking', gfx: 'Graphics', eng: 'Engineering', play: 'Playbook' },
};

export function topicLabel(topic: string | undefined, lang: 'zh' | 'en'): string {
  return topic && topic in TOPIC_LABELS[lang] ? TOPIC_LABELS[lang][topic as Topic] : '';
}

type NoteData = { immersive?: { url: string; label?: string }; interactive?: boolean; topic?: string };

export function formatLabel(data: NoteData, lang: 'zh' | 'en'): string {
  if (data.topic === 'play') return 'Playbook';
  if (data.immersive) return data.immersive.label || (lang === 'en' ? 'Immersive' : '沉浸式');
  if (data.interactive) return lang === 'en' ? 'Illustrated' : '图解笔记';
  return lang === 'en' ? 'Note' : '笔记';
}

// ── Title highlights ────────────────────────────────────────────────
// The immersive pages hand-set their hero <h1> with coloured words
// (<span class="copper">…</span>, <span class="accent">…</span>, or
// style="color:var(--x)"). Cards and note headers reuse exactly those
// highlights so the two never drift. Colours are mapped to a fixed set
// of tones that have light + dark values in field-notes.css.
export type TitlePart = { text: string; tone?: string };

const TONE_BY_HEX: Record<string, string> = {
  '#b35a1f': 'copper',
  '#1f5c8c': 'blue',
  '#6b3aa3': 'purple',
  '#2d6a4f': 'green',
  '#b3422c': 'red',
  '#8a5a2a': 'brown',
};

const cache = new Map<string, TitlePart[] | null>();

function decode(s: string) {
  return s.replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"');
}

export function immersiveTitleParts(immersiveUrl: string | undefined): TitlePart[] | null {
  // Only the zh pages carry the hand-set hero; /en/immersive/* is generated
  // from the same source, so English titles stay plain.
  if (!immersiveUrl || !/^\/immersive\/[a-z0-9-]+\/$/.test(immersiveUrl)) return null;
  if (cache.has(immersiveUrl)) return cache.get(immersiveUrl)!;
  let parts: TitlePart[] | null = null;
  try {
    const html = readFileSync(path.join(process.cwd(), 'public', immersiveUrl, 'index.html'), 'utf8');
    const vars: Record<string, string> = {};
    for (const m of html.matchAll(/--([a-z0-9-]+):\s*(#[0-9a-fA-F]{6})/g)) vars[m[1]] ??= m[2].toLowerCase();
    let h1 = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/)?.[1];
    if (h1) {
      const zh = h1.match(/<span lang="zh">([\s\S]*?)<\/span>/);
      if (zh) h1 = zh[1];
      h1 = h1.replace(/<br\s*\/?>/g, '');
      const out: TitlePart[] = [];
      const re = /<span([^>]*)>([\s\S]*?)<\/span>|([^<]+)/g;
      for (const m of h1.matchAll(re)) {
        if (m[3] !== undefined) { const t = decode(m[3]).replace(/\s+/g, ' '); if (t) out.push({ text: t }); continue; }
        const attrs = m[1];
        const text = decode(m[2].replace(/<[^>]+>/g, '')).replace(/\s+/g, ' ');
        const cls = attrs.match(/class="([^"]+)"/)?.[1].split(/\s+/).find((c) => vars[c]);
        const styleVar = attrs.match(/color:\s*var\(--([a-z0-9-]+)\)/)?.[1];
        const hex = cls ? vars[cls] : styleVar ? vars[styleVar] : undefined;
        out.push({ text, tone: hex ? TONE_BY_HEX[hex] : undefined });
      }
      const flat = out.map((p) => p.text).join('').trim();
      if (flat) {
        if (out.length) { out[0].text = out[0].text.replace(/^\s+/, ''); out[out.length - 1].text = out[out.length - 1].text.replace(/\s+$/, ''); }
        parts = out;
      }
    }
  } catch {
    parts = null;
  }
  cache.set(immersiveUrl, parts);
  return parts;
}

export function titleParts(title: string, immersiveUrl: string | undefined, lang: 'zh' | 'en'): TitlePart[] {
  return (lang === 'zh' && immersiveTitleParts(immersiveUrl)) || [{ text: title }];
}
