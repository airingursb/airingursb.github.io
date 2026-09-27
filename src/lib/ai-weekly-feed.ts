import type { AIWeeklyIssue, WeeklyLocale } from '../data/ai-weekly';

export function aiWeeklyRssItems(issues: readonly AIWeeklyIssue[], lang: WeeklyLocale) {
  const escape = (value: string) => value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');
  return issues.map((issue) => ({
    title: `${lang === 'zh' ? 'AI 趋势周刊' : 'AI Trends Weekly'} ${issue.number} · ${issue.title[lang].join(' ')}`,
    description: issue.description[lang],
    pubDate: new Date(`${issue.publishedAt}T00:00:00+08:00`),
    link: issue.href[lang],
    categories: issue.topics.map((topic) => topic.title[lang]),
    content: `<p><img src="https://ursb.me${escape(issue.cover[lang])}" alt="${escape(issue.title[lang].join(' '))}" width="270" height="480"></p><p>${escape(issue.description[lang])}</p><p>${issue.startDate} – ${issue.endDate} · Airing</p><ol>${issue.columns.map((column) => `<li><a href="https://ursb.me${escape(issue.href[lang])}#${escape(column.anchor)}">${escape(column.title[lang])}</a><p>${escape(column.description[lang])}</p></li>`).join('')}</ol>`,
  }));
}
