import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Office, describe } from './state.js';

// controllable clock
function clock() {
  let t = 1000;
  const fn = () => t;
  fn.advance = (ms) => { t += ms; };
  return fn;
}

test('session_start creates the main agent at the boss desk, idle', () => {
  const o = new Office({ nowFn: clock() });
  const snap = o.ingest('session_start', { session_id: 's1' });
  assert.equal(snap.agents.length, 1);
  const main = snap.agents[0];
  assert.equal(main.kind, 'main');
  assert.equal(main.zone, 'boss');
  assert.equal(main.state, 'idle');
  assert.equal(main.label, 'You');
});

test('tool events drive the main agent state + zone', () => {
  const o = new Office({ nowFn: clock() });
  o.ingest('session_start', { session_id: 's1' });

  let snap = o.ingest('tool', { session_id: 's1', tool_name: 'Edit', tool_input: { file_path: '/a/b/bear.ts' } });
  let main = snap.agents[0];
  assert.equal(main.state, 'typing');
  assert.equal(main.zone, 'desk');
  assert.equal(main.detail, 'editing bear.ts');

  snap = o.ingest('tool', { session_id: 's1', tool_name: 'Bash', tool_input: { description: 'run tests' } });
  main = snap.agents[0];
  assert.equal(main.state, 'running');
  assert.equal(main.zone, 'infra');
  assert.equal(main.detail, 'run tests');

  snap = o.ingest('tool', { session_id: 's1', tool_name: 'WebSearch', tool_input: { query: 'phaser tilemap' } });
  assert.equal(snap.agents[0].state, 'searching');
});

test('unknown tool falls back to working/desk', () => {
  const o = new Office({ nowFn: clock() });
  o.ingest('session_start', { session_id: 's1' });
  const snap = o.ingest('tool', { session_id: 's1', tool_name: 'SomeMcpTool', tool_input: {} });
  assert.equal(snap.agents[0].state, 'working');
  assert.equal(snap.agents[0].zone, 'desk');
});

test('Task spawn adds a sub and sends main to the whiteboard; PostToolUse returns main', () => {
  const o = new Office({ nowFn: clock() });
  o.ingest('session_start', { session_id: 's1' });

  let snap = o.ingest('subagent_spawn', { session_id: 's1', tool_name: 'Task', tool_input: { description: 'review the diff' } });
  assert.equal(snap.agents.length, 2);
  const main = snap.agents.find(a => a.kind === 'main');
  const sub = snap.agents.find(a => a.kind === 'sub');
  assert.equal(main.zone, 'whiteboard');
  assert.equal(main.state, 'talking');
  assert.equal(sub.parentId, main.id);
  assert.equal(sub.label, 'review the diff');
  assert.equal(sub.zone, 'desk');

  snap = o.ingest('tool', { session_id: 's1', tool_name: 'Task', tool_input: {} });
  assert.equal(snap.agents.find(a => a.kind === 'main').zone, 'boss');
});

test('subagent_stop marks the oldest sub leaving; tick removes it after 4s', () => {
  const c = clock();
  const o = new Office({ nowFn: c });
  o.ingest('session_start', { session_id: 's1' });
  o.ingest('subagent_spawn', { session_id: 's1', tool_name: 'Task', tool_input: { description: 'first' } });
  c.advance(10);
  o.ingest('subagent_spawn', { session_id: 's1', tool_name: 'Task', tool_input: { description: 'second' } });

  let snap = o.ingest('subagent_stop', { session_id: 's1' });
  const leaving = snap.agents.filter(a => a.state === 'leaving');
  assert.equal(leaving.length, 1);
  assert.equal(leaving[0].label, 'first'); // oldest

  c.advance(5000);
  snap = o.tick();
  assert.equal(snap.agents.filter(a => a.kind === 'sub').length, 1); // 'first' gone, 'second' stays
});

test('tick drifts an inactive agent to idle after the threshold', () => {
  const c = clock();
  const o = new Office({ nowFn: c });
  o.ingest('session_start', { session_id: 's1' });
  o.ingest('tool', { session_id: 's1', tool_name: 'Edit', tool_input: { file_path: '/x.ts' } });
  assert.equal(o.snapshot().agents[0].state, 'typing');
  c.advance(46_000);
  const snap = o.tick();
  assert.equal(snap.agents[0].state, 'idle');
  assert.equal(snap.agents[0].zone, 'boss');
});

test('stop sends main to the lounge', () => {
  const o = new Office({ nowFn: clock() });
  o.ingest('session_start', { session_id: 's1' });
  const snap = o.ingest('stop', { session_id: 's1' });
  assert.equal(snap.agents[0].zone, 'lounge');
  assert.equal(snap.agents[0].state, 'idle');
});

test('describe() summarizes common tools', () => {
  assert.equal(describe('Read', { file_path: '/foo/bar/baz.md' }), 'reading baz.md');
  assert.equal(describe('Grep', { pattern: 'TODO' }), 'grep "TODO"');
  assert.equal(describe('Edit', {}), 'writing code');
});
