import type { APIContext } from 'astro';

const skills: Array<{
  name: string;
  description: string;
  repo: string;
  keywords: string[];
}> = [];

export async function GET(_context: APIContext) {
  return new Response(JSON.stringify({ skills }), {
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
  });
}
