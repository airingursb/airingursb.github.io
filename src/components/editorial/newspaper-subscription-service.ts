import { z } from 'zod';

const subscriptionResponse = z.object({ ok: z.literal(true), alreadySubscribed: z.boolean() });

export type SubscriptionFailure = 'invalidEmail' | 'limited' | 'unavailable' | 'network';
export type SubscriptionResult =
  | { readonly status: 'confirmed' }
  | { readonly status: 'already' }
  | { readonly status: 'error'; readonly reason: SubscriptionFailure };
export type SubscriptionRequest = { readonly email: string; readonly lang: 'zh' | 'en' };

export async function subscribeToNewspaper(request: SubscriptionRequest, signal: AbortSignal): Promise<SubscriptionResult> {
  try {
    const response = await fetch('https://chat.ursb.me/api/subscribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request),
      signal: AbortSignal.any([signal, AbortSignal.timeout(15_000)]),
    });
    if (!response.ok) {
      const reason = response.status === 429 || response.status === 403 ? 'limited'
        : response.status === 400 ? 'invalidEmail' : 'unavailable';
      return { status: 'error', reason };
    }
    const parsed = subscriptionResponse.safeParse(await response.json());
    if (!parsed.success) return { status: 'error', reason: 'unavailable' };
    return { status: parsed.data.alreadySubscribed ? 'already' : 'confirmed' };
  } catch (error) {
    if (error instanceof SyntaxError) return { status: 'error', reason: 'unavailable' };
    if (error instanceof Error) return { status: 'error', reason: 'network' };
    throw error;
  }
}
