import type { APIContext } from 'astro';

const skills: Array<{
  name: string;
  description: string;
  repo: string;
  path?: string;
  keywords: string[];
}> = [
  {
    name: 'airing-writer',
    description: 'Airing 个人博客（ursb.me）文人论说体写作',
    repo: 'https://github.com/airingursb/airingursb.github.io',
    path: 'skills/airing-writer',
    keywords: ['writing', 'write', 'blog', '写作', '博客', '文章', '周刊', '月刊', '年度总结', 'ursb.me'],
  },
];

export async function GET(_context: APIContext) {
  return new Response(JSON.stringify({ skills }), {
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
  });
}
