// Agent Office — live agents. Connects to the local agent-office server's SSE
// (tools/agent-office, default http://localhost:4500) and renders every agent in
// the snapshot as a Bear: main agent = your avatar at the boss desk, subAgents at
// workstations, each posed by its state's `anim` and captioned by its activity emoji.
//
// Liveliness layer (Phase 1, inspired by pixtuoid):
//   • per-agent GLOW tinted by tool-state category — read the whole room by color
//   • event JUICE — spawn poof, done confetti + wave, fail red-flash + shake
//   • desk PERSONALIZATION that accrues with tool-use (cup → plant → photo → 🔥)
//
// No local server? After a short grace period we run a small DEMO so the room is
// never empty. Override the source with ?agentsrc=<url> or window.__OFFICE_AGENT_URL.

import Phaser from 'phaser'
import { Bear } from './bear'
import { SPECIES, type Species, type Region } from './config'
import { sfxDone, sfxFail, sfxPour, sfxHeart, sfxSpawn, sfxClack, resumeOfficeAudio } from './office_audio'

type AgentMetrics = { tools: number; byTool?: Record<string, number>; inTokens: number; outTokens: number; model?: string | null; result?: string | null; durationMs?: number }
type AgentSnap = {
  id: string; kind: 'main' | 'sub'; label: string; species?: string;
  state: string; cat: string; emoji?: string; anim?: string; zone: string;
  detail?: string; fiction?: boolean; metrics?: AgentMetrics | null
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

// tool-state category → glow colour. Read the room's activity at a glance: each
// desk's aura tells you what that agent is doing without reading its bubble.
const CAT_COLOR: Record<string, number> = {
  code: 0x5a8fff, edit: 0x5a8fff, write: 0x5a8fff,         // blue — writing code
  read: 0x6cc8e8, search: 0x6cc8e8, grep: 0x6cc8e8,        // cyan — reading
  run: 0xff9a3c, test: 0xff9a3c, bash: 0xff9a3c, deploy: 0xff9a3c, // orange — running
  mcp: 0xb070ff,                                            // purple — MCP / tools
  delegate: 0xffd24a,                                       // gold — delegating
  social: 0x7ad0a0,                                         // soft green — chatting
  life: 0x5fd06a, done: 0x5fd06a,                           // green — finished ✓
  blocked: 0xff4d3c,                                        // red — needs you
  idle: 0x7a7a86,                                           // dim grey — idle
}
const glowColor = (cat: string, state: string): number => {
  if (/fail/.test(state)) return 0xff4d3c
  return CAT_COLOR[cat] || 0x8ab0c8
}
const isActive = (cat: string) => !['idle', 'life', 'social', 'blocked'].includes(cat)

type Décor = { emoji: string; at: number; dx: number; dy: number }
// desk décor unlocked by cumulative tool-use — the longer an agent works, the
// more "lived-in" its workstation gets (pixtuoid: plant@30min, photo@1h).
const DECOR_LADDER: Décor[] = [
  { emoji: '☕', at: 3, dx: 13, dy: -4 },
  { emoji: '🪴', at: 12, dx: -14, dy: -3 },
  { emoji: '🖼️', at: 28, dx: 15, dy: -14 },
  { emoji: '🔥', at: 60, dx: -15, dy: -14 },
]

// ── Phase 2: ambient life — idle agents take goal-directed trips ──
// named destinations on the 640×416 office map (in front of the real furniture)
const WAYPOINTS = {
  coffee: { x: 156, y: 108 },
  cooler: { x: 104, y: 114 },
  sofa: { x: 548, y: 368 },
  meeting: { x: 132, y: 332 },
  treadmill: { x: 604, y: 322 },
  plantL: { x: 62, y: 372 },
  plantR: { x: 588, y: 372 },
}
const WANDER_SPOTS = [WAYPOINTS.sofa, WAYPOINTS.cooler, WAYPOINTS.meeting, WAYPOINTS.treadmill, WAYPOINTS.plantL, WAYPOINTS.plantR]
// dev-humour one-liners for pantry chitchat / idle thought bubbles
const QUIPS = ['这正则有毒…', '又是缓存的锅', '再跑一次就好', '谁动了我的 lint', '编译中… ☕', 'LGTM 🚀', '这 bug 会自愈吗？', '先 commit 再说', '摸鱼五分钟', 'tests 全绿 ✅', '需求又变了', '这段我不敢删']
const pickQuip = (i: number) => QUIPS[(i * 7 + 3) % QUIPS.length]   // deterministic-ish, varies per call index
// only truly-idle agents wander off; working/blocked agents stay put at their desk
const freeCat = (cat: string) => cat === 'idle' || cat === 'social'

// a goal-directed trip an idle agent takes (coffee run / stroll), driven per-frame
type Trip = {
  kind: 'coffee' | 'wander'
  phase: 'go' | 'linger' | 'back'
  dest: { x: number; y: number }
  until: number                                   // scene.time.now deadline for `linger`
  cup?: Phaser.GameObjects.Text                   // coffee carried home
}

type Tracked = {
  bear: Bear
  bubble: Phaser.GameObjects.Container & { setLabel?: (s: string, fiction: boolean) => void }
  metrics: Phaser.GameObjects.Text
  glow: Phaser.GameObjects.Image
  decor: Phaser.GameObjects.Text[]
  tx: number; ty: number; anim: string; slot: number | null
  cat: string; state: string                 // last seen, for transition detection
  home: { x: number; y: number }             // the agent's desk seat (return point)
  idle: boolean                              // free to wander (cat idle/social)
  trip: Trip | null                          // active ambient trip, owns movement
  nextTripAt: number                         // scene.time.now to start the next trip
  ind: Phaser.GameObjects.Text               // overhead micro-state glyph (···/?/z)
  idleSince: number                          // when cat became 'idle' (for sleepy z's)
}

// compact token count: 3_190_760 → "3.2M", 45_000 → "45k"
function fmtTok(n: number): string {
  if (n >= 1e6) return (n / 1e6).toFixed(1).replace(/\.0$/, '') + 'M'
  if (n >= 1e3) return Math.round(n / 1e3) + 'k'
  return String(n)
}

// ── shared textures for glow + particle juice (generated once) ──
function ensureGlowTex(scene: Phaser.Scene) {
  if (scene.textures.exists('office_glow')) return
  const d = 64, r = d / 2
  const cv = scene.textures.createCanvas('office_glow', d, d)
  if (!cv) return
  const ctx = cv.getContext()
  const g = ctx.createRadialGradient(r, r, 0, r, r, r)
  g.addColorStop(0, 'rgba(255,255,255,0.7)')
  g.addColorStop(0.4, 'rgba(255,255,255,0.32)')
  g.addColorStop(1, 'rgba(255,255,255,0)')
  ctx.fillStyle = g
  ctx.fillRect(0, 0, d, d)
  cv.refresh()
}
function ensureSparkTex(scene: Phaser.Scene) {
  if (scene.textures.exists('office_spark')) return
  const g = scene.add.graphics()
  g.fillStyle(0xffffff, 1).fillRect(0, 0, 3, 3)
  g.generateTexture('office_spark', 3, 3)
  g.destroy()
}

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
  ensureGlowTex(scene)
  ensureSparkTex(scene)
  const bears = new Map<string, Tracked>()
  const slots = new Map<string, number>()   // agentId → desk seat index
  let es: EventSource | null = null
  let gotData = false

  // ── particle juice: a one-shot burst that cleans itself up ──
  function burst(x: number, y: number, opts: { tint: number | number[]; n: number; speed: number; life: number; up?: boolean }) {
    const p = scene.add.particles(x, y, 'office_spark', {
      speed: { min: opts.speed * 0.3, max: opts.speed },
      angle: opts.up ? { min: 250, max: 290 } : { min: 0, max: 360 },
      lifespan: opts.life, scale: { start: 1.6, end: 0 },
      gravityY: opts.up ? 60 : 0, tint: opts.tint, emitting: false,
    }).setDepth(8)
    p.explode(opts.n, x, y)
    scene.time.delayedCall(opts.life + 120, () => p.destroy())
  }
  function flash(t: Tracked, color: number) {
    const sp = (t.bear as any).sprite
    const f = scene.add.rectangle(sp.x, sp.y - 10, 30, 36, color, 0.5).setDepth(9)
    scene.tweens.add({ targets: f, alpha: 0, duration: 360, onComplete: () => f.destroy() })
  }

  // ── ambient trips: idle agents get up and do something, then come back ──
  function startTrip(t: Tracked) {
    const now = scene.time.now
    const coffee = (Math.floor(now / 1000 + t.home.x) % 5) < 2   // ~40% coffee runs
    const dest = coffee ? WAYPOINTS.coffee : WANDER_SPOTS[Math.floor(now / 700 + t.home.y) % WANDER_SPOTS.length]
    t.trip = { kind: coffee ? 'coffee' : 'wander', phase: 'go', dest, until: 0 }
    t.tx = dest.x; t.ty = dest.y
    t.bear.walkTo(dest.x, dest.y)
  }
  function endTrip(t: Tracked) {
    if (t.trip?.cup) t.trip.cup.destroy()
    t.trip = null
  }
  function driveTrip(t: Tracked, now: number) {
    const trip = t.trip!; const sp = (t.bear as any).sprite
    const arrived = Phaser.Math.Distance.Squared(sp.x, sp.y, trip.dest.x, trip.dest.y) < 40
    if (trip.phase === 'go') {
      if (arrived) { trip.phase = 'linger'; trip.until = now + (trip.kind === 'coffee' ? 1600 : 1800 + (t.home.x % 1800)) }
    } else if (trip.phase === 'linger') {
      if (now >= trip.until) {
        if (trip.kind === 'coffee') { trip.cup = scene.add.text(sp.x, sp.y - 14, '☕', { fontSize: '11px' }).setOrigin(0.5).setDepth(8); sfxPour() }
        trip.phase = 'back'; trip.dest = { x: t.home.x, y: t.home.y }
        t.tx = t.home.x; t.ty = t.home.y; t.bear.walkTo(t.home.x, t.home.y)
      }
    } else {                                            // returning home
      if (trip.cup) trip.cup.setPosition(sp.x + 6, sp.y - 2)
      if (arrived) {
        if (trip.cup) {                                 // settle the coffee on the desk (once)
          if (!t.decor.some((o) => o.getData('emoji') === '☕')) {
            trip.cup.setPosition(t.home.x + 13, t.home.y - 4).setData('emoji', '☕')
            t.decor.push(trip.cup)
          } else trip.cup.destroy()
          trip.cup = undefined
        }
        t.trip = null
        t.nextTripAt = now + 9000 + Math.abs((t.home.y * 53) % 8000)
      }
    }
  }

  // ── office pet: a cat that roams, naps beside the most-idle agent, ❤️ on click ──
  let pet: { bear: Bear; tx: number; ty: number; until: number } | null = null
  const PET_SPOTS = [...WANDER_SPOTS, { x: 320, y: 200 }, { x: 420, y: 340 }, { x: 230, y: 358 }, { x: 470, y: 150 }]
  function spawnPet() {
    const start = { x: 320, y: 358 }
    const b = new Bear(scene, start.x, start.y, REGION, 'cat')
    b.setDisplayName(null)
    pet = { bear: b, tx: start.x, ty: start.y, until: scene.time.now + 2500 }
    const sp = (b as any).sprite
    sp.setInteractive({ useHandCursor: true })
    sp.on('pointerdown', () => {
      for (let i = 0; i < 5; i++) {
        const h = scene.add.text(sp.x + (i - 2) * 6, sp.y - 8, '❤️', { fontSize: '11px' }).setOrigin(0.5).setDepth(9)
        scene.tweens.add({ targets: h, y: sp.y - 34 - i * 4, alpha: 0, duration: 900 + i * 90, ease: 'Sine.easeOut', onComplete: () => h.destroy() })
      }
      pet?.bear.playWave?.(); sfxHeart()
    })
  }
  function drivePet(now: number, dt: number) {
    if (!pet) return
    pet.bear.update(dt)
    const sp = (pet.bear as any).sprite
    const arrived = Phaser.Math.Distance.Squared(sp.x, sp.y, pet.tx, pet.ty) < 40
    if (arrived && now >= pet.until) {
      const idlers = [...bears.values()].filter((t) => t.idle && !t.trip)
      let dest: { x: number; y: number }
      if (idlers.length && (Math.floor(now / 1000) % 5) < 2) {       // ~40%: nap beside an idle coworker
        const a = idlers[Math.floor(now / 800) % idlers.length]
        dest = { x: a.home.x - 18, y: a.home.y + 6 }
      } else {
        dest = PET_SPOTS[Math.floor(now / 600) % PET_SPOTS.length]
      }
      pet.tx = dest.x; pet.ty = dest.y; pet.bear.walkTo(dest.x, dest.y)
      pet.until = now + 3500 + Math.abs((Math.floor(now / 7) * 13) % 5000)
    }
  }
  spawnPet()

  // ── idle chitchat: when ≥2 agents are free, they trade dev-humour quips ──
  let nextChitchatAt = 0
  let quipIdx = 0
  function popQuip(t: Tracked) {
    const sp = (t.bear as any).sprite
    const q = scene.add.text(sp.x, sp.y - 32, pickQuip(quipIdx++), {
      fontFamily: 'monospace', fontSize: '8px', color: '#e6e3dc', backgroundColor: '#2c2e36', padding: { x: 4, y: 2 },
    }).setOrigin(0.5, 1).setDepth(8)
    scene.tweens.add({ targets: q, y: sp.y - 44, alpha: 0, duration: 2200, ease: 'Sine.easeIn', delay: 700, onComplete: () => q.destroy() })
  }
  function chitchat(now: number) {
    if (now < nextChitchatAt) return
    const free = [...bears.values()].filter((t) => t.idle)
    if (free.length < 2) { nextChitchatAt = now + 3000; return }
    const a = free[Math.floor(now / 900) % free.length]
    popQuip(a)
    const asp = (a.bear as any).sprite
    const b = free.find((t) => t !== a && Phaser.Math.Distance.Squared((t.bear as any).sprite.x, (t.bear as any).sprite.y, asp.x, asp.y) < 160 * 160)
    if (b) scene.time.delayedCall(1300, () => { if ([...bears.values()].includes(b)) popQuip(b) })   // a nearby coworker replies
    nextChitchatAt = now + 5000 + Math.abs((Math.floor(now / 11) * 17) % 5000)
  }

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
        const metrics = scene.add.text(tgt.x, tgt.y, '', { fontFamily: 'monospace', fontSize: '7px', color: '#8ab0c8' }).setOrigin(0.5, 0).setDepth(7)
        const glow = scene.add.image(tgt.x, tgt.y, 'office_glow').setBlendMode(Phaser.BlendModes.ADD).setDepth(4).setAlpha(0)
        const ind = scene.add.text(tgt.x, tgt.y - 18, '', { fontFamily: 'monospace', fontSize: '10px', color: '#e6f0f6' }).setOrigin(0.5, 1).setStroke('#11161b', 2.5).setDepth(7)
        t = { bear: b, bubble: makeBubble(scene), metrics, glow, decor: [], tx: tgt.x, ty: tgt.y, anim: a.anim || 'idle', slot: null, cat: a.cat, state: a.state, home: { x: tgt.x, y: tgt.y }, idle: freeCat(a.cat) && a.kind === 'sub', trip: null, nextTripAt: scene.time.now + 4000 + Math.abs((tgt.x * 31) % 6000), ind, idleSince: a.cat === 'idle' ? scene.time.now : 0 }
        bears.set(a.id, t)
        // spawn juice: a soft dust poof + a quick glow bloom + arrival chime
        burst(tgt.x, tgt.y - 8, { tint: [0xcfe4ee, 0xffffff], n: 10, speed: 50, life: 600 })
        scene.tweens.add({ targets: glow, alpha: 0.5, duration: 280, yoyo: true })
        sfxSpawn()
      }

      // ── transition juice (compare last-seen → new) ──
      if (t.state !== a.state || t.cat !== a.cat) {
        if (/fail/.test(a.state) && !/fail/.test(t.state)) {
          flash(t, 0xff4d3c); scene.cameras.main.shake(140, 0.0035); sfxFail()
        } else if (/done/.test(a.state) && !/done/.test(t.state)) {
          burst(t.tx, t.ty - 18, { tint: [0x5fd06a, 0xffd24a, 0x6cc8e8, 0xff7ab0], n: 16, speed: 90, life: 900, up: true })
          t.bear.playWave(); sfxDone()
        } else if (a.cat === 'blocked' && t.cat !== 'blocked') {
          flash(t, 0xff4d3c)
        }
      }
      const wasIdle = t.idle
      const nowIdle = freeCat(a.cat) && a.kind === 'sub'   // the boss stays at the boss desk; only subs wander
      if (nowIdle && !wasIdle) t.nextTripAt = scene.time.now + 2500 + Math.abs((tgt.x * 17) % 4000)
      if (!nowIdle && t.trip) endTrip(t)          // became active mid-trip → drop the stroll
      if (a.cat === 'idle' && t.cat !== 'idle') t.idleSince = scene.time.now
      else if (a.cat !== 'idle') t.idleSince = 0
      t.cat = a.cat; t.state = a.state; t.home = tgt; t.idle = nowIdle
      t.anim = a.anim || 'idle'
      t.bear.setDisplayName(a.label, { prefix: a.kind === 'main' ? '★ ' : '', color: a.kind === 'main' ? '#d8b048' : undefined })
      t.bubble.setLabel?.(`${a.emoji || ''} ${a.detail || ''}`.trim(), !!a.fiction)

      // glow colour + intensity by state category
      t.glow.setTint(glowColor(a.cat, a.state))
      t.glow.setData('targetAlpha', isActive(a.cat) ? 0.34 : a.cat === 'blocked' ? 0.42 : 0.16)

      // desk personalization from tool-use (desktop metrics only)
      const m = a.metrics
      const tools = m?.tools || 0
      t.metrics.setText(m ? `⚙${m.tools} · ${fmtTok((m.inTokens || 0) + (m.outTokens || 0))}` : '').setVisible(!!m)
      for (const d of DECOR_LADDER) {
        if (tools >= d.at && !t.decor.some((o) => o.getData('emoji') === d.emoji)) {
          const o = scene.add.text(tgt.x + d.dx, tgt.y + d.dy, d.emoji, { fontSize: '11px' }).setOrigin(0.5).setDepth(5).setScale(0)
          o.setData('emoji', d.emoji)
          scene.tweens.add({ targets: o, scale: 1, duration: 320, ease: 'Back.easeOut' })
          t.decor.push(o)
        }
      }

      // movement ownership: the ambient trip system drives idle agents on their
      // coffee runs / strolls; everyone else follows the server's zone placement.
      if (!t.trip) { t.tx = tgt.x; t.ty = tgt.y; t.bear.walkTo(tgt.x, tgt.y) }
    }
    for (const [id, t] of [...bears.entries()]) {
      if (!seen.has(id)) {
        // exit juice: a small farewell wave + fade-out poof
        burst(t.tx, t.ty - 8, { tint: [0x9a9890, 0xffffff], n: 8, speed: 36, life: 500 })
        destroyTracked(t); bears.delete(id); slots.delete(id)
      }
    }
  }

  function destroyTracked(t: Tracked) {
    t.bear.destroy(); t.bubble.destroy(); t.metrics.destroy(); t.glow.destroy(); t.ind.destroy()
    if (t.trip?.cup) t.trip.cup.destroy()
    for (const o of t.decor) o.destroy()
  }

  // per-frame: drive movement + pose-on-arrival + glow/decor follow + pulse
  let pulse = 0
  let nextClackAt = 0
  const onUpdate = (_t: number, dt: number) => {
    pulse += dt * 0.004
    for (const t of bears.values()) {
      t.bear.update(dt)
      const sp = (t.bear as any).sprite
      t.bubble.setPosition(sp.x, sp.y - 30)
      t.metrics.setPosition(sp.x, sp.y + 16)
      // glow breathes under the feet; eased toward its target alpha
      const want = (t.glow.getData('targetAlpha') as number) ?? 0.22
      const breathe = 1 + Math.sin(pulse * 2) * 0.12
      t.glow.setPosition(sp.x, sp.y + 6).setScale(0.42 * breathe)
      t.glow.setAlpha(t.glow.alpha + (want * breathe - t.glow.alpha) * 0.08)
      // overhead micro-state indicator: ··· busy / ? blocked (blink) / z sleepy (drift)
      const tn = scene.time.now
      if (t.cat === 'blocked') {
        t.ind.setVisible(true).setColor('#ff6a58').setPosition(sp.x + 12, sp.y - 18).setText('?').setAlpha(Math.floor(tn / 420) % 2 ? 1 : 0.2)
      } else if (isActive(t.cat)) {
        t.ind.setVisible(true).setColor('#cfe4ee').setAlpha(0.9).setPosition(sp.x + 12, sp.y - 18).setText('·'.repeat(1 + Math.floor(tn / 320) % 3))
      } else if (t.cat === 'idle' && t.idleSince && tn - t.idleSince > 6000 && !t.trip) {
        const f = Math.floor(tn / 500) % 3
        t.ind.setVisible(true).setColor('#9ab6c8').setText('z').setAlpha(0.85 - f * 0.25).setPosition(sp.x + 12, sp.y - 18 - f * 4)
      } else t.ind.setVisible(false)
      const dx = sp.x - t.tx, dy = sp.y - t.ty
      if (dx * dx + dy * dy < 16) {           // arrived → apply static pose
        if (t.anim === 'sit') t.bear.playSit()
        else if (t.anim === 'wave' || t.anim === 'dance') t.bear.playWave()
        else if (t.anim === 'idle') t.bear.playIdle()
      }
      // ambient life: idle agents take coffee runs / strolls, then return
      if (t.idle) {
        if (!t.trip && scene.time.now >= t.nextTripAt) startTrip(t)
        else if (t.trip) driveTrip(t, scene.time.now)
      }
    }
    drivePet(scene.time.now, dt)
    chitchat(scene.time.now)
    // faint keyboard clacks while agents code — busier room → more clatter
    const coders = [...bears.values()].filter((t) => /code|edit|write/.test(t.cat)).length
    if (coders > 0 && scene.time.now >= nextClackAt) {
      sfxClack()
      nextClackAt = scene.time.now + 80 + Math.floor((220 + (scene.time.now % 160)) / Math.min(coders, 4))
    }
  }
  scene.events.on(Phaser.Scenes.Events.UPDATE, onUpdate)
  scene.input.once('pointerdown', resumeOfficeAudio)   // unlock WebAudio on first click

  const teardownBears = () => {
    scene.events.off(Phaser.Scenes.Events.UPDATE, onUpdate)
    stopDemo?.()
    for (const t of bears.values()) destroyTracked(t)
    bears.clear()
    pet?.bear.destroy(); pet = null
  }

  // ── pick a source ──
  // PREFER a direct SSE connection whenever there's a local server (explicit
  // ?agentsrc= or a localhost page). Only fall back to the Tauri bridge when the
  // page is a bundled frontend with NO localhost server. (A Tauri webview that
  // loads a localhost URL still gets __TAURI__ injected, but an external page
  // can't invoke commands — so taking the bridge branch there silently fails.)
  let explicit: string | null = null
  let isLocal = false
  try {
    explicit = new URLSearchParams(window.location.search).get('agentsrc') || (window as any).__OFFICE_AGENT_URL || null
    isLocal = /^(localhost$|127\.|0\.0\.0\.0)/.test(window.location.hostname)
  } catch {}
  const src = explicit || (isLocal ? 'http://localhost:4500/events' : null)

  if (src) {
    try {
      es = new EventSource(src)
      es.onmessage = (e) => { try { reconcile(JSON.parse(e.data)) } catch {} }
      es.onerror = () => { if (!gotData) { try { es?.close() } catch {} ; es = null; startDemo(reconcile) } }
    } catch { startDemo(reconcile) }
    cleanup = () => { try { es?.close() } catch {} ; teardownBears() }
    return
  }

  // ── bundled-frontend desktop fallback: the Rust bridge re-emits the SSE ──
  const tauri = (window as any).__TAURI__
  if (tauri?.event?.listen) {
    let unlisten: (() => void) | null = null
    tauri.core?.invoke?.('start_office_bridge').catch(() => {})
    tauri.event.listen('office-state', (e: any) => {
      try { reconcile(typeof e.payload === 'string' ? JSON.parse(e.payload) : e.payload) } catch {}
    }).then((u: any) => { unlisten = u })
    cleanup = () => { try { unlisten?.() } catch {} ; teardownBears() }
    return
  }

  // ── public web: no local server, no bridge → demo ──
  const demoTimer = scene.time.delayedCall(250, () => startDemo(reconcile))
  cleanup = () => { demoTimer?.remove(false); teardownBears() }
}

let cleanup: (() => void) | null = null
let stopDemo: (() => void) | null = null
export function teardownOfficeAgents(): void { cleanup?.(); cleanup = null }

// ── DEMO: a tiny canned scene so the office breathes without a local server ──
function startDemo(reconcile: (s: { agents: AgentSnap[] }) => void) {
  const A = (id: string, kind: 'main' | 'sub', label: string, species: string, cat: string, state: string, emoji: string, anim: string, zone: string, detail: string, metrics?: AgentMetrics): AgentSnap =>
    ({ id, kind, label, species, cat, state, emoji, anim, zone, detail, fiction: false, metrics })
  const M = (tools: number, tok: number): AgentMetrics => ({ tools, inTokens: tok, outTokens: Math.round(tok * 0.1) })
  // a perpetually-idle intern keeps the room alive — it wanders / coffee-runs the
  // whole time (its cat stays 'idle' across every frame).
  const intern = A('intern', 'sub', 'intern', 'hamster', 'idle', 'idle_relax', '🫧', 'idle', 'lounge', 'puttering about', M(2, 40_000))
  const frames: AgentSnap[][] = [
    [A('main', 'main', 'You', 'bear', 'code', 'edit_code', '⌨️', 'sit', 'boss', 'writing code', M(31, 3_190_000)),
     A('rev', 'sub', 'code-reviewer', 'fox', 'read', 'read_diff', '🔍', 'sit', 'desk', 'reviewing the diff', M(6, 210_000)),
     A('db', 'sub', 'db-auditor', 'frog', 'mcp', 'mcp_db', '🗄️', 'sit', 'desk', 'querying Supabase', M(14, 520_000)), intern],
    [A('main', 'main', 'You', 'bear', 'delegate', 'del_spawn', '🤝', 'wave', 'whiteboard', 'delegating', M(33, 3_300_000)),
     A('rev', 'sub', 'code-reviewer', 'fox', 'run', 'run_test', '🧪', 'sit', 'infra', 'running tests', M(13, 360_000)),
     A('db', 'sub', 'db-auditor', 'frog', 'idle', 'idle_coffee', '☕', 'idle', 'pantry', 'getting coffee', M(15, 540_000)), intern],
    [A('main', 'main', 'You', 'bear', 'run', 'run_deploy', '🚢', 'sit', 'infra', 'deploying', M(35, 3_400_000)),
     A('rev', 'sub', 'code-reviewer', 'fox', 'life', 'life_done', '🎉', 'wave', 'lounge', 'done ✓', M(30, 410_000)),
     A('db', 'sub', 'db-auditor', 'frog', 'social', 'soc_coffee', '💬', 'wave', 'pantry', 'chatting', M(15, 540_000)), intern],
  ]
  let i = 0
  reconcile({ agents: frames[0] })
  const h = setInterval(() => { i = (i + 1) % frames.length; reconcile({ agents: frames[i] }) }, 4000)
  stopDemo = () => clearInterval(h)
}
