/// <reference types="astro/client" />

interface ImportMetaEnv {
  readonly PUBLIC_MAPBOX_TOKEN?: string;
  readonly PUBLIC_SUPABASE_URL?: string;
  readonly PUBLIC_SUPABASE_ANON_KEY?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
