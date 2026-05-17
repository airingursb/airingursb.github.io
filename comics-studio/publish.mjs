#!/usr/bin/env node
// comics-studio/publish.mjs
// Take a finished draft (strip.png + meta.json) → create draft row + upload to R2 +
// send Telegram preview to admin. Admin taps ✅ in Telegram to actually publish.
//
// Usage:
//   node comics-studio/publish.mjs drafts/<slug>
//   node comics-studio/publish.mjs comics-studio/drafts/<slug>   # also works
//
// Env (auto-loaded from these files in order, first match wins):
//   comics-studio/.env
//   services/blog-api/.env
//   .env (repo root)
//
// Required env vars:
//   BLOG_SUPABASE_URL, BLOG_SUPABASE_SERVICE_KEY
//   R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET, R2_PUBLIC_BASE
//   COMICS_TELEGRAM_BOT_TOKEN
//   ADMIN_TELEGRAM_USER_ID

import { readFile, stat } from 'node:fs/promises';
import { existsSync, readFileSync } from 'node:fs';
import { resolve, basename, dirname, isAbsolute } from 'node:path';
import { fileURLToPath } from 'node:url';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { createClient } from '@supabase/supabase-js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(__dirname, '..');

// ── Load env from common locations ──────────────────────────────
const ENV_FILES = [
  resolve(__dirname, '.env'),
  resolve(REPO_ROOT, 'services/blog-api/.env'),
  resolve(REPO_ROOT, '.env'),
];
for (const f of ENV_FILES) {
  if (!existsSync(f)) continue;
  for (const line of readFileSync(f, 'utf8').split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#') || !trimmed.includes('=')) continue;
    const eq = trimmed.indexOf('=');
    const k = trimmed.slice(0, eq).trim();
    const v = trimmed.slice(eq + 1).trim();
    if (!(k in process.env)) process.env[k] = v;
  }
}

const REQUIRED = [
  'BLOG_SUPABASE_URL', 'BLOG_SUPABASE_SERVICE_KEY',
  'R2_ACCOUNT_ID', 'R2_ACCESS_KEY_ID', 'R2_SECRET_ACCESS_KEY', 'R2_BUCKET', 'R2_PUBLIC_BASE',
  'COMICS_TELEGRAM_BOT_TOKEN', 'ADMIN_TELEGRAM_USER_ID',
];
const missing = REQUIRED.filter(k => !process.env[k]);
if (missing.length) {
  console.error('Missing env vars:', missing.join(', '));
  process.exit(1);
}

// ── Resolve draft directory ──────────────────────────────────────
let draftArg = process.argv[2];
if (!draftArg) {
  console.error('Usage: node comics-studio/publish.mjs <draft-dir>');
  console.error('  e.g. node comics-studio/publish.mjs drafts/2026-05-17-semicolon');
  process.exit(1);
}
const draftDir = isAbsolute(draftArg) ? draftArg
  : draftArg.startsWith('comics-studio/') ? resolve(REPO_ROOT, draftArg)
  : resolve(__dirname, draftArg);

try { await stat(draftDir); } catch {
  console.error(`Draft dir not found: ${draftDir}`);
  process.exit(1);
}

const imagePath = resolve(draftDir, 'strip.png');
const metaPath = resolve(draftDir, 'meta.json');
try { await stat(imagePath); } catch {
  console.error(`Missing strip.png in ${draftDir}`);
  process.exit(1);
}
try { await stat(metaPath); } catch {
  console.error(`Missing meta.json in ${draftDir}`);
  process.exit(1);
}

const imageBytes = await readFile(imagePath);
const meta = JSON.parse(await readFile(metaPath, 'utf8'));

if (!meta.title) {
  console.error('meta.json must have a "title" field');
  process.exit(1);
}
const titleZh = meta.title;
const titleEn = meta.title_en || meta.title;
const sourceText = meta.source_text || '';
const tags = Array.isArray(meta.tags) ? meta.tags : [];

console.log(`📥 publishing draft: ${basename(draftDir)}`);
console.log(`   title: ${titleZh} / ${titleEn}`);
console.log(`   tags:  ${tags.join(', ') || '(none)'}`);

// ── 1. Insert draft row in Supabase ──────────────────────────────
const sb = createClient(process.env.BLOG_SUPABASE_URL, process.env.BLOG_SUPABASE_SERVICE_KEY, {
  auth: { persistSession: false },
});
const adminId = Number(process.env.ADMIN_TELEGRAM_USER_ID);

const { data: row, error: insErr } = await sb.from('comics').insert({
  source_text: sourceText,
  title: { zh: titleZh, en: titleEn },
  tags,
  script: {},
  panels: {},
  telegram_user_id: adminId,
  telegram_chat_id: adminId,
  telegram_source_msg_id: 0,
}).select().single();
if (insErr) {
  console.error('Supabase insert failed:', insErr.message);
  process.exit(1);
}
console.log(`✓ row created · id=${row.id}`);

// ── 2. Upload to R2 ──────────────────────────────────────────────
const r2 = new S3Client({
  region: 'auto',
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
  },
});
const key = `strip/${row.id}/v1/strip.png`;
await r2.send(new PutObjectCommand({
  Bucket: process.env.R2_BUCKET,
  Key: key,
  Body: imageBytes,
  ContentType: 'image/png',
}));
const url = `${process.env.R2_PUBLIC_BASE.replace(/\/$/, '')}/${key}`;
console.log(`✓ uploaded to R2 · ${url}`);

await sb.from('comics').update({
  panels: { url, alt: { zh: titleZh, en: titleEn } },
}).eq('id', row.id);

// ── 3. Send Telegram preview to admin ───────────────────────────
const tgToken = process.env.COMICS_TELEGRAM_BOT_TOKEN;
const tgCall = async (method, body) => {
  const res = await fetch(`https://api.telegram.org/bot${tgToken}/${method}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const json = await res.json();
  if (!json.ok) throw new Error(`Telegram ${method}: ${json.description}`);
  return json.result;
};

await tgCall('sendPhoto', {
  chat_id: adminId,
  photo: url,
  caption: `*草稿* · 「${titleZh}」` + (titleEn !== titleZh ? ` / 「${titleEn}」` : ''),
  parse_mode: 'Markdown',
});

const kbMsg = await tgCall('sendMessage', {
  chat_id: adminId,
  text: '选择操作：',
  reply_markup: {
    inline_keyboard: [[
      { text: '✅ 发布', callback_data: `strip:approve:${row.id}` },
      { text: '❌ 删', callback_data: `strip:cancel:${row.id}` },
    ]],
  },
});
await sb.from('comics').update({ telegram_preview_msg_id: kbMsg.message_id }).eq('id', row.id);

console.log(`✓ Preview pushed to Telegram. Tap ✅ in your DM to publish.`);
console.log(`   row.id = ${row.id}`);
