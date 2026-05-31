// Agent Office — pure state machine.
//
// Maintains the agent tree (main + subAgents) and assigns each a fine-grained state
// from the ~247-entry catalog (states.js). Resolution has three layers:
//   1. resolveTool(tool, input, ctx)  — tool call → fine code/read/run/web/mcp state
//   2. inference (_infer)             — sequence/role/count signals → think/delegate/react
//   3. lifecycle wiring (ingest)      — SessionStart.source, PreCompact, Notification
//                                       subtype, SubagentStop exit → life/blocked/react
// Plus the 加戏 layer (idle ambient rotation + paired social), flagged fiction:true.
//
// Attribution by `agent_id`. Pure & I/O-free; time injected. See README / states.js.

import {
  resolveTool, getState, AMBIENT, SOCIAL, pickFrom,
  REACT_HAPPY, REACT_SAD, REACT_MEH, REACT_EUREKA, REACT_ZEN, REACT_CONFUSED,
} from './states.js';

const SPAWN_TOOLS = new Set(['Agent', 'Task']);
const REAL_ACTIVE = new Set(['code', 'read', 'run', 'web', 'think', 'delegate', 'mcp']);
const SPECIES = ['bear', 'cat', 'fox', 'capybara', 'bird', 'bunny', 'puppy', 'panda', 'hamster', 'penguin', 'frog'];
const ACCENTS = ['#d44820', '#7c5cd0', '#e8c020', '#3a7fd0', '#5a8f4a'];

const IDLE_AFTER_MS = 45_000;
const AMBIENT_ROTATE_MS = 12_000;
const SOCIAL_AFTER_MS = 8_000;
const SOCIAL_WALK_MS = 2_500;
const SOCIAL_CHAT_MS = 12_000;
const SOCIAL_TURN_MS = 3_000;
const SOCIAL_COOLDOWN_MS = 30_000;
const LEAVE_REMOVE_MS = 4_000;
const REACT_AT_MS = 2_200;        // departing sub flashes its reaction this long after stop
const BRIEF_AFTER_MS = 1_500;     // del_spawn → del_brief
const RECEIVE_WINDOW_MS = 6_000;  // main reads after a stop → del_review
const WAIT_AFTER_MS = 8_000;      // life_done → life_waiting_user
const BREAK_AFTER_MS = 30_000;    // → life_break
const LEAVE_AFTER_MS = 120_000;   // → life_leave
const OVERTIME_MS = 30 * 60_000;  // session this old + active → life_overtime
const ZEN_AFTER_MS = 60_000;      // idle this long → a moment of zen
const SOCIAL_LINES = ['这咖啡还行', '你那边忙完了？', '刚跑完一轮', '喝口水先', '今天活儿不少', '歇会儿~'];

function shortPath(p) { return !p ? '' : (String(p).split('/').filter(Boolean).slice(-1)[0] || p); }
function squash(s, n) { return String(s).replace(/\s+/g, ' ').trim().slice(0, n); }
function hashStr(s) { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
const fail = /error|fail|✗|exception|not ok|exit code [1-9]|cannot|denied/i;
const pass = /pass|✓|success|\bok\b|done|completed|0 failures/i;

function detailFor(toolName, input) {
  const inp = input || {};
  switch (toolName) {
    case 'Edit': case 'Write': case 'MultiEdit': case 'NotebookEdit':
      return inp.file_path ? `editing ${shortPath(inp.file_path)}` : null;
    case 'Read': return inp.file_path ? `reading ${shortPath(inp.file_path)}` : null;
    case 'Grep': return inp.pattern ? `grep "${squash(inp.pattern, 24)}"` : null;
    case 'Bash': return inp.description ? squash(inp.description, 40) : null;
    case 'WebSearch': return inp.query ? `searching "${squash(inp.query, 24)}"` : null;
    case 'WebFetch': return inp.url ? `fetching ${shortPath(inp.url)}` : null;
    case 'Agent': case 'Task': {
      const who = inp.agent_type ? `${inp.agent_type}: ` : '';
      const body = inp.prompt || inp.description || '';
      return body ? `delegating ${who}${squash(body, 28)}` : (inp.agent_type ? `delegating to ${inp.agent_type}` : null);
    }
    default: return null;
  }
}
export function describe(toolName, input) {
  return detailFor(toolName, input) ?? getState(resolveTool(toolName, input)).verb;
}

export class Office {
  constructor({ nowFn = () => Date.now(), ownerLabel = 'You', ownerSpecies = 'bear' } = {}) {
    this.nowFn = nowFn;
    this.ownerLabel = ownerLabel;
    this.ownerSpecies = ownerSpecies;
    this.agents = new Map();
    this.seenFiles = new Set();
    this._subCounter = 0;
    this._provCounter = 0;
    this._mainId = null;
    this._socIdx = 0; this._rH = 0; this._rS = 0; this._rM = 0;   // rotating pickers
  }

  _now() { return this.nowFn(); }
  _speciesFor(seed) { return SPECIES[hashStr(String(seed)) % SPECIES.length]; }
  _accentFor(seed) { return ACCENTS[hashStr(String(seed)) % ACCENTS.length]; }

  _apply(agent, stateId, detail) {
    if (!agent) return;
    const d = getState(stateId);
    agent.stateId = stateId; agent.cat = d.cat; agent.emoji = d.emoji;
    agent.zone = d.zone; agent.anim = d.anim; agent.fiction = d.fiction;
    agent.detail = detail != null ? detail : d.verb;
    agent.since = this._now();
    agent._reactUntil = null;
    if (!d.fiction) { agent.socialPhase = null; agent.partner = null; agent.speaking = false; }
  }
  _flashReact(agent, stateId) {   // transient mood spike, reverts to ambient on tick
    this._apply(agent, stateId);
    agent._reactUntil = this._now() + REACT_AT_MS;
    agent.idleSince = agent.idleSince ?? this._now();
  }

  _ensureMain(sessionId) {
    if (this._mainId && this.agents.has(this._mainId)) return this.agents.get(this._mainId);
    const id = sessionId || 'main';
    const a = { id, kind: 'main', parentId: null, label: this.ownerLabel, agentType: null,
      species: this.ownerSpecies, accent: '#d8b048', bornAt: this._now(), hist: [] };
    this.agents.set(id, a); this._mainId = id;
    this._apply(a, 'life_clockin');
    return a;
  }
  _newSub(id, { provisional, agentType, detail }) {
    this._subCounter++;
    const seed = agentType || id;
    const a = { id, kind: 'sub', parentId: this._mainId, provisional: !!provisional,
      label: agentType || `Agent ${this._subCounter}`, agentType: agentType || null,
      species: this._speciesFor(seed), accent: this._accentFor(seed), bornAt: this._now(), hist: [] };
    this.agents.set(id, a);
    this._apply(a, 'life_startup', detail);
    return a;
  }
  _createProvisional(agentType, detail) {
    return this._newSub(`pending_${++this._provCounter}`, { provisional: true, agentType, detail });
  }
  _bindOrCreateSub(agentId, agentType) {
    if (this.agents.has(agentId)) {
      const a = this.agents.get(agentId);
      if (agentType && !a.agentType) { a.agentType = agentType; a.label = agentType; a.species = this._speciesFor(agentType); a.accent = this._accentFor(agentType); }
      return a;
    }
    const prov = [...this.agents.values()].filter(a => a.kind === 'sub' && a.provisional && !a.departing).sort((a, b) => a.bornAt - b.bornAt)[0];
    if (prov) {
      this.agents.delete(prov.id); prov.id = agentId; prov.provisional = false;
      if (agentType) { prov.agentType = agentType; prov.label = agentType; prov.species = this._speciesFor(agentType); prov.accent = this._accentFor(agentType); }
      this.agents.set(agentId, prov); return prov;
    }
    return this._newSub(agentId, { provisional: false, agentType });
  }

  _activeSubs() {
    return [...this.agents.values()].filter(a => a.kind === 'sub' && !a.departing && a.cat !== 'life');
  }

  // Inference: refine a resolved tool state using sequence/role/count signals.
  _infer(agent, id, name, input) {
    const cat = getState(id).cat;
    // TodoWrite flavor: plan (first) → estimate (first big list) → idea (grew) → todo
    if (name === 'TodoWrite') {
      const n = Array.isArray(input?.todos) ? input.todos.length : null;
      const prev = agent._todoCount ?? 0; const first = agent._todoSeen !== true;
      agent._todoCount = n ?? prev; agent._todoSeen = true;
      if (first) return 'think_plan';
      if (n != null && n >= 5 && !agent._estimated) { agent._estimated = true; return 'think_estimate'; }
      if (n != null && n > prev) return 'think_idea';
      return 'think_todo';
    }
    if (/memory|recall/i.test(name)) return 'think_recall';
    if (cat === 'web' && (agent._webStreak ?? 0) >= 1) { agent._wasResearching = true; return 'think_research'; }
    if (cat === 'code' && agent._wasResearching) { agent._wasResearching = false; return REACT_EUREKA; }
    if (id === 'run_test' && agent._lastFailed) return 'think_debug';
    // consecutive repeats of the same resolved state: 3rd = stuck, 4th+ = confusion
    const rep = agent._lastResolved === id ? (agent._repeat = (agent._repeat || 1) + 1) : (agent._repeat = 1);
    agent._lastResolved = id;
    if (rep >= 4) return REACT_CONFUSED;
    if (rep === 3) return 'think_stuck';
    // a reviewer reading code: alternate the literal read vs a "reviewing" beat
    if (cat === 'read' && /review|audit/i.test(agent.agentType || '')) {
      return (agent.hist.length % 2) ? 'think_review' : id;   // id is already read_review
    }
    return id;
  }

  _track(agent, id, name, input, payload) {
    const cat = getState(id).cat;
    agent.hist.push(id); if (agent.hist.length > 6) agent.hist.shift();
    agent._webStreak = cat === 'web' ? (agent._webStreak ?? 0) + 1 : 0;
    if (name === 'Write' && input?.file_path) this.seenFiles.add(input.file_path);
    if (name === 'Edit' && input?.file_path) this.seenFiles.add(input.file_path);
    const out = payload?.tool_output;
    if (out != null) { if (fail.test(out)) agent._lastFailed = true; else if (pass.test(out)) agent._lastFailed = false; }
    else if (id === 'read_error') agent._lastFailed = true;
  }

  ingest(kind, payload = {}) {
    const sid = payload.session_id;
    const aid = payload.agent_id || null;
    const atype = payload.agent_type || null;

    switch (kind) {
      case 'session_start': {
        const main = this._ensureMain(sid);
        const src = payload.source;
        this._apply(main, src === 'resume' ? 'life_resume' : src === 'clear' ? 'life_return' : src === 'compact' ? 'life_compact' : 'life_clockin');
        break;
      }
      case 'compact':
        this._apply(this._ensureMain(sid), 'life_compact');
        break;
      case 'prompt': {
        const main = this._ensureMain(sid);
        main._prompts = (main._prompts ?? 0) + 1;
        this._apply(main, main._prompts > 1 ? 'think_read_ask' : 'life_read_ask');
        break;
      }
      case 'subagent_spawn': {
        const main = this._ensureMain(sid);
        const inp = payload.tool_input || {};
        const actives = this._activeSubs();
        const blocked = actives.some(a => a.cat === 'blocked');
        this._apply(main, blocked ? 'del_sync' : actives.length ? 'del_assign' : 'del_spawn', describe('Agent', inp));
        main._spawnedAt = this._now();
        this._createProvisional(inp.agent_type, inp.prompt ? squash(inp.prompt, 32) : null);
        break;
      }
      case 'subagent_start':
        if (aid) this._apply(this._bindOrCreateSub(aid, atype), 'life_startup');
        break;
      case 'metrics': {   // desktop-only: per-agent tokens/tools/result from transcript tail
        if (!aid) break;
        const a = this._bindOrCreateSub(aid, atype);
        a.metrics = {
          tools: payload.tools ?? 0, byTool: payload.byTool ?? {},
          inTokens: payload.inTokens ?? 0, outTokens: payload.outTokens ?? 0,
          model: payload.model ?? null, result: payload.result ?? null,
          durationMs: payload.durationMs ?? 0,
        };
        break;
      }
      case 'tool': {
        const name = payload.tool_name;
        if (aid) {
          const sub = this._bindOrCreateSub(aid, atype);
          if (SPAWN_TOOLS.has(name)) break;
          const ctx = { role: sub.agentType, lastFailed: sub._lastFailed, seenFiles: this.seenFiles };
          const id = this._infer(sub, resolveTool(name, payload.tool_input, ctx), name, payload.tool_input);
          this._apply(sub, id, describe(name, payload.tool_input));
          this._track(sub, id, name, payload.tool_input, payload);
        } else {
          const main = this._ensureMain(sid);
          if (SPAWN_TOOLS.has(name)) { this._apply(main, 'del_handoff', 'handing off'); break; }
          const ctx = { role: main.agentType, lastFailed: main._lastFailed, seenFiles: this.seenFiles };
          let id = this._infer(main, resolveTool(name, payload.tool_input, ctx), name, payload.tool_input);
          // main reading shortly after a sub reported back = reviewing their work
          if (getState(id).cat === 'read' && main._receivedAt && this._now() - main._receivedAt < RECEIVE_WINDOW_MS) id = 'del_review';
          this._apply(main, id, describe(name, payload.tool_input));
          this._track(main, id, name, payload.tool_input, payload);
        }
        break;
      }
      case 'notification': {
        const target = aid ? this._bindOrCreateSub(aid, atype) : this._ensureMain(sid);
        const msg = String(payload.message || '').toLowerCase();
        const id = payload.notification_type === 'permission_prompt' ? 'blocked_perm'
          : /confirm|sure|proceed|y\/n/.test(msg) ? 'blocked_confirm'
          : /choose|select|option|which|decision/.test(msg) ? 'blocked_choice'
          : 'blocked_input';
        this._apply(target, id);
        break;
      }
      case 'subagent_stop': {
        let sub = aid && this.agents.get(aid);
        if (!sub) sub = [...this.agents.values()].filter(a => a.kind === 'sub' && !a.departing).sort((a, b) => a.bornAt - b.bornAt)[0];
        if (sub) {
          const r = payload.exit_reason;
          this._apply(sub, r === 'failed' ? 'life_failed' : r === 'cancelled' ? 'life_cancelled' : 'life_handback');
          sub.departing = true; sub.exitReason = r || 'completed'; sub._stopAt = this._now();
          sub._reactPending = r === 'failed' ? REACT_SAD[this._rS++ % REACT_SAD.length]
            : r === 'cancelled' ? REACT_MEH[this._rM++ % REACT_MEH.length]
            : REACT_HAPPY[this._rH++ % REACT_HAPPY.length];
          const main = this._mainId && this.agents.get(this._mainId);
          if (main) { this._apply(main, 'del_receive'); main._receivedAt = this._now(); }
        }
        break;
      }
      case 'stop':
        if (this._mainId && this.agents.get(this._mainId)) this._apply(this.agents.get(this._mainId), 'life_done');
        break;
      default:
        break;
    }
    return this.snapshot();
  }

  tick() {
    const now = this._now();
    for (const a of [...this.agents.values()]) {
      // departing subs: flash their reaction, then remove (both keyed off _stopAt)
      if (a.departing) {
        const since = now - (a._stopAt ?? a.since);
        if (a._reactPending && since > REACT_AT_MS) { this._apply(a, a._reactPending); a._reactPending = null; a.departing = true; }
        if (since > LEAVE_REMOVE_MS) this.agents.delete(a.id);
        continue;
      }
      // transient mood spikes revert to ambient
      if (a._reactUntil && now >= a._reactUntil) { a._reactUntil = null; a.idleSince = now; this._apply(a, pickFrom(AMBIENT, a.id)); a.idleSince = now; }
      // main lifecycle: after finishing, drift through waiting → break → leave (+overtime)
      if (a.kind === 'main') {
        const old = now - a.bornAt > OVERTIME_MS;
        if (a.stateId === 'life_clockin' && now - a.since > 2_000) this._apply(a, 'life_idle_boss');
        if (a.stateId === 'life_done' && now - a.since > WAIT_AFTER_MS) this._apply(a, old ? 'life_overtime' : 'life_waiting_user');
        else if (a.stateId === 'life_waiting_user' && now - a.since > BREAK_AFTER_MS) this._apply(a, 'life_break');
        else if (a.stateId === 'life_break' && now - a.since > LEAVE_AFTER_MS) this._apply(a, 'life_leave');
        // waiting on teammates while idle
        if ((a.cat === 'life' || a.cat === 'idle') && this._activeSubs().length) this._apply(a, 'del_wait');
        else if (a.stateId === 'del_spawn' && now - (a._spawnedAt ?? now) > BRIEF_AFTER_MS) this._apply(a, 'del_brief');
      }
      // real-active but stale → drift into idle/ambient
      if (REAL_ACTIVE.has(a.cat) && now - a.since > IDLE_AFTER_MS) { a.idleSince = now; this._apply(a, pickFrom(AMBIENT, a.id)); }
      // long idle → a beat of zen, else rotate ambient activity
      if (a.cat === 'idle' && !a.socialPhase) {
        if (now - (a.idleSince ?? a.since) > ZEN_AFTER_MS && (hashStr(a.id + Math.floor(now / ZEN_AFTER_MS)) % 3 === 0)) {
          this._flashReact(a, REACT_ZEN);
        } else {
          const id = pickFrom(AMBIENT, `${a.id}:${Math.floor(now / AMBIENT_ROTATE_MS)}`);
          if (id !== a.stateId) { const keep = a.idleSince; this._apply(a, id); a.idleSince = keep; }
        }
      }
    }
    this._socialize(now);
    return this.snapshot();
  }

  _socialize(now) {
    for (const a of this.agents.values()) {
      if (!a.socialPhase) continue;
      if (now >= a.socialPhaseEndsAt) {
        if (a.socialPhase === 'walk-in') { a.socialPhase = 'chat'; a.chatStartAt = now; a.socialPhaseEndsAt = now + SOCIAL_CHAT_MS; a.anim = 'wave'; }
        else if (a.socialPhase === 'chat') { a.socialPhase = 'walk-out'; a.zone = 'desk'; a.anim = 'walk'; a.detail = 'heading back'; a.speaking = false; a.socialPhaseEndsAt = now + SOCIAL_WALK_MS; }
        else { a.socialPhase = null; a.partner = null; a.speaking = false; a.socialCooldownUntil = now + SOCIAL_COOLDOWN_MS; a.idleSince = now; this._apply(a, pickFrom(AMBIENT, a.id)); a.idleSince = now; continue; }
      }
      if (a.socialPhase === 'chat') { const turn = Math.floor((now - a.chatStartAt) / SOCIAL_TURN_MS); a.speaking = (turn % 2) === a.socialSeat; a.detail = a.speaking ? SOCIAL_LINES[turn % SOCIAL_LINES.length] : '…'; }
    }
    const eligible = [...this.agents.values()]
      .filter(a => a.kind === 'sub' && a.cat === 'idle' && !a.socialPhase && now - (a.idleSince ?? a.since) > SOCIAL_AFTER_MS && (a.socialCooldownUntil ?? 0) <= now)
      .sort((a, b) => a.bornAt - b.bornAt);
    for (let i = 0; i + 1 < eligible.length; i += 2) {
      const pair = [eligible[i], eligible[i + 1]];
      const soc = getState(SOCIAL[this._socIdx++ % SOCIAL.length]);
      pair.forEach((p, seat) => {
        p.cat = 'social'; p.stateId = soc.id; p.emoji = soc.emoji; p.fiction = true; p.zone = soc.zone; p.anim = 'walk';
        p.partner = pair[1 - seat].id; p.socialSeat = seat; p.socialPhase = 'walk-in'; p.socialPhaseEndsAt = now + SOCIAL_WALK_MS;
        p.speaking = false; p.detail = 'heading over'; p.since = now;
      });
    }
  }

  snapshot() {
    return {
      t: this._now(),
      agents: [...this.agents.values()].map(a => ({
        id: a.id, kind: a.kind, parentId: a.parentId, label: a.label, agentType: a.agentType ?? null,
        species: a.species, accent: a.accent, state: a.stateId, cat: a.cat, emoji: a.emoji,
        anim: a.anim, zone: a.zone, detail: a.detail, fiction: !!a.fiction, speaking: !!a.speaking,
        socialPhase: a.socialPhase ?? null, partner: a.partner ?? null, exitReason: a.exitReason ?? null,
        metrics: a.metrics ?? null, since: a.since,
      })),
    };
  }
}

export { IDLE_AFTER_MS, SOCIAL_AFTER_MS, SPECIES };
