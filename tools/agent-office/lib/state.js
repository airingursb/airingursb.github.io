// Agent Office — pure state machine.
//
// Ingests normalized Claude Code hook events and maintains an in-memory tree:
//   main agent (your Claude Code session) + subAgents (spawned via the Agent/Task tool).
// Each agent has a derived STATE (typing/reading/running/...) and a ZONE
// (boss/desk/infra/...) that the Phaser office scene maps to a position + animation.
//
// REAL vs FICTION — this matters, keep it honest:
//   • REAL states come straight from hooks (typing/reading/running/searching/thinking/
//     talking/working/blocked/leaving/idle). Attribution is by `agent_id` (present in
//     hook payloads fired INSIDE a subagent; absent for main-agent events).
//   • FICTION is the "加戏" layer: when a subAgent sits idle we make it wander off to
//     socialize for liveliness. Real Claude Code subagents do NOT talk to each other
//     (star topology — sub↔sub communication doesn't exist on one machine). Any such
//     behavior is charm, NOT data, and is flagged `fiction:true` in the snapshot.
//
// Pure & I/O-free so it can be unit-tested. Time is injected (nowFn).
//
// Hook field facts (verified against Claude Code docs):
//   - Spawn tool is `Agent` (renamed from `Task` in v2.1.63; old alias still works).
//   - Its tool_input carries `prompt` (freeform) + optional `agent_type` — NOT `description`.
//   - Sub tool/stop events carry `agent_id` + `agent_type`; main events carry neither.
//   - SubagentStop carries `agent_id` + `exit_reason` (completed|failed|cancelled).
//   - Notification {notification_type:'permission_prompt'} = blocked on user approval.
//   - The sub's actual RESULT text is NOT in any hook → needs transcript_path tail (v1.1).

const SPAWN_TOOLS = new Set(['Agent', 'Task']);

/** Tool name -> { state, zone, verb } used for the speech bubble. */
const TOOL_MAP = {
  Edit:         { state: 'typing',    zone: 'desk',       verb: 'writing code' },
  Write:        { state: 'typing',    zone: 'desk',       verb: 'writing code' },
  MultiEdit:    { state: 'typing',    zone: 'desk',       verb: 'writing code' },
  NotebookEdit: { state: 'typing',    zone: 'desk',       verb: 'editing notebook' },
  Read:         { state: 'reading',   zone: 'desk',       verb: 'reading files' },
  Grep:         { state: 'reading',   zone: 'desk',       verb: 'searching code' },
  Glob:         { state: 'reading',   zone: 'desk',       verb: 'finding files' },
  Bash:         { state: 'running',   zone: 'infra',      verb: 'running commands' },
  BashOutput:   { state: 'running',   zone: 'infra',      verb: 'watching output' },
  WebSearch:    { state: 'searching', zone: 'desk',       verb: 'searching the web' },
  WebFetch:     { state: 'searching', zone: 'desk',       verb: 'reading a page' },
  TodoWrite:    { state: 'thinking',  zone: 'desk',       verb: 'planning' },
  Agent:        { state: 'talking',   zone: 'whiteboard', verb: 'delegating' },
  Task:         { state: 'talking',   zone: 'whiteboard', verb: 'delegating' },
};

const DEFAULT_TOOL = { state: 'working', zone: 'desk', verb: 'working' };

const IDLE_AFTER_MS = 45_000;   // no event this long → drift to idle
const SOCIAL_AFTER_MS = 8_000;  // idle this long → 加戏: wander off to socialize (FICTION)
const LEAVE_REMOVE_MS = 4_000;  // 'leaving' this long → remove from the floor

function shortPath(p) {
  if (!p || typeof p !== 'string') return '';
  const parts = p.split('/').filter(Boolean);
  return parts.slice(-1)[0] || p;
}
function squash(s, n) { return String(s).replace(/\s+/g, ' ').trim().slice(0, n); }

/** Human bubble string from a tool name + its input payload. */
function describe(toolName, input) {
  const m = TOOL_MAP[toolName] || DEFAULT_TOOL;
  const inp = input || {};
  switch (toolName) {
    case 'Edit': case 'Write': case 'MultiEdit': case 'NotebookEdit':
      return inp.file_path ? `editing ${shortPath(inp.file_path)}` : m.verb;
    case 'Read':
      return inp.file_path ? `reading ${shortPath(inp.file_path)}` : m.verb;
    case 'Grep':
      return inp.pattern ? `grep "${squash(inp.pattern, 24)}"` : m.verb;
    case 'Bash':
      return inp.description ? squash(inp.description, 40) : m.verb;
    case 'WebSearch':
      return inp.query ? `searching "${squash(inp.query, 24)}"` : m.verb;
    case 'WebFetch':
      return inp.url ? `fetching ${shortPath(inp.url)}` : m.verb;
    case 'Agent': case 'Task': {
      // real delegation channel is the freeform `prompt`; `agent_type` is the role
      const who = inp.agent_type ? `${inp.agent_type}: ` : '';
      const body = inp.prompt || inp.description || '';
      return body ? `delegating ${who}${squash(body, 28)}`
                  : (inp.agent_type ? `delegating to ${inp.agent_type}` : m.verb);
    }
    default:
      return m.verb;
  }
}

export class Office {
  constructor({ nowFn = () => Date.now(), ownerLabel = 'You' } = {}) {
    this.nowFn = nowFn;
    this.ownerLabel = ownerLabel;
    this.agents = new Map();   // id -> agent
    this._subCounter = 0;
    this._provCounter = 0;
    this._mainId = null;
  }

  _now() { return this.nowFn(); }

  _ensureMain(sessionId) {
    if (this._mainId && this.agents.has(this._mainId)) return this.agents.get(this._mainId);
    const id = sessionId || 'main';
    const agent = {
      id, kind: 'main', parentId: null, label: this.ownerLabel, agentType: null,
      state: 'idle', tool: null, zone: 'boss', detail: 'clocking in',
      fiction: false, since: this._now(), bornAt: this._now(),
    };
    this.agents.set(id, agent);
    this._mainId = id;
    return agent;
  }

  // A provisional sub appears the instant main delegates (PreToolUse Agent), before
  // we know the real agent_id. It gets bound to a real agent_id on the sub's first
  // hook event (or stopped via fallback if agent_id never arrives).
  _createProvisional(agentType, detail) {
    const id = `pending_${++this._provCounter}`;
    this._subCounter++;
    const a = {
      id, kind: 'sub', parentId: this._mainId, provisional: true,
      label: agentType || `Agent ${this._subCounter}`, agentType: agentType || null,
      state: 'working', tool: null, zone: 'desk', detail: detail || 'starting up',
      fiction: false, since: this._now(), bornAt: this._now(),
    };
    this.agents.set(id, a);
    return a;
  }

  // Resolve the sub for an agent_id: return existing, else bind the oldest unbound
  // provisional to it, else create fresh. Keeps one character per real subagent.
  _bindOrCreateSub(agentId, agentType) {
    if (this.agents.has(agentId)) {
      const a = this.agents.get(agentId);
      if (agentType && !a.agentType) { a.agentType = agentType; a.label = agentType; }
      return a;
    }
    const prov = [...this.agents.values()]
      .filter(a => a.kind === 'sub' && a.provisional && a.state !== 'leaving')
      .sort((a, b) => a.bornAt - b.bornAt)[0];
    if (prov) {
      this.agents.delete(prov.id);
      prov.id = agentId; prov.provisional = false;
      if (agentType) { prov.agentType = agentType; prov.label = agentType; }
      this.agents.set(agentId, prov);
      return prov;
    }
    this._subCounter++;
    const a = {
      id: agentId, kind: 'sub', parentId: this._mainId, provisional: false,
      label: agentType || `Agent ${this._subCounter}`, agentType: agentType || null,
      state: 'working', tool: null, zone: 'desk', detail: 'starting up',
      fiction: false, since: this._now(), bornAt: this._now(),
    };
    this.agents.set(agentId, a);
    return a;
  }

  _setState(agent, { state, zone, detail, tool }) {
    if (!agent) return;
    agent.state = state;
    if (zone) agent.zone = zone;
    if (detail != null) agent.detail = detail;
    if (tool !== undefined) agent.tool = tool;
    agent.fiction = false;     // any real event cancels the 加戏 layer
    agent.since = this._now();
  }

  /**
   * Ingest one normalized event.
   * @param {string} kind session_start | prompt | subagent_spawn | subagent_start
   *                       | tool | notification | subagent_stop | stop
   * @param {object} payload Claude Code hook JSON (session_id, agent_id, agent_type,
   *                         tool_name, tool_input, notification_type, exit_reason, ...)
   */
  ingest(kind, payload = {}) {
    const sid = payload.session_id;
    const aid = payload.agent_id || null;   // present only INSIDE a subagent
    const atype = payload.agent_type || null;

    switch (kind) {
      case 'session_start': {
        const main = this._ensureMain(sid);
        this._setState(main, { state: 'idle', zone: 'boss', detail: 'at the desk', tool: null });
        break;
      }
      case 'prompt': {
        this._setState(this._ensureMain(sid), { state: 'thinking', zone: 'boss', detail: 'reading the ask' });
        break;
      }
      case 'subagent_spawn': {   // PreToolUse(Agent|Task), fires in MAIN — no agent_id yet
        const main = this._ensureMain(sid);
        const inp = payload.tool_input || {};
        this._setState(main, { state: 'talking', zone: 'whiteboard', detail: describe('Agent', inp), tool: 'Agent' });
        this._createProvisional(inp.agent_type, inp.prompt ? squash(inp.prompt, 32) : 'on a task');
        break;
      }
      case 'subagent_start': {   // optional, if wired — carries the real agent_id
        if (aid) this._setState(this._bindOrCreateSub(aid, atype), { state: 'working', zone: 'desk', detail: 'starting up' });
        break;
      }
      case 'tool': {
        const name = payload.tool_name;
        if (aid) {
          // event from INSIDE a subagent → attribute precisely
          const sub = this._bindOrCreateSub(aid, atype);
          if (SPAWN_TOOLS.has(name)) break;   // subs can't spawn; ignore if it ever appears
          const m = TOOL_MAP[name] || DEFAULT_TOOL;
          this._setState(sub, { state: m.state, zone: m.zone, detail: describe(name, payload.tool_input), tool: name });
        } else {
          // main-agent event
          const main = this._ensureMain(sid);
          if (SPAWN_TOOLS.has(name)) {        // PostToolUse(Agent) — handoff done, back to desk
            this._setState(main, { state: 'idle', zone: 'boss', detail: 'back at the desk', tool: name });
          } else {
            const m = TOOL_MAP[name] || DEFAULT_TOOL;
            this._setState(main, { state: m.state, zone: m.zone, detail: describe(name, payload.tool_input), tool: name });
          }
        }
        break;
      }
      case 'notification': {
        if (payload.notification_type === 'permission_prompt') {
          const target = aid ? this._bindOrCreateSub(aid, atype) : this._ensureMain(sid);
          this._setState(target, { state: 'blocked', detail: 'waiting for your approval' });
        }
        break;
      }
      case 'subagent_stop': {
        let sub = aid && this.agents.get(aid);
        if (!sub) {   // fallback (agent_id absent in payload): oldest live sub leaves
          sub = [...this.agents.values()]
            .filter(a => a.kind === 'sub' && a.state !== 'leaving')
            .sort((a, b) => a.bornAt - b.bornAt)[0];
        }
        if (sub) {
          const r = payload.exit_reason;
          const detail = r === 'failed' ? 'failed ✗' : r === 'cancelled' ? 'cancelled' : 'done ✓';
          this._setState(sub, { state: 'leaving', zone: 'lounge', detail });
          sub.exitReason = r || 'completed';
        }
        break;
      }
      case 'stop': {
        const main = this._mainId ? this.agents.get(this._mainId) : null;
        if (main) this._setState(main, { state: 'idle', zone: 'lounge', detail: 'taking a break' });
        break;
      }
      default:
        break;
    }
    return this.snapshot();
  }

  /** Maintenance + the 加戏 social layer. Call on a timer. */
  tick() {
    const now = this._now();
    for (const agent of [...this.agents.values()]) {
      if (agent.kind === 'sub' && agent.state === 'leaving' && now - agent.since > LEAVE_REMOVE_MS) {
        this.agents.delete(agent.id);
        continue;
      }
      // drift real-active agents to idle after inactivity (skip blocked — that's a real wait)
      if (!['idle', 'leaving', 'blocked'].includes(agent.state) && !agent.fiction
          && now - agent.since > IDLE_AFTER_MS) {
        this._setState(agent, { state: 'idle', zone: agent.kind === 'main' ? 'boss' : 'pantry', detail: 'idle' });
      }
    }
    this._socialize(now);
    return this.snapshot();
  }

  // FICTION (加戏): subs that have been idle a while wander off to "socialize" so the
  // office feels alive. This is NOT real agent behavior — flagged fiction:true.
  // Deterministic (no RNG) so it's testable: pair idle subs, alternate spot.
  _socialize(now) {
    const idleSubs = [...this.agents.values()]
      .filter(a => a.kind === 'sub' && a.state === 'idle' && !a.fiction && now - a.since > SOCIAL_AFTER_MS)
      .sort((a, b) => a.bornAt - b.bornAt);
    const SPOTS = ['pantry', 'whiteboard'];
    const VERBS = ['chatting ☕', 'comparing notes', 'taking a break'];
    for (let i = 0; i < idleSubs.length; i++) {
      const a = idleSubs[i];
      a.state = 'chatting';
      a.zone = SPOTS[Math.floor(i / 2) % SPOTS.length];   // pairs share a spot
      a.detail = VERBS[i % VERBS.length];
      a.fiction = true;
      a.partner = idleSubs[i % 2 === 0 ? i + 1 : i - 1]?.id ?? null;
      a.since = now;
    }
  }

  snapshot() {
    return {
      t: this._now(),
      agents: [...this.agents.values()].map(a => ({
        id: a.id, kind: a.kind, parentId: a.parentId, label: a.label,
        agentType: a.agentType ?? null, state: a.state, zone: a.zone,
        detail: a.detail, tool: a.tool, fiction: !!a.fiction,
        partner: a.partner ?? null, exitReason: a.exitReason ?? null, since: a.since,
      })),
    };
  }
}

export { TOOL_MAP, DEFAULT_TOOL, describe, IDLE_AFTER_MS, SOCIAL_AFTER_MS };
