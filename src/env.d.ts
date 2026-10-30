/// <reference types="astro/client" />

interface ImportMetaEnv {
  readonly PUBLIC_MAPBOX_TOKEN?: string;
  readonly PUBLIC_SUPABASE_URL?: string;
  readonly PUBLIC_SUPABASE_ANON_KEY?: string;
  /** Local dev only: blog-api host for /api/posts/trending (default https://chat.ursb.me). */
  readonly PUBLIC_TRENDING_API_BASE?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
