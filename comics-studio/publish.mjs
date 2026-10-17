#!/usr/bin/env node
// comics-studio/publish.mjs
// Take a finished draft (strip.png + meta.json) → create draft row + upload PNG and
// a WebP copy to R2 + send Telegram preview to admin. Admin taps ✅ in Telegram to actually publish.
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
import { resolve, basename, dirname, isAbsolute } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createClient } from '@supabase/supabase-js';
import { loadEnv, envFiles, requireEnv, createR2, uploadStripVersion } from './strip-assets.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(__dirname, '..');

// ── Load env from common locations ──────────────────────────────
loadEnv(envFiles(__dirname, REPO_ROOT));
requireEnv([
  'BLOG_SUPABASE_URL', 'BLOG_SUPABASE_SERVICE_KEY',
  'R2_ACCOUNT_ID', 'R2_ACCESS_KEY_ID', 'R2_SECRET_ACCESS_KEY', 'R2_BUCKET', 'R2_PUBLIC_BASE',
  'COMICS_TELEGRAM_BOT_TOKEN', 'ADMIN_TELEGRAM_USER_ID',
]);

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

// Cleanup helper — hard-delete the draft row if a later step fails.
async function rollback(reason) {
  console.error(`✗ ${reason}`);
  try {
    await sb.from('comics').delete().eq('id', row.id);
    console.error(`  (rolled back · row ${row.id} deleted)`);
  } catch (e) {
    console.error(`  (rollback failed; please \`DELETE FROM comics WHERE id='${row.id}'\` manually)`);
  }
  process.exit(1);
}

// ── 2. Upload PNG + WebP to R2 ───────────────────────────────────
let url, original;
try {
  const r2 = await createR2();
  const panels = await uploadStripVersion({ r2, rowId: row.id, version: 1, pngBytes: imageBytes });
  ({ url, original } = panels);
  console.log(`✓ uploaded to R2 · ${url}`);
  console.log(`   png ${(panels.bytes.png / 1024).toFixed(0)} KB → webp ${(panels.bytes.webp / 1024).toFixed(0)} KB`);

  await sb.from('comics').update({
    panels: { url, original, width: panels.width, height: panels.height, alt: { zh: titleZh, en: titleEn } },
  }).eq('id', row.id);
} catch (e) {
  await rollback(`R2 upload failed: ${e.message || e}`);
}

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

try {
  await tgCall('sendPhoto', {
    chat_id: adminId,
    photo: original,
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
} catch (e) {
  // Don't rollback — image is already on R2, row has the URL.
  // Just tell the user how to recover.
  console.error(`✗ Telegram preview failed: ${e.message || e}`);
  console.error(`  Row + image are intact. To approve manually:`);
  console.error(`    SQL: UPDATE comics SET issue_number=(SELECT comics_allocate_issue()), approved=true, published_at=now() WHERE id='${row.id}';`);
  console.error(`    Then fire dispatch: curl -X POST -H "Authorization: Bearer \$GH_DISPATCH_TOKEN" https://api.github.com/repos/airingursb/airingursb.github.io/dispatches -d '{"event_type":"strip-published"}'`);
  process.exit(1);
}
