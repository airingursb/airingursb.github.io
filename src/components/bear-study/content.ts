import type { LifeContent } from './life';

export type TravelPhoto = {
  readonly slug: string;
  readonly title?: string;
  readonly tags?: readonly string[];
  readonly syncedAt?: string;
  readonly firstSyncedAt?: string;
  readonly place?: { readonly countryCode?: string };
};

export function latestTravelPhoto(photos: readonly TravelPhoto[], now: number): LifeContent | null {
  let latest: LifeContent | null = null;
  for (const photo of photos) {
    const country = photo.place?.countryCode?.trim().toLowerCase();
    const taggedTravel = photo.tags?.some((tag) => ['travel', '旅行'].includes(tag.trim().toLowerCase()));
    if (!(country && country !== 'sg') && !taggedTravel) continue;
    const slug = photo.slug.trim();
    if (!slug || slug === '.' || slug === '..' || /[\uD800-\uDFFF]/u.test(slug)) continue;
    const publishedAt = Date.parse(photo.firstSyncedAt ?? photo.syncedAt ?? '');
    if (!Number.isFinite(publishedAt) || publishedAt > now) continue;
    if (latest !== null && latest.publishedAt >= publishedAt) continue;
    latest = {
      href: `/photos/${encodeURIComponent(slug)}/`,
      title: photo.title?.trim() || '旅行照片',
      publishedAt,
    };
  }
  return latest;
}
