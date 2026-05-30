// Agent Office — live agents. Connects to the local agent-office server's SSE
// (tools/agent-office, default http://localhost:4500) and renders every agent in
// the snapshot as a Bear: main agent = your avatar at the boss desk, subAgents at
// workstations, each posed by its state's `anim` and captioned by its activity emoji.
//
// No local server? After a short grace period we run a small DEMO so the room is
// never empty. Override the source with ?agentsrc=<url> or window.__OFFICE_AGENT_URL.

import Phaser from 'phaser'
import { Bear } from './bear'
import { SPECIES, type Species, type Region } from './config'

type AgentSnap = {
  id: string; kind: 'main' | 'sub'; label: string; species?: string;
  state: string; cat: string; emoji?: string; anim?: string; zone: string;
  detail?: string; fiction?: boolean
}

const REGION: Region = 'asia'   // office agents aren't geo-located; pick a stocked atlas

// zone → anchor on the 640×416 office map (matches office_decor placements)
const ZONES: Record<string, { x: number; y: number }> = {
  boss: { x: 542, y: 250 }, infra: { x: 578, y: 134 }, whiteboard: { x: 134, y: 300 },
  pantry: { x: 138, y: 116 }, lounge: { x: 548, y: 360 }, desk: { x: 240, y: 230 },
}
// 12 workstation seats (in front of each desk's chair)
const DESK_SEATS = (() => {
  const s: { x: number; y: number }[] = []
  for (const ry of [172, 234, 296]) for (const cx of [112, 196, 280, 364]) s.push({ x: cx, y: ry })
  return s
})()

type Tracked = { bear: Bear; bubble: Phaser.GameObjects.Container & { setLabel?: (s: string, fiction: boolean) => void }; tx: number; ty: number; anim: string; slot: number | null }

// a compact "what am I doing" speech bubble (emoji + detail); fiction reads dimmed
function makeBubble(scene: Phaser.Scene): Phaser.GameObjects.Container & { setLabel?: (s: string, f: boolean) => void } {
  const bg = scene.add.rectangle(0, 0, 18, 12, 0x2c2e36, 0.92).setOrigin(0.5, 1).setStrokeStyle(1, 0x000000, 0.35)
  const txt = scene.add.text(0, -2, '', { fontFamily: 'monospace', fontSize: '8px', color: '#e6e3dc' }).setOrigin(0.5, 1)
  const c = scene.add.container(0, 0, [bg, txt]).setDepth(7) as Phaser.GameObjects.Container & { setLabel?: (s: string, f: boolean) => void }
  c.setLabel = (s: string, fiction: boolean) => {
    txt.setText(s || ''); txt.setColor(fiction ? '#9a9890' : '#e6e3dc')
    bg.setSize(Math.max(16, txt.width + 8), txt.height + 5)
    bg.setFillStyle(0x2c2e36, fiction ? 0.6 : 0.92)
    c.setVisible(!!s)
  }
  return c
}

function speciesOf(a: AgentSnap): Species {
  const s = a.species as Species
  return (SPECIES as readonly string[]).includes(s) ? s : 'bear'
}

export function setupOfficeAgents(scene: Phaser.Scene): void {
  teardownOfficeAgents()
  const bears = new Map<string, Tracked>()
  const slots = new Map<string, number>()   // agentId → desk seat index
  let es: EventSource | null = null
  let gotData = false

  function seatFor(id: string): { x: number; y: number } {
    let i = slots.get(id)
    if (i == null) {
      const used = new Set(slots.values())
      i = DESK_SEATS.findIndex((_, k) => !used.has(k))
      if (i < 0) i = slots.size % DESK_SEATS.length
      slots.set(id, i)
    }
    return DESK_SEATS[i]
  }
  function target(a: AgentSnap): { x: number; y: number } {
    if (a.kind === 'main') return ZONES.boss
    if (a.zone === 'desk') return seatFor(a.id)
    slots.delete(a.id)
    return ZONES[a.zone] || ZONES.desk
  }

  function reconcile(snap: { agents: AgentSnap[] }) {
    gotData = true
    const seen = new Set<string>()
    for (const a of snap.agents) {
      seen.add(a.id)
      let t = bears.get(a.id)
      const tgt = target(a)
      if (!t) {
        const b = new Bear(scene, tgt.x, tgt.y, REGION, speciesOf(a))
        t = { bear: b, bubble: makeBubble(scene), tx: tgt.x, ty: tgt.y, anim: a.anim || 'idle', slot: null }
        bears.set(a.id, t)
      }
      t.tx = tgt.x; t.ty = tgt.y; t.anim = a.anim || 'idle'
      t.bear.setDisplayName(a.label, { prefix: a.kind === 'main' ? '★ ' : '', color: a.kind === 'main' ? '#d8b048' : undefined })
      t.bubble.setLabel?.(`${a.emoji || ''} ${a.detail || ''}`.trim(), !!a.fiction)
      t.bear.walkTo(tgt.x, tgt.y)
    }
    for (const [id, t] of [...bears.entries()]) {
      if (!seen.has(id)) { t.bear.destroy(); t.bubble.destroy(); bears.delete(id); slots.delete(id) }
    }
  }

  // per-frame: drive movement + pose-on-arrival
  const onUpdate = (_t: number, dt: number) => {
    for (const t of bears.values()) {
      t.bear.update(dt)
      const sp = (t.bear as any).sprite
      t.bubble.setPosition(sp.x, sp.y - 30)   // float above the name label
      const dx = sp.x - t.tx, dy = sp.y - t.ty
      if (dx * dx + dy * dy < 16) {           // arrived → apply static pose
        if (t.anim === 'sit') t.bear.playSit()
        else if (t.anim === 'wave' || t.anim === 'dance') t.bear.playWave()
        else if (t.anim === 'idle') t.bear.playIdle()
      }
    }
  }
  scene.events.on(Phaser.Scenes.Events.UPDATE, onUpdate)

  // ── pick a source ──
  // Explicit override (?agentsrc= / window.__OFFICE_AGENT_URL) wins. Otherwise we
  // only auto-connect on localhost (dev). On the public site there's no local
  // server, so we go straight to the demo — no connection-refused console spam.
  let explicit: string | null = null
  let isLocal = false
  try {
    explicit = new URLSearchParams(window.location.search).get('agentsrc') || (window as any).__OFFICE_AGENT_URL || null
    isLocal = /^(localhost$|127\.|0\.0\.0\.0)/.test(window.location.hostname)
  } catch {}
  const src = explicit || (isLocal ? 'http://localhost:4500/events' : null)

  let demoTimer: Phaser.Time.TimerEvent | null = null
  if (src) {
    try {
      es = new EventSource(src)
      es.onmessage = (e) => { try { reconcile(JSON.parse(e.data)) } catch {} }
      // close on first failure (no retry spam) and fall back to the demo
      es.onerror = () => { if (!gotData) { try { es?.close() } catch {} ; es = null; startDemo(reconcile) } }
    } catch { startDemo(reconcile) }
  } else {
    demoTimer = scene.time.delayedCall(250, () => startDemo(reconcile))
  }

  cleanup = () => {
    try { es?.close() } catch {}
    scene.events.off(Phaser.Scenes.Events.UPDATE, onUpdate)
    demoTimer?.remove(false)
    stopDemo?.()
    for (const t of bears.values()) { t.bear.destroy(); t.bubble.destroy() }
    bears.clear()
  }
}

let cleanup: (() => void) | null = null
let stopDemo: (() => void) | null = null
export function teardownOfficeAgents(): void { cleanup?.(); cleanup = null }

// ── DEMO: a tiny canned scene so the office breathes without a local server ──
function startDemo(reconcile: (s: { agents: AgentSnap[] }) => void) {
  const A = (id: string, kind: 'main' | 'sub', label: string, species: string, cat: string, state: string, emoji: string, anim: string, zone: string, detail: string): AgentSnap =>
    ({ id, kind, label, species, cat, state, emoji, anim, zone, detail, fiction: false })
  const frames: AgentSnap[][] = [
    [A('main', 'main', 'You', 'bear', 'code', 'edit_code', '⌨️', 'sit', 'boss', 'writing code'),
     A('rev', 'sub', 'code-reviewer', 'fox', 'read', 'read_diff', '🔍', 'sit', 'desk', 'reviewing the diff'),
     A('db', 'sub', 'db-auditor', 'frog', 'mcp', 'mcp_db', '🗄️', 'sit', 'desk', 'querying Supabase')],
    [A('main', 'main', 'You', 'bear', 'delegate', 'del_spawn', '🤝', 'wave', 'whiteboard', 'delegating'),
     A('rev', 'sub', 'code-reviewer', 'fox', 'run', 'run_test', '🧪', 'sit', 'infra', 'running tests'),
     A('db', 'sub', 'db-auditor', 'frog', 'idle', 'idle_coffee', '☕', 'idle', 'pantry', 'getting coffee')],
    [A('main', 'main', 'You', 'bear', 'run', 'run_deploy', '🚢', 'sit', 'infra', 'deploying'),
     A('rev', 'sub', 'code-reviewer', 'fox', 'life', 'life_done', '🎉', 'wave', 'lounge', 'done ✓'),
     A('db', 'sub', 'db-auditor', 'frog', 'social', 'soc_coffee', '💬', 'wave', 'pantry', 'chatting')],
  ]
  let i = 0
  reconcile({ agents: frames[0] })
  const h = setInterval(() => { i = (i + 1) % frames.length; reconcile({ agents: frames[i] }) }, 4000)
  stopDemo = () => clearInterval(h)
}
