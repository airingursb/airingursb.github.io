// strip-github.ts — fire repository_dispatch to trigger deploy
const REPO = 'airingursb/airingursb.github.io';

export async function dispatchStripPublished(issueNumber: number): Promise<void> {
  const token = Deno.env.get('GH_DISPATCH_TOKEN');
  if (!token) throw new Error('GH_DISPATCH_TOKEN not set');
  const res = await fetch(`https://api.github.com/repos/${REPO}/dispatches`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      event_type: 'strip-published',
      client_payload: { issue: issueNumber },
    }),
  });
  if (res.status !== 204) {
    const body = await res.text();
    throw new Error(`GitHub dispatch failed: ${res.status} ${body}`);
  }
}
