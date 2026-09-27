import type { AIWeeklyIssue, WeeklyLocale } from '../data/ai-weekly';

export function aiWeeklyRssItems(issues: readonly AIWeeklyIssue[], lang: WeeklyLocale) {
  const escape = (value: string) => value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');
  return issues.map((issue) => {
    const canonical = new URL(issue.href[lang], 'https://ursb.me').href;
    const campaignLink = (anchor = '') => {
      const link = new URL(canonical);
      link.searchParams.set('utm_source', 'ai-weekly');
      link.searchParams.set('utm_medium', 'rss');
      link.searchParams.set('utm_campaign', `ai-weekly-${issue.number}`);
      link.searchParams.set('utm_content', anchor || 'issue');
      link.searchParams.set('lang', lang);
      if (anchor) link.hash = anchor;
      return link.href;
    };
    return {
      title: `${lang === 'zh' ? 'AI 趋势周刊' : 'AI Trends Weekly'} ${issue.number} · ${issue.title[lang].join(' ')}`,
      description: issue.description[lang],
      pubDate: new Date(`${issue.publishedAt}T00:00:00+08:00`),
      link: campaignLink(),
      // Astro otherwise derives GUID from the tracked link, duplicating existing reader entries.
      customData: `<guid isPermaLink="true">${escape(canonical)}</guid>`,
      categories: issue.topics.map((topic) => topic.title[lang]),
      content: `<p><img src="${escape(new URL(issue.shareCover[lang], 'https://ursb.me').href)}" alt="${escape(issue.title[lang].join(' '))}" width="270" height="382"></p><p>${escape(issue.description[lang])}</p><p>${issue.startDate} – ${issue.endDate} · Airing</p><ol>${issue.columns.map((column) => `<li><a href="${escape(campaignLink(column.anchor))}">${escape(column.title[lang])}</a><p>${escape(column.description[lang])}</p></li>`).join('')}</ol>`,
    };
  });
}
