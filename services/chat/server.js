import { createServer } from 'http';
import config from './lib/config.js';
import { createToken, verifyToken } from './lib/auth.js';
import { checkRateLimit } from './lib/rate-limit.js';
import {
  createVisitor,
  getRecentMessages,
  saveMessages,
  updateVisitorActivity,
} from './lib/supabase.js';
import { streamChat } from './lib/openclaw.js';

// ── Constants ──────────────────────────────────────────────────────────────────

const MAX_ROUNDS = 5;           // maximum back-and-forth exchanges per 24h window
const MAX_INPUT_CHARS = 200;    // maximum user message length
const MAX_BODY_BYTES = 10_240;  // 10 KB read limit for request bodies

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Read the request body up to MAX_BODY_BYTES.
 * @param {import('http').IncomingMessage} req
 * @returns {Promise<string>}
 */
function readBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    let bytes = 0;

    req.on('data', (chunk) => {
      bytes += chunk.length;
      if (bytes > MAX_BODY_BYTES) {
        req.destroy();
        reject(new Error('Request body too large'));
        return;
      }
      body += chunk.toString();
    });

    req.on('end', () => resolve(body));
    req.on('error', reject);
  });
}

/**
 * Send a JSON response.
 * @param {import('http').ServerResponse} res
 * @param {number} status
 * @param {unknown} data
 */
function json(res, status, data) {
  const body = JSON.stringify(data);
  res.writeHead(status, {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(body),
  });
  res.end(body);
}

/**
 * Derive the client IP, respecting common proxy headers.
 * @param {import('http').IncomingMessage} req
 * @returns {string}
 */
function getIp(req) {
  const forwarded = req.headers['x-forwarded-for'];
  if (forwarded) {
    return String(forwarded).split(',')[0].trim();
  }
  return req.socket?.remoteAddress ?? 'unknown';
}

// ── CORS ──────────────────────────────────────────────────────────────────────

const { allowedOrigins } = config;

/**
 * Apply CORS headers if the request origin is allowed.
 * @param {import('http').IncomingMessage} req
 * @param {import('http').ServerResponse} res
 * @returns {boolean} true if the origin is permitted (or no Origin header)
 */
function applyCors(req, res) {
  const origin = req.headers['origin'];
  if (!origin) return true; // same-origin or non-browser request

  if (allowedOrigins.length > 0 && !allowedOrigins.includes(origin)) {
    return false;
  }

  res.setHeader('Access-Control-Allow-Origin', origin);
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'Content-Type, Authorization, X-Visitor-Token'
  );
  res.setHeader('Vary', 'Origin');
  return true;
}

// ── Route handlers ────────────────────────────────────────────────────────────

/**
 * POST /api/chat/init
 * Creates a new visitor token and registers the visitor in Supabase.
 */
async function handleInit(req, res) {
  const ip = getIp(req);
  const userAgent = req.headers['user-agent'] ?? '';
  const { visitorId, token } = createToken();

  // Fire-and-forget — do not block the response on DB latency
  createVisitor(visitorId, ip, userAgent).catch((err) =>
    console.error('[init] createVisitor failed:', err.message)
  );

  json(res, 200, { token });
}

/**
 * POST /api/chat
 * Validates input, checks rate limit, calls OpenClaw, streams SSE back.
 */
async function handleChat(req, res) {
  // Content-Type check
  const ct = req.headers['content-type'] ?? '';
  if (!ct.includes('application/json')) {
    return json(res, 415, { error: 'Content-Type must be application/json' });
  }

  // Token verification
  const rawToken =
    req.headers['x-visitor-token'] ??
    (req.headers['authorization'] ?? '').replace(/^Bearer\s+/i, '');

  const visitorId = verifyToken(rawToken);
  if (!visitorId) {
    return json(res, 401, { error: 'Invalid or missing visitor token' });
  }

  // Rate limiting
  const ip = getIp(req);
  const rateResult = checkRateLimit(ip);
  if (!rateResult.allowed) {
    res.setHeader('Retry-After', String(rateResult.retryAfter));
    return json(res, 429, {
      error: 'Too many requests',
      retryAfter: rateResult.retryAfter,
    });
  }

  // Parse body
  let body;
  try {
    const raw = await readBody(req);
    body = JSON.parse(raw);
  } catch {
    return json(res, 400, { error: 'Invalid JSON body' });
  }

  const userMessage = body?.message;
  if (typeof userMessage !== 'string' || !userMessage.trim()) {
    return json(res, 400, { error: 'message is required' });
  }
  if (userMessage.length > MAX_INPUT_CHARS) {
    return json(res, 400, {
      error: `message must be ${MAX_INPUT_CHARS} characters or fewer`,
    });
  }

  // Round limit check
  const { messages: history, round } = await getRecentMessages(visitorId);
  if (round >= MAX_ROUNDS) {
    return json(res, 429, {
      error: 'Round limit reached. Please come back tomorrow.',
      round,
      maxRounds: MAX_ROUNDS,
    });
  }

  // Build messages array for OpenClaw
  const messages = [
    ...history,
    { role: 'user', content: userMessage.trim() },
  ];

  // Begin SSE response
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    Connection: 'keep-alive',
    'X-Accel-Buffering': 'no', // disable nginx buffering
  });

  // Stream from OpenClaw → transform → client
  let assistantMessage = '';

  try {
    const stream = await streamChat(messages, visitorId);
    const reader = stream.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() ?? ''; // keep incomplete line for next chunk

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || trimmed === 'data: [DONE]') continue;
        if (!trimmed.startsWith('data:')) continue;

        const jsonStr = trimmed.slice(5).trim();
        let parsed;
        try {
          parsed = JSON.parse(jsonStr);
        } catch {
          continue;
        }

        const delta = parsed?.choices?.[0]?.delta?.content;
        if (typeof delta === 'string' && delta) {
          assistantMessage += delta;
          const sseData = JSON.stringify({ type: 'delta', content: delta });
          res.write(`data: ${sseData}\n\n`);
        }
      }
    }
  } catch (err) {
    console.error('[chat] OpenClaw stream error:', err.message);
    const errData = JSON.stringify({ type: 'error', message: 'Upstream error' });
    res.write(`data: ${errData}\n\n`);
    res.end();
    return;
  }

  // Send done event with updated round count
  const newRound = round + 1;
  res.write(
    `data: ${JSON.stringify({ type: 'done', round: newRound, maxRounds: MAX_ROUNDS })}\n\n`
  );
  res.end();

  // Fire-and-forget persistence
  const ua = req.headers['user-agent'] ?? '';
  Promise.all([
    saveMessages(visitorId, userMessage.trim(), assistantMessage),
    updateVisitorActivity(visitorId, ip, ua),
  ]).catch((err) =>
    console.error('[chat] post-response DB ops failed:', err.message)
  );
}

/**
 * GET /api/chat/history
 * Returns recent messages and current round count for a visitor.
 */
async function handleHistory(req, res) {
  const rawToken =
    req.headers['x-visitor-token'] ??
    (req.headers['authorization'] ?? '').replace(/^Bearer\s+/i, '');

  const visitorId = verifyToken(rawToken);
  if (!visitorId) {
    return json(res, 401, { error: 'Invalid or missing visitor token' });
  }

  const { messages, round } = await getRecentMessages(visitorId);
  json(res, 200, { messages, round, maxRounds: MAX_ROUNDS });
}

// ── Request dispatcher ────────────────────────────────────────────────────────

const server = createServer(async (req, res) => {
  const url = new URL(req.url ?? '/', `http://${req.headers.host}`);
  const pathname = url.pathname;

  // CORS preflight
  if (!applyCors(req, res)) {
    res.writeHead(403);
    res.end();
    return;
  }
  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  try {
    // Health check — no auth required
    if (req.method === 'GET' && pathname === '/health') {
      return json(res, 200, { status: 'ok', ts: new Date().toISOString() });
    }

    if (req.method === 'POST' && pathname === '/api/chat/init') {
      return await handleInit(req, res);
    }

    if (req.method === 'POST' && pathname === '/api/chat') {
      return await handleChat(req, res);
    }

    if (req.method === 'GET' && pathname === '/api/chat/history') {
      return await handleHistory(req, res);
    }

    json(res, 404, { error: 'Not found' });
  } catch (err) {
    console.error('[server] Unhandled error:', err);
    json(res, 500, { error: 'Internal server error' });
  }
});

// ── Start ─────────────────────────────────────────────────────────────────────

server.listen(config.port, () => {
  console.log(`[chat-service] listening on port ${config.port}`);
});
