/**
 * Migrate post likes from Typlog (blog.ursb.me) to Supabase.
 * Scrapes the "Enjoy ♥ N" button from each post page.
 *
 * Usage:
 *   node scripts/migrate_likes.mjs
 *   node scripts/migrate_likes.mjs --dry-run   # just print, don't insert
 */

import { chromium } from 'playwright';
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const BLOG_BASE = 'https://blog.ursb.me/posts';

const ALL_SLUGS = [
  'weekly-33','weekly-32','weekly-31','weekly-30',
  'game-engine-renderer','weekly-29','summary-2024','weekly-28','moflow',
  'mac-app-share-2024','weekly-27','2024-summer','service','weekly-26',
  'tools','weekly-25','summary-2023','weekly-24','weekly-23',
  'weekly-22','weekly-21','weekly-20','weekly-19','cross-end',
  'weekly-18','summary-2022',
  'weekly-17','weekly-16','chromium-renderer','weekly-13',
  'case-sensitivity','weekly-12','weekly-11','weekly-10','weekly-9',
  'weekly-8','weekly-7','weekly-6','weekly-5','weekly-4','weekly-3',
  'weekly-2','weekly-1','js-string-to-number','summary-2021','life',
  'flutter-reduce','roam-research','homogeneous','flutter-downgrade',
  'summary-2020','sky','flutter-kant','flutter-hybrid','flutter-boost-android',
  'summary-2019','react-hooks-4','react-hooks-3','react-hooks-2','react-hooks-1',
  'wwdc-19','2life-develop-experience','hpp','xst','csrf','xss',
  'ai-consciousness','how-write-essay','summary-2018',
  'wreak-it','web-terminal','learning-system','summary-2017',
  'douban-movie-analysis','bilibili-user',
  'summary-2025',
];

// ── .env loader ─────────────────────────────────────────────────────────────

function loadEnv() {
  const root = path.resolve(__dirname, '..');
  const candidates = [
    path.join(root, '.env'),
    path.join(root, 'services', 'chat', '.env'),
    path.join(root, 'services', 'blog-api', '.env'),
  ];
  const env = {};
  for (const p of candidates) {
    if (!fs.existsSync(p)) continue;
    for (const line of fs.readFileSync(p, 'utf-8').split('\n')) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const idx = trimmed.indexOf('=');
      if (idx === -1) continue;
      const key = trimmed.slice(0, idx).trim();
      let val = trimmed.slice(idx + 1).trim();
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'")))
        val = val.slice(1, -1);
      env[key] = val;
    }
  }
  return env;
}

// ── Main ────────────────────────────────────────────────────────────────────

async function main() {
  const dryRun = process.argv.includes('--dry-run');

  const env = loadEnv();
  const supabaseUrl = env.BLOG_SUPABASE_URL;
  const supabaseKey = env.BLOG_SUPABASE_SERVICE_KEY;
  if (!dryRun && (!supabaseUrl || !supabaseKey)) {
    console.error('Error: BLOG_SUPABASE_URL and BLOG_SUPABASE_SERVICE_KEY must be set in .env');
    process.exit(1);
  }
  const supabase = dryRun ? null : createClient(supabaseUrl, supabaseKey, { auth: { persistSession: false } });

  console.log(`Scanning ${ALL_SLUGS.length} posts for likes...${dryRun ? ' (DRY RUN)' : ''}\n`);

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();

  const results = [];

  for (const slug of ALL_SLUGS) {
    const url = `${BLOG_BASE}/${slug}/`;
    const page = await context.newPage();

    try {
      await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });

      // Extract like count from "Enjoy ♥ N" button
      const likeCount = await page.evaluate(() => {
        const btn = Array.from(document.querySelectorAll('button'))
          .find(b => b.textContent.includes('Enjoy'));
        if (!btn) return 0;
        const match = btn.textContent.trim().match(/Enjoy\s*[♥❤]?\s*(\d+)/);
        return match ? parseInt(match[1]) : 0;
      });

      if (likeCount > 0) {
        results.push({ slug, likes: likeCount });
        console.log(`  [${slug}] ${likeCount} likes`);
      }
    } catch (err) {
      console.error(`  [${slug}] Error: ${err.message}`);
    }

    await page.close();
  }

  await browser.close();

  console.log(`\nFound ${results.length} posts with likes.`);

  if (dryRun || !supabase) {
    console.log('\nDry run results:');
    results.forEach(r => console.log(`  ${r.slug}: ${r.likes}`));
    return;
  }

  // Insert likes as placeholder IPs (migrated-1, migrated-2, etc.)
  let totalInserted = 0;
  for (const { slug, likes } of results) {
    // Check if already migrated
    const { count } = await supabase
      .from('post_likes')
      .select('*', { count: 'exact', head: true })
      .eq('post_slug', slug)
      .like('ip', 'migrated-%');

    if (count && count > 0) {
      console.log(`  [${slug}] Already migrated (${count} likes), skipping.`);
      continue;
    }

    // Insert N likes with unique placeholder IPs
    const rows = [];
    for (let i = 0; i < likes; i++) {
      rows.push({ post_slug: slug, ip: `migrated-${slug}-${i + 1}` });
    }

    const { error } = await supabase.from('post_likes').insert(rows);
    if (error) {
      console.error(`  [${slug}] Insert error: ${error.message}`);
    } else {
      totalInserted += likes;
      console.log(`  [${slug}] Migrated ${likes} likes.`);
    }
  }

  console.log(`\n=== Migration Complete ===`);
  console.log(`Total likes migrated: ${totalInserted}`);
}

main().catch(err => {
  console.error('Fatal:', err);
  process.exit(1);
});
