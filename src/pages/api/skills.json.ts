import type { APIContext } from 'astro';

const skills = [
  {
    name: 'khazix-writer',
    description: '卡兹克风格公众号写作',
    repo: 'https://github.com/airingursb/skill-khazix-writer',
    keywords: ['writing', 'write', '写作', '公众号', '卡兹克'],
  },
];

export async function GET(_context: APIContext) {
  return new Response(JSON.stringify({ skills }), {
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
  });
}
