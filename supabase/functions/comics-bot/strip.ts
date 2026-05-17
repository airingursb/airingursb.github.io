// strip.ts — pure publisher: receive photo + caption → upload R2 → preview → ✅ publish.
// No AI generation. User produces the image themselves.
import { uploadStrip } from './strip-r2.ts';
import * as tg from './strip-telegram.ts';
import { dispatchStripPublished } from './strip-github.ts';
import * as db from './strip-supabase.ts';

function isAdmin(userId: number | string): boolean {
  return String(userId) === String(Deno.env.get('ADMIN_TELEGRAM_USER_ID'));
}

function normalizeRow(row: any) {
  return {
    ...row,
    telegram_chat_id: row.telegram_chat_id ?? row.telegramChatId,
  };
}

/**
 * Pick the largest photo size from message.photo, or fall back to document (if PNG/JPEG).
 */
function pickFileId(msg: any): { fileId: string; sourceText: string; title: string } | null {
  const caption = (msg.caption || '').trim();
  const title = caption || '未命名';

  if (Array.isArray(msg.photo) && msg.photo.length > 0) {
    const largest = msg.photo[msg.photo.length - 1];
    return { fileId: largest.file_id, sourceText: caption, title };
  }
  if (msg.document?.mime_type?.startsWith('image/')) {
    return { fileId: msg.document.file_id, sourceText: caption, title };
  }
  return null;
}

export async function handleMessage(update: any): Promise<void> {
  const msg = update.message;
  if (!msg) return;
  if (!isAdmin(msg.from.id)) return;

  const picked = pickFileId(msg);
  if (!picked) {
    // Plain text DM — guide the user.
    if (msg.text) {
      await tg.sendMessage({
        chat_id: msg.chat.id,
        text: '发一张图给我（caption 作为标题）→ 我帮你存到草稿 → ✅ 发布。',
        reply_to_message_id: msg.message_id,
      });
    }
    return;
  }

  const { fileId, sourceText, title } = picked;

  // Create the draft row immediately (so we have an id for R2 path)
  const rawRow = await db.createComic({
    sourceText,
    title: { zh: title, en: title },
    telegramUserId: msg.from.id,
    telegramChatId: msg.chat.id,
    telegramSourceMsgId: msg.message_id,
  });
  const row = normalizeRow(rawRow);

  const ack = await tg.sendMessage({
    chat_id: msg.chat.id,
    text: `📥 收到「${title}」，上传中...`,
    reply_to_message_id: msg.message_id,
  });

  try {
    // Download from Telegram → upload to R2
    const fileInfo = await tg.getFile(fileId);
    const bytes = await tg.downloadFile(fileInfo.file_path);
    const url = await uploadStrip({ rowId: row.id, attempt: 1, body: bytes });

    await db.updateComic(row.id, {
      panels: { url, alt: { zh: title, en: title } },
    });

    // Preview message with approval keyboard
    const kbMsg = await tg.sendMessage({
      chat_id: row.telegram_chat_id,
      text: `*草稿就绪* · 「${title}」`,
      reply_markup: tg.approvalKeyboard(row.id),
    });
    await db.updateComic(row.id, { telegram_preview_msg_id: kbMsg.message_id });

    await tg.editMessageText({
      chat_id: row.telegram_chat_id,
      message_id: ack.message_id,
      text: `✅ 草稿已存`,
    });
  } catch (e: any) {
    await tg.editMessageText({
      chat_id: row.telegram_chat_id,
      message_id: ack.message_id,
      text: `❌ 上传失败：${String(e.message || e).slice(0, 200)}`,
    });
  }
}

export async function handleCallback(update: any): Promise<void> {
  const cb = update.callback_query;
  if (!cb) return;
  if (!isAdmin(cb.from.id)) {
    await tg.answerCallbackQuery({ callback_query_id: cb.id, text: 'Not authorized' });
    return;
  }
  const m = /^strip:(approve|cancel):([\w-]+)$/.exec(cb.data || '');
  if (!m) return;
  const [, action, id] = m;
  const row = await db.findById(id);
  if (!row) {
    await tg.answerCallbackQuery({ callback_query_id: cb.id, text: '记录未找到' });
    return;
  }

  if (action === 'approve') {
    const issueNumber = await db.allocateIssueNumber();
    await db.updateComic(row.id, {
      issue_number: issueNumber,
      approved: true,
      published_at: new Date().toISOString(),
    });
    try {
      await dispatchStripPublished(issueNumber);
    } catch (e: any) {
      await tg.sendMessage({
        chat_id: row.telegram_chat_id,
        text: `⚠️ approved，但触发构建失败：${e.message}。下次 daily build 会带上。`,
      });
    }
    await tg.editMessageText({
      chat_id: row.telegram_chat_id,
      message_id: cb.message.message_id,
      text: `✅ 已发布为 No. ${issueNumber} · ~3min 后上线：ursb.me/comics/${issueNumber}`,
    });
    await tg.answerCallbackQuery({ callback_query_id: cb.id, text: `已发布 No. ${issueNumber}` });
  } else if (action === 'cancel') {
    await db.updateComic(row.id, { deleted: true });
    await tg.editMessageText({
      chat_id: row.telegram_chat_id,
      message_id: cb.message.message_id,
      text: `❌ 草稿已删除`,
    });
    await tg.answerCallbackQuery({ callback_query_id: cb.id, text: '已删除' });
  }
}
