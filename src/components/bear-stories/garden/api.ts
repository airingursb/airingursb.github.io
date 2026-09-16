import { z } from 'astro/zod';

export const gardenStateSchema = z.object({
  namespace: z.enum(['bear-garden-preview-v1', 'bear-garden-v1']),
  today: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  totalWaterings: z.number().int().nonnegative(),
  stage: z.enum(['seed', 'sprout', 'bud', 'bloom']),
  wateredToday: z.boolean(),
  updatedAt: z.string().nullable(),
  source: z.enum(['shared-preview-sqlite', 'shared-supabase']),
  accepted: z.boolean().optional(),
});

export type GardenState = Readonly<z.infer<typeof gardenStateSchema>>;
export type GardenResult =
  | { readonly kind: 'ok'; readonly state: GardenState }
  | { readonly kind: 'session' }
  | { readonly kind: 'unavailable' };

export function gardenApiUrl(preview: boolean): URL {
  if (!preview) return new URL('https://chat.ursb.me/api/garden');
  const url = new URL('/api/preview/garden', location.origin);
  url.port = '4410';
  return url;
}

export async function gardenRequest(watering: boolean, preview = false): Promise<GardenResult> {
  const url = gardenApiUrl(preview);
  if (watering) url.pathname += '/water';
  const attempts = watering ? 1 : 2;
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    try {
      const response = await fetch(url, {
        method: watering ? 'POST' : 'GET', credentials: 'include', cache: 'no-store',
        signal: AbortSignal.timeout(5000),
        ...(watering ? { headers: { 'Content-Type': 'application/json' }, body: '{}' } : {}),
      });
      if (response.status === 409) return { kind: 'session' };
      if (!response.ok) continue;
      const parsed = gardenStateSchema.safeParse(await response.json());
      if (parsed.success && parsed.data.namespace === (preview ? 'bear-garden-preview-v1' : 'bear-garden-v1') &&
          parsed.data.source === (preview ? 'shared-preview-sqlite' : 'shared-supabase')) return { kind: 'ok', state: parsed.data };
      return { kind: 'unavailable' };
    } catch (error) {
      if (!(error instanceof TypeError || error instanceof DOMException || error instanceof SyntaxError)) throw error;
    }
  }
  return { kind: 'unavailable' };
}
