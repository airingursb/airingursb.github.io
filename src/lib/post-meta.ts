// Article-page metadata derived from post bodies: reading time, the series
// issue badge and "related posts". Shared by the zh and en post routes.

/** Strip everything a reader does not read as prose. */
export function readableText(markdown: string): string {
  return String(markdown || '')
    .replace(/^---[\s\S]*?---/, '')
    .replace(/^(```|~~~)[^\n]*\n[\s\S]*?^\1[^\n]*$/gm, ' ')
    .replace(/`[^`\n]*`/g, ' ')
    .replace(/<!--[\s\S]*?-->/g, ' ')
    .replace(/!\[([^\]]*)\]\([^)]*\)/g, ' ')
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\$\$[\s\S]*?\$\$/g, ' ')
    .replace(/https?:\/\/\S+/g, ' ');
}

const CJK = /[㐀-鿿豈-﫿]/g;
/** Chinese characters per minute and English words per minute. */
export const CJK_PER_MIN = 350;
export const WORDS_PER_MIN = 220;

export function readingMinutes(markdown: string): number {
  const text = readableText(markdown);
  const cjk = (text.match(CJK) || []).length;
  const words = text
    .replace(CJK, ' ')
    .split(/\s+/)
    .filter((w) => /[A-Za-z0-9]/.test(w)).length;
  return Math.max(1, Math.round(cjk / CJK_PER_MIN + words / WORDS_PER_MIN));
}

/**
 * Issue number written in the title — "月刊（第36期）", "Weekly #35",
 * "Monthly #36" — or a leading year for annual reviews ("2025，全新旅途").
 * The site never published issues 14/15, so counting posts drifts.
 */
export function seriesIssue(title: string, tag: string): string | null {
  const t = String(title || '');
  if (tag === 'annually') {
    const y = t.match(/^\s*(\d{4})\b/);
    return y ? y[1] : null;
  }
  const m = t.match(/第\s*(\d+)\s*期/) || t.match(/#\s*(\d+)/) || t.match(/\b(?:issue|no\.)\s*(\d+)/i);
  return m ? `#${m[1]}` : null;
}

// ---------------------------------------------------------------------------
// Related posts
//
// Every post carries one of four broad tags (tech / weekly / annually / essays),
// so "same primary tag, newest first" gave every tech article the same list.
// Instead rank candidates by TF-IDF cosine similarity of their title,
// description and section headings (CJK bigrams + Latin words), with a small
// bonus for sharing a tag. Ties and zero-similarity fall back to date proximity.

export interface RelatedInput {
  id: string;
  title: string;
  description?: string;
  tags: string[];
  date: Date;
  body: string;
}

/** Content-collection entry → RelatedInput. */
export function toRelatedInput(p: { id: string; body?: string; data: { title: string; description?: string; tags: string[]; date: Date } }): RelatedInput {
  return { id: p.id, title: p.data.title, description: p.data.description, tags: p.data.tags, date: p.data.date, body: p.body ?? '' };
}

const STOP = new Set(['the', 'and', 'for', 'with', 'from', 'that', 'this', 'what', 'how', 'why', 'are', 'was', 'you', 'your', 'our', 'its', 'into', 'about', 'weekly', 'monthly']);

function tokens(text: string): string[] {
  const out: string[] = [];
  const s = String(text || '').toLowerCase();
  for (const run of s.match(/[㐀-鿿]+/g) || []) {
    for (let i = 0; i < run.length - 1; i++) out.push(run.slice(i, i + 2));
  }
  for (const w of s.replace(/[㐀-鿿]/g, ' ').match(/[a-z][a-z0-9+#.-]{2,}/g) || []) {
    const word = w.replace(/[.-]+$/, '');
    if (!STOP.has(word)) out.push(word);
  }
  return out;
}

function headings(body: string): string {
  return (String(body || '').match(/^#{2,3}\s+.+$/gm) || []).map((h) => h.replace(/^#+\s+/, '')).join(' ');
}

function docText(p: RelatedInput): string {
  // Title weighs most: repeat it.
  return [p.title, p.title, p.description || '', headings(p.body)].join(' ');
}

export function relatedPosts(post: RelatedInput, all: RelatedInput[], limit = 5): { slug: string; title: string }[] {
  const docs = all.map((p) => ({ p, tf: count(tokens(docText(p))) }));
  const df = new Map<string, number>();
  for (const d of docs) for (const k of d.tf.keys()) df.set(k, (df.get(k) || 0) + 1);
  const N = docs.length;
  const vec = (tf: Map<string, number>) => {
    const v = new Map<string, number>();
    let norm = 0;
    for (const [k, n] of tf) {
      const w = (1 + Math.log(n)) * Math.log(1 + N / (df.get(k) || 1));
      v.set(k, w);
      norm += w * w;
    }
    return { v, norm: Math.sqrt(norm) || 1 };
  };
  const self = docs.find((d) => d.p.id === post.id);
  const a = vec(self ? self.tf : count(tokens(docText(post))));
  const scored = docs
    .filter((d) => d.p.id !== post.id)
    .map((d) => {
      const b = vec(d.tf);
      let dot = 0;
      for (const [k, w] of a.v) { const x = b.v.get(k); if (x) dot += w * x; }
      const sim = dot / (a.norm * b.norm);
      const sharesTag = d.p.tags.some((t) => post.tags.includes(t));
      return { d, score: sim + (sharesTag ? 0.02 : 0), gap: Math.abs(d.p.date.valueOf() - post.date.valueOf()) };
    })
    .filter((s) => s.score > 0.02 || post.tags.some((t) => s.d.p.tags.includes(t)))
    .sort((x, y) => y.score - x.score || x.gap - y.gap);
  return scored.slice(0, limit).map((s) => ({ slug: s.d.p.id, title: s.d.p.title }));
}

function count(list: string[]): Map<string, number> {
  const m = new Map<string, number>();
  for (const t of list) m.set(t, (m.get(t) || 0) + 1);
  return m;
}
