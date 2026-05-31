// Transcript tail (v1.1) — fine-grained subAgent actions from Claude Code's
// own jsonl logs. Shell hooks may not reliably deliver per-subagent tool events
// (agent_id coverage in settings.json hooks is uncertain), so this reads the
// subagent transcripts directly and emits normalized tool events keyed by the
// agent_id baked into the filename.
//
//   ~/.claude/projects/<proj>/<session>/subagents/agent-<agentId>.jsonl
//
// Each line is one transcript entry. `type:'assistant'` lines carry a
// `message.content[]` array; `{type:'tool_use', name, input}` items are the
// subAgent's actual tool calls. We skip pre-existing history (start at EOF) and
// only stream NEW appends.
//
// Browsers can't read local files — this is inherently a local-server / desktop
// capability, which is exactly why the desktop client is the right home for it.

import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

export const PROJECTS_DIR = path.join(os.homedir(), '.claude', 'projects');

/** agent_id from `.../agent-<id>.jsonl` (the id is in the filename). */
export function agentIdFromPath(p) {
  const m = path.basename(String(p)).match(/^agent-(.+)\.jsonl$/);
  return m ? m[1] : null;
}

/** Parse one transcript line → 0+ normalized tool events. Pure / testable. */
export function parseLine(line, agentId) {
  let o;
  try { o = JSON.parse(line); } catch { return []; }
  if (o.type !== 'assistant') return [];
  const content = o.message?.content;
  if (!Array.isArray(content)) return [];
  const out = [];
  for (const c of content) {
    if (c && c.type === 'tool_use' && c.name) {
      out.push({ kind: 'tool', payload: { agent_id: agentId, tool_name: c.name, tool_input: c.input || {} } });
    }
  }
  return out;
}

export class TranscriptTailer {
  constructor(onEvent, { dir = PROJECTS_DIR, pollMs = 1000 } = {}) {
    this.onEvent = onEvent;
    this.dir = dir;
    this.pollMs = pollMs;
    this.offsets = new Map();   // file -> byte offset already consumed
    this.timer = null;
  }

  /** All subagent transcript files currently on disk. */
  subagentFiles() {
    const out = [];
    let projects = [];
    try { projects = fs.readdirSync(this.dir); } catch { return out; }
    for (const proj of projects) {
      let sessions = [];
      try { sessions = fs.readdirSync(path.join(this.dir, proj)); } catch { continue; }
      for (const sess of sessions) {
        const sub = path.join(this.dir, proj, sess, 'subagents');
        let files = [];
        try { files = fs.readdirSync(sub); } catch { continue; }
        for (const f of files) if (/^agent-.+\.jsonl$/.test(f)) out.push(path.join(sub, f));
      }
    }
    return out;
  }

  /** Read appended bytes from a file since last offset → emit events. */
  drainFile(file) {
    let size;
    try { size = fs.statSync(file).size; } catch { return; }
    const prev = this.offsets.get(file);
    if (prev === undefined) { this.offsets.set(file, size); return; }   // skip history on first sight
    if (size <= prev) { if (size < prev) this.offsets.set(file, size); return; }   // truncated/rotated
    let buf;
    try {
      const fd = fs.openSync(file, 'r');
      buf = Buffer.alloc(size - prev);
      fs.readSync(fd, buf, 0, size - prev, prev);
      fs.closeSync(fd);
    } catch { return; }
    this.offsets.set(file, size);
    const agentId = agentIdFromPath(file);
    for (const line of buf.toString('utf8').split('\n')) {
      if (!line.trim()) continue;
      for (const ev of parseLine(line, agentId)) this.onEvent(ev);
    }
  }

  poll() { for (const f of this.subagentFiles()) this.drainFile(f); }

  start() {
    if (this.timer) return this;
    this.poll();                       // seed offsets (skip history)
    this.timer = setInterval(() => this.poll(), this.pollMs);
    this.timer.unref?.();
    return this;
  }

  stop() { if (this.timer) { clearInterval(this.timer); this.timer = null; } }
}
