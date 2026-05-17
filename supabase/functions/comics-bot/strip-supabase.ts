// strip-supabase.ts — CRUD on the comics table via Supabase service role
import { createClient, SupabaseClient } from 'npm:@supabase/supabase-js@^2.49.0';

let _client: SupabaseClient | null = null;
function client(): SupabaseClient {
  if (_client) return _client;
  const url = Deno.env.get('SUPABASE_URL')!;
  const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  if (!url || !key) throw new Error('SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY not set');
  _client = createClient(url, key, { auth: { persistSession: false } });
  return _client;
}

export async function allocateIssueNumber(): Promise<number> {
  const { data, error } = await client().rpc('comics_allocate_issue');
  if (error) throw error;
  return data as number;
}

export async function createComic(args: {
  sourceText: string;
  title: { zh: string; en: string };
  telegramUserId: number;
  telegramChatId: number;
  telegramSourceMsgId: number;
}): Promise<any> {
  const { data, error } = await client()
    .from('comics')
    .insert({
      source_text: args.sourceText,
      title: args.title,
      script: {},
      panels: {},
      telegram_user_id: args.telegramUserId,
      telegram_chat_id: args.telegramChatId,
      telegram_source_msg_id: args.telegramSourceMsgId,
    })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateComic(id: string, fields: Record<string, any>): Promise<any> {
  const { data, error } = await client().from('comics').update(fields).eq('id', id).select().single();
  if (error) throw error;
  return data;
}

export async function findById(id: string): Promise<any> {
  const { data, error } = await client().from('comics').select('*').eq('id', id).maybeSingle();
  if (error) throw error;
  return data;
}
