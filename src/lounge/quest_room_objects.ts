// V3.0-X · Overnight A2 — render interactable quest objects in rooms.
//
// Fetches /api/ai-companion/quests (cached per scene), filters to quests
// whose state is suggested/accepted AND whose room_object.room matches
// the current room. Clicks → POST /quests/:slug/complete → toast +
// despawn the object.

import Phaser from 'phaser'
import { showToast } from './ui'
import { playSfx } from './audio'

const API = 'https://chat.ursb.me'

let cache: { ts: number; rows: any[] } | null = null
const CACHE_TTL_MS = 60_000

async function fetchQuests(): Promise<any[]> {
  if (cache && Date.now() - cache.ts < CACHE_TTL_MS) return cache.rows
  try {
    const res = await fetch(`${API}/api/ai-companion/quests`, { credentials: 'include' })
    if (!res.ok) return []
    const body = await res.json()
    cache = { ts: Date.now(), rows: body.quests ?? [] }
    return cache.rows
  } catch { return [] }
}

export function invalidateQuestRoomCache() { cache = null }

/**
 * Spawn quest interactables for the given room. Returns dispose fn.
 * Call after scene/room is set up.
 */
export async function spawnQuestRoomObjects(
  scene: Phaser.Scene,
  roomId: string
): Promise<() => void> {
  const quests = await fetchQuests()
  const objects: Array<{ destroy: () => void }> = []
  const dispose = () => { for (const o of objects) { try { o.destroy() } catch {} } }

  for (const q of quests) {
    const ro = q.room_object
    if (!ro) continue
    if (ro.room !== roomId) continue
    if (q.state === 'completed' || q.state === 'declined') continue

    const color = ro.sprite?.color ?? 0x6a3c1f
    const w = ro.sprite?.w ?? 8
    const h = ro.sprite?.h ?? 10
    const body = scene.add.rectangle(ro.x, ro.y, w, h, color, 1).setDepth(3)
    // Subtle pulse to draw the eye (similar to pebble pattern)
    const glow = scene.add.rectangle(ro.x, ro.y - h / 2 - 2, 2, 2, 0xfff7c0, 0.9).setDepth(4)
    const pulse = scene.tweens.add({
      targets: glow, alpha: 0.3, scale: 1.5,
      duration: 1200, yoyo: true, repeat: -1, ease: 'Sine.inOut',
    })
    body.setInteractive({ useHandCursor: true })
    body.on('pointerover', () => {
      if (ro.label) showToast(`${ro.label}${ro.hint ? ' — ' + ro.hint : ''}`, 1500)
    })
    body.on('pointerdown', async () => {
      try {
        const res = await fetch(`${API}/api/ai-companion/quests/${q.slug}/complete`, {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ evidence: `clicked in ${roomId}` }),
        })
        if (res.ok) {
          const data = await res.json()
          showToast(`📜 ${q.title} · 完成了 +${data.reward_heart || 1} ♥`, 2800)
          playSfx('item_collect')
          invalidateQuestRoomCache()
          try { body.destroy(); glow.destroy(); pulse.remove() } catch {}
        }
      } catch (err) {
        console.warn('[quest-obj] complete failed:', err)
      }
    })
    objects.push(body, glow, { destroy: () => pulse.remove() })
  }

  return dispose
}
