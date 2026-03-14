import config from './config.js';

/**
 * Send a chat-completions request to OpenClaw and return the raw Response body
 * as a readable stream.  The caller is responsible for piping/reading the SSE
 * stream.
 *
 * @param {Array<{role: string, content: string}>} messages
 * @param {string} visitorId  — forwarded as a user identifier for tracing
 * @returns {Promise<ReadableStream>}  the raw SSE byte stream from OpenClaw
 */
export async function streamChat(messages, visitorId) {
  const { url, token, agentId } = config.openclaw;

  if (!url || !token || !agentId) {
    throw new Error(
      'OpenClaw is not configured (OPENCLAW_URL / OPENCLAW_TOKEN / OPENCLAW_AGENT_ID missing).'
    );
  }

  const endpoint = `${url.replace(/\/$/, '')}/v1/chat/completions`;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 30000);

  const response = await fetch(endpoint, {
    signal: controller.signal,
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      'X-Agent-Id': agentId,
      'X-Visitor-Id': visitorId,
    },
    body: JSON.stringify({
      messages,
      stream: true,
      max_tokens: 500,
    }),
  });

  clearTimeout(timeoutId);

  if (!response.ok) {
    const text = await response.text().catch(() => '');
    throw new Error(
      `OpenClaw responded with ${response.status} ${response.statusText}: ${text}`
    );
  }

  if (!response.body) {
    throw new Error('OpenClaw response has no body stream.');
  }

  return response.body;
}
