import { createServer } from 'node:http';
import { createHmac, randomBytes, randomUUID, timingSafeEqual } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { openGardenStore } from './store.mjs';

const endpoint = '/api/preview/garden';
const cookieName = 'bear_garden_preview';
const previewNamespace = 'bear-garden-preview-v1';
const defaultOrigins = [
  'http://localhost:4406', 'http://127.0.0.1:4406', 'http://100.93.37.97:4406',
  'http://localhost:4407', 'http://127.0.0.1:4407', 'http://100.93.37.97:4407',
  'http://localhost:4408', 'http://127.0.0.1:4408', 'http://100.93.37.97:4408',
];

function signature(value, secret) {
  return createHmac('sha256', secret).update(value).digest('hex');
}

function visitorFromCookie(cookie, secret) {
  const token = cookie?.split(';').map(part => part.trim()).find(part => part.startsWith(`${cookieName}=`))?.slice(cookieName.length + 1);
  if (!token) return null;
  const [visitor, signed] = token.split('.');
  if (!/^[0-9a-f-]{36}$/.test(visitor ?? '') || !/^[0-9a-f]{64}$/.test(signed ?? '')) return null;
  return timingSafeEqual(Buffer.from(signed), Buffer.from(signature(visitor, secret))) ? visitor : null;
}

function reply(response, status, value) {
  response.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
  response.end(JSON.stringify(value));
}

export function createGardenPreviewServer({ store, secret, now = () => new Date(), origins = defaultOrigins }) {
  const allowed = new Set(origins);
  return createServer((request, response) => {
    const origin = request.headers.origin;
    if (origin && !allowed.has(origin)) return reply(response, 403, { error: 'origin_not_allowed' });
    if (origin) {
      response.setHeader('Access-Control-Allow-Origin', origin);
      response.setHeader('Access-Control-Allow-Credentials', 'true');
      response.setHeader('Vary', 'Origin');
    }
    if (request.method === 'OPTIONS') {
      response.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
      response.setHeader('Access-Control-Allow-Headers', 'Content-Type');
      response.writeHead(204);
      return response.end();
    }
    const path = new URL(request.url, 'http://preview.local').pathname;
    if (path === '/health' && request.method === 'GET') return reply(response, 200, { ok: true, namespace: previewNamespace });
    const reading = path === endpoint && request.method === 'GET';
    const watering = path === `${endpoint}/water` && request.method === 'POST';
    if (!reading && !watering) return reply(response, 404, { error: 'not_found' });
    if (watering && !origin) return reply(response, 403, { error: 'origin_required' });
    let visitor = visitorFromCookie(request.headers.cookie, secret);
    if (!visitor && watering) return reply(response, 409, { error: 'visitor_session_required' });
    if (!visitor) {
      visitor = randomUUID();
      response.setHeader('Set-Cookie', `${cookieName}=${visitor}.${signature(visitor, secret)}; Path=${endpoint}; HttpOnly; SameSite=Lax; Max-Age=31536000`);
    }
    const visitorHash = signature(`visitor:${visitor}`, secret);
    try {
      if (reading) return reply(response, 200, store.read(previewNamespace, visitorHash, now()));
      request.resume();
      return reply(response, 200, store.water(previewNamespace, visitorHash, now()));
    } catch (error) {
      if (error instanceof Error) console.error('[garden-preview] Persistence failed:', error.message);
      return reply(response, 503, { error: 'persistence_unavailable' });
    }
  });
}

function persistentSecret(path) {
  try {
    return readFileSync(path);
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
    const secret = randomBytes(32);
    writeFileSync(path, secret, { mode: 0o600, flag: 'wx' });
    return secret;
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const databasePath = resolve(process.env.GARDEN_PREVIEW_DB ?? 'output/bear-stories/garden/state/garden.sqlite');
  mkdirSync(dirname(databasePath), { recursive: true });
  const store = openGardenStore(databasePath);
  const server = createGardenPreviewServer({ store, secret: persistentSecret(`${databasePath}.secret`) });
  server.listen(4410, '0.0.0.0', () => console.log('[garden-preview] Listening on :4410; persistent namespace bear-garden-preview-v1'));
  const close = () => server.close(() => { store.close(); process.exit(0); });
  process.once('SIGINT', close);
  process.once('SIGTERM', close);
}
