#!/usr/bin/env node
// comics-studio/replace.mjs
// Swap the image of already-published issues (redraws, fixes) without creating new issues.
// For each issue: upload PNG + WebP to the next strip/<rowId>/v<N>/, point panels at it,
// keep the old URL in panels.previous. Then fire one deploy for the whole batch.
//
// Usage:
//   node comics-studio/replace.mjs <issue>=<strip.png | dir containing strip.png> [...more]
//   node comics-studio/replace.mjs 17=~/Downloads/comics-redraw/no17 3=./no03/strip.png
//
// Flags:
//   --dry-run     show what would change; upload nothing, write nothing
//   --no-deploy   update R2 + Supabase but skip the deploy trigger
//
// Env: BLOG_SUPABASE_URL, BLOG_SUPABASE_SERVICE_KEY, R2_* (same files as publish.mjs).
// Deploy: GH_DISPATCH_TOKEN if set, otherwise the logged-in `gh` CLI.

import { readFile, stat } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { homedir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
import { createClient } from '@supabase/supabase-js';
import { loadEnv, envFiles, requireEnv, createR2, uploadStripVersion, nextStripVersion } from './strip-assets.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(__dirname, '..');
const REPO = 'airingursb/airingursb.github.io';

const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const noDeploy = args.includes('--no-deploy');
const pairs = args.filter(a => !a.startsWith('--'));
if (!pairs.length) {
  console.error('Usage: node comics-studio/replace.mjs <issue>=<strip.png|dir> [...] [--dry-run] [--no-deploy]');
  process.exit(1);
}

loadEnv(envFiles(__dirname, REPO_ROOT));
requireEnv([
  'BLOG_SUPABASE_URL', 'BLOG_SUPABASE_SERVICE_KEY',
  'R2_ACCOUNT_ID', 'R2_ACCESS_KEY_ID', 'R2_SECRET_ACCESS_KEY', 'R2_BUCKET', 'R2_PUBLIC_BASE',
]);

// ── Resolve every input before touching anything ─────────────────
const jobs = [];
for (const pair of pairs) {
  const m = /^(\d+)=(.+)$/.exec(pair);
  if (!m) {
    console.error(`Bad argument "${pair}", expected <issue>=<path>`);
    process.exit(1);
  }
  let file = m[2].replace(/^~(?=\/)/, homedir());
  file = resolve(process.cwd(), file);
  try {
    if ((await stat(file)).isDirectory()) file = resolve(file, 'strip.png');
    await stat(file);
  } catch {
    console.error(`Issue ${m[1]}: file not found: ${file}`);
    process.exit(1);
  }
  jobs.push({ issue: Number(m[1]), file });
}

const sb = createClient(process.env.BLOG_SUPABASE_URL, process.env.BLOG_SUPABASE_SERVICE_KEY, {
  auth: { persistSession: false },
});
const { data: rows, error } = await sb.from('comics')
  .select('id, issue_number, title, panels')
  .in('issue_number', jobs.map(j => j.issue))
  .eq('approved', true)
  .eq('deleted', false);
if (error) {
  console.error('Supabase lookup failed:', error.message);
  process.exit(1);
}
for (const job of jobs) {
  job.row = rows.find(r => r.issue_number === job.issue);
  if (!job.row) {
    console.error(`Issue ${job.issue}: no published comic with that number`);
    process.exit(1);
  }
}

// ── Upload + repoint, one issue at a time ────────────────────────
const r2 = dryRun ? null : await createR2();
let replaced = 0;
for (const { issue, file, row } of jobs) {
  const version = nextStripVersion(row.panels?.url);
  const label = `No.${issue}「${row.title?.zh}」`;
  if (dryRun) {
    console.log(`· ${label}: ${row.panels?.url} → v${version} from ${file}`);
    continue;
  }
  try {
    const pngBytes = await readFile(file);
    const up = await uploadStripVersion({ r2, rowId: row.id, version, pngBytes });
    const panels = {
      ...row.panels,
      url: up.url,
      original: up.original,
      width: up.width,
      height: up.height,
      previous: row.panels?.url || null,
    };
    const { error: upErr } = await sb.from('comics').update({ panels }).eq('id', row.id);
    if (upErr) throw new Error(`Supabase update: ${upErr.message}`);
    replaced++;
    console.log(`✓ ${label} → v${version} · png ${(up.bytes.png / 1024).toFixed(0)} KB → webp ${(up.bytes.webp / 1024).toFixed(0)} KB`);
    console.log(`   ${up.url}`);
  } catch (e) {
    console.error(`✗ ${label}: ${e.message || e}`);
    console.error('  Stopping here; issues above are already replaced, the rest are untouched.');
    break;
  }
}

if (dryRun) process.exit(0);
if (!replaced) process.exit(1);

// ── Trigger deploy so the static pages pick up the new URLs ─────
if (noDeploy) {
  console.log('Skipped deploy (--no-deploy). Fire it later with: gh workflow run deploy.yml');
} else {
  const payload = JSON.stringify({ event_type: 'strip-published', client_payload: { replaced: jobs.map(j => j.issue) } });
  try {
    if (process.env.GH_DISPATCH_TOKEN) {
      const res = await fetch(`https://api.github.com/repos/${REPO}/dispatches`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${process.env.GH_DISPATCH_TOKEN}`,
          Accept: 'application/vnd.github+json',
          'Content-Type': 'application/json',
        },
        body: payload,
      });
      if (res.status !== 204) throw new Error(`${res.status} ${await res.text()}`);
    } else {
      execFileSync('gh', ['api', `repos/${REPO}/dispatches`, '--input', '-'], { input: payload, stdio: ['pipe', 'ignore', 'inherit'] });
    }
    console.log('✓ Deploy triggered. ursb.me/comics updates in ~3 min.');
  } catch (e) {
    console.error(`✗ Deploy trigger failed: ${e.message || e}`);
    console.error('  Data is updated; run `gh workflow run deploy.yml` to publish.');
    process.exit(1);
  }
}
if (replaced < jobs.length) process.exit(1);
