import type { APIRoute, GetStaticPaths } from 'astro';
import { aiWeeklyIssues, type AIWeeklyIssue, type WeeklyLocale } from '../../../../data/ai-weekly';
import { generateWeeklySocialImage } from '../../../../lib/ai-weekly-social-image';

interface Props { readonly issue: AIWeeklyIssue; readonly lang: WeeklyLocale }

export const getStaticPaths: GetStaticPaths = () => aiWeeklyIssues.flatMap((issue) =>
  (['zh', 'en'] as const).map((lang) => ({ params: { slug: issue.number, lang }, props: { issue, lang } })),
);

export const GET: APIRoute<Props> = async ({ props: { issue, lang } }) => {
  const image = await generateWeeklySocialImage(issue, lang);
  return new Response(new Uint8Array(image), { headers: { 'Content-Type': 'image/jpeg' } });
};
