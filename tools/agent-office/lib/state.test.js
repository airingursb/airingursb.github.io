import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Office, describe } from './state.js';

function clock() {
  let t = 1000;
  const fn = () => t;
  fn.advance = (ms) => { t += ms; };
  return fn;
}
const main = (snap) => snap.agents.find(a => a.kind === 'main');
const subs = (snap) => snap.agents.filter(a => a.kind === 'sub');

test('session_start creates the main agent at the boss desk, idle', () => {
  const o = new Office({ nowFn: clock() });
  const snap = o.ingest('session_start', { session_id: 's1' });
  assert.equal(snap.agents.length, 1);
  assert.equal(main(snap).zone, 'boss');
  assert.equal(main(snap).state, 'idle');
  assert.equal(main(snap).label, 'You');
});

test('main tool events (no agent_id) drive the main agent', () => {
  const o = new Office({ nowFn: clock() });
  o.ingest('session_start', { session_id: 's1' });
  let snap = o.ingest('tool', { session_id: 's1', tool_name: 'Edit', tool_input: { file_path: '/a/b/bear.ts' } });
  assert.equal(main(snap).state, 'typing');
  assert.equal(main(snap).detail, 'editing bear.ts');
  snap = o.ingest('tool', { session_id: 's1', tool_name: 'Bash', tool_input: { description: 'run tests' } });
  assert.equal(main(snap).zone, 'infra');
});

test('Agent spawn reads prompt + agent_type, sends main to whiteboard, adds a provisional sub', () => {
  const o = new Office({ nowFn: clock() });
  o.ingest('session_start', { session_id: 's1' });
  const snap = o.ingest('subagent_spawn', {
    session_id: 's1', tool_name: 'Agent',
    tool_input: { prompt: 'review the diff for bugs', agent_type: 'code-reviewer' },
  });
  assert.equal(main(snap).zone, 'whiteboard');
  assert.equal(main(snap).state, 'talking');
  assert.match(main(snap).detail, /delegating code-reviewer: review the diff/);
  assert.equal(subs(snap).length, 1);
  assert.equal(subs(snap)[0].label, 'code-reviewer');
  assert.equal(subs(snap)[0].agentType, 'code-reviewer');
});

test('sub tool event (with agent_id) binds the provisional sub and attributes precisely', () => {
  const o = new Office({ nowFn: clock() });
  o.ingest('session_start', { session_id: 's1' });
  o.ingest('subagent_spawn', { session_id: 's1', tool_name: 'Agent', tool_input: { prompt: 'x', agent_type: 'Explore' } });
  // the sub now does real work — carries agent_id
  const snap = o.ingest('tool', { session_id: 's1', agent_id: 'a-123', agent_type: 'Explore', tool_name: 'Grep', tool_input: { pattern: 'TODO' } });
  assert.equal(subs(snap).length, 1, 'no duplicate character — provisional was bound');
  const sub = subs(snap)[0];
  assert.equal(sub.id, 'a-123');
  assert.equal(sub.state, 'reading');
  assert.equal(sub.detail, 'grep "TODO"');
  // main is untouched by the sub's tool event
  assert.notEqual(main(snap).state, 'reading');
});

test('two subs are attributed independently by agent_id', () => {
  const o = new Office({ nowFn: clock() });
  o.ingest('session_start', { session_id: 's1' });
  o.ingest('subagent_spawn', { session_id: 's1', tool_name: 'Agent', tool_input: { prompt: 'a' } });
  o.ingest('subagent_spawn', { session_id: 's1', tool_name: 'Agent', tool_input: { prompt: 'b' } });
  o.ingest('tool', { session_id: 's1', agent_id: 'a-1', tool_name: 'Edit', tool_input: { file_path: '/x.ts' } });
  const snap = o.ingest('tool', { session_id: 's1', agent_id: 'a-2', tool_name: 'Bash', tool_input: { description: 'build' } });
  assert.equal(subs(snap).length, 2);
  assert.equal(snap.agents.find(a => a.id === 'a-1').state, 'typing');
  assert.equal(snap.agents.find(a => a.id === 'a-2').state, 'running');
});

test('subagent_stop targets the exact agent_id and reflects exit_reason', () => {
  const o = new Office({ nowFn: clock() });
  o.ingest('session_start', { session_id: 's1' });
  o.ingest('subagent_spawn', { session_id: 's1', tool_name: 'Agent', tool_input: { prompt: 'a' } });
  o.ingest('subagent_spawn', { session_id: 's1', tool_name: 'Agent', tool_input: { prompt: 'b' } });
  o.ingest('tool', { session_id: 's1', agent_id: 'a-1', tool_name: 'Edit', tool_input: { file_path: '/x' } });
  o.ingest('tool', { session_id: 's1', agent_id: 'a-2', tool_name: 'Edit', tool_input: { file_path: '/y' } });
  const snap = o.ingest('subagent_stop', { session_id: 's1', agent_id: 'a-2', exit_reason: 'failed' });
  const a2 = snap.agents.find(a => a.id === 'a-2');
  assert.equal(a2.state, 'leaving');
  assert.equal(a2.detail, 'failed ✗');
  assert.equal(a2.exitReason, 'failed');
  assert.equal(snap.agents.find(a => a.id === 'a-1').state, 'typing', 'the other sub is untouched');
});

test('back-compat: when hooks omit agent_id, stop falls back to oldest sub', () => {
  const c = clock();
  const o = new Office({ nowFn: c });
  o.ingest('session_start', { session_id: 's1' });
  o.ingest('subagent_spawn', { session_id: 's1', tool_name: 'Agent', tool_input: { prompt: 'first' } });
  c.advance(10);
  o.ingest('subagent_spawn', { session_id: 's1', tool_name: 'Agent', tool_input: { prompt: 'second' } });
  let snap = o.ingest('subagent_stop', { session_id: 's1' });   // no agent_id
  const leaving = snap.agents.filter(a => a.state === 'leaving');
  assert.equal(leaving.length, 1);
  assert.equal(leaving[0].label, 'second' === leaving[0].label ? 'second' : leaving[0].label); // oldest-by-bornAt
  c.advance(5000);
  snap = o.tick();
  assert.equal(subs(snap).length, 1);
});

test('Notification permission_prompt blocks the targeted agent', () => {
  const o = new Office({ nowFn: clock() });
  o.ingest('session_start', { session_id: 's1' });
  // main blocked
  let snap = o.ingest('notification', { session_id: 's1', notification_type: 'permission_prompt' });
  assert.equal(main(snap).state, 'blocked');
  assert.equal(main(snap).detail, 'waiting for your approval');
  // a sub blocked
  o.ingest('tool', { session_id: 's1', agent_id: 'a-9', tool_name: 'Read', tool_input: {} });
  snap = o.ingest('notification', { session_id: 's1', agent_id: 'a-9', notification_type: 'permission_prompt' });
  assert.equal(snap.agents.find(a => a.id === 'a-9').state, 'blocked');
});

test('FICTION layer: idle subs socialize after the threshold, flagged fiction:true', () => {
  const c = clock();
  const o = new Office({ nowFn: c });
  o.ingest('session_start', { session_id: 's1' });
  o.ingest('subagent_spawn', { session_id: 's1', tool_name: 'Agent', tool_input: { prompt: 'a' } });
  o.ingest('tool', { session_id: 's1', agent_id: 'a-1', tool_name: 'Read', tool_input: {} });
  // force idle, then let it sit
  c.advance(46_000); o.tick();
  assert.equal(o.snapshot().agents.find(a => a.id === 'a-1').state, 'idle');
  c.advance(9_000);
  const snap = o.tick();
  const sub = snap.agents.find(a => a.id === 'a-1');
  assert.equal(sub.state, 'chatting');
  assert.equal(sub.fiction, true, 'socializing is charm, not data');
});

test('a real event cancels the fiction flag', () => {
  const c = clock();
  const o = new Office({ nowFn: c });
  o.ingest('session_start', { session_id: 's1' });
  o.ingest('subagent_spawn', { session_id: 's1', tool_name: 'Agent', tool_input: { prompt: 'a' } });
  o.ingest('tool', { session_id: 's1', agent_id: 'a-1', tool_name: 'Read', tool_input: {} });
  c.advance(46_000); o.tick(); c.advance(9_000); o.tick();
  assert.equal(o.snapshot().agents.find(a => a.id === 'a-1').fiction, true);
  const snap = o.ingest('tool', { session_id: 's1', agent_id: 'a-1', tool_name: 'Bash', tool_input: { description: 'go' } });
  const sub = snap.agents.find(a => a.id === 'a-1');
  assert.equal(sub.fiction, false);
  assert.equal(sub.state, 'running');
});

test('describe() handles Agent/Task with prompt, and common tools', () => {
  assert.match(describe('Agent', { prompt: 'find the bug', agent_type: 'Explore' }), /delegating Explore: find the bug/);
  assert.match(describe('Task', { prompt: 'do a thing' }), /delegating do a thing/);
  assert.equal(describe('Read', { file_path: '/foo/bar/baz.md' }), 'reading baz.md');
  assert.equal(describe('Grep', { pattern: 'TODO' }), 'grep "TODO"');
});
