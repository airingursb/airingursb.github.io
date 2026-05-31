#!/usr/bin/env node
// Knowledge sync — self-contained, CI-friendly.
//
// Reads the blog's own posts (src/content/posts), chunks the annual reports +
// recent weeklies, embeds each chunk with SiliconFlow bge-m3, and upserts them
// into Supabase `knowledge_chunks` (pgvector) for the blog-api's RAG retrieval.
// Also writes knowledge-core.md (the always-on core: intro + KNOWLEDGE_LATEST_DATE
// marker) so a blog-api rebuild can bake the right "knowledge cutoff" date.
//
// This is the CANONICAL CI path. It deliberately has NO dependency on the
// blog-server submodule (private) — it lives in the public blog repo where the
// content is, and uses the root package.json's @supabase/supabase-js. The
// submodule's build-knowledge.py + index-knowledge.mjs remain the equivalent
// LOCAL/manual tools; keep their logic in sync with this file if you change
// chunking/classification.
//
// Run:
//   BLOG_SUPABASE_URL=… BLOG_SUPABASE_SERVICE_KEY=… SILICONFLOW_API_KEY=… \
//     node scripts/sync-knowledge.mjs [--out build/knowledge] [--latest 12] [--dry]
//
//   --dry  build + chunk + report, but DON'T embed or write to Supabase.

import { readFileSync, writeFileSync, mkdirSync, readdirSync } from 'fs';
import { resolve, dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(__dirname, '..');
const POSTS = resolve(REPO_ROOT, 'src', 'content', 'posts');

// ── args ──
const argv = process.argv.slice(2);
const argVal = (flag, def) => { const i = argv.indexOf(flag); return i >= 0 && argv[i + 1] ? argv[i + 1] : def; };
const DRY = argv.includes('--dry');
const OUT_DIR = resolve(REPO_ROOT, argVal('--out', 'build/knowledge'));
const LATEST_N = Number(argVal('--latest', '12'));

const CHUNK_TARGET_CHARS = 600;   // ~300 tokens for Chinese
const EMBED_BATCH = 16;

const SUPABASE_URL = process.env.BLOG_SUPABASE_URL;
const SUPABASE_KEY = process.env.BLOG_SUPABASE_SERVICE_KEY;
const SILICONFLOW_KEY = process.env.SILICONFLOW_API_KEY;

const YEAR_RE = /^(\d{4})(?:-[a-z]+)?\.md$/;
const SUMMARY_RE = /^summary-(\d{4})\.md$/;   // blog repo names annuals summary-YYYY.md
const WEEKLY_RE = /^weekly-(\d+)\.md$/;

// ── content cleaning (mirrors build-knowledge.py clean()) ──
function stripFrontmatter(t) { const m = t.match(/^---\n[\s\S]*?\n---\n/); return m ? t.slice(m[0].length) : t; }
function clean(t) {
  t = stripFrontmatter(t);
  t = t.replace(/<!--[\s\S]*?-->/g, '');
  t = t.replace(/<[^>]+>/g, '');
  t = t.replace(/!\[.*?\]\(.*?\)/g, '');
  t = t.replace(/^\s*https?:\/\/\S+\s*$/gm, '');
  t = t.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1');
  t = t.replace(/^-{3,}\s*$/gm, '');
  t = t.replace(/\$[^$]+\$/g, '');
  t = t.replace(/\n{3,}/g, '\n\n');
  return t.trim();
}
function meta(t) {
  const title = t.match(/title:\s*"?([^"\n]+)"?/);
  const date = t.match(/date:\s*(\d{4}-\d{2}-\d{2})/);
  return { title: title ? title[1].trim() : '', date: date ? date[1] : '' };
}

// ── discover the curated knowledge set from src/content/posts ──
function discoverSections() {
  const files = readdirSync(POSTS).filter((f) => f.endsWith('.md'));
  const sections = [];

  // annuals: YYYY.md / YYYY-name.md / summary-YYYY.md
  const annuals = files.filter((f) => YEAR_RE.test(f) || SUMMARY_RE.test(f));
  // WWDC trip
  if (files.includes('wwdc-19.md')) annuals.push('wwdc-19.md');
  for (const f of annuals) {
    const raw = readFileSync(join(POSTS, f), 'utf8');
    const { title, date } = meta(raw);
    sections.push({ kind: 'annual', slug: date ? `annual-${date}` : `annual-${f.replace('.md', '')}`, title: title || f, date, body: clean(raw) });
  }

  // latest N weeklies by issue number
  const weeklies = files
    .map((f) => { const m = f.match(WEEKLY_RE); return m ? { n: Number(m[1]), f } : null; })
    .filter(Boolean)
    .sort((a, b) => a.n - b.n)
    .slice(-LATEST_N);
  for (const { n, f } of weeklies) {
    const raw = readFileSync(join(POSTS, f), 'utf8');
    const { title, date } = meta(raw);
    sections.push({ kind: 'weekly', slug: `weekly-${n}`, title: title || `Weekly ${n}`, date, body: clean(raw) });
  }
  return sections;
}

function chunkBody(body, target = CHUNK_TARGET_CHARS) {
  const paras = body.split(/\n\s*\n+/).map((p) => p.trim()).filter(Boolean);
  const chunks = [];
  let buf = '';
  for (const p of paras) {
    if (buf.length + p.length + 2 > target && buf) { chunks.push(buf.trim()); buf = p; }
    else buf = buf ? `${buf}\n\n${p}` : p;
  }
  if (buf.trim()) chunks.push(buf.trim());
  return chunks;
}

async function embedBatch(texts) {
  const res = await fetch('https://api.siliconflow.cn/v1/embeddings', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${SILICONFLOW_KEY}` },
    body: JSON.stringify({ model: 'BAAI/bge-m3', input: texts, encoding_format: 'float' }),
  });
  if (!res.ok) throw new Error(`SiliconFlow ${res.status}: ${await res.text()}`);
  const data = await res.json();
  const out = new Array(texts.length).fill(null);
  for (const item of data.data || []) if (Number.isInteger(item.index) && Array.isArray(item.embedding)) out[item.index] = item.embedding;
  return out;
}

async function main() {
  const sections = discoverSections();
  const annuals = sections.filter((s) => s.kind === 'annual');
  const weeklies = sections.filter((s) => s.kind === 'weekly');
  const latestDate = sections.reduce((max, s) => (s.date > max ? s.date : max), '');
  console.log(`[sync-knowledge] ${annuals.length} annuals + ${weeklies.length} weeklies; latest date ${latestDate || 'unknown'}`);

  // write knowledge-core.md (intro + date marker) for the blog-api image to bake
  mkdirSync(OUT_DIR, { recursive: true });
  const core = `# Airing 的知识库\n\n以下是 Airing 的年度总结、WWDC 游记和近期月刊，用于了解他的经历、思考和风格。\n\n\n<!-- KNOWLEDGE_LATEST_DATE: ${latestDate} -->\n`;
  writeFileSync(join(OUT_DIR, 'knowledge-core.md'), core, 'utf8');
  console.log(`[sync-knowledge] wrote ${join(OUT_DIR, 'knowledge-core.md')}`);

  // chunk
  const rows = [];
  for (const s of sections) {
    chunkBody(s.body).forEach((c, i) => rows.push({ source: s.slug, source_title: s.title, source_date: s.date, chunk_index: i, content: c }));
  }
  console.log(`[sync-knowledge] ${rows.length} chunks total`);

  if (DRY) {
    console.log('[sync-knowledge] --dry: skipping embed + Supabase write');
    console.log('  weeklies:', weeklies.map((w) => w.slug).join(' '));
    return;
  }

  if (!SUPABASE_URL || !SUPABASE_KEY) throw new Error('Missing BLOG_SUPABASE_URL / BLOG_SUPABASE_SERVICE_KEY');
  if (!SILICONFLOW_KEY) throw new Error('Missing SILICONFLOW_API_KEY');
  const sb = createClient(SUPABASE_URL, SUPABASE_KEY);

  for (let i = 0; i < rows.length; i += EMBED_BATCH) {
    const slice = rows.slice(i, i + EMBED_BATCH);
    const vecs = await embedBatch(slice.map((r) => r.content));
    slice.forEach((r, j) => { r.embedding = vecs[j]; });
    process.stdout.write(`  embedded ${Math.min(i + EMBED_BATCH, rows.length)}/${rows.length}\r`);
  }
  console.log(`\n[sync-knowledge] embedded ${rows.length} chunks`);

  const sources = [...new Set(rows.map((r) => r.source))];
  const { error: delErr } = await sb.from('knowledge_chunks').delete().in('source', sources);
  if (delErr) throw new Error(`delete-old failed: ${delErr.message}`);
  for (let i = 0; i < rows.length; i += 100) {
    const { error } = await sb.from('knowledge_chunks').insert(rows.slice(i, i + 100));
    if (error) throw new Error(`insert failed: ${error.message}`);
  }
  console.log(`[sync-knowledge] upserted ${rows.length} chunks for ${sources.length} sources → done`);
}

main().catch((err) => { console.error(err); process.exit(1); });
