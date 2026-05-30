import { test } from "node:test";
import assert from "node:assert/strict";
import { Office } from "./lib/state.js";
import { STATES } from "./lib/states.js";

test("every one of the 247 catalog states is reachable from real events", () => {
// Dynamic reachability audit: drive the Office through many scenarios, collect every
// stateId that ACTUALLY appears in a snapshot, compare to the full catalog.

const seen = new Set();
const see = (snap) => { for (const a of snap.agents) seen.add(a.state); };

let T = 0;
const mk = () => { T = 1000; return new Office({ nowFn: () => T }); };
const adv = (ms) => { T += ms; };

// ── tool-driven states: every file type / command / tool ──
{
  const o = mk(); o.ingest('session_start', { session_id: 's' });
  const files = ['a.test.ts','README.md','x.md','a.css','a.html','a.json','pnpm-lock.json','x.yml','.github/ci.yml',
    'a.sql','t.d.ts','a.sh','.env','Dockerfile','.gitignore','a.ipynb','a.prisma','a.png','a.pdf','a.log','a.csv',
    'a.toml','locales/en.json','db/migration/001.sql','design/spec.md','CHANGELOG.md','a.diff','plain.ts','huge.ts'];
  for (const f of files) {
    see(o.ingest('tool', { session_id: 's', tool_name: 'Edit', tool_input: { file_path: f, new_string: 'x' } }));
    see(o.ingest('tool', { session_id: 's', tool_name: 'Read', tool_input: { file_path: f } }));
  }
  // content-driven edits
  see(o.ingest('tool', { session_id: 's', tool_name: 'Edit', tool_input: { file_path: 'x.ts', old_string: 'a', new_string: '' } }));        // delete
  see(o.ingest('tool', { session_id: 's', tool_name: 'Edit', tool_input: { file_path: 'x.ts', old_string: 'a b', new_string: 'a  b' } }));   // format
  see(o.ingest('tool', { session_id: 's', tool_name: 'Edit', tool_input: { file_path: 'x.ts', new_string: '<<<<<<< HEAD' } }));               // resolve
  see(o.ingest('tool', { session_id: 's', tool_name: 'MultiEdit', tool_input: { file_path: 'x.ts', edits: [{ new_string: 'a' }] } }));        // refactor
  see(o.ingest('tool', { session_id: 's', tool_name: 'Write', tool_input: { file_path: 'brand-new.ts', content: 'x' } }));                    // newfile
  see(o.ingest('tool', { session_id: 's', tool_name: 'Edit', tool_input: { file_path: 'x.ts', new_string: 'x'.repeat(5000) } }));             // bigfile
  see(o.ingest('tool', { session_id: 's', tool_name: 'Edit', tool_input: { file_path: 'x.ts', new_string: '// just a comment\n// another\n// third' } })); // comment
  // reads with offset/limit
  see(o.ingest('tool', { session_id: 's', tool_name: 'Read', tool_input: { file_path: 'big.ts', offset: 500 } }));   // bigfile
  see(o.ingest('tool', { session_id: 's', tool_name: 'Read', tool_input: { file_path: 'x.ts', limit: 20 } }));        // skim
  // grep variants
  see(o.ingest('tool', { session_id: 's', tool_name: 'Grep', tool_input: { pattern: 'TODO' } }));
  see(o.ingest('tool', { session_id: 's', tool_name: 'Grep', tool_input: { pattern: 'function foo' } }));
  see(o.ingest('tool', { session_id: 's', tool_name: 'Grep', tool_input: { pattern: 'bar' } }));
  see(o.ingest('tool', { session_id: 's', tool_name: 'Glob', tool_input: {} }));
  // bash: every keyword
  const cmds = ['npm test','npm run build','npm install','git commit -m x','git push','git pull','git merge','git rebase',
    'git status','git diff','git log','./scripts/deploy.sh','eslint .','prettier -w .','tsc','migrate up','docker build .',
    'curl x','kubectl get pods','rsync -a a b','sshpass ssh','kill 1','tail -f x','psql -c x','rm -rf x','mkdir x','ls -la',
    'cat x','chmod +x x','grep x','find .','make','npm ci','pip list','node x.js','vite preview --port 3000','bench x','printenv','git mv a b','weird'];
  for (const c of cmds) see(o.ingest('tool', { session_id: 's', tool_name: 'Bash', tool_input: { command: c } }));
  see(o.ingest('tool', { session_id: 's', tool_name: 'BashOutput', tool_input: {} }));   // watch
  // web — reset streak (a non-web tool) before each so each web state is the "first" web
  const reset = () => o.ingest('tool', { session_id: 's', tool_name: 'Glob', tool_input: {} });
  for (const u of ['https://github.com/a','https://stackoverflow.com/q','https://api.x.com/v1','https://docs.x.com',
    'https://x.com/blog/post','https://x.com/a.png','https://x.com']) { reset(); see(o.ingest('tool', { session_id: 's', tool_name: 'WebFetch', tool_input: { url: u } })); }
  reset(); see(o.ingest('tool', { session_id: 's', tool_name: 'WebSearch', tool_input: { query: 'how to x' } }));
  reset(); see(o.ingest('tool', { session_id: 's', tool_name: 'WebSearch', tool_input: { query: 'a screenshot of x' } }));
  // mcp
  for (const n of ['mcp__x_Supabase__sql','mcp__x_playwright__click','mcp__x_Exa__search','mcp__x_Pencil__d',
    'mcp__x_Figma__d','mcp__linear__x','mcp__x_Calendar__x','mcp__Flomo__x','mcp__memory__search','mcp__weird__x'])
    see(o.ingest('tool', { session_id: 's', tool_name: n, tool_input: {} }));
  see(o.ingest('tool', { session_id: 's', tool_name: 'SomeRandomTool', tool_input: {} }));   // → mcp_tool
  // plan/question tools
  see(o.ingest('tool', { session_id: 's', tool_name: 'AskUserQuestion', tool_input: {} }));
  see(o.ingest('tool', { session_id: 's', tool_name: 'EnterPlanMode', tool_input: {} }));
  see(o.ingest('tool', { session_id: 's', tool_name: 'ExitPlanMode', tool_input: {} }));
}

// ── think inference: todo variants, research, stuck/confused, recall, debug, eureka ──
{
  const o = mk(); o.ingest('session_start', { session_id: 's' });
  see(o.ingest('tool', { session_id: 's', tool_name: 'TodoWrite', tool_input: { todos: [1] } }));           // plan (first)
  see(o.ingest('tool', { session_id: 's', tool_name: 'TodoWrite', tool_input: { todos: [1, 2, 3, 4, 5, 6] } })); // estimate (>=5)
  see(o.ingest('tool', { session_id: 's', tool_name: 'TodoWrite', tool_input: { todos: [1, 2, 3, 4, 5, 6, 7] } })); // idea (grew)
  see(o.ingest('tool', { session_id: 's', tool_name: 'TodoWrite', tool_input: { todos: [1, 2] } }));        // todo (shrank)
  // research: two consecutive webs
  o.ingest('tool', { session_id: 's', tool_name: 'WebSearch', tool_input: { query: 'a' } });
  see(o.ingest('tool', { session_id: 's', tool_name: 'WebFetch', tool_input: { url: 'https://x.com' } }));  // think_research
  see(o.ingest('tool', { session_id: 's', tool_name: 'Edit', tool_input: { file_path: 'x.ts', new_string: 'y' } })); // eureka
  // stuck/confused: same tool 5x (3rd = stuck, 4th+ = confused)
  for (let i = 0; i < 5; i++) see(o.ingest('tool', { session_id: 's', tool_name: 'Glob', tool_input: {} }));
  // recall
  see(o.ingest('tool', { session_id: 's', tool_name: 'mcp__x_memory__search', tool_input: {} }));
  // debug: fail then re-run tests
  o.ingest('tool', { session_id: 's', tool_name: 'Bash', tool_input: { command: 'npm test' }, tool_output: 'FAIL 2 errors' });
  see(o.ingest('tool', { session_id: 's', tool_name: 'Bash', tool_input: { command: 'npm test' } }));       // think_debug
  // fix after failure
  see(o.ingest('tool', { session_id: 's', tool_name: 'Edit', tool_input: { file_path: 'x.ts', new_string: 'fixed' } })); // edit_fix
  see(o.ingest('tool', { session_id: 's', tool_name: 'Read', tool_input: { file_path: 'x.ts' } }));         // read_error (lastFailed)
}

// ── reviewer role: read_review + think_review (alternates) ──
{
  const o = mk(); o.ingest('session_start', { session_id: 's' });
  o.ingest('subagent_spawn', { session_id: 's', tool_name: 'Agent', tool_input: { agent_type: 'code-reviewer' } });
  for (let i = 0; i < 4; i++) see(o.ingest('tool', { session_id: 's', agent_id: 'rv', agent_type: 'code-reviewer', tool_name: 'Read', tool_input: { file_path: `f${i}.ts` } }));
}

// ── zen: a lone idle sub (no partner to socialize with) sits long enough ──
{
  const o = mk(); o.ingest('session_start', { session_id: 's' });
  o.ingest('subagent_spawn', { session_id: 's', tool_name: 'Agent', tool_input: { prompt: 'x' } });
  o.ingest('tool', { session_id: 's', agent_id: 'lone', tool_name: 'Read', tool_input: {} });
  adv(46000); o.tick();
  for (let b = 0; b < 30; b++) { adv(20000); see(o.tick()); }   // long idle → zen flashes
}

// ── lifecycle: session sources, compact, stop progression ──
{
  for (const src of ['resume', 'clear', 'compact', 'startup']) { const o = mk(); see(o.ingest('session_start', { session_id: 's', source: src })); }
  { const o = mk(); o.ingest('session_start', { session_id: 's' }); adv(3000); see(o.tick()); }   // clockin → idle_boss
  const o = mk(); o.ingest('session_start', { session_id: 's' });
  see(o.ingest('compact', { session_id: 's' }));
  see(o.ingest('prompt', { session_id: 's' }));     // life_read_ask (1st)
  see(o.ingest('prompt', { session_id: 's' }));     // think_read_ask (2nd)
  see(o.ingest('stop', { session_id: 's' }));        // life_done
  adv(9000); see(o.tick());     // waiting
  adv(31000); see(o.tick());    // break
  adv(121000); see(o.tick());   // leave
  // overtime: very old session, finishes
  const o2 = mk(); o2.ingest('session_start', { session_id: 's' }); adv(31 * 60000);
  o2.ingest('stop', { session_id: 's' }); adv(9000); see(o2.tick());   // life_overtime
}

// ── delegate: spawn/assign/sync/brief/handoff/receive/review/wait ──
{
  const o = mk(); o.ingest('session_start', { session_id: 's' });
  see(o.ingest('subagent_spawn', { session_id: 's', tool_name: 'Agent', tool_input: { prompt: 'a' } }));   // del_spawn
  o.ingest('tool', { session_id: 's', agent_id: 'w1', tool_name: 'Read', tool_input: {} });
  see(o.ingest('subagent_spawn', { session_id: 's', tool_name: 'Agent', tool_input: { prompt: 'b' } }));   // del_assign
  adv(1600); see(o.tick());     // del_brief (main stuck on del_spawn? it's del_assign now) — also del_wait
  // blocked sub → del_sync on next spawn
  o.ingest('notification', { session_id: 's', agent_id: 'w1', notification_type: 'permission_prompt' });
  see(o.ingest('subagent_spawn', { session_id: 's', tool_name: 'Agent', tool_input: { prompt: 'c' } }));   // del_sync
  see(o.ingest('tool', { session_id: 's', tool_name: 'Agent', tool_input: {} }));                          // del_handoff (PostToolUse Agent in main)
  see(o.ingest('subagent_stop', { session_id: 's', agent_id: 'w1', exit_reason: 'completed' }));           // del_receive (main)
  see(o.ingest('tool', { session_id: 's', tool_name: 'Read', tool_input: { file_path: 'x.ts' } }));        // del_review (main reads after receive)
  adv(50000); see(o.tick());    // del_wait (idle main + active subs)
  // del_brief precisely
  const o2 = mk(); o2.ingest('session_start', { session_id: 's' });
  o2.ingest('subagent_spawn', { session_id: 's', tool_name: 'Agent', tool_input: { prompt: 'x' } });
  adv(1600); see(o2.tick());    // del_brief
}

// ── blocked subtypes ──
{
  const o = mk(); o.ingest('session_start', { session_id: 's' });
  see(o.ingest('notification', { session_id: 's', notification_type: 'permission_prompt' }));
  see(o.ingest('notification', { session_id: 's', message: 'Please confirm to proceed' }));
  see(o.ingest('notification', { session_id: 's', message: 'Which option do you want?' }));
  see(o.ingest('notification', { session_id: 's', message: 'Please provide input' }));
}

// ── react pools: many subs stopping completed/failed/cancelled ──
{
  const o = mk(); o.ingest('session_start', { session_id: 's' });
  for (let i = 0; i < 40; i++) {
    const id = `r${i}`;
    o.ingest('subagent_spawn', { session_id: 's', tool_name: 'Agent', tool_input: { prompt: 'x' } });
    o.ingest('tool', { session_id: 's', agent_id: id, tool_name: 'Read', tool_input: {} });
    const reason = ['completed', 'failed', 'cancelled'][i % 3];
    see(o.ingest('subagent_stop', { session_id: 's', agent_id: id, exit_reason: reason }));
    adv(2300); see(o.tick());   // react flash
    adv(2000); see(o.tick());   // removal
  }
}

// ── idle ambient (all 50) + social (all 26) + zen, across many agents/buckets ──
{
  const o = mk(); o.ingest('session_start', { session_id: 's' });
  const subIds = [];
  for (let i = 0; i < 24; i++) {
    const id = `s${i}`; subIds.push(id);
    o.ingest('subagent_spawn', { session_id: 's', tool_name: 'Agent', tool_input: { prompt: 'x' } });
    o.ingest('tool', { session_id: 's', agent_id: id, tool_name: 'Read', tool_input: {} });
  }
  adv(46000); see(o.tick());   // all drift to idle
  // rotate ambient across many buckets
  for (let b = 0; b < 80; b++) { adv(12000); see(o.tick()); }
  // zen: keep some idle very long (handled by long advances above)
}
// social: pairs need to not socialize-then-cooldown forever; use fresh offices per pair-batch
{
  for (let batch = 0; batch < 30; batch++) {
    const o = mk(); o.ingest('session_start', { session_id: 's' });
    for (let i = 0; i < 4; i++) {
      const id = `b${batch}_${i}`;
      o.ingest('subagent_spawn', { session_id: 's', tool_name: 'Agent', tool_input: { prompt: 'x' } });
      o.ingest('tool', { session_id: 's', agent_id: id, tool_name: 'Read', tool_input: {} });
    }
    adv(46000); o.tick();
    adv(9000); see(o.tick());    // pairs form
    adv(3000); see(o.tick());    // chat
  }
}


  const unreached = Object.keys(STATES).filter(id => !seen.has(id));
  assert.equal(unreached.length, 0, "unreached: "+unreached.join(", "));
  assert.ok(seen.size >= 247);
});
