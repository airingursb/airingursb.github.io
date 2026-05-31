import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { parseLine, agentIdFromPath, TranscriptTailer } from './transcript-tail.js';

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
  assert.equal(events.length, 1);
  assert.equal(events[0].payload.agent_id, 'xyz123');
  assert.equal(events[0].payload.tool_name, 'Edit');

  fs.rmSync(dir, { recursive: true, force: true });
});
