// supabase/functions/dispatch-notifications/index.ts
//
// V5 (2026-05-23): hardened after death-spiral incident — the V3 version
// could hang 25-51s per call when pooler was saturated, causing pg_cron
// to pile up http_post calls and bring the entire DB plane down.
//
// Aliyun cannot reach api.telegram.org (GFW). blog-api enqueues into
// `notification_queue`; this Edge Function (running on non-China infra)
// drains the queue and delivers messages to Telegram.
//
// Invocation paths:
//   1. Database Webhook on INSERT INTO notification_queue → realtime per-row
//   2. pg_cron every minute (jobid=1) → batch sweep
//   3. pg_cron every hour ?mode=hourly (jobid=2) → noise digest
//
// V5 safety bounds (vs V3):
//   - MAX_ROWS 200 → 50: caps worst-case sequential sends per tick
//   - DEADLINE_MS 25s: function returns early; remaining rows next tick
//   - TG_TIMEOUT_MS 10s → 5s: faster failure if Telegram congested
//
// Auth: verify_jwt=false. Caller must present `x-dispatch-secret`.

import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const BOT_TOKEN = Deno.env.get('BLOG_TG_BOT_TOKEN') ?? '';
const MAIN_CHAT = Deno.env.get('BLOG_TG_CHAT_ID') ?? '';
const NOISE_CHAT = Deno.env.get('BLOG_TG_NOISE_CHAT_ID') ?? MAIN_CHAT;
const DISPATCH_SECRET = Deno.env.get('DISPATCH_SECRET') ?? '';

const TZ_OFFSET_HOURS = 8;
const QUIET_END_BJT = 9;
const MAX_ROWS = 50;
const DEADLINE_MS = 25_000;
const TG_TIMEOUT_MS = 5_000;

type Row = {
  id: number;
  event_type: string;
  payload: Record<string, unknown> & { text?: string; postTitle?: string; postSlug?: string; newVisitor?: boolean; isDigest?: boolean };
  channel: 'main' | 'noise' | string;
  scheduled_for: string;
  sent_at: string | null;
  created_at: string;
};

function sb() {
  return createClient(SUPABASE_URL, SERVICE_ROLE, { auth: { persistSession: false } });
}

async function sendToTelegram(channel: string, text: string): Promise<void> {
  if (!BOT_TOKEN) throw new Error('BLOG_TG_BOT_TOKEN unset');
  const chatId = channel === 'noise' && NOISE_CHAT ? NOISE_CHAT : MAIN_CHAT;
  if (!chatId) throw new Error('BLOG_TG_CHAT_ID unset');

  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), TG_TIMEOUT_MS);
  try {
    const res = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: 'Markdown',
        disable_web_page_preview: true,
      }),
      signal: ctrl.signal,
    });
    if (!res.ok) {
      const body = await res.text();
      throw new Error(`Telegram HTTP ${res.status}: ${body}`);
    }
  } finally {
    clearTimeout(timer);
  }
}

/** Most recent 09:00 BJT (= 01:00 UTC) at or before now. */
function lastFlushBoundary(): Date {
  const now = new Date();
  const flush = new Date(Date.UTC(
    now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(),
    QUIET_END_BJT - TZ_OFFSET_HOURS, 0, 0, 0,
  ));
  if (flush.getTime() > now.getTime()) flush.setUTCDate(flush.getUTCDate() - 1);
  return flush;
}

function buildMorningSummary(rows: Row[]): string | null {
  const groups: Record<string, Row[]> = {};
  for (const r of rows) {
    (groups[r.event_type] = groups[r.event_type] ?? []).push(r);
  }
  const parts: string[] = [];
  if (groups.subscribe) parts.push(`✉️ ${groups.subscribe.length} 位新订阅`);
  if (groups.comment) {
    const titles = groups.comment
      .map((r) => r.payload?.postTitle as string | undefined)
      .filter(Boolean)
      .slice(0, 3) as string[];
    const tag = titles.length ? ` (${titles.map((t) => `《${t}》`).join('、')})` : '';
    parts.push(`💬 ${groups.comment.length} 条新评论${tag}`);
  }
  if (groups.like) parts.push(`❤️ ${groups.like.length} 个点赞`);
  if (groups.chat) {
    const newVisitors = groups.chat.filter((r) => r.payload?.newVisitor).length;
    parts.push(`🤖 Chat: ${groups.chat.length} 条对话${newVisitors ? `, ${newVisitors} 位新访客` : ''}`);
  }
  if (groups.anomaly) parts.push(`📈 ${groups.anomaly.length} 次流量异常`);
  if (groups.referrer) parts.push(`🔗 ${groups.referrer.length} 个新外站引用`);
  if (parts.length === 0) return null;
  return `🌙 *昨夜静默期摘要* (00:00–09:00)\n─────────────\n${parts.join('\n')}`;
}

/**
 * Atomically claim a row by setting sent_at=now() if currently NULL.
 * Returns the row if claimed (caller must send), or null if someone else got it.
 * If send fails, caller must call `release(id)` to reset sent_at to NULL.
 */
async function claim(id: number, db = sb()): Promise<Row | null> {
  const { data } = await db
    .from('notification_queue')
    .update({ sent_at: new Date().toISOString() })
    .eq('id', id)
    .is('sent_at', null)
    .select('*')
    .maybeSingle();
  return (data as Row | null) ?? null;
}

async function release(id: number, db = sb()): Promise<void> {
  await db.from('notification_queue').update({ sent_at: null }).eq('id', id);
}

/**
 * Try to deliver one row. Skips if no text or already claimed by another worker.
 * On send failure, releases the claim so a future tick can retry.
 */
async function deliverOne(row: Row, db = sb()): Promise<'sent' | 'skipped' | 'failed'> {
  const text = row.payload?.text;
  if (!text) return 'skipped';

  const claimed = await claim(row.id, db);
  if (!claimed) return 'skipped';

  try {
    await sendToTelegram(claimed.channel, text);
    return 'sent';
  } catch (e) {
    console.error(`[dispatch] send id=${row.id}:`, (e as Error).message);
    await release(row.id, db);
    return 'failed';
  }
}

/**
 * Sweep all pending rows: scheduled_for <= now AND sent_at IS NULL.
 * Handles both live rows and morning-flush rows (collapsed into one summary).
 */
async function processPending(deadline: number): Promise<{ sent: number; skipped: number; failed: number; deadline_hit: boolean }> {
  const db = sb();
  const { data: rows, error } = await db
    .from('notification_queue')
    .select('*')
    .is('sent_at', null)
    .lte('scheduled_for', new Date().toISOString())
    .order('scheduled_for', { ascending: true })
    .limit(MAX_ROWS);

  if (error) {
    console.error('[dispatch] query error:', error.message);
    return { sent: 0, skipped: 0, failed: 0, deadline_hit: false };
  }
  if (!rows?.length) return { sent: 0, skipped: 0, failed: 0, deadline_hit: false };

  const typed = rows as Row[];
  const flushBoundary = lastFlushBoundary();
  const flushRows = typed.filter(
    (r) => Math.abs(new Date(r.scheduled_for).getTime() - flushBoundary.getTime()) < 60_000,
  );
  const liveRows = typed.filter((r) => !flushRows.includes(r));

  let sent = 0, skipped = 0, failed = 0;
  let deadline_hit = false;
  for (const r of liveRows) {
    if (Date.now() > deadline) { deadline_hit = true; break; }
    const res = await deliverOne(r, db);
    if (res === 'sent') sent++;
    else if (res === 'skipped') skipped++;
    else failed++;
  }

  if (!deadline_hit && flushRows.length > 0) {
    const summary = buildMorningSummary(flushRows);
    if (summary) {
      // Claim all flush rows first; only send if at least one was claimed.
      const claimedIds: number[] = [];
      for (const r of flushRows) {
        const c = await claim(r.id, db);
        if (c) claimedIds.push(r.id);
      }
      if (claimedIds.length > 0) {
        try {
          await sendToTelegram('main', summary);
          sent += claimedIds.length;
        } catch (e) {
          console.error('[dispatch] flush send error:', (e as Error).message);
          // Release everything we claimed
          await db.from('notification_queue').update({ sent_at: null }).in('id', claimedIds);
          failed += claimedIds.length;
        }
      }
    }
  }

  return { sent, skipped, failed, deadline_hit };
}

/**
 * Hourly noise-channel digest: like+chat in the past hour with no `text`
 * payload (digest-only) get rolled into one 📦 summary.
 */
async function runHourlyDigest(): Promise<{ sent: number }> {
  const db = sb();
  const since = new Date(Date.now() - 3600_000).toISOString();
  const { data: rows, error } = await db
    .from('notification_queue')
    .select('*')
    .in('event_type', ['like', 'chat'])
    .eq('channel', 'noise')
    .is('sent_at', null)
    .gte('created_at', since);
  if (error) {
    console.error('[dispatch] hourly query error:', error.message);
    return { sent: 0 };
  }
  if (!rows?.length) return { sent: 0 };

  const typed = rows as Row[];
  const likes = typed.filter((r) => r.event_type === 'like');
  const chats = typed.filter((r) => r.event_type === 'chat');

  const lines: string[] = [];
  if (likes.length > 0) {
    const byPost: Record<string, number> = {};
    for (const r of likes) {
      const t = (r.payload?.postTitle as string) ?? (r.payload?.postSlug as string) ?? '?';
      byPost[t] = (byPost[t] ?? 0) + 1;
    }
    const top = Object.entries(byPost)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([t, n]) => `《${t}》${n}`)
      .join('、');
    lines.push(`❤️ 过去 1h 共 ${likes.length} 个赞 — ${top}`);
  }
  if (chats.length > 0) {
    const newVisitors = chats.filter((r) => r.payload?.newVisitor).length;
    lines.push(`🤖 过去 1h 共 ${chats.length} 条 Chat${newVisitors ? `, ${newVisitors} 位新访客` : ''}`);
  }
  if (lines.length === 0) return { sent: 0 };

  // Claim all rows first
  const claimedIds: number[] = [];
  for (const r of typed) {
    const c = await claim(r.id, db);
    if (c) claimedIds.push(r.id);
  }
  if (claimedIds.length === 0) return { sent: 0 };

  const text = `📦 *小时摘要*\n─────────────\n${lines.join('\n')}`;
  try {
    await sendToTelegram('noise', text);
    return { sent: claimedIds.length };
  } catch (e) {
    console.error('[dispatch] hourly send error:', (e as Error).message);
    await db.from('notification_queue').update({ sent_at: null }).in('id', claimedIds);
    return { sent: 0 };
  }
}

Deno.serve(async (req: Request) => {
  if (req.method !== 'POST') {
    return new Response('method not allowed', { status: 405 });
  }
  if (DISPATCH_SECRET && req.headers.get('x-dispatch-secret') !== DISPATCH_SECRET) {
    return new Response('unauthorized', { status: 401 });
  }

  const url = new URL(req.url);
  const mode = url.searchParams.get('mode'); // 'hourly' | null
  const deadline = Date.now() + DEADLINE_MS;

  let body: any = null;
  try { body = await req.json(); } catch { /* no body */ }

  try {
    if (mode === 'hourly') {
      const result = await runHourlyDigest();
      return new Response(JSON.stringify({ ok: true, mode: 'hourly', ...result }), {
        headers: { 'content-type': 'application/json' },
      });
    }

    // Webhook payload shape: { type:'INSERT', table, schema, record:{...} }
    // processPending() is idempotent + handles race conditions; just sweep.
    const result = await processPending(deadline);
    return new Response(JSON.stringify({ ok: true, mode: 'sweep', webhookRowId: body?.record?.id ?? null, ...result }), {
      headers: { 'content-type': 'application/json' },
    });
  } catch (e) {
    console.error('[dispatch] fatal:', (e as Error).message);
    return new Response(JSON.stringify({ ok: false, error: (e as Error).message }), {
      status: 500, headers: { 'content-type': 'application/json' },
    });
  }
});
