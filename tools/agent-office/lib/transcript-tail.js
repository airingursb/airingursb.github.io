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
  const e = parseEntry(line);
  if (!e) return [];
  return e.tools.map((t) => ({ kind: 'tool', payload: { agent_id: agentId, tool_name: t.name, tool_input: t.input } }));
}

/**
 * Parse one assistant transcript entry into the rich info the desktop can show
 * (which a browser can't get): tool calls, token usage (incl. cache), the model,
 * a timestamp, and the entry's text (the last text entry = the subAgent's result).
 * Returns null for non-assistant / unparseable lines.
 */
export function parseEntry(line) {
  let o;
  try { o = JSON.parse(line); } catch { return null; }
  if (o.type !== 'assistant') return null;
  const content = Array.isArray(o.message?.content) ? o.message.content : [];
  const tools = content.filter((c) => c && c.type === 'tool_use' && c.name).map((c) => ({ name: c.name, input: c.input || {} }));
  const text = content.filter((c) => c && c.type === 'text' && c.text).map((c) => c.text).join('\n').trim();
  const u = o.message?.usage || null;
  return {
    tools,
    text: text || null,
    inTokens: u ? (u.input_tokens || 0) + (u.cache_read_input_tokens || 0) + (u.cache_creation_input_tokens || 0) : 0,
    outTokens: u ? (u.output_tokens || 0) : 0,
    model: o.message?.model || null,
    ts: o.timestamp ? Date.parse(o.timestamp) : null,
  };
}

export class TranscriptTailer {
  constructor(onEvent, { dir = PROJECTS_DIR, pollMs = 1000 } = {}) {
    this.onEvent = onEvent;
    this.dir = dir;
    this.pollMs = pollMs;
    this.offsets = new Map();   // file -> byte offset already consumed
    this.acc = new Map();       // agentId -> running metrics accumulator
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
    if (!agentId) return;
    let m = this.acc.get(agentId);
    if (!m) { m = { tools: 0, byTool: {}, inTokens: 0, outTokens: 0, model: null, result: null, firstTs: null, lastTs: null }; this.acc.set(agentId, m); }
    let changed = false;
    for (const line of buf.toString('utf8').split('\n')) {
      if (!line.trim()) continue;
      const e = parseEntry(line);
      if (!e) continue;
      for (const t of e.tools) {
        this.onEvent({ kind: 'tool', payload: { agent_id: agentId, tool_name: t.name, tool_input: t.input } });
        m.tools++; m.byTool[t.name] = (m.byTool[t.name] || 0) + 1; changed = true;
      }
      if (e.inTokens || e.outTokens) { m.inTokens += e.inTokens; m.outTokens += e.outTokens; changed = true; }
      if (e.model && !m.model) { m.model = e.model; changed = true; }
      if (e.text) { m.result = e.text; changed = true; }   // last text wins = the result
      if (e.ts) { m.firstTs = m.firstTs ? Math.min(m.firstTs, e.ts) : e.ts; m.lastTs = Math.max(m.lastTs || 0, e.ts); changed = true; }
    }
    if (changed) {
      this.onEvent({ kind: 'metrics', payload: {
        agent_id: agentId, tools: m.tools, byTool: { ...m.byTool }, inTokens: m.inTokens, outTokens: m.outTokens,
        model: m.model, result: m.result, durationMs: m.firstTs && m.lastTs ? m.lastTs - m.firstTs : 0,
      } });
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
