import rss from '@astrojs/rss';
import { aiWeeklyIssues } from '../../../data/ai-weekly';
import { aiWeeklyRssItems } from '../../../lib/ai-weekly-feed';

export function GET() {
  return rss({
    title: 'AI 趋势周刊 · Airing',
    description: '把一周的 AI 阅读，编成可以翻阅、重读的一期。',
    site: 'https://ursb.me',
    stylesheet: '/feed.xsl',
    items: aiWeeklyRssItems(aiWeeklyIssues, 'zh'),
    customData: '<language>zh-CN</language>',
  });
}
