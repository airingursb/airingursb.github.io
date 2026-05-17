// supabase/functions/comics-bot/index.ts
// Entry point: Telegram webhook handler.
// Returns 200 immediately so Telegram doesn't time out, processes update asynchronously.
import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { handleMessage, handleCallback } from './strip.ts';

Deno.serve(async (req: Request) => {
  if (req.method !== 'POST') {
    return new Response('method not allowed', { status: 405 });
  }
  let update: any;
  try {
    update = await req.json();
  } catch {
    return new Response('bad json', { status: 400 });
  }

  // Reply 200 immediately. Defer the actual work.
  // Edge functions support waitUntil-style background work via the request lifetime.
  // Since we returned the response, the function instance still runs until its async work completes
  // up to the 400s wall-clock limit.
  const work = (async () => {
    try {
      if (update.message) await handleMessage(update);
      else if (update.callback_query) await handleCallback(update);
    } catch (e) {
      console.error('[comics-bot]', e);
    }
  })();

  // EdgeRuntime.waitUntil keeps the worker alive for the background promise.
  // @ts-ignore — EdgeRuntime is provided by Supabase
  if (typeof EdgeRuntime !== 'undefined' && EdgeRuntime.waitUntil) {
    // @ts-ignore
    EdgeRuntime.waitUntil(work);
  }

  return new Response('ok', { status: 200 });
});
