// South Pavilion · comics wall. Fetches the comics list from
// /api/gallery-comics.json (built statically by Astro at deploy time), then
// renders each issue as a wall frame in the south pavilion. Player can click
// any frame to open that specific comic issue in a side panel.
//
// Frames are arranged in a 2-column grid up the left and right walls of the
// south pavilion (mirroring the wing painting layout). If more issues exist
// than the wall can hold, the most recent ones win.

import Phaser from 'phaser'
import { crispText } from './gallery_text'
import type { RoomId } from './config'

type GalleryComic = {
  issue: number
  title_zh: string
  title_en: string
  cover_url?: string
  alt_zh?: string
}

let layer: Phaser.GameObjects.Container | null = null
let inflight: AbortController | null = null
let registeredInteractables: Array<{
  x: number; y: number; w: number; h: number;
  anchorX: number; anchorY: number;
  comic: GalleryComic;
}> = []

// Wall mounting positions in the south pavilion (x=384..896, y=704..960).
// 2 columns: left wall (x=400) + right wall (x=880). 4 frames per side = 8 total.
// Each frame is 48×48, painting-style.
const SOUTH_FRAME_SLOTS: Array<{ x: number; y: number; side: 'left' | 'right' }> = [
  { x: 408, y: 736, side: 'left'  },
  { x: 408, y: 800, side: 'left'  },
  { x: 408, y: 864, side: 'left'  },
  { x: 408, y: 920, side: 'left'  },
  { x: 872, y: 736, side: 'right' },
  { x: 872, y: 800, side: 'right' },
  { x: 872, y: 864, side: 'right' },
  { x: 872, y: 920, side: 'right' },
]

export function setupGalleryComics(scene: Phaser.Scene, roomId: RoomId) {
  teardownGalleryComics()
  if (roomId !== 'room_gallery') return

  layer = scene.add.container(0, 0).setDepth(3.2)

  // Empty-frame placeholders shown while the fetch is in flight (and remain
  // for any unused slots).
  for (const slot of SOUTH_FRAME_SLOTS) {
    drawEmptyFrame(scene, layer, slot.x, slot.y)
  }

  inflight = new AbortController()
  // Snapshot the layer + scene refs so a scene restart that swaps in a new
  // module-level `layer` can't be corrupted by a stale fetch callback.
  const ourLayer = layer
  const ourScene = scene
  void fetch('/api/gallery-comics.json', { signal: inflight.signal })
    .then(r => r.ok ? r.json() as Promise<GalleryComic[]> : [])
    .then(list => {
      if (ourLayer !== layer || !ourLayer.scene) return  // teardown or restart
      const sorted = [...list].sort((a, b) => b.issue - a.issue)
      const items = sorted.slice(0, SOUTH_FRAME_SLOTS.length)
      ourLayer.removeAll(true)
      registeredInteractables = []
      for (let i = 0; i < SOUTH_FRAME_SLOTS.length; i++) {
        const slot = SOUTH_FRAME_SLOTS[i]
        const comic = items[i]
        if (comic) {
          drawComicFrame(ourScene, ourLayer, slot.x, slot.y, slot.side, comic)
        } else {
          drawEmptyFrame(ourScene, ourLayer, slot.x, slot.y)
        }
      }
    })
    .catch((err) => {
      if (err?.name !== 'AbortError') console.warn('[gallery-comics] fetch failed:', err)
    })
}

function drawEmptyFrame(
  scene: Phaser.Scene,
  layer: Phaser.GameObjects.Container,
  cx: number, cy: number
) {
  const fw = 48, fh = 48
  layer.add(scene.add.rectangle(cx + 2, cy + 3, fw, fh, 0x000000, 0.45))
  layer.add(scene.add.rectangle(cx, cy, fw, fh, 0x4a3a20))
  layer.add(scene.add.rectangle(cx, cy, fw - 3, fh - 3, 0x6a5028))
  layer.add(scene.add.rectangle(cx, cy, fw - 9, fh - 9, 0x14202a))
}

function drawComicFrame(
  scene: Phaser.Scene,
  layer: Phaser.GameObjects.Container,
  cx: number, cy: number,
  side: 'left' | 'right',
  comic: GalleryComic
) {
  const fw = 48, fh = 48
  // Frame layers (same palette as paintings for visual consistency)
  layer.add(scene.add.rectangle(cx + 2, cy + 3, fw, fh, 0x000000, 0.55))
  layer.add(scene.add.rectangle(cx, cy, fw, fh, 0x6a4818))
  layer.add(scene.add.rectangle(cx, cy, fw - 4, fh - 4, 0xc8a058))
  layer.add(scene.add.rectangle(cx, cy, fw - 7, fh - 7, 0xe6c878, 0.55))
  layer.add(scene.add.rectangle(cx, cy, fw - 10, fh - 10, 0x3a2810))

  // Comic content area. Remote comic covers live on r2.airingdeng.com which
  // does NOT currently send Access-Control-Allow-Origin headers, so we
  // can't load them as WebGL textures directly. Until the R2 bucket is
  // configured to allow CORS from ursb.me, we render a stylized placeholder:
  // dark velvet mat + panda emoji + issue number. The frame is still fully
  // clickable — clicking opens the specific /comics/<N> page.
  layer.add(scene.add.rectangle(cx, cy, fw - 14, fh - 14, 0x14202a))
  layer.add(crispText(scene, cx, cy - 6, '🐼', {
    fontSize: '20px',
    fontFamily: 'ui-monospace, monospace',
  }).setOrigin(0.5))
  layer.add(crispText(scene, cx, cy + 14, `#${comic.issue}`, {
    fontSize: '8px', color: '#c8a058',
    fontFamily: 'ui-monospace, monospace',
  }).setOrigin(0.5))

  // Make the whole frame clickable. Mark visited on click too so the plaque
  // ✓ tick appears whether the player used E or directly clicked the frame.
  const hit = scene.add.rectangle(cx, cy, fw, fh, 0x000000, 0.001)
    .setInteractive({ useHandCursor: true })
  const url = `/comics/${comic.issue}`
  hit.on('pointerdown', () => {
    try {
      void import('./gallery_progress').then(m => m.markVisited(url))
      window.dispatchEvent(new CustomEvent('open-exhibit', {
        detail: { url, label: `#${comic.issue} ${comic.title_zh}` },
      }))
    } catch (err) {
      console.warn('[gallery-comics] click dispatch failed:', err)
    }
  })
  layer.add(hit)

  // Brass plaque
  layer.add(scene.add.rectangle(cx, cy + fh / 2 + 5, fw * 0.55, 3, 0xc8a058, 0.9)
    .setStrokeStyle(1, 0x6a4818, 0.85))

  // Record an anchor so the existing nearbyInteractable machinery can pick
  // up these frames. We expose them via setupGalleryComicsInteractables (see
  // below) which the scene calls right after this — pattern matches the
  // way painting interactables come out of the tilemap.
  const anchorOffset = side === 'left' ? 32 : -32
  registeredInteractables.push({
    x: cx - fw / 2,
    y: cy - fh / 2,
    w: fw,
    h: fh,
    anchorX: cx + anchorOffset,
    anchorY: cy,
    comic,
  })
}

export function teardownGalleryComics() {
  if (inflight) { inflight.abort(); inflight = null }
  if (layer) { layer.destroy(); layer = null }
  registeredInteractables = []
}

/** Read-only snapshot of the dynamically created comic frame interactables.
 *  RoomScene queries this after setup to add them to its nearbyInteractable
 *  check loop so the E-key prompt also works (not just clicks). */
export function getComicsInteractables() {
  return registeredInteractables.map(it => ({ ...it }))
}
