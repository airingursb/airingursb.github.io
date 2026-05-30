#!/usr/bin/env node
// Idempotently merge the Agent Office hooks into ~/.claude/settings.json.
// - Backs up settings.json before writing.
// - Appends our hook entries WITHOUT clobbering your existing hooks.
// - Re-running is safe: it skips events that already point at localhost:4500.
//
// Usage:  node install-hooks.mjs            (install)
//         node install-hooks.mjs --remove   (remove our entries)

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const MARK = 'localhost:4500/event';
const SETTINGS = path.join(os.homedir(), '.claude', 'settings.json');
const HOOKS_FILE = path.join(path.dirname(new URL(import.meta.url).pathname), 'hooks.example.json');
const remove = process.argv.includes('--remove');

function readJson(p, fallback) {
  try { return JSON.parse(fs.readFileSync(p, 'utf8')); } catch { return fallback; }
}

const ours = readJson(HOOKS_FILE, {}).hooks || {};
const settings = readJson(SETTINGS, {});
settings.hooks = settings.hooks || {};

// backup
if (fs.existsSync(SETTINGS)) {
  fs.copyFileSync(SETTINGS, SETTINGS + '.bak');
  console.log(`backed up → ${SETTINGS}.bak`);
}

function entryIsOurs(entry) {
  return JSON.stringify(entry).includes(MARK);
}

let changed = 0;
for (const [event, ourEntries] of Object.entries(ours)) {
  const cur = Array.isArray(settings.hooks[event]) ? settings.hooks[event] : [];
  // always strip any prior office entries first (idempotent / clean removal)
  const kept = cur.filter((e) => !entryIsOurs(e));
  if (remove) {
    if (kept.length) settings.hooks[event] = kept; else delete settings.hooks[event];
    if (kept.length !== cur.length) changed++;
    continue;
  }
  settings.hooks[event] = [...kept, ...ourEntries];
  changed++;
}

fs.mkdirSync(path.dirname(SETTINGS), { recursive: true });
fs.writeFileSync(SETTINGS, JSON.stringify(settings, null, 2) + '\n');
console.log(remove
  ? `removed Agent Office hooks from ${SETTINGS} (${changed} events touched)`
  : `installed Agent Office hooks into ${SETTINGS} (${changed} events).\nStart the server (npm start), open http://localhost:4500, then launch a NEW Claude Code session.`);
