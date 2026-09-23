import { z } from 'astro/zod';
const lampSchema = z.number().int().min(0).max(5);
export const lampStateSchema = z.object({
  namespace: z.enum(['bear-tree-lamps-v1', 'bear-tree-lamps-preview-v1']),
  source: z.enum(['shared-supabase', 'shared-preview-sqlite']),
  night: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), active: z.boolean(),
  serverNow: z.string().datetime({ offset: true }), nextChangeAt: z.string().datetime({ offset: true }),
  lights: z.array(lampSchema).max(6), contributed: z.boolean(), yourLamp: lampSchema.nullable(),
  accepted: z.boolean(), outcome: z.enum(['state', 'lit', 'already', 'occupied', 'full', 'daytime']),
  simulated: z.boolean().optional(),
}).refine(state => new Set(state.lights).size === state.lights.length &&
  state.contributed === (state.yourLamp !== null) && (state.yourLamp === null || state.lights.includes(state.yourLamp)) &&
  (state.active || state.lights.length === 0) && state.accepted === (state.outcome === 'lit'));
export type LampState = Readonly<z.infer<typeof lampStateSchema>>;
export type LampResult = { readonly kind: 'ok'; readonly state: LampState }
  | { readonly kind: 'session' } | { readonly kind: 'unavailable' };

export async function lampRequest(options: { readonly preview: boolean; readonly lamp: number | null; readonly signal: AbortSignal }): Promise<LampResult> {
  const url = options.preview ? new URL('/api/preview/tree-lamps', location.origin) : new URL('https://chat.ursb.me/api/tree-lamps');
  if (options.preview) {
    url.port = '4420';
    const scene = new URLSearchParams(location.search).get('scene');
    if (scene === 'night' || scene === 'day') url.searchParams.set('scene', scene);
  }
  if (options.lamp !== null) url.pathname += `/light/${options.lamp}`;
  try {
    // Match the existing garden transport: bounded time, explicit failures, no write retries.
    const response = await fetch(url, { method: options.lamp === null ? 'GET' : 'POST',
      credentials: 'include', cache: 'no-store', signal: AbortSignal.any([options.signal, AbortSignal.timeout(5000)]) });
    if (response.status === 409) return { kind: 'session' };
    if (!response.ok) return { kind: 'unavailable' };
    const parsed = lampStateSchema.safeParse(await response.json());
    if (!parsed.success || parsed.data.namespace !== (options.preview ? 'bear-tree-lamps-preview-v1' : 'bear-tree-lamps-v1') ||
        parsed.data.source !== (options.preview ? 'shared-preview-sqlite' : 'shared-supabase')) return { kind: 'unavailable' };
    return { kind: 'ok', state: parsed.data };
  } catch (error) {
    if (error instanceof TypeError || error instanceof DOMException || error instanceof SyntaxError) return { kind: 'unavailable' };
    throw error;
  }
}
