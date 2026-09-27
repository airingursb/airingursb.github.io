import rss from '@astrojs/rss';
import { aiWeeklyIssues } from '../../../../data/ai-weekly';
import { aiWeeklyRssItems } from '../../../../lib/ai-weekly-feed';

export function GET() {
  return rss({
    title: 'AI Trends Weekly · Airing',
    description: 'A week of AI reading, edited into an issue to explore and revisit.',
    site: 'https://ursb.me',
    stylesheet: '/feed.xsl',
    items: aiWeeklyRssItems(aiWeeklyIssues, 'en'),
    customData: '<language>en</language>',
  });
}
