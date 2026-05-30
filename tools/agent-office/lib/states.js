// Agent Office — STATE CATALOG (~240 states).
//
// One flat registry of every状态 a character can be in. Each state carries:
//   { id, cat, verb, emoji, zone, anim, fiction }
//     cat     — category (drives color + coarse grouping)
//     verb    — the speech-bubble text (overridable per-event with a concrete detail)
//     emoji   — the visual flavor in the bubble / over the head
//     zone    — where on the floor it happens (boss/desk/infra/whiteboard/pantry/lounge)
//     anim    — bear.ts BearState to play: idle | walk | wave | sit | dance
//     fiction — REAL (from hooks) vs 加戏 (idle/social/reaction flavor)
//
// REAL cats   : code read run web think delegate mcp life blocked
// FICTION cats: idle social react
//
// resolveTool(toolName, input) maps a Claude Code tool call → a fine state id via
// file-extension / bash-keyword / mcp-server heuristics. The fiction pools
// (AMBIENT/SOCIAL/REACT) feed the 加戏 layer.

export const CATS = {
  code:     { color: '#5a8f4a', zone: 'desk',       anim: 'sit',  fiction: false },
  read:     { color: '#3a7fd0', zone: 'desk',       anim: 'sit',  fiction: false },
  run:      { color: '#d8732a', zone: 'infra',      anim: 'sit',  fiction: false },
  web:      { color: '#7c5cd0', zone: 'desk',       anim: 'sit',  fiction: false },
  think:    { color: '#d8b048', zone: 'desk',       anim: 'idle', fiction: false },
  delegate: { color: '#6cc8e8', zone: 'whiteboard', anim: 'wave', fiction: false },
  mcp:      { color: '#4aa9a0', zone: 'desk',       anim: 'sit',  fiction: false },
  life:     { color: '#8a8a90', zone: 'boss',       anim: 'idle', fiction: false },
  blocked:  { color: '#d44820', zone: 'desk',       anim: 'idle', fiction: false },
  idle:     { color: '#6a6a70', zone: 'pantry',     anim: 'idle', fiction: true  },
  social:   { color: '#9a7a5a', zone: 'pantry',     anim: 'wave', fiction: true  },
  react:    { color: '#d8b048', zone: 'desk',       anim: 'wave', fiction: true  },
};

export const STATES = {};

// reg(cat, rows) — rows are [id, verb, emoji, zoneOverride?, animOverride?]
function reg(cat, rows) {
  const d = CATS[cat];
  for (const [id, verb, emoji, zone, anim] of rows) {
    STATES[id] = { id, cat, verb, emoji, zone: zone || d.zone, anim: anim || d.anim, fiction: d.fiction };
  }
}

// ── CODE (writing / editing) ───────────────────────────────────────────────
reg('code', [
  ['edit_code', 'writing code', '⌨️'],
  ['edit_fix', 'fixing a bug', '🐛'],
  ['edit_refactor', 'refactoring', '♻️'],
  ['edit_rename', 'renaming things', '🏷️'],
  ['edit_test', 'writing tests', '🧪'],
  ['edit_docs', 'writing docs', '📝'],
  ['edit_readme', 'updating the README', '📖'],
  ['edit_config', 'editing config', '⚙️'],
  ['edit_style', 'styling CSS', '🎨'],
  ['edit_markup', 'editing HTML', '🔖'],
  ['edit_json', 'editing JSON', '🧾'],
  ['edit_yaml', 'editing YAML', '🧾'],
  ['edit_sql', 'writing SQL', '🗄️'],
  ['edit_types', 'editing types', '🔷'],
  ['edit_script', 'editing a script', '📜'],
  ['edit_env', 'editing .env', '🔐'],
  ['edit_ci', 'editing CI workflow', '🔁'],
  ['edit_docker', 'editing Dockerfile', '🐳'],
  ['edit_comment', 'commenting code', '💬'],
  ['edit_delete', 'deleting code', '✂️'],
  ['edit_newfile', 'creating a file', '📄'],
  ['edit_bigfile', 'editing a big file', '📚'],
  ['edit_notebook', 'editing a notebook', '📓'],
  ['edit_lock', 'updating the lockfile', '🔒'],
  ['edit_gitignore', 'editing .gitignore', '🚫'],
  ['edit_schema', 'editing a schema', '📐'],
  ['edit_migration', 'writing a migration', '🧬'],
  ['edit_i18n', 'editing translations', '🌐'],
  ['edit_format', 'tidying formatting', '🧹'],
  ['edit_resolve', 'resolving a conflict', '⚔️'],
]);

// ── READ (reading / searching) ─────────────────────────────────────────────
reg('read', [
  ['read_code', 'reading code', '📖'],
  ['read_docs', 'reading docs', '📘'],
  ['read_config', 'reading config', '⚙️'],
  ['read_logs', 'reading logs', '🪵'],
  ['read_test', 'reading tests', '🧪'],
  ['read_data', 'reading data', '🧾'],
  ['read_diff', 'reviewing the diff', '🔍'],
  ['read_error', 'reading an error', '❗'],
  ['read_bigfile', 'skimming a big file', '📚'],
  ['read_image', 'looking at an image', '🖼️'],
  ['read_pdf', 'reading a PDF', '📕'],
  ['read_notebook', 'reading a notebook', '📓'],
  ['read_review', 'reviewing code', '🧐'],
  ['read_readme', 'reading the README', '📖'],
  ['read_types', 'reading types', '🔷'],
  ['read_sql', 'reading SQL', '🗄️'],
  ['read_env', 'checking .env', '🔐'],
  ['read_skim', 'skimming', '👀'],
  ['read_history', 'reading git history', '🕰️'],
  ['read_spec', 'reading the spec', '📋'],
  ['grep_search', 'searching the code', '🔎'],
  ['grep_todo', 'hunting TODOs', '📌'],
  ['grep_def', 'finding a definition', '🧭'],
  ['glob_find', 'finding files', '🗂️'],
]);

// ── RUN (bash / shell) ─────────────────────────────────────────────────────
reg('run', [
  ['run_test', 'running tests', '🧪'],
  ['run_build', 'building', '🏗️'],
  ['run_install', 'installing deps', '📦'],
  ['run_commit', 'committing', '✅'],
  ['run_push', 'pushing', '🚀'],
  ['run_pull', 'pulling', '⬇️'],
  ['run_merge', 'merging', '🔀'],
  ['run_rebase', 'rebasing', '📏'],
  ['run_status', 'checking git status', '📋'],
  ['run_gitdiff', 'git diff', '🔍'],
  ['run_log', 'reading git log', '🕰️'],
  ['run_deploy', 'deploying', '🚢'],
  ['run_lint', 'linting', '🧹'],
  ['run_format', 'formatting', '🧼'],
  ['run_typecheck', 'type-checking', '🔷'],
  ['run_migrate', 'running a migration', '🧬'],
  ['run_docker', 'running docker', '🐳'],
  ['run_curl', 'curling an API', '🌐'],
  ['run_script', 'running a script', '📜'],
  ['run_server', 'starting a server', '🖥️'],
  ['run_kill', 'killing a process', '🔪'],
  ['run_watch', 'watching output', '👁️'],
  ['run_bench', 'benchmarking', '⏱️'],
  ['run_rm', 'removing files', '🗑️'],
  ['run_mkdir', 'making a directory', '📁'],
  ['run_ls', 'listing files', '📂'],
  ['run_cat', 'cat-ing a file', '🐈'],
  ['run_chmod', 'fixing permissions', '🔧'],
  ['run_ssh', 'ssh-ing in', '🔌'],
  ['run_rsync', 'rsync-ing', '🔁'],
  ['run_npm', 'running npm', '📦'],
  ['run_pip', 'running pip', '🐍'],
  ['run_make', 'running make', '🛠️'],
  ['run_grep', 'grepping', '🔎'],
  ['run_find', 'finding files', '🗺️'],
  ['run_env', 'checking the env', '🔐'],
  ['run_tail', 'tailing logs', '🪵'],
  ['run_db', 'querying the DB', '🗄️'],
  ['run_kubectl', 'running kubectl', '☸️'],
  ['run_generic', 'running a command', '▶️'],
]);

// ── WEB ────────────────────────────────────────────────────────────────────
reg('web', [
  ['web_search', 'searching the web', '🔎'],
  ['web_read', 'reading an article', '📰'],
  ['web_api', 'calling an API', '🌐'],
  ['web_docs', 'reading docs online', '📘'],
  ['web_github', 'browsing GitHub', '🐙'],
  ['web_so', 'checking StackOverflow', '📚'],
  ['web_fetch', 'fetching a page', '🔗'],
  ['web_image', 'looking up an image', '🖼️'],
]);

// ── THINK ──────────────────────────────────────────────────────────────────
reg('think', [
  ['think_plan', 'planning', '🗺️'],
  ['think_todo', 'updating the to-do list', '📝'],
  ['think_decide', 'weighing options', '⚖️'],
  ['think_stuck', 'stuck on something', '🤔'],
  ['think_research', 'researching', '🔬'],
  ['think_review', 'reviewing', '🧐'],
  ['think_read_ask', 'reading the ask', '📨'],
  ['think_design', 'designing', '📐'],
  ['think_estimate', 'estimating', '📊'],
  ['think_debug', 'reasoning about a bug', '🐛'],
  ['think_recall', 'recalling context', '💭'],
  ['think_idea', 'had an idea', '💡'],
]);

// ── DELEGATE ───────────────────────────────────────────────────────────────
reg('delegate', [
  ['del_spawn', 'delegating', '🤝'],
  ['del_brief', 'briefing a teammate', '📋'],
  ['del_review', 'reviewing their work', '🧐'],
  ['del_handoff', 'handing off', '📨'],
  ['del_wait', 'waiting on a teammate', '⏳'],
  ['del_receive', 'receiving a report', '📥'],
  ['del_assign', 'assigning a task', '📌'],
  ['del_sync', 'syncing up', '🔄'],
]);

// ── MCP (integrations) ─────────────────────────────────────────────────────
reg('mcp', [
  ['mcp_tool', 'using a tool', '🔌'],
  ['mcp_db', 'querying Supabase', '🗄️'],
  ['mcp_browser', 'driving the browser', '🌐'],
  ['mcp_search', 'searching the web', '🔎'],
  ['mcp_design', 'designing in Pencil', '🎨'],
  ['mcp_notes', 'saving a note', '🗒️'],
  ['mcp_calendar', 'checking the calendar', '📅'],
  ['mcp_linear', 'updating Linear', '📊'],
  ['mcp_figma', 'working in Figma', '🖌️'],
  ['mcp_generic', 'using an integration', '🧩'],
]);

// ── LIFE (lifecycle) ───────────────────────────────────────────────────────
reg('life', [
  ['life_clockin', 'clocking in', '🚪'],
  ['life_startup', 'spinning up', '🌅', 'desk'],
  ['life_idle_boss', 'at the desk', '🪑'],
  ['life_read_ask', 'reading the ask', '📨'],
  ['life_done', 'done ✓', '🎉', 'lounge', 'wave'],
  ['life_failed', 'failed ✗', '💥', 'lounge', 'walk'],
  ['life_cancelled', 'cancelled', '🚫', 'lounge', 'walk'],
  ['life_break', 'taking a break', '☕', 'lounge'],
  ['life_leave', 'heading out', '👋', 'lounge', 'walk'],
  ['life_return', 'back at it', '🔙', 'desk'],
  ['life_overtime', 'pulling overtime', '🌙'],
  ['life_handback', 'reporting back', '📤', 'whiteboard', 'wave'],
  ['life_waiting_user', 'waiting for you', '⏳'],
  ['life_compact', 'tidying up memory', '🧠'],
  ['life_resume', 'resuming', '▶️', 'desk'],
]);

// ── BLOCKED (waiting on the human) ─────────────────────────────────────────
reg('blocked', [
  ['blocked_perm', 'waiting for your approval', '✋'],
  ['blocked_input', 'needs your input', '🙋'],
  ['blocked_confirm', 'awaiting confirmation', '❓'],
  ['blocked_choice', 'needs a decision', '🔀'],
]);

// ── IDLE / AMBIENT (FICTION) ───────────────────────────────────────────────
reg('idle', [
  ['idle_sit', 'idling', '🪑', 'desk'],
  ['idle_stretch', 'stretching', '🧘'],
  ['idle_yawn', 'yawning', '🥱', 'desk'],
  ['idle_coffee', 'getting coffee', '☕', 'pantry', 'walk'],
  ['idle_water', 'refilling water', '💧', 'pantry'],
  ['idle_window', 'staring out the window', '🪟'],
  ['idle_pace', 'pacing', '🚶', null, 'walk'],
  ['idle_nap', 'power-napping', '😴', 'lounge'],
  ['idle_plant', 'watering the plant', '🪴'],
  ['idle_tidy', 'tidying the desk', '🧹', 'desk'],
  ['idle_whiteboard', 'staring at the whiteboard', '📋', 'whiteboard'],
  ['idle_doodle', 'doodling', '✏️', 'desk'],
  ['idle_phone', 'checking the phone', '📱', 'desk'],
  ['idle_book', 'reading a book', '📖', 'lounge'],
  ['idle_lean', 'leaning back', '🪑', 'desk'],
  ['idle_knuckles', 'cracking knuckles', '🤜', 'desk'],
  ['idle_snack', 'grabbing a snack', '🍪', 'pantry'],
  ['idle_ceiling', 'staring at the ceiling', '🔭', 'desk'],
  ['idle_wander', 'wandering around', '🧭', null, 'walk'],
  ['idle_treadmill', 'on the treadmill', '🏃', 'lounge', 'walk'],
  ['idle_monitor', 'zoning out at the monitor', '🖥️', 'desk'],
  ['idle_daydream', 'daydreaming', '💭', 'desk'],
  ['idle_music', 'listening to music', '🎧', 'desk'],
  ['idle_fidget', 'fidgeting', '🤹', 'desk'],
  ['idle_note', 'jotting a note', '🗒️', 'desk'],
  ['idle_sip', 'sipping coffee', '☕', 'desk'],
  ['idle_breathe', 'taking a breather', '😮‍💨'],
  ['idle_look', 'looking around', '👀', 'desk'],
  ['idle_organize', 'organizing files', '🗂️', 'desk'],
  ['idle_messages', 'checking messages', '📧', 'desk'],
  ['idle_clock', 'watching the clock', '🕰️', 'desk'],
  ['idle_cooler', 'by the water cooler', '🚰', 'pantry'],
  ['idle_rain', 'watching the rain', '🌧️'],
  ['idle_prune', 'pruning the plant', '🌿'],
  ['idle_pen', 'balancing a pen', '🖊️', 'desk'],
  ['idle_spin', 'spinning the chair', '💺', 'desk'],
  ['idle_snooze', 'dozing off', '💤', 'lounge'],
  ['idle_lap', 'taking a lap', '🚶‍♂️', null, 'walk'],
  ['idle_news', 'reading the news', '📰', 'lounge'],
  ['idle_meditate', 'meditating', '🧘‍♂️', 'lounge'],
  ['idle_warmup', 'warming up fingers', '🙌', 'desk'],
  ['idle_sticky', 'rearranging sticky notes', '🟨', 'whiteboard'],
  ['idle_papers', 'shuffling papers', '📄', 'desk'],
  ['idle_hum', 'humming', '🎵', 'desk'],
  ['idle_thinkwalk', 'thinking on a walk', '🤔', null, 'walk'],
  ['idle_recharge', 'recharging', '🔋', 'lounge'],
  ['idle_munch', 'munching', '🍿', 'pantry'],
  ['idle_scroll', 'scrolling', '📲', 'desk'],
  ['idle_relax', 'relaxing', '😌', 'lounge'],
  ['idle_gaze', 'gazing into the distance', '🌅'],
]);

// ── SOCIAL (FICTION, paired) ───────────────────────────────────────────────
reg('social', [
  ['soc_chat', 'chatting', '💬'],
  ['soc_notes', 'comparing notes', '🗒️'],
  ['soc_debate', 'debating', '⚔️'],
  ['soc_laugh', 'laughing', '😄'],
  ['soc_highfive', 'high-fiving', '🙌'],
  ['soc_gossip', 'gossiping', '🤫'],
  ['soc_help', 'asking for help', '🆘'],
  ['soc_brainstorm', 'brainstorming', '🧠', 'whiteboard'],
  ['soc_coffee', 'coffee chat', '☕', 'pantry'],
  ['soc_greet', 'saying hi', '👋'],
  ['soc_nod', 'nodding along', '🙂'],
  ['soc_whisper', 'whispering', '🤐'],
  ['soc_explain', 'explaining something', '🗣️'],
  ['soc_agree', 'agreeing', '👍'],
  ['soc_disagree', 'disagreeing', '🙅'],
  ['soc_plan', 'planning together', '📋', 'whiteboard'],
  ['soc_celebrate', 'celebrating together', '🎉'],
  ['soc_vent', 'venting', '😤'],
  ['soc_story', 'telling a story', '📖'],
  ['soc_joke', 'cracking a joke', '😆'],
  ['soc_quiz', 'quizzing each other', '❓'],
  ['soc_review', 'peer-reviewing', '🧐', 'whiteboard'],
  ['soc_pair', 'pair-thinking', '👥'],
  ['soc_intro', 'introducing themselves', '🤝'],
  ['soc_catchup', 'catching up', '💭'],
  ['soc_tabs', 'arguing tabs vs spaces', '😅'],
]);

// ── REACT (FICTION, mood spikes) ───────────────────────────────────────────
reg('react', [
  ['react_celebrate', 'celebrating!', '🎉', 'desk', 'dance'],
  ['react_facepalm', 'facepalming', '🤦'],
  ['react_relief', 'relieved', '😌'],
  ['react_proud', 'feeling proud', '😎'],
  ['react_confused', 'confused', '😕'],
  ['react_eureka', 'eureka!', '💡', 'desk', 'dance'],
  ['react_frustrated', 'frustrated', '😣'],
  ['react_shrug', 'shrugging', '🤷'],
  ['react_cheer', 'cheering', '📣', 'desk', 'dance'],
  ['react_sigh', 'sighing', '😮‍💨'],
  ['react_sweat', 'sweating it', '😅'],
  ['react_thumbsup', 'thumbs up', '👍'],
  ['react_oof', 'oof', '😬'],
  ['react_party', 'party time', '🥳', 'desk', 'dance'],
  ['react_mindblown', 'mind blown', '🤯'],
  ['react_meh', 'unimpressed', '😐'],
  ['react_fistpump', 'fist pump', '✊'],
  ['react_melt', 'head in hands', '🫠'],
  ['react_wow', 'impressed', '😮'],
  ['react_zen', 'zen', '🧘'],
]);

// ── helpers ────────────────────────────────────────────────────────────────

export function getState(id) { return STATES[id] || STATES.life_idle_boss; }

const ids = (cat) => Object.values(STATES).filter(s => s.cat === cat).map(s => s.id);
export const AMBIENT = ids('idle');
export const SOCIAL = ids('social');
export const REACT = ids('react');

function hashStr(s) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}
/** Deterministic pick from a list, varied by seed (so it's testable, no RNG). */
export function pickFrom(list, seed) { return list[hashStr(String(seed)) % list.length]; }

const lc = (s) => String(s || '').toLowerCase();
const ext = (p) => { const m = lc(p).match(/\.([a-z0-9]+)$/); return m ? m[1] : ''; };
const base = (p) => lc(p).split('/').pop() || '';

/** Edit/Write target file → a fine code/edit state. */
function editStateForFile(fp) {
  const b = base(fp), e = ext(fp), p = lc(fp);
  if (/\.(test|spec)\./.test(b)) return 'edit_test';
  if (b === 'readme.md') return 'edit_readme';
  if (e === 'md' || e === 'mdx') return 'edit_docs';
  if (e === 'css' || e === 'scss' || e === 'sass' || e === 'less') return 'edit_style';
  if (e === 'html' || e === 'astro' || e === 'vue' || e === 'svelte') return 'edit_markup';
  if (e === 'json') return b.includes('lock') ? 'edit_lock' : 'edit_json';
  if (e === 'yml' || e === 'yaml') return p.includes('.github/') ? 'edit_ci' : 'edit_yaml';
  if (e === 'sql') return 'edit_sql';
  if (b.endsWith('.d.ts') || b === 'types.ts') return 'edit_types';
  if (e === 'sh' || e === 'bash' || e === 'zsh') return 'edit_script';
  if (b === '.env' || b.startsWith('.env')) return 'edit_env';
  if (b === 'dockerfile') return 'edit_docker';
  if (b === '.gitignore') return 'edit_gitignore';
  if (e === 'ipynb') return 'edit_notebook';
  if (e === 'prisma' || e === 'proto' || e === 'graphql') return 'edit_schema';
  return 'edit_code';
}
function readStateForFile(fp) {
  const b = base(fp), e = ext(fp);
  if (/\.(test|spec)\./.test(b)) return 'read_test';
  if (b === 'readme.md') return 'read_readme';
  if (e === 'md' || e === 'mdx') return 'read_docs';
  if (e === 'log') return 'read_logs';
  if (e === 'json' || e === 'csv' || e === 'yml' || e === 'yaml') return 'read_data';
  if (e === 'sql') return 'read_sql';
  if (b.endsWith('.d.ts')) return 'read_types';
  if (e === 'png' || e === 'jpg' || e === 'jpeg' || e === 'gif' || e === 'svg' || e === 'webp') return 'read_image';
  if (e === 'pdf') return 'read_pdf';
  if (e === 'ipynb') return 'read_notebook';
  if (b === '.env' || b.startsWith('.env')) return 'read_env';
  return 'read_code';
}

// keyword → run state. First match wins; ordered most-specific first.
const BASH_RULES = [
  [/\b(npm|pnpm|yarn|jest|vitest|pytest|go test|cargo test)\b.*\btest\b|\btest\b/, 'run_test'],
  [/\b(npm|pnpm|yarn)\s+(run\s+)?build\b|\bvite build\b|\bwebpack\b|\btsc -b\b/, 'run_build'],
  [/\b(npm|pnpm|yarn)\s+(install|add|i)\b|\bpip install\b|\bbundle install\b/, 'run_install'],
  [/\bgit\s+commit\b/, 'run_commit'],
  [/\bgit\s+push\b/, 'run_push'],
  [/\bgit\s+pull\b/, 'run_pull'],
  [/\bgit\s+merge\b/, 'run_merge'],
  [/\bgit\s+rebase\b/, 'run_rebase'],
  [/\bgit\s+status\b/, 'run_status'],
  [/\bgit\s+diff\b/, 'run_gitdiff'],
  [/\bgit\s+log\b/, 'run_log'],
  [/\bdeploy|\.\/scripts\/deploy/, 'run_deploy'],
  [/\b(eslint|lint)\b/, 'run_lint'],
  [/\b(prettier|format)\b/, 'run_format'],
  [/\btsc\b|type-?check/, 'run_typecheck'],
  [/\bmigrat/, 'run_migrate'],
  [/\bdocker\b/, 'run_docker'],
  [/\bcurl\b|\bwget\b/, 'run_curl'],
  [/\bkubectl\b|\bhelm\b/, 'run_kubectl'],
  [/\brsync\b/, 'run_rsync'],
  [/\bssh\b|sshpass/, 'run_ssh'],
  [/\bkill\b|pkill/, 'run_kill'],
  [/\btail\b/, 'run_tail'],
  [/\bpsql\b|\bsqlite3?\b|\bmysql\b/, 'run_db'],
  [/\brm\s|-rf\b/, 'run_rm'],
  [/\bmkdir\b/, 'run_mkdir'],
  [/\bls\b/, 'run_ls'],
  [/\bcat\b/, 'run_cat'],
  [/\bchmod\b|chown/, 'run_chmod'],
  [/\bgrep\b|\brg\b/, 'run_grep'],
  [/\bfind\b|\bfd\b/, 'run_find'],
  [/\bmake\b/, 'run_make'],
  [/\bnpm\b|\bpnpm\b|\byarn\b/, 'run_npm'],
  [/\bpip\b|python -m/, 'run_pip'],
  [/\bnode\b|\bpython3?\b|\bdeno\b|\bbun\b/, 'run_script'],
  [/server|serve|preview|--port|listen/, 'run_server'],
  [/bench/, 'run_bench'],
  [/\benv\b|printenv/, 'run_env'],
];
function bashState(input) {
  const cmd = lc((input && (input.command || input.description)) || '');
  for (const [re, id] of BASH_RULES) if (re.test(cmd)) return id;
  return 'run_generic';
}

function mcpState(toolName) {
  const n = lc(toolName);
  if (n.includes('supabase')) return 'mcp_db';
  if (n.includes('playwright') || n.includes('browser')) return 'mcp_browser';
  if (n.includes('exa') || n.includes('search')) return 'mcp_search';
  if (n.includes('pencil') || n.includes('figma') || n.includes('excalidraw')) return 'mcp_design';
  if (n.includes('linear')) return 'mcp_linear';
  if (n.includes('calendar')) return 'mcp_calendar';
  if (n.includes('flomo') || n.includes('tana') || n.includes('note') || n.includes('heptabase')) return 'mcp_notes';
  return 'mcp_generic';
}

/** Map a Claude Code tool call → a fine state id. */
export function resolveTool(toolName, input) {
  const t = toolName || '';
  if (t.startsWith('mcp__')) return mcpState(t);
  switch (t) {
    case 'Edit': case 'Write': case 'MultiEdit':
      return input?.file_path ? editStateForFile(input.file_path) : 'edit_code';
    case 'NotebookEdit': return 'edit_notebook';
    case 'Read': return input?.file_path ? readStateForFile(input.file_path) : 'read_code';
    case 'Grep': return /todo|fixme|hack/i.test(input?.pattern || '') ? 'grep_todo' : 'grep_search';
    case 'Glob': return 'glob_find';
    case 'Bash': case 'BashOutput': return bashState(input);
    case 'WebSearch': return 'web_search';
    case 'WebFetch': {
      const u = lc(input?.url);
      if (u.includes('github.com')) return 'web_github';
      if (u.includes('stackoverflow')) return 'web_so';
      if (u.includes('/api') || u.includes('api.')) return 'web_api';
      if (u.includes('docs')) return 'web_docs';
      return 'web_fetch';
    }
    case 'TodoWrite': return 'think_todo';
    case 'Task': case 'Agent': return 'del_spawn';
    default: return 'edit_code' in STATES && /^[A-Z]/.test(t) ? 'mcp_generic' : 'run_generic';
  }
}
