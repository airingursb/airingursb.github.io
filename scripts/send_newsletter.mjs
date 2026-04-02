#!/usr/bin/env node

/**
 * Send newsletter for a blog post.
 *
 * Usage:
 *   node scripts/send_newsletter.mjs --slug=my-post [--dry-run] [--api-url=...] [--token=...]
 *
 * Reads the post markdown from src/content/posts/<slug>.md, extracts
 * frontmatter + excerpt, and calls POST /api/admin/newsletter/send.
 *
 * Environment variables (or flags):
 *   BLOG_API_URL   — defaults to https://ursb.me
 *   ADMIN_TOKEN    — required for authentication
 */

import { readFileSync } from 'fs';
import { resolve } from 'path';

// ── Parse CLI args ──────────────────────────────────────────────────────────

function parseArgs(argv) {
  const args = {};
  for (const arg of argv.slice(2)) {
    if (arg.startsWith('--')) {
      const [key, ...rest] = arg.slice(2).split('=');
      args[key] = rest.length ? rest.join('=') : true;
    }
  }
  return args;
}

const args = parseArgs(process.argv);
const slug = args.slug;
const dryRun = !!args['dry-run'];
const testEmail = args['test-email'] || null;
const apiUrl = args['api-url'] || process.env.BLOG_API_URL || 'https://ursb.me';
const adminToken = args.token || process.env.ADMIN_TOKEN;

if (!slug) {
  console.error('Usage: node scripts/send_newsletter.mjs --slug=<post-slug> [--dry-run]');
  process.exit(1);
}

if (!adminToken) {
  console.error('Error: ADMIN_TOKEN is required (env var or --token=...)');
  process.exit(1);
}

// ── Read and parse the post markdown ────────────────────────────────────────

const postsDir = resolve(import.meta.dirname, '..', 'src', 'content', 'posts');
const filePath = resolve(postsDir, `${slug}.md`);

let raw;
try {
  raw = readFileSync(filePath, 'utf8');
} catch {
  console.error(`Post not found: ${filePath}`);
  process.exit(1);
}

// Parse YAML frontmatter
const fmMatch = raw.match(/^---\r?\n([\s\S]*?)\r?\n---/);
if (!fmMatch) {
  console.error('No frontmatter found in post.');
  process.exit(1);
}

const fmBlock = fmMatch[1];
const content = raw.slice(fmMatch[0].length).trim();

function parseFrontmatter(block) {
  const fm = {};
  for (const line of block.split('\n')) {
    const m = line.match(/^(\w+):\s*(.+)$/);
    if (!m) continue;
    let [, key, val] = m;
    val = val.trim().replace(/^["']|["']$/g, '');
    if (val.startsWith('[') && val.endsWith(']')) {
      fm[key] = val.slice(1, -1).split(',').map((s) => s.trim().replace(/^["']|["']$/g, ''));
    } else {
      fm[key] = val;
    }
  }
  return fm;
}

const fm = parseFrontmatter(fmBlock);

// Extract plain-text excerpt (~300 chars, strip markdown)
function extractExcerpt(md, maxLen = 300) {
  const plain = md
    .replace(/^#{1,6}\s+.*$/gm, '')     // remove headings
    .replace(/!\[.*?\]\(.*?\)/g, '')     // remove images
    .replace(/\[([^\]]*)\]\(.*?\)/g, '$1') // links → text
    .replace(/[*_`~>]/g, '')             // strip formatting
    .replace(/\n{2,}/g, '\n')            // collapse blank lines
    .trim();
  if (plain.length <= maxLen) return plain;
  return plain.slice(0, maxLen).replace(/\s+\S*$/, '') + '……';
}

const post = {
  title: fm.title || slug,
  slug,
  cover: fm.cover || '',
  description: fm.description || '',
  excerpt: extractExcerpt(content),
  tags: Array.isArray(fm.tags) ? fm.tags : [],
  date: fm.date || '',
};

// ── Call the API ────────────────────────────────────────────────────────────

console.log(`\n📰 Newsletter: "${post.title}"`);
console.log(`   Slug:    ${post.slug}`);
console.log(`   Cover:   ${post.cover || '(none)'}`);
console.log(`   Tags:    ${post.tags.join(', ') || '(none)'}`);
console.log(`   Excerpt: ${post.excerpt.slice(0, 80)}...`);
console.log(`   Dry run: ${dryRun}`);
if (testEmail) console.log(`   Test to: ${testEmail}`);
console.log();

const params = new URLSearchParams();
if (dryRun) params.set('dry_run', '1');
if (testEmail) params.set('test_email', testEmail);
const qs = params.toString();
const endpoint = `${apiUrl}/api/admin/newsletter/send${qs ? '?' + qs : ''}`;

try {
  const resp = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${adminToken}`,
    },
    body: JSON.stringify(post),
  });

  const data = await resp.json();

  if (!resp.ok) {
    console.error(`❌ API error (${resp.status}):`, data.error || data.message || JSON.stringify(data));
    process.exit(1);
  }

  if (data.dryRun) {
    console.log(`✅ Dry run complete — would send to ${data.sent} subscribers.`);
  } else {
    console.log(`✅ Newsletter sent to ${data.sent} subscribers.`);
  }
} catch (err) {
  console.error('❌ Request failed:', err.message);
  process.exit(1);
}
