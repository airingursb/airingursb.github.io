import { createServer } from 'node:http';
import { randomBytes } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createLampHandler } from '../../services/blog-api/lib/tree-lamps-http.js';
import { openLampStore } from './store.mjs';

const namespace = 'bear-tree-lamps-preview-v1';
const endpoint = '/api/preview/tree-lamps';
const origins = ['localhost', '127.0.0.1', '100.93.37.97'].flatMap(host =>
  [4321, 4418, 4419, 4421, 4423].map(port => `http://${host}:${port}`));

export function createLampPreviewServer({ store, secret, allowedOrigins = origins, now = () => new Date() }) {
  const allowed = new Set(allowedOrigins);
  const route = createLampHandler({ endpoint, cookieName: 'bear_tree_lamps_preview', secret,
    secure: false, origins: allowedOrigins,
    getState(visitorHash, lampIndex, url) {
      const actual = now();
      const scene = url.searchParams.get('scene');
      const simulated = scene === 'night' || scene === 'day';
      const day = new Date(actual.getTime() + 8 * 3600000).toISOString().slice(0, 10);
      const clock = simulated ? new Date(`${day}T${scene === 'night' ? '12' : '04'}:00:00.000Z`) : actual;
      return { ...store.state(namespace, visitorHash, clock, lampIndex), simulated };
    },
  });
  return createServer(async (req, res) => {
    const origin = req.headers.origin;
    if (origin && !allowed.has(origin)) { res.writeHead(403); res.end(); return; }
    if (origin) {
      res.setHeader('Access-Control-Allow-Origin', origin);
      res.setHeader('Access-Control-Allow-Credentials', 'true');
      res.setHeader('Vary', 'Origin');
    }
    if (req.method === 'OPTIONS') {
      res.writeHead(204, { 'Access-Control-Allow-Methods': 'GET, POST, OPTIONS' });
      res.end(); return;
    }
    const url = new URL(req.url, 'http://preview.local');
    if (url.pathname === '/health') {
      res.writeHead(200, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' });
      res.end(JSON.stringify({ ok: true, namespace, isolated: true })); return;
    }
    if (await route(req, res, url)) return;
    res.writeHead(404); res.end();
  });
}

function persistentSecret(path) {
  try { return readFileSync(path); }
  catch (error) {
    if (!(error instanceof Error && 'code' in error && error.code === 'ENOENT')) throw error;
    const value = randomBytes(32);
    writeFileSync(path, value, { mode: 0o600, flag: 'wx' });
    return value;
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const databasePath = resolve(process.env.LAMP_PREVIEW_DB ?? 'output/tree-lamps/state/lamps.sqlite');
  mkdirSync(dirname(databasePath), { recursive: true });
  const store = openLampStore(databasePath);
  const server = createLampPreviewServer({ store, secret: persistentSecret(`${databasePath}.secret`) });
  server.listen(4420, '0.0.0.0', () => console.log('[tree-lamps-preview] :4420; isolated SQLite, no production writes'));
  const close = () => server.close(() => { store.close(); process.exit(0); });
  process.once('SIGINT', close); process.once('SIGTERM', close);
}
