import config from './config.js';

/**
 * Send a request to OpenClaw's OpenResponses API and return the raw Response
 * body as a readable stream.  The caller is responsible for piping/reading the
 * SSE stream.
 *
 * @param {Array<{role: string, content: string}>} messages
 * @param {string} visitorId  — forwarded as a user identifier for session isolation
 * @returns {Promise<ReadableStream>}  the raw SSE byte stream from OpenClaw
 */
export async function streamChat(messages, visitorId) {
  const { url, token, agentId } = config.openclaw;

  if (!url || !token || !agentId) {
    throw new Error(
      'OpenClaw is not configured (OPENCLAW_URL / OPENCLAW_TOKEN / OPENCLAW_AGENT_ID missing).'
    );
  }

  const endpoint = `${url.replace(/\/$/, '')}/v1/responses`;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 30000);

  // Convert chat messages to OpenResponses input format
  const input = messages.map((m) => ({
    type: 'message',
    role: m.role,
    content: m.content,
  }));

  const response = await fetch(endpoint, {
    signal: controller.signal,
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      'x-openclaw-agent-id': agentId,
    },
    body: JSON.stringify({
      model: `openclaw:${agentId}`,
      input,
      stream: true,
      max_output_tokens: 500,
      user: visitorId,
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
