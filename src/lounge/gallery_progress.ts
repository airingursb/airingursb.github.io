// Tracks which gallery exhibits the player has viewed. Persists to
// localStorage so progress survives sessions. Renderers query
// `hasVisited(slug)` and add a small brass "✓" check to the plaque of
// previously visited works — a subtle reward for thorough museum-goers.

const STORAGE_KEY = 'gallery_visited_v1'
const visited = new Set<string>()
let loaded = false

function load(): void {
  if (loaded) return
  loaded = true
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const arr = JSON.parse(raw)
      if (Array.isArray(arr)) for (const s of arr) visited.add(String(s))
    }
  } catch {}
}

function save(): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify([...visited]))
  } catch {}
}

export function markVisited(slugOrUrl: string): void {
  if (!slugOrUrl) return
  load()
  if (visited.has(slugOrUrl)) return
  visited.add(slugOrUrl)
  save()
}

export function hasVisited(slugOrUrl: string): boolean {
  load()
  return visited.has(slugOrUrl)
}

export function getVisitedCount(): number {
  load()
  return visited.size
}

export function resetGalleryProgress(): void {
  visited.clear()
  save()
}
