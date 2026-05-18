// V10.5 — Photo album. Stores actual canvas snapshots (PNG dataURL) so the
// player has a real visual record of their session, not just metadata.
//
// Storage budget: localStorage is ~5MB total. A small canvas → dataURL is
// typically 80-200KB. We cap at 15 entries and evict oldest. Larger budgets
// belong in IndexedDB; not worth the complexity for the V10.5 MVP.

const STORAGE_KEY = 'lounge_photos_v1'
const MAX_PHOTOS = 15

export type Photo = {
  id: string
  roomLabel: string
  takenAt: number          // epoch ms
  dataUrl: string          // image/png base64
  width: number
  height: number
}

function loadAll(): Photo[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const arr = JSON.parse(raw)
    return Array.isArray(arr) ? arr : []
  } catch { return [] }
}

function saveAll(photos: Photo[]) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(photos.slice(0, MAX_PHOTOS))) }
  catch (e) {
    // Most likely QuotaExceededError. Trim to half and retry once.
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(photos.slice(0, Math.floor(MAX_PHOTOS / 2))))
    } catch {}
  }
}

export function listPhotos(): Photo[] { return loadAll() }

export function savePhoto(p: Omit<Photo, 'id' | 'takenAt'>): Photo {
  const photo: Photo = {
    ...p,
    id: 'ph_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 6),
    takenAt: Date.now()
  }
  const all = loadAll()
  all.unshift(photo)
  saveAll(all)
  // V10.4 — achievement
  try { void import('./achievements').then(m => m.recordEvent({ type: 'photo_taken', total: all.length })) } catch {}
  return photo
}

export function deletePhoto(id: string) {
  saveAll(loadAll().filter(p => p.id !== id))
}

export function getPhotoCount(): number { return loadAll().length }
