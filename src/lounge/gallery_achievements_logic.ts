// Pure logic for gallery achievements — extracted so it's importable in
// Node tests without dragging the Phaser-coupled renderer along.
// `gallery_achievements.ts` re-exports from here.

export type Achievement = {
  id: string
  label: string
  requiresAll: string[]      // exhibit URLs that must all be visited
}

export const ACHIEVEMENTS: Achievement[] = [
  {
    id: 'web_internals',
    label: 'Web Internals 全通',
    requiresAll: [
      '/immersive/chromium-renderer/', '/immersive/css-engine/',
      '/immersive/react-internals/', '/immersive/webgpu/',
      '/immersive/webassembly/', '/immersive/image-formats/',
    ],
  },
  {
    id: 'performance',
    label: 'Performance 全通',
    requiresAll: [
      '/immersive/gc/', '/immersive/helio/', '/immersive/jank-stutter/',
      '/immersive/llm-inference-life/', '/immersive/quickjs/', '/immersive/v8-fast-js/',
    ],
  },
  {
    id: 'networks',
    label: 'Networks 全通',
    requiresAll: ['/immersive/http3/', '/immersive/tls-handshake/'],
  },
  {
    id: 'curator',
    label: 'Curator · 看过全部 14 篇 immersive',
    requiresAll: [
      '/immersive/chromium-renderer/', '/immersive/css-engine/',
      '/immersive/react-internals/', '/immersive/webgpu/',
      '/immersive/webassembly/', '/immersive/image-formats/',
      '/immersive/gc/', '/immersive/helio/', '/immersive/jank-stutter/',
      '/immersive/llm-inference-life/', '/immersive/quickjs/', '/immersive/v8-fast-js/',
      '/immersive/http3/', '/immersive/tls-handshake/',
    ],
  },
  {
    id: 'easter_egg',
    label: '策展人发现 · 找到馆主签名',
    requiresAll: ['/'],
  },
]

/** Given the set of visited exhibit urls, return the achievements unlocked.
 *  Order matches ACHIEVEMENTS array — gallery_achievements.ts relies on
 *  this stable order to allocate medallion slots in the rotunda. */
export function computeUnlockedAchievements(visited: ReadonlySet<string>): Achievement[] {
  return ACHIEVEMENTS.filter((a) => a.requiresAll.every((url) => visited.has(url)))
}
