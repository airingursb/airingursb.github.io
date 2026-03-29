/**
 * Migrate comments from Typlog (blog.ursb.me) to Supabase post_comments table.
 *
 * Usage:
 *   node scripts/migrate_comments.js <post-slug>
 *
 * Example:
 *   node scripts/migrate_comments.js summary-2025
 *
 * Prerequisites:
 *   - npm install @supabase/supabase-js
 *   - .env file at project root with BLOG_SUPABASE_URL and BLOG_SUPABASE_SERVICE_KEY
 */

const https = require('https');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const TYPLOG_CLIENT_SECRET = '3TS0s5PHGBN6gHZyno4ChbaXtrjUDp';
const TYPLOG_SITE_ID = '4198';
const BLOG_BASE_URL = 'https://blog.ursb.me/posts';

// ---------------------------------------------------------------------------
// .env loader
// ---------------------------------------------------------------------------

function loadEnv() {
  const root = path.resolve(__dirname, '..');
  const candidates = [
    path.join(root, '.env'),
    path.join(root, 'services', 'chat', '.env'),
  ];
  let allLines = [];
  for (const p of candidates) {
    if (fs.existsSync(p)) {
      allLines.push(...fs.readFileSync(p, 'utf-8').split('\n'));
    }
  }
  if (allLines.length === 0) {
    console.error('Error: No .env file found');
    process.exit(1);
  }
  const lines = allLines;
  const env = {};
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const idx = trimmed.indexOf('=');
    if (idx === -1) continue;
    const key = trimmed.slice(0, idx).trim();
    let val = trimmed.slice(idx + 1).trim();
    // Strip surrounding quotes
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    env[key] = val;
  }
  return env;
}

// ---------------------------------------------------------------------------
// HTTP helpers
// ---------------------------------------------------------------------------

function httpGet(url, headers = {}) {
  return new Promise((resolve, reject) => {
    const parsedUrl = new URL(url);
    const options = {
      hostname: parsedUrl.hostname,
      port: parsedUrl.port || 443,
      path: parsedUrl.pathname + parsedUrl.search,
      method: 'GET',
      headers,
    };
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => resolve({ status: res.statusCode, data }));
    });
    req.on('error', reject);
    req.end();
  });
}

// ---------------------------------------------------------------------------
// base64url
// ---------------------------------------------------------------------------

function base64url(input) {
  let b64;
  if (Buffer.isBuffer(input)) {
    b64 = input.toString('base64');
  } else {
    b64 = Buffer.from(input, 'utf-8').toString('base64');
  }
  return b64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

// ---------------------------------------------------------------------------
// Typlog token generation
// ---------------------------------------------------------------------------

function generateTyplogToken(pageId) {
  const iat = Math.floor(Date.now() / 1000);

  const headerObj = { iat, alg: 'T5' };
  const payloadObj = {
    method: 'GET',
    url: `/api/v3/threads/${pageId}/comments`,
    scope: 'public',
    site_id: TYPLOG_SITE_ID,
  };

  const headerB64 = base64url(JSON.stringify(headerObj));
  const payloadB64 = base64url(JSON.stringify(payloadObj));

  const signatureInput = `${headerB64}.${payloadB64}.${TYPLOG_CLIENT_SECRET}`;
  const md5Hash = crypto.createHash('md5').update(signatureInput).digest();
  const signatureB64 = base64url(md5Hash);

  return `${headerB64}.${payloadB64}.${signatureB64}`;
}

// ---------------------------------------------------------------------------
// Fetch page-id from Typlog HTML
// ---------------------------------------------------------------------------

async function fetchPageId(slug) {
  const url = `${BLOG_BASE_URL}/${slug}/`;
  console.log(`Fetching page HTML from ${url} ...`);
  const { status, data } = await httpGet(url);
  if (status !== 200) {
    throw new Error(`Failed to fetch page (HTTP ${status}): ${url}`);
  }

  // page-id is in a meta tag: <meta name="page:id" content="85811">
  const match = data.match(/<meta\s+name="page:id"\s+content="([^"]+)"/);
  if (!match) {
    throw new Error('Could not find <meta name="page:id" content="..."> in page HTML');
  }
  return match[1];
}

// ---------------------------------------------------------------------------
// Fetch comments from Typlog API
// ---------------------------------------------------------------------------

async function fetchComments(pageId) {
  const token = generateTyplogToken(pageId);
  const url = `https://typlog.com/api/v3/threads/${pageId}/comments`;
  console.log(`Fetching comments from Typlog API ...`);

  const { status, data } = await httpGet(url, {
    Authorization: `session ${token}`,
  });

  if (status !== 200) {
    throw new Error(`Typlog API returned HTTP ${status}: ${data}`);
  }

  return JSON.parse(data);
}

// ---------------------------------------------------------------------------
// Flatten comments (recursive)
// ---------------------------------------------------------------------------

function flattenComments(comments, parentTyplogId = null) {
  const result = [];
  for (const comment of comments) {
    result.push({
      typlog_id: comment.id,
      parent_typlog_id: parentTyplogId,
      nickname: comment.author?.name || 'Anonymous',
      email: extractGravatarEmail(comment.author?.picture),
      website: comment.author?.website || comment.author?.url || null,
      content: comment.content || '',
      created_at: comment.created_at,
      status: 'approved',
    });

    if (comment.children && comment.children.length > 0) {
      result.push(...flattenComments(comment.children, comment.id));
    }
  }
  return result;
}

// ---------------------------------------------------------------------------
// Extract Gravatar MD5 hash from picture URL
// ---------------------------------------------------------------------------

function extractGravatarEmail(pictureUrl) {
  if (!pictureUrl) return null;
  // Gravatar URLs look like: https://www.gravatar.com/avatar/{md5}?...
  const match = pictureUrl.match(/gravatar\.com\/avatar\/([a-f0-9]+)/i);
  if (match) {
    return `${match[1]}@gravatar.placeholder`;
  }
  return null;
}

// ---------------------------------------------------------------------------
// Strip HTML tags (basic)
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  const slug = process.argv[2];
  if (!slug) {
    console.error('Usage: node scripts/migrate_comments.js <post-slug>');
    console.error('Example: node scripts/migrate_comments.js summary-2025');
    process.exit(1);
  }

  // Load env
  const env = loadEnv();
  const supabaseUrl = env.BLOG_SUPABASE_URL;
  const supabaseKey = env.BLOG_SUPABASE_SERVICE_KEY;
  if (!supabaseUrl || !supabaseKey) {
    console.error('Error: BLOG_SUPABASE_URL and BLOG_SUPABASE_SERVICE_KEY must be set in .env');
    process.exit(1);
  }

  // Load supabase client
  let createClient;
  try {
    createClient = require('@supabase/supabase-js').createClient;
  } catch (e) {
    console.error('Error: @supabase/supabase-js is not installed.');
    console.error('Run: npm install @supabase/supabase-js');
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  // Step 1: Get page-id from Typlog HTML
  const pageId = await fetchPageId(slug);
  console.log(`Found page-id: ${pageId}`);

  // Step 2: Fetch comments
  const response = await fetchComments(pageId);
  const comments = response.data || response.comments || response;
  if (!Array.isArray(comments)) {
    console.error('Unexpected API response structure:', JSON.stringify(response).slice(0, 500));
    process.exit(1);
  }

  if (comments.length === 0) {
    console.log('No comments found for this post.');
    return;
  }

  // Step 3: Flatten
  const flat = flattenComments(comments);
  console.log(`Found ${flat.length} comments (including replies).`);

  // Step 4: Insert into Supabase in order (top-level first, then replies)
  // Build a map from typlog_id -> new supabase id
  const idMap = new Map(); // typlog_id -> supabase row id

  // Separate top-level and replies
  const topLevel = flat.filter((c) => c.parent_typlog_id === null);
  const replies = flat.filter((c) => c.parent_typlog_id !== null);

  let insertedCount = 0;
  let errorCount = 0;

  // Insert top-level comments
  for (const comment of topLevel) {
    const row = {
      post_slug: slug,
      nickname: comment.nickname,
      email: comment.email,
      website: comment.website,
      content: stripHtml(comment.content),
      created_at: comment.created_at,
      status: comment.status,
      parent_id: null,
    };

    const { data, error } = await supabase
      .from('post_comments')
      .insert(row)
      .select('id')
      .single();

    if (error) {
      console.error(`Error inserting comment by ${comment.nickname}:`, error.message);
      errorCount++;
    } else {
      idMap.set(comment.typlog_id, data.id);
      insertedCount++;
    }
  }

  // Insert replies (may need multiple passes for nested replies)
  let remaining = [...replies];
  let maxPasses = 10;
  while (remaining.length > 0 && maxPasses > 0) {
    maxPasses--;
    const stillRemaining = [];

    for (const comment of remaining) {
      const parentSupabaseId = idMap.get(comment.parent_typlog_id);
      if (parentSupabaseId === undefined) {
        // Parent not yet inserted, defer to next pass
        stillRemaining.push(comment);
        continue;
      }

      const row = {
        slug,
        nickname: comment.nickname,
        email: comment.email,
        website: comment.website,
        content: stripHtml(comment.content),
        content_html: comment.content,
        created_at: comment.created_at,
        status: comment.status,
        parent_id: parentSupabaseId,
      };

      const { data, error } = await supabase
        .from('post_comments')
        .insert(row)
        .select('id')
        .single();

      if (error) {
        console.error(`Error inserting reply by ${comment.nickname}:`, error.message);
        errorCount++;
      } else {
        idMap.set(comment.typlog_id, data.id);
        insertedCount++;
      }
    }

    if (stillRemaining.length === remaining.length) {
      // No progress made, orphaned replies
      console.warn(`Warning: ${stillRemaining.length} orphaned replies could not be mapped to parents.`);
      errorCount += stillRemaining.length;
      break;
    }
    remaining = stillRemaining;
  }

  // Summary
  console.log('\n--- Migration Summary ---');
  console.log(`Post slug:        ${slug}`);
  console.log(`Typlog page-id:   ${pageId}`);
  console.log(`Total comments:   ${flat.length}`);
  console.log(`Inserted:         ${insertedCount}`);
  console.log(`Errors:           ${errorCount}`);
  console.log('Done.');
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
