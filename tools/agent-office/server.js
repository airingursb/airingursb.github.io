#!/usr/bin/env node
// Agent Office — local event server (zero external deps).
//
//   Claude Code hooks  ──POST /event (X-Kind: ...)──►  this server  ──SSE──►  office page
//
// Ingests Claude Code hook events, maintains the agent tree (lib/state.js), and
// pushes the world snapshot to the browser over Server-Sent Events. Also serves
// the static office page from ./public.
//
// Run:  node server.js   (defaults to http://localhost:4500)
// Env:  PORT=4500  OWNER_LABEL=You

import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Office } from './lib/state.js';

const PORT = Number(process.env.PORT || 4500);
const OWNER_LABEL = process.env.OWNER_LABEL || 'You';
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PUBLIC_DIR = path.join(__dirname, 'public');

const office = new Office({ ownerLabel: OWNER_LABEL });
/** @type {Set<http.ServerResponse>} active SSE clients */
const clients = new Set();

function broadcast(snap) {
  const line = `data: ${JSON.stringify(snap)}\n\n`;
  for (const res of clients) {
    try { res.write(line); } catch { clients.delete(res); }
  }
}

// v1.1 — fine-grained subAgent actions straight from Claude Code transcripts.
// Opt-in (reads ~/.claude): OFFICE_TAIL_TRANSCRIPTS=1
if (process.env.OFFICE_TAIL_TRANSCRIPTS === '1') {
  const { TranscriptTailer } = await import('./lib/transcript-tail.js');
  new TranscriptTailer((ev) => broadcast(office.ingest(ev.kind, ev.payload))).start();
  process.stdout.write('[office] transcript tail ON — subAgent fine-grained actions from ~/.claude\n');
}

// periodic tick: idle-drift + remove departed subs
setInterval(() => {
  const snap = office.tick();
  broadcast(snap);
}, 2000).unref?.();

const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.json': 'application/json', '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.woff': 'font/woff', '.webmanifest': 'application/manifest+json', '.ico': 'image/x-icon', '.webp': 'image/webp', '.jpg': 'image/jpeg', '.ogg': 'audio/ogg', '.mp3': 'audio/mpeg' };

// Also serve the built nook site (dist/) so the office window can load the REAL
// nook office from THIS origin — page + SSE same-origin (no cross-origin localhost,
// which the desktop WKWebView blocks). e.g. localhost:4500/nook?room=office.
const NOOK_DIST = process.env.OFFICE_NOOK_DIST || path.resolve(__dirname, '..', '..', 'dist');

function sendFile(res, filePath) {
  fs.readFile(filePath, (err, data) => {
    if (err) { res.writeHead(404).end('not found'); return; }
    res.writeHead(200, { 'content-type': MIME[path.extname(filePath)] || 'application/octet-stream' });
    res.end(data);
  });
}

function serveStatic(req, res) {
  let rel = decodeURIComponent((req.url || '/').split('?')[0]);
  if (rel === '/') rel = '/index.html';
  // 1) the placeholder office page under ./public
  const pub = path.join(PUBLIC_DIR, path.normalize(rel));
  if (pub.startsWith(PUBLIC_DIR) && fs.existsSync(pub) && fs.statSync(pub).isFile()) { sendFile(res, pub); return; }
  // 2) fall through to the built nook site (dist/) — /nook → dist/nook/index.html
  let distPath = path.join(NOOK_DIST, path.normalize(rel));
  if (distPath.startsWith(NOOK_DIST)) {
    try { if (fs.statSync(distPath).isDirectory()) distPath = path.join(distPath, 'index.html'); } catch {}
    if (fs.existsSync(distPath)) { sendFile(res, distPath); return; }
  }
  res.writeHead(404).end('not found');
}

function readBody(req) {
  return new Promise((resolve) => {
    let buf = '';
    req.on('data', (c) => { buf += c; if (buf.length > 1e6) req.destroy(); });
    req.on('end', () => resolve(buf));
    req.on('error', () => resolve(buf));
  });
}

const server = http.createServer(async (req, res) => {
  const url = (req.url || '/').split('?')[0];

  // CORS (so an Astro page on :4321 could also connect later)
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'X-Kind, Content-Type');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  // Private Network Access: a public https page (ursb.me) reaching this local
  // server is a "public → private" request. http://localhost is exempt from
  // mixed-content blocking, but Chrome's PNA still needs this header on the
  // preflight, else the connection is blocked.
  res.setHeader('Access-Control-Allow-Private-Network', 'true');
  if (req.method === 'OPTIONS') { res.writeHead(204).end(); return; }

  // --- event ingest (from Claude Code hooks) ---
  if (req.method === 'POST' && url === '/event') {
    const kind = String(req.headers['x-kind'] || '').toLowerCase();
    const raw = await readBody(req);
    let payload = {};
    try { payload = raw ? JSON.parse(raw) : {}; } catch { payload = { _raw: raw }; }
    const snap = office.ingest(kind, payload);
    broadcast(snap);
    res.writeHead(200, { 'content-type': 'application/json' });
    res.end(JSON.stringify({ ok: true, agents: snap.agents.length }));
    log(kind, payload);
    return;
  }

  // --- health (used by the desktop client's bootstrap) ---
  if (req.method === 'GET' && url === '/health') {
    res.writeHead(200, { 'content-type': 'application/json' });
    res.end(JSON.stringify({ ok: true, agents: office.snapshot().agents.length }));
    return;
  }

  // --- snapshot (poll / initial state) ---
  if (req.method === 'GET' && url === '/state') {
    res.writeHead(200, { 'content-type': 'application/json' });
    res.end(JSON.stringify(office.snapshot()));
    return;
  }

  // --- SSE stream ---
  if (req.method === 'GET' && url === '/events') {
    res.writeHead(200, {
      'content-type': 'text/event-stream',
      'cache-control': 'no-cache',
      connection: 'keep-alive',
    });
    res.write(`data: ${JSON.stringify(office.snapshot())}\n\n`);
    clients.add(res);
    req.on('close', () => clients.delete(res));
    return;
  }

  // --- static office page ---
  if (req.method === 'GET') { serveStatic(req, res); return; }

  res.writeHead(405).end();
});

function log(kind, payload) {
  const t = payload.tool_name ? ` ${payload.tool_name}` : '';
  process.stdout.write(`[office] ${kind}${t} · agents=${office.snapshot().agents.length}\n`);
}

server.listen(PORT, () => {
  process.stdout.write(`\n  Agent Office server → http://localhost:${PORT}\n`);
  process.stdout.write(`  open that URL, then start a Claude Code session with hooks installed.\n\n`);
});
