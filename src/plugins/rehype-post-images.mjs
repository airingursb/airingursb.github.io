// Article body images: lazy loading, intrinsic size and text alternatives.
//
// - Every image after the first one in a document gets
//   `loading="lazy" decoding="async"`; the first keeps the browser default
//   so an above-the-fold figure is not delayed.
// - `width` / `height` come from `src/data/post-image-sizes.json`, a cache
//   built offline by `scripts/build-post-image-sizes.mjs` (the build itself
//   never touches the network). With both attributes and the stylesheet's
//   `height: auto`, the browser reserves the box before the bytes arrive.
// - A missing alt is filled only from words the author already wrote next to
//   the image, never invented:
//     1. the Markdown title  `![](src "title")`;
//     2. a short caption right after the image in the same paragraph — the
//        same text PostLayout's caption script shows under the picture;
//     3. a lead-in sentence right before the image ending in a colon
//        ("各引擎性能表现如下图所示：" → "各引擎性能表现").
//   Images with none of these keep no alt (an honest gap, not a guess).

import fs from 'node:fs';
import path from 'node:path';

const SIZES_FILE = path.resolve('./src/data/post-image-sizes.json');
let sizes = null;
function loadSizes() {
  if (sizes) return sizes;
  try {
    sizes = JSON.parse(fs.readFileSync(SIZES_FILE, 'utf8'));
  } catch {
    sizes = {};
  }
  return sizes;
}

function safeDecode(s) {
  try { return decodeURI(s); } catch { return s; }
}

const CAPTION_MAX = 30;
const LEADIN_MAX = 80;

function textOf(node) {
  if (!node) return '';
  if (node.type === 'text') return node.value;
  if (Array.isArray(node.children)) return node.children.map(textOf).join('');
  return '';
}

const isImg = (n) => n && n.type === 'element' && n.tagName === 'img';
const isBlank = (n) => n && n.type === 'text' && !n.value.trim();

/** Caption rule shared with PostLayout's client caption script. */
export function captionAfter(siblings, idx) {
  let i = idx + 1;
  while (i < siblings.length && isBlank(siblings[i])) i++;
  const n = siblings[i];
  if (!n || n.type !== 'text') return '';
  // A caption ends the line: "![](a.png)核心逻辑是将 [LayerTreeHost](…) 的…"
  // is a sentence that merely starts after the image.
  let j = i + 1;
  while (j < siblings.length && isBlank(siblings[j])) j++;
  const after = siblings[j];
  if (after && !(after.type === 'element' && (after.tagName === 'img' || after.tagName === 'br'))) return '';
  const t = n.value.trim();
  if (!t || t.length > CAPTION_MAX || t.includes('\n') || /^[#>]/.test(t)) return '';
  // "哪些地方做的不好：" opens the next passage; it is not about the image.
  if (/[：:]$/.test(t)) return '';
  return t;
}

/** "……，如下图所示：" → the last clause before the colon, cleaned. */
export function leadInText(raw) {
  let t = String(raw || '').replace(/\s+/g, ' ').trim();
  if (!/[：:]$/.test(t)) return '';
  t = t.replace(/[：:]$/, '').trim();
  // Keep only the final sentence.
  const parts = t.split(/(?<=[。！？!?；;])\s*|(?<=\.)\s+/);
  t = (parts[parts.length - 1] || '').trim();
  t = t
    .replace(/[，,]?\s*(具体)?(如|见)(下|上)(图|表|面)?(所示|所见)?$/u, '')
    .replace(/[，,]?\s*(具体)?(如|见)(图|表)(所示)?$/u, '')
    .replace(/[，,]?\s*(as\s+)?(shown|seen|illustrated)\s+(below|above|here)$/i, '')
    .replace(/[，,]?\s*(是)?这样的$/u, '')
    .replace(/[，,]?\s*(如下|下图|下面)$/u, '')
    .replace(/[，,：:\s]+$/u, '')
    .trim();
  if (t.length < 2 || t.length > LEADIN_MAX) return '';
  return t;
}

function leadInBefore(siblings, idx, parent, grand) {
  // Text in the same paragraph before the image (back to the previous image).
  let buf = '';
  for (let i = idx - 1; i >= 0; i--) {
    const n = siblings[i];
    if (isImg(n)) break;
    buf = textOf(n) + buf;
  }
  if (buf.trim()) return leadInText(buf);
  // Image opens its paragraph: look at the previous block.
  if (!grand || !Array.isArray(grand.children)) return '';
  const pIdx = grand.children.indexOf(parent);
  for (let i = pIdx - 1; i >= 0; i--) {
    const prev = grand.children[i];
    if (isBlank(prev)) continue;
    if (prev.type !== 'element' || prev.tagName !== 'p') return '';
    // Only the trailing text, after the previous block's last image.
    let tail = '';
    for (let j = prev.children.length - 1; j >= 0; j--) {
      const n = prev.children[j];
      if (isImg(n)) break;
      tail = textOf(n) + tail;
    }
    return leadInText(tail);
  }
  return '';
}

export function rehypePostImages() {
  return (tree) => {
    const dims = loadSizes();
    let seen = 0;
    const walk = (node, parent, grand) => {
      if (!node || !Array.isArray(node.children)) return;
      node.children.forEach((child, idx) => {
        if (isImg(child)) {
          const p = (child.properties ||= {});
          seen += 1;
          if (seen > 1) {
            if (p.loading == null) p.loading = 'lazy';
            if (p.decoding == null) p.decoding = 'async';
          }
          const src = typeof p.src === 'string' ? p.src : '';
          const d = dims[src] || dims[safeDecode(src)];
          if (d && p.width == null && p.height == null) {
            p.width = d[0];
            p.height = d[1];
          }
          const hasAlt = typeof p.alt === 'string' && p.alt.trim() !== '';
          if (!hasAlt) {
            const alt =
              (typeof p.title === 'string' && p.title.trim()) ||
              captionAfter(node.children, idx) ||
              leadInBefore(node.children, idx, node, parent);
            if (alt) p.alt = alt;
          }
          return;
        }
        walk(child, node, parent);
      });
    };
    walk(tree, null, null);
  };
}

export default rehypePostImages;
