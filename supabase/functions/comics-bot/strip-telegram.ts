// strip-telegram.ts — Telegram Bot API wrapper
const API_BASE = 'https://api.telegram.org';

function token(): string {
  const t = Deno.env.get('COMICS_TELEGRAM_BOT_TOKEN');
  if (!t) throw new Error('COMICS_TELEGRAM_BOT_TOKEN not set');
  return t;
}

async function call(method: string, body: any): Promise<any> {
  const res = await fetch(`${API_BASE}/bot${token()}/${method}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const json = await res.json();
  if (!json.ok) throw new Error(`Telegram ${method} error: ${json.description}`);
  return json.result;
}

export function sendMessage(args: { chat_id: number; text: string; parse_mode?: string; reply_to_message_id?: number; reply_markup?: any }): Promise<any> {
  return call('sendMessage', { parse_mode: 'Markdown', ...args });
}

export function editMessageText(args: { chat_id: number; message_id: number; text: string; parse_mode?: string; reply_markup?: any }): Promise<any> {
  return call('editMessageText', { parse_mode: 'Markdown', ...args });
}

export function sendPhoto(args: { chat_id: number; photo: string; caption?: string; parse_mode?: string; reply_to_message_id?: number }): Promise<any> {
  return call('sendPhoto', { parse_mode: 'Markdown', ...args });
}

export function answerCallbackQuery(args: { callback_query_id: string; text?: string }): Promise<any> {
  return call('answerCallbackQuery', args);
}

/**
 * Resolve a Telegram file_id to its server-side path.
 */
export function getFile(file_id: string): Promise<{ file_path: string; file_size?: number }> {
  return call('getFile', { file_id });
}

/**
 * Download a file from Telegram CDN using its file_path.
 */
export async function downloadFile(file_path: string): Promise<Uint8Array> {
  const res = await fetch(`${API_BASE}/file/bot${token()}/${file_path}`);
  if (!res.ok) throw new Error(`Telegram file download failed: ${res.status}`);
  const buf = await res.arrayBuffer();
  return new Uint8Array(buf);
}

export function approvalKeyboard(comicId: string) {
  return {
    inline_keyboard: [[
      { text: '✅ 发布', callback_data: `strip:approve:${comicId}` },
      { text: '❌ 删', callback_data: `strip:cancel:${comicId}` },
    ]],
  };
}
