import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Office, describe } from './state.js';
import { STATES, resolveTool } from './states.js';

function clock() {
  let t = 1000;
  const fn = () => t;
  fn.advance = (ms) => { t += ms; };
  return fn;
}
const main = (s) => s.agents.find(a => a.kind === 'main');
const subs = (s) => s.agents.filter(a => a.kind === 'sub');
const byId = (s, id) => s.agents.find(a => a.id === id);

test('every catalog state is well-formed (id/cat/verb/emoji/zone/anim)', () => {
  const zones = new Set(['boss', 'desk', 'infra', 'whiteboard', 'pantry', 'lounge']);
  const anims = new Set(['idle', 'walk', 'wave', 'sit', 'dance']);
  let n = 0;
  for (const [id, d] of Object.entries(STATES)) {
    n++;
    assert.equal(d.id, id);
    assert.ok(d.verb && d.emoji && d.cat, `${id} has verb/emoji/cat`);
    assert.ok(zones.has(d.zone), `${id} zone ${d.zone} valid`);
    assert.ok(anims.has(d.anim), `${id} anim ${d.anim} maps to a bear.ts state`);
  }
  assert.ok(n > 200, `catalog has 200+ states (got ${n})`);
});

test('session_start puts the main agent at the boss desk', () => {
  const o = new Office({ nowFn: clock() });
  const snap = o.ingest('session_start', { session_id: 's1' });
  assert.equal(main(snap).cat, 'life');
  assert.equal(main(snap).zone, 'boss');
  assert.equal(main(snap).species, 'bear');
});

test('main tool events resolve to fine states by file/command', () => {
  const o = new Office({ nowFn: clock() });
  o.ingest('session_start', { session_id: 's1' });
  let snap = o.ingest('tool', { session_id: 's1', tool_name: 'Edit', tool_input: { file_path: '/a/foo.test.ts' } });
  assert.equal(main(snap).state, 'edit_test');     // .test. → writing tests
  assert.equal(main(snap).cat, 'code');
  assert.equal(main(snap).detail, 'editing foo.test.ts');
  snap = o.ingest('tool', { session_id: 's1', tool_name: 'Bash', tool_input: { command: 'git commit -m x' } });
  assert.equal(main(snap).state, 'run_commit');
  assert.equal(main(snap).zone, 'infra');
});

test('Agent spawn → main delegates at whiteboard + provisional sub appears', () => {
  const o = new Office({ nowFn: clock() });
  o.ingest('session_start', { session_id: 's1' });
  const snap = o.ingest('subagent_spawn', {
    session_id: 's1', tool_name: 'Agent', tool_input: { prompt: 'review the diff', agent_type: 'code-reviewer' },
  });
  assert.equal(main(snap).state, 'del_spawn');
  assert.equal(main(snap).cat, 'delegate');
  assert.equal(main(snap).zone, 'whiteboard');
  assert.match(main(snap).detail, /delegating code-reviewer: review the diff/);
  assert.equal(subs(snap).length, 1);
  assert.equal(subs(snap)[0].label, 'code-reviewer');
});

test('sub tool event binds the provisional sub & attributes by agent_id', () => {
  const o = new Office({ nowFn: clock() });
  o.ingest('session_start', { session_id: 's1' });
  o.ingest('subagent_spawn', { session_id: 's1', tool_name: 'Agent', tool_input: { prompt: 'x', agent_type: 'Explore' } });
  const snap = o.ingest('tool', { session_id: 's1', agent_id: 'a-123', agent_type: 'Explore', tool_name: 'Grep', tool_input: { pattern: 'foo' } });
  assert.equal(subs(snap).length, 1, 'provisional bound, no duplicate');
  assert.equal(byId(snap, 'a-123').state, 'grep_search');
  assert.equal(byId(snap, 'a-123').cat, 'read');
});

test('two subs attributed independently by agent_id', () => {
  const o = new Office({ nowFn: clock() });
  o.ingest('session_start', { session_id: 's1' });
  o.ingest('subagent_spawn', { session_id: 's1', tool_name: 'Agent', tool_input: { prompt: 'a' } });
  o.ingest('subagent_spawn', { session_id: 's1', tool_name: 'Agent', tool_input: { prompt: 'b' } });
  o.ingest('tool', { session_id: 's1', agent_id: 'a-1', tool_name: 'Edit', tool_input: { file_path: '/x.css' } });
  const snap = o.ingest('tool', { session_id: 's1', agent_id: 'a-2', tool_name: 'Bash', tool_input: { command: 'npm run build' } });
  assert.equal(byId(snap, 'a-1').state, 'edit_style');
  assert.equal(byId(snap, 'a-2').state, 'run_build');
});

test('subagent_stop targets agent_id + reflects exit_reason, then is removed', () => {
  const c = clock();
  const o = new Office({ nowFn: c });
  o.ingest('session_start', { session_id: 's1' });
  o.ingest('subagent_spawn', { session_id: 's1', tool_name: 'Agent', tool_input: { prompt: 'a' } });
  o.ingest('subagent_spawn', { session_id: 's1', tool_name: 'Agent', tool_input: { prompt: 'b' } });
  o.ingest('tool', { session_id: 's1', agent_id: 'a-1', tool_name: 'Edit', tool_input: { file_path: '/x' } });
  o.ingest('tool', { session_id: 's1', agent_id: 'a-2', tool_name: 'Edit', tool_input: { file_path: '/y' } });
  let snap = o.ingest('subagent_stop', { session_id: 's1', agent_id: 'a-2', exit_reason: 'failed' });
  assert.equal(byId(snap, 'a-2').state, 'life_failed');
  assert.equal(byId(snap, 'a-2').exitReason, 'failed');
  assert.equal(byId(snap, 'a-1').state, 'edit_code', 'other sub untouched');
  c.advance(5000); snap = o.tick();
  assert.equal(byId(snap, 'a-2'), undefined, 'departed sub removed');
});

test('Notification permission_prompt → blocked', () => {
  const o = new Office({ nowFn: clock() });
  o.ingest('session_start', { session_id: 's1' });
  const snap = o.ingest('notification', { session_id: 's1', notification_type: 'permission_prompt' });
  assert.equal(main(snap).cat, 'blocked');
  assert.equal(main(snap).state, 'blocked_perm');
});

test('appearance: same agent_type → same species; main is the owner species', () => {
  const o = new Office({ nowFn: clock(), ownerSpecies: 'fox' });
  o.ingest('session_start', { session_id: 's1' });
  o.ingest('tool', { session_id: 's1', agent_id: 'x1', agent_type: 'code-reviewer', tool_name: 'Read', tool_input: {} });
  o.ingest('tool', { session_id: 's1', agent_id: 'x2', agent_type: 'code-reviewer', tool_name: 'Read', tool_input: {} });
  const snap = o.snapshot();
  assert.equal(byId(snap, 'x1').species, byId(snap, 'x2').species);
  assert.equal(main(snap).species, 'fox');
});

test('anim hints map to bear.ts BearStates', () => {
  const o = new Office({ nowFn: clock() });
  o.ingest('session_start', { session_id: 's1' });
  let snap = o.ingest('tool', { session_id: 's1', tool_name: 'Edit', tool_input: { file_path: '/x.ts' } });
  assert.equal(main(snap).anim, 'sit');
  snap = o.ingest('subagent_spawn', { session_id: 's1', tool_name: 'Agent', tool_input: { prompt: 'p' } });
  assert.equal(main(snap).anim, 'wave');
});

// helper: two subs, both drifted to idle/ambient
function twoIdleSubs(c) {
  const o = new Office({ nowFn: c });
  o.ingest('session_start', { session_id: 's1' });
  o.ingest('subagent_spawn', { session_id: 's1', tool_name: 'Agent', tool_input: { prompt: 'a' } });
  o.ingest('subagent_spawn', { session_id: 's1', tool_name: 'Agent', tool_input: { prompt: 'b' } });
  o.ingest('tool', { session_id: 's1', agent_id: 'a-1', tool_name: 'Read', tool_input: {} });
  o.ingest('tool', { session_id: 's1', agent_id: 'a-2', tool_name: 'Read', tool_input: {} });
  c.advance(46_000); o.tick();   // both drift to idle/ambient
  return o;
}

test('idle drift gives ambient life (fiction), flagged fiction:true', () => {
  const c = clock();
  const o = twoIdleSubs(c);
  const a1 = byId(o.snapshot(), 'a-1');
  assert.equal(a1.cat, 'idle');
  assert.equal(a1.fiction, true, 'ambient idle is charm, not data');
});

test('FICTION choreography: idle pair walks in → chats (turn-taking) → walks out', () => {
  const c = clock();
  const o = twoIdleSubs(c);
  c.advance(9_000);
  let snap = o.tick();   // pair forms
  let a1 = byId(snap, 'a-1'), a2 = byId(snap, 'a-2');
  assert.equal(a1.cat, 'social');
  assert.equal(a1.socialPhase, 'walk-in');
  assert.equal(a1.partner, 'a-2');

  c.advance(2_600); snap = o.tick();   // → chat
  a1 = byId(snap, 'a-1'); a2 = byId(snap, 'a-2');
  assert.equal(a1.socialPhase, 'chat');
  assert.notEqual(a1.speaking, a2.speaking, 'turn-taking: exactly one speaks');

  c.advance(3_000); snap = o.tick();   // speaker flips
  assert.equal(byId(snap, 'a-1').speaking, !a1.speaking);

  c.advance(13_000); snap = o.tick();  // chat over → walk-out
  assert.equal(byId(snap, 'a-1').socialPhase, 'walk-out');
  c.advance(2_600); snap = o.tick();   // → back to idle ambient
  assert.equal(byId(snap, 'a-1').socialPhase, null);
  assert.equal(byId(snap, 'a-1').cat, 'idle');
});

test('a real event cancels the fiction layer mid-chat', () => {
  const c = clock();
  const o = twoIdleSubs(c);
  c.advance(9_000); o.tick();
  assert.equal(byId(o.snapshot(), 'a-1').cat, 'social');
  const snap = o.ingest('tool', { session_id: 's1', agent_id: 'a-1', tool_name: 'Bash', tool_input: { command: 'npm test' } });
  assert.equal(byId(snap, 'a-1').state, 'run_test');
  assert.equal(byId(snap, 'a-1').fiction, false);
  assert.equal(byId(snap, 'a-1').socialPhase, null);
});

test('describe() gives concrete detail or falls back to the state verb', () => {
  assert.equal(describe('Read', { file_path: '/foo/bar/baz.md' }), 'reading baz.md');
  assert.equal(describe('Edit', {}), 'writing code');
  assert.match(describe('Agent', { prompt: 'find the bug', agent_type: 'Explore' }), /delegating Explore: find the bug/);
  assert.equal(resolveTool('Bash', { command: './scripts/deploy.sh' }), 'run_deploy');
});
