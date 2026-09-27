import { aiWeeklyIssues } from '../../../data/ai-weekly';

export function GET() {
  return new Response(JSON.stringify({ version: 1, issues: aiWeeklyIssues }), {
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
  });
}
