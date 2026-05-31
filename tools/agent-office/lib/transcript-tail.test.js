import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { parseLine, parseEntry, agentIdFromPath, TranscriptTailer } from './transcript-tail.js';

test('agentIdFromPath extracts the id from the filename', () => {
  assert.equal(agentIdFromPath('/x/subagents/agent-acbd4ac2a100a3603.jsonl'), 'acbd4ac2a100a3603');
  assert.equal(agentIdFromPath('/x/session.jsonl'), null);
});

test('parseLine extracts tool_use from a real-shaped assistant line', () => {
  const line = JSON.stringify({
    type: 'assistant', uuid: 'u1',
    message: { content: [
      { type: 'text', text: 'let me check' },
      { type: 'tool_use', name: 'Bash', input: { command: 'ls -la', description: 'Check file sizes' } },
    ] },
  });
  const evs = parseLine(line, 'a-1');
  assert.equal(evs.length, 1);
  assert.deepEqual(evs[0], { kind: 'tool', payload: { agent_id: 'a-1', tool_name: 'Bash', tool_input: { command: 'ls -la', description: 'Check file sizes' } } });
});

test('parseLine ignores non-assistant / non-tool lines + bad json', () => {
  assert.deepEqual(parseLine(JSON.stringify({ type: 'user', message: { content: 'hi' } }), 'a'), []);
  assert.deepEqual(parseLine(JSON.stringify({ type: 'assistant', message: { content: [{ type: 'text', text: 'hi' }] } }), 'a'), []);
  assert.deepEqual(parseLine('{not json', 'a'), []);
});

test('parseLine handles multiple tool_use in one line', () => {
  const line = JSON.stringify({ type: 'assistant', message: { content: [
    { type: 'tool_use', name: 'Read', input: { file_path: '/a' } },
    { type: 'tool_use', name: 'Grep', input: { pattern: 'x' } },
  ] } });
  const evs = parseLine(line, 'a-2');
  assert.equal(evs.length, 2);
  assert.equal(evs[1].payload.tool_name, 'Grep');
});

test('parseEntry extracts tokens (incl. cache), model, ts, and text result', () => {
  const e = parseEntry(JSON.stringify({
    type: 'assistant', timestamp: '2026-05-27T14:51:48.077Z',
    message: { model: 'claude-opus-4-7', usage: { input_tokens: 6, cache_read_input_tokens: 73687, cache_creation_input_tokens: 923, output_tokens: 40 },
      content: [{ type: 'text', text: 'All done. Summary: it works.' }, { type: 'tool_use', name: 'Read', input: { file_path: '/a' } }] },
  }));
  assert.equal(e.tools.length, 1);
  assert.equal(e.inTokens, 6 + 73687 + 923);
  assert.equal(e.outTokens, 40);
  assert.equal(e.model, 'claude-opus-4-7');
  assert.equal(e.text, 'All done. Summary: it works.');
  assert.equal(e.ts, Date.parse('2026-05-27T14:51:48.077Z'));
  assert.equal(parseEntry('{bad'), null);
  assert.equal(parseEntry(JSON.stringify({ type: 'user' })), null);
});

test('TranscriptTailer emits metrics (tools/tokens/result) keyed by agent_id', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'tt-'));
  const sub = path.join(dir, 'p', 's', 'subagents');
  fs.mkdirSync(sub, { recursive: true });
  const file = path.join(sub, 'agent-m1.jsonl');
  fs.writeFileSync(file, '');   // empty so first poll seeds offset 0
  const events = [];
  const tailer = new TranscriptTailer((e) => events.push(e), { dir, pollMs: 9e9 });
  tailer.poll();
  const line = (text, name) => JSON.stringify({ type: 'assistant', timestamp: '2026-05-27T14:51:48Z',
    message: { model: 'm', usage: { input_tokens: 100, output_tokens: 10 }, content: [name ? { type: 'tool_use', name, input: {} } : { type: 'text', text } ] } }) + '\n';
  fs.appendFileSync(file, line(null, 'Read') + line(null, 'Bash') + line('final result text', null));
  tailer.poll();
  const metrics = events.filter((e) => e.kind === 'metrics').pop();
  assert.ok(metrics, 'a metrics event fired');
  assert.equal(metrics.payload.agent_id, 'm1');
  assert.equal(metrics.payload.tools, 2);
  assert.deepEqual(metrics.payload.byTool, { Read: 1, Bash: 1 });
  assert.equal(metrics.payload.inTokens, 300);
  assert.equal(metrics.payload.result, 'final result text');
  fs.rmSync(dir, { recursive: true, force: true });
});

test('TranscriptTailer skips history, streams new appends, keyed by filename agent_id', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'tt-'));
  const sub = path.join(dir, 'proj1', 'sessA', 'subagents');
  fs.mkdirSync(sub, { recursive: true });
  const file = path.join(sub, 'agent-xyz123.jsonl');
  // pre-existing history (should be skipped)
  fs.writeFileSync(file, JSON.stringify({ type: 'assistant', message: { content: [{ type: 'tool_use', name: 'Read', input: {} }] } }) + '\n');

  const events = [];
  const tailer = new TranscriptTailer((e) => events.push(e), { dir, pollMs: 999999 });
  tailer.poll();   // seed offsets — history skipped
  assert.equal(events.length, 0, 'history not replayed');

  // append a new tool_use
  fs.appendFileSync(file, JSON.stringify({ type: 'assistant', message: { content: [{ type: 'tool_use', name: 'Edit', input: { file_path: '/x.ts' } }] } }) + '\n');
  tailer.poll();
  const tool = events.find((e) => e.kind === 'tool');
  assert.ok(tool, 'a tool event streamed');
  assert.equal(tool.payload.agent_id, 'xyz123');
  assert.equal(tool.payload.tool_name, 'Edit');

  fs.rmSync(dir, { recursive: true, force: true });
});
