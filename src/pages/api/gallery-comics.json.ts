// Build-time static JSON endpoint that lists all approved comics for the
// in-game gallery's south pavilion. The Phaser gallery renderer fetches
// /api/gallery-comics.json at runtime and renders each issue as a wall
// frame. Generated once per build — refreshed on every deploy.

import type { APIRoute } from 'astro'
import { fetchComics } from '../../lib/comics'

export const GET: APIRoute = async () => {
  const comics = await fetchComics()
  // Strip down to the fields the gallery actually needs (smaller payload)
  const slim = comics.map(c => ({
    issue:     c.issue_number,
    title_zh:  c.title?.zh ?? `第 ${c.issue_number} 期`,
    title_en:  c.title?.en ?? `Issue ${c.issue_number}`,
    cover_url: c.panels?.url,
    alt_zh:    c.panels?.alt?.zh ?? '',
  }))
  return new Response(JSON.stringify(slim), {
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'public, max-age=3600',
    },
  })
}
