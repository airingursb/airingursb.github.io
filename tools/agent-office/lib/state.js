// Agent Office — pure state machine.
//
// Maintains the agent tree (main + subAgents) and assigns each a fine-grained STATE
// from the ~240-entry catalog in states.js. State carries: stateId, cat (category →
// color), emoji, zone, anim (bear.ts BearState), and fiction (REAL vs 加戏).
//
// Attribution is by `agent_id` (present inside a subagent, absent for main). The 加戏
// layer (idle ambient + paired social) is flagged fiction:true and any real hook event
// instantly pulls a character back to a real state.
//
// Pure & I/O-free; time injected (nowFn). Hook field facts: see states.js / README.

import { resolveTool, getState, AMBIENT, SOCIAL, REACT, pickFrom } from './states.js';

const SPAWN_TOOLS = new Set(['Agent', 'Task']);
const REAL_ACTIVE = new Set(['code', 'read', 'run', 'web', 'think', 'delegate', 'mcp']);

// matches src/lounge/config.ts SPECIES so characters port straight to bear.ts
const SPECIES = ['bear', 'cat', 'fox', 'capybara', 'bird', 'bunny', 'puppy', 'panda', 'hamster', 'penguin', 'frog'];
const ACCENTS = ['#d44820', '#7c5cd0', '#e8c020', '#3a7fd0', '#5a8f4a'];

const IDLE_AFTER_MS = 45_000;     // real-active + stale → drift to idle/ambient
const AMBIENT_ROTATE_MS = 12_000; // idle agents change their ambient activity this often
const SOCIAL_AFTER_MS = 8_000;    // idle this long → eligible to socialize (FICTION)
const SOCIAL_WALK_MS = 2_500;
const SOCIAL_CHAT_MS = 12_000;
const SOCIAL_TURN_MS = 3_000;
const SOCIAL_COOLDOWN_MS = 30_000;
const LEAVE_REMOVE_MS = 4_000;
const SOCIAL_LINES = ['这咖啡还行', '你那边忙完了？', '刚跑完一轮', '喝口水先', '今天活儿不少', '歇会儿~'];

function shortPath(p) { return !p ? '' : (String(p).split('/').filter(Boolean).slice(-1)[0] || p); }
function squash(s, n) { return String(s).replace(/\s+/g, ' ').trim().slice(0, n); }
function hashStr(s) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}

// Concrete, context-specific bubble text (file/cmd names). null → use the state's verb.
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
/** Bubble text for a tool call — concrete if possible, else the state's default verb. */
export function describe(toolName, input) {
  return detailFor(toolName, input) ?? getState(resolveTool(toolName, input)).verb;
}

export class Office {
  constructor({ nowFn = () => Date.now(), ownerLabel = 'You', ownerSpecies = 'bear' } = {}) {
    this.nowFn = nowFn;
    this.ownerLabel = ownerLabel;
    this.ownerSpecies = ownerSpecies;
    this.agents = new Map();
    this._subCounter = 0;
    this._provCounter = 0;
    this._mainId = null;
  }

  _now() { return this.nowFn(); }
  _speciesFor(seed) { return SPECIES[hashStr(String(seed)) % SPECIES.length]; }
  _accentFor(seed) { return ACCENTS[hashStr(String(seed)) % ACCENTS.length]; }

  // Apply a state from the catalog. Concrete `detail` overrides the state's verb.
  _apply(agent, stateId, detail) {
    if (!agent) return;
    const d = getState(stateId);
    agent.stateId = stateId; agent.cat = d.cat; agent.emoji = d.emoji;
    agent.zone = d.zone; agent.anim = d.anim; agent.fiction = d.fiction;
    agent.detail = detail != null ? detail : d.verb;
    agent.since = this._now();
    if (!d.fiction) {   // a real event ends any 加戏 session
      agent.socialPhase = null; agent.partner = null; agent.speaking = false;
    }
  }

  _ensureMain(sessionId) {
    if (this._mainId && this.agents.has(this._mainId)) return this.agents.get(this._mainId);
    const id = sessionId || 'main';
    const agent = {
      id, kind: 'main', parentId: null, label: this.ownerLabel, agentType: null,
      species: this.ownerSpecies, accent: '#d8b048', bornAt: this._now(),
    };
    this.agents.set(id, agent);
    this._mainId = id;
    this._apply(agent, 'life_clockin');
    return agent;
  }

  _newSub(id, { provisional, agentType, detail }) {
    this._subCounter++;
    const seed = agentType || id;   // role-stable identity; same agent_type → same face
    const a = {
      id, kind: 'sub', parentId: this._mainId, provisional: !!provisional,
      label: agentType || `Agent ${this._subCounter}`, agentType: agentType || null,
      species: this._speciesFor(seed), accent: this._accentFor(seed), bornAt: this._now(),
    };
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
      if (agentType && !a.agentType) {
        a.agentType = agentType; a.label = agentType;
        a.species = this._speciesFor(agentType); a.accent = this._accentFor(agentType);
      }
      return a;
    }
    const prov = [...this.agents.values()]
      .filter(a => a.kind === 'sub' && a.provisional && !a.departing)
      .sort((a, b) => a.bornAt - b.bornAt)[0];
    if (prov) {
      this.agents.delete(prov.id);
      prov.id = agentId; prov.provisional = false;
      if (agentType) {
        prov.agentType = agentType; prov.label = agentType;
        prov.species = this._speciesFor(agentType); prov.accent = this._accentFor(agentType);
      }
      this.agents.set(agentId, prov);
      return prov;
    }
    return this._newSub(agentId, { provisional: false, agentType });
  }

  ingest(kind, payload = {}) {
    const sid = payload.session_id;
    const aid = payload.agent_id || null;
    const atype = payload.agent_type || null;

    switch (kind) {
      case 'session_start':
        this._apply(this._ensureMain(sid), 'life_idle_boss');
        break;
      case 'prompt':
        this._apply(this._ensureMain(sid), 'think_read_ask');
        break;
      case 'subagent_spawn': {   // PreToolUse(Agent|Task) — in MAIN, no agent_id yet
        const inp = payload.tool_input || {};
        this._apply(this._ensureMain(sid), 'del_spawn', describe('Agent', inp));
        this._createProvisional(inp.agent_type, inp.prompt ? squash(inp.prompt, 32) : null);
        break;
      }
      case 'subagent_start':
        if (aid) this._apply(this._bindOrCreateSub(aid, atype), 'life_startup');
        break;
      case 'tool': {
        const name = payload.tool_name;
        if (aid) {
          const sub = this._bindOrCreateSub(aid, atype);
          if (SPAWN_TOOLS.has(name)) break;   // subs can't spawn
          this._apply(sub, resolveTool(name, payload.tool_input), describe(name, payload.tool_input));
        } else {
          const m = this._ensureMain(sid);
          if (SPAWN_TOOLS.has(name)) this._apply(m, 'life_idle_boss', 'back at the desk');
          else this._apply(m, resolveTool(name, payload.tool_input), describe(name, payload.tool_input));
        }
        break;
      }
      case 'notification':
        if (payload.notification_type === 'permission_prompt') {
          this._apply(aid ? this._bindOrCreateSub(aid, atype) : this._ensureMain(sid), 'blocked_perm');
        }
        break;
      case 'subagent_stop': {
        let sub = aid && this.agents.get(aid);
        if (!sub) {
          sub = [...this.agents.values()]
            .filter(a => a.kind === 'sub' && !a.departing).sort((a, b) => a.bornAt - b.bornAt)[0];
        }
        if (sub) {
          const r = payload.exit_reason;
          this._apply(sub, r === 'failed' ? 'life_failed' : r === 'cancelled' ? 'life_cancelled' : 'life_done');
          sub.departing = true; sub.exitReason = r || 'completed';
        }
        break;
      }
      case 'stop': {
        const main = this._mainId ? this.agents.get(this._mainId) : null;
        if (main) this._apply(main, 'life_break');
        break;
      }
      default:
        break;
    }
    return this.snapshot();
  }

  /** Maintenance + the 加戏 layers (idle ambient + paired social). Call on a timer. */
  tick() {
    const now = this._now();
    for (const a of [...this.agents.values()]) {
      if (a.departing && now - a.since > LEAVE_REMOVE_MS) { this.agents.delete(a.id); continue; }
      // real-active but stale → drift into idle/ambient life
      if (REAL_ACTIVE.has(a.cat) && now - a.since > IDLE_AFTER_MS) {
        a.idleSince = now;
        this._apply(a, pickFrom(AMBIENT, a.id));
      }
      // rotate ambient activity so idle characters don't freeze on one pose
      if (a.cat === 'idle' && !a.socialPhase) {
        const id = pickFrom(AMBIENT, `${a.id}:${Math.floor(now / AMBIENT_ROTATE_MS)}`);
        if (id !== a.stateId) { const keep = a.idleSince; this._apply(a, id); a.idleSince = keep; }
      }
    }
    this._socialize(now);
    return this.snapshot();
  }

  // FICTION (加戏): two idle subs walk to a spot → chat with turn-taking → walk back →
  // idle + cooldown. NOT real behavior (star topology). Deterministic / testable.
  _socialize(now) {
    for (const a of this.agents.values()) {
      if (!a.socialPhase) continue;
      if (now >= a.socialPhaseEndsAt) {
        if (a.socialPhase === 'walk-in') {
          a.socialPhase = 'chat'; a.chatStartAt = now; a.socialPhaseEndsAt = now + SOCIAL_CHAT_MS; a.anim = 'wave';
        } else if (a.socialPhase === 'chat') {
          a.socialPhase = 'walk-out'; a.zone = 'desk'; a.anim = 'walk';
          a.detail = 'heading back'; a.speaking = false; a.socialPhaseEndsAt = now + SOCIAL_WALK_MS;
        } else {   // walk-out done → back to idle/ambient with a cooldown
          a.socialPhase = null; a.partner = null; a.speaking = false;
          a.socialCooldownUntil = now + SOCIAL_COOLDOWN_MS; a.idleSince = now;
          this._apply(a, pickFrom(AMBIENT, a.id)); a.idleSince = now;
          continue;
        }
      }
      if (a.socialPhase === 'chat') {
        const turn = Math.floor((now - a.chatStartAt) / SOCIAL_TURN_MS);
        a.speaking = (turn % 2) === a.socialSeat;
        a.detail = a.speaking ? SOCIAL_LINES[turn % SOCIAL_LINES.length] : '…';
      }
    }

    const eligible = [...this.agents.values()]
      .filter(a => a.kind === 'sub' && a.cat === 'idle' && !a.socialPhase
        && now - (a.idleSince ?? a.since) > SOCIAL_AFTER_MS && (a.socialCooldownUntil ?? 0) <= now)
      .sort((a, b) => a.bornAt - b.bornAt);
    for (let i = 0; i + 1 < eligible.length; i += 2) {
      const pair = [eligible[i], eligible[i + 1]];
      const soc = getState(pickFrom(SOCIAL, `${pair[0].id}|${pair[1].id}`));
      pair.forEach((p, seat) => {
        p.cat = 'social'; p.stateId = soc.id; p.emoji = soc.emoji; p.fiction = true;
        p.zone = soc.zone; p.anim = 'walk'; p.partner = pair[1 - seat].id; p.socialSeat = seat;
        p.socialPhase = 'walk-in'; p.socialPhaseEndsAt = now + SOCIAL_WALK_MS;
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
        since: a.since,
      })),
    };
  }
}

export { IDLE_AFTER_MS, SOCIAL_AFTER_MS, SPECIES };
