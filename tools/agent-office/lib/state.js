// Agent Office — pure state machine.
//
// Ingests normalized Claude Code hook events and maintains an in-memory tree:
//   main agent (your Claude Code session) + subAgents (spawned via the Task tool).
// Each agent has a derived STATE (typing/reading/running/...) and a ZONE
// (boss/desk/infra/...) that the Phaser office scene maps to a position + animation.
//
// This module is pure & I/O-free so it can be unit-tested. The server (server.js)
// wires real HTTP/WS around it. Time is injected (nowFn) so tests are deterministic.

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
  Task:         { state: 'talking',   zone: 'whiteboard', verb: 'delegating' },
};

const DEFAULT_TOOL = { state: 'working', zone: 'desk', verb: 'working' };

// After this many ms with no event, an agent drifts to idle (goes to pantry/lounge).
const IDLE_AFTER_MS = 45_000;

function shortPath(p) {
  if (!p || typeof p !== 'string') return '';
  const parts = p.split('/').filter(Boolean);
  return parts.slice(-1)[0] || p;
}

/** Build a human bubble string from a tool name + its input payload. */
function describe(toolName, input) {
  const m = TOOL_MAP[toolName] || DEFAULT_TOOL;
  const inp = input || {};
  switch (toolName) {
    case 'Edit': case 'Write': case 'MultiEdit': case 'NotebookEdit':
      return inp.file_path ? `editing ${shortPath(inp.file_path)}` : m.verb;
    case 'Read':
      return inp.file_path ? `reading ${shortPath(inp.file_path)}` : m.verb;
    case 'Grep':
      return inp.pattern ? `grep "${String(inp.pattern).slice(0, 24)}"` : m.verb;
    case 'Bash':
      return inp.description ? String(inp.description).slice(0, 40) : m.verb;
    case 'WebSearch':
      return inp.query ? `searching "${String(inp.query).slice(0, 24)}"` : m.verb;
    case 'WebFetch':
      return inp.url ? `fetching ${shortPath(inp.url)}` : m.verb;
    case 'Task':
      return inp.description ? `delegating: ${String(inp.description).slice(0, 32)}` : m.verb;
    default:
      return m.verb;
  }
}

export class Office {
  constructor({ nowFn = () => Date.now(), ownerLabel = 'You' } = {}) {
    this.nowFn = nowFn;
    this.ownerLabel = ownerLabel;
    /** @type {Map<string, object>} id -> agent */
    this.agents = new Map();
    /** session_id -> agent id (for attributing tool events) */
    this.sessionToAgent = new Map();
    this._subCounter = 0;
    this._mainId = null;
  }

  _now() { return this.nowFn(); }

  _ensureMain(sessionId) {
    if (this._mainId && this.agents.has(this._mainId)) return this.agents.get(this._mainId);
    const id = sessionId || 'main';
    const agent = {
      id, kind: 'main', parentId: null, label: this.ownerLabel,
      state: 'idle', tool: null, zone: 'boss', detail: 'clocking in',
      since: this._now(), bornAt: this._now(),
    };
    this.agents.set(id, agent);
    if (sessionId) this.sessionToAgent.set(sessionId, id);
    this._mainId = id;
    return agent;
  }

  _agentForSession(sessionId) {
    if (sessionId && this.sessionToAgent.has(sessionId)) {
      return this.agents.get(this.sessionToAgent.get(sessionId));
    }
    return this._mainId ? this.agents.get(this._mainId) : null;
  }

  _setState(agent, { state, zone, detail, tool }) {
    if (!agent) return;
    agent.state = state;
    if (zone) agent.zone = zone;
    if (detail != null) agent.detail = detail;
    if (tool !== undefined) agent.tool = tool;
    agent.since = this._now();
  }

  /**
   * Ingest one normalized event.
   * @param {string} kind one of: session_start | tool | subagent_spawn | subagent_stop | stop | prompt
   * @param {object} payload the Claude Code hook JSON (session_id, tool_name, tool_input, ...)
   * @returns {object} the current world snapshot
   */
  ingest(kind, payload = {}) {
    const sid = payload.session_id;
    switch (kind) {
      case 'session_start': {
        const main = this._ensureMain(sid);
        this._setState(main, { state: 'idle', zone: 'boss', detail: 'at the desk', tool: null });
        break;
      }
      case 'prompt': {
        const main = this._ensureMain(sid);
        this._setState(main, { state: 'thinking', zone: 'boss', detail: 'reading the ask' });
        break;
      }
      case 'subagent_spawn': {
        const main = this._ensureMain(sid);
        // main walks to the whiteboard to hand off work
        this._setState(main, { state: 'talking', zone: 'whiteboard', detail: describe('Task', payload.tool_input), tool: 'Task' });
        // new worker enters and takes a desk
        const subId = `sub_${++this._subCounter}`;
        const desc = payload.tool_input?.description;
        const agent = {
          id: subId, kind: 'sub', parentId: main.id,
          label: desc ? String(desc).slice(0, 18) : `Agent ${this._subCounter}`,
          state: 'working', tool: null, zone: 'desk',
          detail: desc ? String(desc).slice(0, 32) : 'on a task',
          since: this._now(), bornAt: this._now(),
        };
        this.agents.set(subId, agent);
        break;
      }
      case 'tool': {
        const agent = this._agentForSession(sid);
        const name = payload.tool_name;
        if (name === 'Task') {
          // PostToolUse(Task) — handoff done, main returns to desk
          if (agent) this._setState(agent, { state: 'idle', zone: 'boss', detail: 'back at the desk', tool: 'Task' });
          break;
        }
        const m = TOOL_MAP[name] || DEFAULT_TOOL;
        this._setState(agent, { state: m.state, zone: m.zone, detail: describe(name, payload.tool_input), tool: name });
        break;
      }
      case 'subagent_stop': {
        // oldest still-working sub finishes & leaves (coarse v1: hooks don't tell us which)
        const sub = [...this.agents.values()]
          .filter(a => a.kind === 'sub' && a.state !== 'leaving')
          .sort((a, b) => a.bornAt - b.bornAt)[0];
        if (sub) this._setState(sub, { state: 'leaving', zone: 'lounge', detail: 'wrapping up' });
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

  /** Mark stale agents idle & remove fully-departed subs. Call on a timer. */
  tick() {
    const now = this._now();
    for (const agent of [...this.agents.values()]) {
      // remove a sub that has been 'leaving' for a bit
      if (agent.kind === 'sub' && agent.state === 'leaving' && now - agent.since > 4000) {
        this.agents.delete(agent.id);
        continue;
      }
      // drift active agents to idle after inactivity
      if (agent.state !== 'idle' && agent.state !== 'leaving' && now - agent.since > IDLE_AFTER_MS) {
        this._setState(agent, {
          state: 'idle',
          zone: agent.kind === 'main' ? 'boss' : 'pantry',
          detail: 'idle',
        });
      }
    }
    return this.snapshot();
  }

  snapshot() {
    return {
      t: this._now(),
      agents: [...this.agents.values()].map(a => ({
        id: a.id, kind: a.kind, parentId: a.parentId, label: a.label,
        state: a.state, zone: a.zone, detail: a.detail, tool: a.tool, since: a.since,
      })),
    };
  }
}

export { TOOL_MAP, DEFAULT_TOOL, describe, IDLE_AFTER_MS };
