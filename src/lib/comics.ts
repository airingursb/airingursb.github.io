// src/lib/comics.ts
// Build-time Supabase fetch of all approved comics.

export interface ComicPanels {
  url: string;            // what pages show (WebP for strips published via comics-studio)
  original?: string;      // source PNG, used where WebP is poorly supported (og:image)
  width?: number;
  height?: number;
  previous?: string | null;
  alt?: { zh: string; en: string };
}

export interface Comic {
  id: string;
  issue_number: number;
  source_text: string;
  panels: ComicPanels;
  title: { zh: string; en: string };
  tags: string[];
  published_at: string;
  created_at: string;
}

/**
 * The day an episode is about, YYYY-MM-DD. The source text opens with it
 * ("2026/8/15，和同事去…"); published_at (late evening, Singapore time) is
 * the fallback.
 */
export function comicDate(c: Comic): string {
  const m = (c.source_text || '').match(/^\s*(\d{4})\/(\d{1,2})\/(\d{1,2})/);
  if (m) return `${m[1]}-${m[2].padStart(2, '0')}-${m[3].padStart(2, '0')}`;
  const t = Date.parse(c.published_at);
  return Number.isNaN(t) ? '' : new Date(t + 8 * 3600 * 1000).toISOString().slice(0, 10);
}

const SUPABASE_URL =(import.meta as any).env?.BLOG_SUPABASE_URL || process.env.BLOG_SUPABASE_URL || '';
const SUPABASE_KEY = (import.meta as any).env?.BLOG_SUPABASE_SERVICE_KEY || process.env.BLOG_SUPABASE_SERVICE_KEY || '';

export async function fetchComics(): Promise<Comic[]> {
  if (!SUPABASE_URL || !SUPABASE_KEY) {
    console.warn('[comics] Supabase env not set, returning empty list');
    return [];
  }
  const url = `${SUPABASE_URL}/rest/v1/comics?select=id,issue_number,source_text,panels,title,tags,published_at,created_at&approved=eq.true&deleted=eq.false&order=issue_number.desc`;
  try {
    const res = await fetch(url, {
      headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` },
    });
    if (!res.ok) {
      console.error('[comics] fetch failed:', res.status, await res.text());
      return [];
    }
    return await res.json();
  } catch (e) {
    console.error('[comics] fetch threw:', e);
    return [];
  }
}
