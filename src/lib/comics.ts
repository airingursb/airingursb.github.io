// src/lib/comics.ts
// Build-time Supabase fetch of all approved comics.

export interface ComicPanel {
  url: string;
  alt: { zh: string; en: string };
  dialog: { zh: string; en: string; position: 'top-left'|'top-right'|'bottom-left'|'bottom-right'|'hidden' };
}

export interface Comic {
  id: string;
  issue_number: number;
  source_text: string;
  panels: ComicPanel[];
  title: { zh: string; en: string };
  tags: string[];
  published_at: string;
  created_at: string;
}

const SUPABASE_URL = (import.meta as any).env?.BLOG_SUPABASE_URL || process.env.BLOG_SUPABASE_URL || '';
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
