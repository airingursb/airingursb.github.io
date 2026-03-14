import { createClient } from '@supabase/supabase-js';
import config from './config.js';

/** @type {import('@supabase/supabase-js').SupabaseClient | null} */
let _client = null;

/**
 * Lazily initialise and return the Supabase client.
 * Prints a warning when credentials are missing (e.g. during local dev without
 * a real Supabase project) rather than crashing at startup.
 * @returns {import('@supabase/supabase-js').SupabaseClient | null}
 */
function getClient() {
  if (_client) return _client;

  const { url, serviceKey } = config.supabase;
  if (!url || !serviceKey) {
    console.warn(
      '[supabase] Missing SUPABASE_URL or SUPABASE_SERVICE_KEY — ' +
      'database operations will be skipped.'
    );
    return null;
  }

  _client = createClient(url, serviceKey, {
    auth: { persistSession: false },
  });
  return _client;
}

// ── Public API ─────────────────────────────────────────────────────────────────

/**
 * Upsert a visitor row.  Safe to call on every /init request.
 * @param {string} visitorId
 * @param {string} ip
 * @param {string} userAgent
 */
export async function createVisitor(visitorId, ip, userAgent) {
  const client = getClient();
  if (!client) return;

  const now = new Date().toISOString();
  // Try insert first; if visitor_id already exists, just update last_seen
  const { error: insertError } = await client.from('chat_visitors').insert({
    visitor_id: visitorId,
    ip,
    user_agent: userAgent,
    first_seen_at: now,
    last_seen_at: now,
  });

  if (insertError && insertError.code === '23505') {
    // Unique violation — visitor already exists, update activity only
    await updateVisitorActivity(visitorId, ip, userAgent);
    return;
  }

  const error = insertError;

  if (error) console.error('[supabase] createVisitor error:', error.message);
}

/**
 * Fetch the last 10 messages within the past 24 hours for a visitor.
 * Also computes the number of complete user-assistant exchange rounds.
 *
 * @param {string} visitorId
 * @returns {Promise<{ messages: Array<{role:string, content:string}>, round: number }>}
 */
export async function getRecentMessages(visitorId) {
  const client = getClient();
  if (!client) return { messages: [], round: 0 };

  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

  const { data, error } = await client
    .from('chat_messages')
    .select('role, content, created_at')
    .eq('visitor_id', visitorId)
    .gte('created_at', since)
    .order('created_at', { ascending: true })
    .limit(10);

  if (error) {
    console.error('[supabase] getRecentMessages error:', error.message);
    return { messages: [], round: 0 };
  }

  const messages = (data ?? []).map(({ role, content }) => ({ role, content }));

  // A round is one user message paired with one assistant reply
  const userCount = messages.filter((m) => m.role === 'user').length;
  const assistantCount = messages.filter((m) => m.role === 'assistant').length;
  const round = Math.min(userCount, assistantCount);

  return { messages, round };
}

/**
 * Insert a user-assistant message pair.
 * @param {string} visitorId
 * @param {string} userMessage
 * @param {string} assistantMessage
 */
export async function saveMessages(visitorId, userMessage, assistantMessage) {
  const client = getClient();
  if (!client) return;

  const now = new Date().toISOString();
  const { error } = await client.from('chat_messages').insert([
    { visitor_id: visitorId, role: 'user',      content: userMessage,      created_at: now },
    { visitor_id: visitorId, role: 'assistant',  content: assistantMessage, created_at: now },
  ]);

  if (error) console.error('[supabase] saveMessages error:', error.message);
}

/**
 * Update the visitor's last_seen_at timestamp.
 * @param {string} visitorId
 * @param {string} ip
 * @param {string} userAgent
 */
export async function updateVisitorActivity(visitorId, ip, userAgent) {
  const client = getClient();
  if (!client) return;

  const { error } = await client
    .from('chat_visitors')
    .update({ ip, user_agent: userAgent, last_seen_at: new Date().toISOString() })
    .eq('visitor_id', visitorId);

  if (error) console.error('[supabase] updateVisitorActivity error:', error.message);
}
