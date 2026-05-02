/**
 * URL-safe slug for facet values like camera names ("Sony ILCE-7M4" -> "sony-ilce-7m4").
 * Mirrors the logic in scripts/lib/photos-source.mjs deriveSlug.
 */
export function slugify(text: string): string {
  return (text || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}
