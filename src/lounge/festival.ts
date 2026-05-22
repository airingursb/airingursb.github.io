// V3.0-X · Overnight 3 — Festival client.
//
// Fetches /api/ai-companion/festival once per scene + renders date-gated
// decorations and interactable objects (e.g. the beach rice sack during
// Dragon Boat).

import Phaser from 'phaser'
import { showToast } from './ui'

const API_BASE = 'https://chat.ursb.me'

export type FestivalStep = { id: string; npc_id: string | null; description: string }
export type FestivalActive = {
  slug: string
  name: string
  start_date: string
  end_date: string
  narrative: string
  decorations_hints: any
  steps?: FestivalStep[]
  reward_unlock?: { slug: string; label: string }
}
export type FestivalProgress = {
  current_step: number
  steps_completed: string[]
  inventory_unlocked: string[]
  completed_at: string | null
}

let cached: { active: FestivalActive | null; progress: FestivalProgress | null } | null = null
let inFlight: Promise<typeof cached> | null = null

export async function getFestivalState() {
  if (cached) return cached
  if (inFlight) return inFlight
  inFlight = fetch(`${API_BASE}/api/ai-companion/festival`, { credentials: 'include' })
    .then(async (r) => {
      if (!r.ok) return { active: null, progress: null }
      const body = await r.json()
      cached = body
      return body
    })
    .catch(() => ({ active: null, progress: null }))
    .finally(() => { inFlight = null })
  return inFlight
}

/** Force refresh (e.g. after advancing a step). */
export function invalidateFestivalCache() { cached = null }

export async function advanceFestivalStep(stepId: string): Promise<{ ok: boolean; final?: boolean }> {
  try {
    const res = await fetch(`${API_BASE}/api/ai-companion/festival/advance`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ step_id: stepId }),
    })
    if (!res.ok) return { ok: false }
    const body = await res.json()
    invalidateFestivalCache()
    return { ok: true, final: !!body.completed_final }
  } catch {
    return { ok: false }
  }
}

/**
 * Spawn festival decorations + interactables for the given room.
 * Returns a dispose function. Called from RoomScene after main setup.
 */
export async function spawnFestivalDecor(
  scene: Phaser.Scene,
  roomId: string,
  mapWidthPx: number,
  mapHeightPx: number
): Promise<() => void> {
  const state = await getFestivalState()
  if (!state?.active) return () => {}
  const fest = state.active
  const progress = state.progress
  const hints = fest.decorations_hints?.[roomId]
  if (!hints) return () => {}

  const objects: Array<{ destroy: () => void }> = []
  const dispose = () => { for (const o of objects) { try { o.destroy() } catch {} } }

  // ── Red ribbons (端午 festive vibe) ─────────────────────────────
  if (hints.red_ribbons) {
    // Draw 4 hanging ribbons across the top of the room
    for (let i = 0; i < 4; i++) {
      const x = (mapWidthPx / 5) * (i + 1)
      const y = 8
      // Hang: a small red rect + a longer thin tail
      const knot = scene.add.rectangle(x, y, 6, 4, 0xc23030, 0.85).setDepth(2)
      const tail = scene.add.rectangle(x, y + 14, 2, 20, 0xa02020, 0.7).setDepth(2)
      objects.push(knot, tail)
      // Subtle sway
      const sway = scene.tweens.add({
        targets: tail,
        x: x + 0.5, duration: 2400 + Math.random() * 800,
        yoyo: true, repeat: -1, ease: 'Sine.inOut',
      })
      objects.push({ destroy: () => sway.remove() })
    }
  }

  // ── Zongzi pile (lobby decoration once step 4 reached) ──────────
  if (hints.zongzi_pile && progress?.steps_completed?.includes('give_rice_to_mio')) {
    const { x, y } = hints.zongzi_pile
    // A small triangular pile — 3 dark green zongzi shapes
    for (let i = 0; i < 3; i++) {
      const zx = x + (i - 1) * 5
      const zy = y - Math.abs(i - 1) * 2
      const body = scene.add.rectangle(zx, zy, 5, 5, 0x3e6b3a, 0.95).setDepth(3)
      const ribbon = scene.add.rectangle(zx, zy, 1, 6, 0xa02020, 0.95).setDepth(4)
      objects.push(body, ribbon)
    }
  }

  // ── Rice sack on beach (interactable, step 1→2) ─────────────────
  if (
    hints.rice_sack
    && progress?.steps_completed?.includes('pip_mentions_rice')
    && !progress?.steps_completed?.includes('find_rice_at_beach')
  ) {
    const { x, y } = hints.rice_sack
    const sack = scene.add.rectangle(x, y, 8, 10, 0xd9c89a, 1).setDepth(3)
    const tie = scene.add.rectangle(x, y - 5, 5, 1, 0x6a5030, 1).setDepth(4)
    const sparkle = scene.add.rectangle(x + 5, y - 6, 1, 1, 0xfff7c0, 1).setDepth(5)
    sack.setInteractive({ useHandCursor: true })
    sack.on('pointerdown', async () => {
      const r = await advanceFestivalStep('find_rice_at_beach')
      if (r.ok) {
        showToast('找到了一袋糯米 · 带去给 Mio', 3000)
        // Add to inventory? For now just despawn — the "give to Mio" is
        // implicit (auto-advance when user next chats with Mio).
        try { sack.destroy(); tie.destroy(); sparkle.destroy() } catch {}
      }
    })
    // Soft pulse to draw the eye
    const pulse = scene.tweens.add({
      targets: sparkle, alpha: 0.3, scale: 1.6,
      duration: 1200, yoyo: true, repeat: -1, ease: 'Sine.inOut',
    })
    objects.push(sack, tie, sparkle, { destroy: () => pulse.remove() })
  }

  return dispose
}
