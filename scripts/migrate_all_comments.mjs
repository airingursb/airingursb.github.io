/**
 * Migrate ALL comments from Typlog (blog.ursb.me) to Supabase.
 * Uses Playwright to scrape comments from Shadow DOM since the Typlog API requires
 * widget-specific auth that can't be replicated server-side.
 *
 * Usage:
 *   node scripts/migrate_all_comments.mjs
 *   node scripts/migrate_all_comments.mjs --slug summary-2024   # single post
 */

import { chromium } from 'playwright';
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// ── Config ──────────────────────────────────────────────────────────────────

const BLOG_BASE = 'https://blog.ursb.me/posts';
const ALREADY_MIGRATED = ['summary-2025']; // Already migrated in previous session

// All known post slugs
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
  'douban-movie-analysis','bilibili-user'
];

// ── .env loader ─────────────────────────────────────────────────────────────

function loadEnv() {
  const root = path.resolve(__dirname, '..');
  const candidates = [
    path.join(root, '.env'),
    path.join(root, 'services', 'chat', '.env'),
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

// ── Extract comments from Shadow DOM ────────────────────────────────────────

async function extractComments(page) {
  return page.evaluate(() => {
    const tcComment = document.querySelector('tc-comment');
    if (!tcComment || !tcComment.shadowRoot) return [];

    const allComments = [];

    function extractFromItem(item, parentIndex) {
      const sr = item.shadowRoot;
      if (!sr) return;

      // Typlog Shadow DOM structure:
      //   .comment > .head > .info > span (name), time
      //                    > .avatar > picture > img
      //            > .content > p (text)
      //            > .children > tc-comment-item (replies)
      const info = sr.querySelector('.info');
      const contentEl = sr.querySelector('.content');
      const timeEl = sr.querySelector('time');
      const avatarImg = sr.querySelector('.avatar img') || sr.querySelector('img');

      if (!info || !contentEl) return;

      const nameSpan = info.querySelector('span');
      const nameLink = info.querySelector('a');

      const myIndex = allComments.length;
      allComments.push({
        nickname: nameSpan ? nameSpan.textContent.trim() : 'Anonymous',
        website: nameLink ? nameLink.href : null,
        time: timeEl ? (timeEl.getAttribute('datetime') || timeEl.textContent.trim()) : null,
        content: contentEl.innerHTML.trim(),
        contentText: contentEl.textContent.trim(),
        avatarUrl: avatarImg ? avatarImg.src : null,
        parentIndex: parentIndex,
      });

      // Extract replies
      const childrenContainer = sr.querySelector('.children');
      if (childrenContainer) {
        const childItems = childrenContainer.querySelectorAll(':scope > tc-comment-item');
        for (const child of childItems) {
          extractFromItem(child, myIndex);
        }
      }
    }

    const tcSr = tcComment.shadowRoot;
    const topItems = tcSr.querySelectorAll('.comments > tc-comment-item');
    for (const item of topItems) {
      extractFromItem(item, null);
    }
    return allComments;
  });
}

// ── Extract gravatar hash from avatar URL ───────────────────────────────────

function extractGravatarHash(avatarUrl) {
  if (!avatarUrl) return null;
  const match = avatarUrl.match(/gravatar\.\w+\/avatar\/([a-f0-9]+)/i);
  return match ? match[1] : null;
}

// ── Strip HTML ──────────────────────────────────────────────────────────────

function stripHtml(html) {
  if (!html) return '';
  return html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .trim();
}

// ── Main ────────────────────────────────────────────────────────────────────

async function main() {
  const args = process.argv.slice(2);
  let targetSlug = null;
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--slug' && args[i + 1]) targetSlug = args[i + 1];
  }

  const env = loadEnv();
  const supabaseUrl = env.BLOG_SUPABASE_URL;
  const supabaseKey = env.BLOG_SUPABASE_SERVICE_KEY;
  if (!supabaseUrl || !supabaseKey) {
    console.error('Error: BLOG_SUPABASE_URL and BLOG_SUPABASE_SERVICE_KEY must be set in .env');
    process.exit(1);
  }
  const supabase = createClient(supabaseUrl, supabaseKey, { auth: { persistSession: false } });

  const slugs = targetSlug
    ? [targetSlug]
    : ALL_SLUGS.filter(s => !ALREADY_MIGRATED.includes(s));

  console.log(`Scanning ${slugs.length} posts for comments...\n`);

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();

  let totalMigrated = 0;
  let postsWithComments = 0;

  for (const slug of slugs) {
    const url = `${BLOG_BASE}/${slug}/`;
    const page = await context.newPage();

    try {
      await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });

      // Wait for tc-comment to appear and load
      const tcComment = await page.$('tc-comment');
      if (!tcComment) {
        console.log(`  [${slug}] No comment widget found, skipping.`);
        await page.close();
        continue;
      }

      // Wait for Shadow DOM to render comments (up to 8s)
      await page.waitForTimeout(3000);

      // Check if there are any comments
      const comments = await extractComments(page);

      if (comments.length === 0) {
        // No comments
        await page.close();
        continue;
      }

      postsWithComments++;
      console.log(`  [${slug}] Found ${comments.length} comments. Migrating...`);

      // Check if already migrated to avoid duplicates
      const { data: existing } = await supabase
        .from('post_comments')
        .select('id')
        .eq('post_slug', slug)
        .limit(1);

      if (existing && existing.length > 0) {
        console.log(`  [${slug}] Already has comments in Supabase, skipping.`);
        await page.close();
        continue;
      }

      // Insert comments in order, building ID map for parent references
      const idMap = new Map(); // index in comments array -> supabase id

      for (let i = 0; i < comments.length; i++) {
        const c = comments[i];
        const gravatarHash = extractGravatarHash(c.avatarUrl);
        const email = gravatarHash ? `${gravatarHash}@gravatar.placeholder` : 'unknown@placeholder';

        // Determine if this is an author comment (Airing)
        const isAuthor = c.nickname === 'Airing' || c.nickname === 'airing';
        const finalEmail = isAuthor ? 'me@ursb.me' : email;

        // Clean website URL
        let website = c.website;
        if (website && (website === 'javascript:void(0)' || website === '#')) website = null;

        const row = {
          post_slug: slug,
          nickname: c.nickname,
          email: finalEmail,
          website: website,
          content: stripHtml(c.content),
          created_at: c.time || new Date().toISOString(),
          status: 'approved',
          parent_id: c.parentIndex !== null && idMap.has(c.parentIndex) ? idMap.get(c.parentIndex) : null,
        };

        const { data, error } = await supabase
          .from('post_comments')
          .insert(row)
          .select('id')
          .single();

        if (error) {
          console.error(`    Error inserting comment by ${c.nickname}: ${error.message}`);
        } else {
          idMap.set(i, data.id);
          totalMigrated++;
        }
      }
      console.log(`  [${slug}] Done.`);
    } catch (err) {
      console.error(`  [${slug}] Error: ${err.message}`);
    }

    await page.close();
  }

  await browser.close();

  console.log(`\n=== Migration Complete ===`);
  console.log(`Posts with comments: ${postsWithComments}`);
  console.log(`Total comments migrated: ${totalMigrated}`);
}

main().catch(err => {
  console.error('Fatal:', err);
  process.exit(1);
});
