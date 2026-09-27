import issue001Columns from './ai-weekly/001.columns.json' with { type: 'json' };

export type WeeklyLocale = 'zh' | 'en';
type WeeklyText = Readonly<Record<WeeklyLocale, string>>;

export type AIWeeklyIssue = {
  readonly number: string;
  readonly startDate: string;
  readonly endDate: string;
  readonly publishedAt: string;
  readonly href: WeeklyText;
  readonly cover: WeeklyText;
  readonly shareCover: WeeklyText;
  readonly socialImage: WeeklyText;
  readonly columns: readonly { readonly anchor: string; readonly source: string; readonly relatedSources?: readonly string[]; readonly title: WeeklyText; readonly description: WeeklyText }[];
  readonly title: Readonly<Record<WeeklyLocale, readonly string[]>>;
  readonly description: WeeklyText;
  readonly topics: readonly {
    readonly anchor: string;
    readonly title: WeeklyText;
    readonly description: WeeklyText;
    readonly count: number;
  }[];
};

export const aiWeeklyIssues = [
  {
    number: '001',
    startDate: '2026-09-20',
    endDate: '2026-09-26',
    publishedAt: '2026-09-28',
    href: { zh: '/reading/weekly/001/', en: '/en/reading/weekly/001/' },
    cover: { zh: '/reading/weekly/001/assets/shelf-cover.webp', en: '/reading/weekly/001/assets/shelf-cover-en.webp' },
    shareCover: { zh: '/reading/weekly/001/assets/share-cover-01.png', en: '/reading/weekly/001/assets/share-cover-01-en.png' },
    socialImage: { zh: '/reading/weekly/001/social-zh.jpg', en: '/reading/weekly/001/social-en.jpg' },
    columns: issue001Columns,
    title: { zh: ['Jev，Agent', '该如何做决定？'], en: ['Jev: how should an agent make decisions?'] },
    description: {
      zh: '拆解 Jev 的决策机制与应用，再看 AI 创作、Claude 的生物学发现，以及回到日常的产品。',
      en: 'Inside Jev’s decisions, the next steps in AI creation, Claude’s biology research, and products for everyday life.',
    },
    topics: [
      { anchor: 'agents', title: { zh: 'Jev 与 Agent', en: 'Jev & agents' }, description: { zh: '从决策原理到真实工作流', en: 'From decisions to working systems' }, count: 7 },
      { anchor: 'creation', title: { zh: 'AI 创作', en: 'AI creation' }, description: { zh: '生成之后，怎样继续制作', en: 'What happens after generation' }, count: 5 },
      { anchor: 'science', title: { zh: 'Claude × 生物学', en: 'Claude × biology' }, description: { zh: '发现 ART，也看清研究边界', en: 'The ART discovery and its limits' }, count: 2 },
      { anchor: 'life', title: { zh: '人与产品', en: 'People & products' }, description: { zh: '让经验和工具回到人的需要', en: 'Tools that meet everyday needs' }, count: 2 },
    ],
  },
] as const satisfies readonly AIWeeklyIssue[];

export function weeklyArticleCount(issue: AIWeeklyIssue): number {
  return new Set(issue.columns.flatMap((column) => [column.source, ...(column.relatedSources ?? [])])).size;
}

export function weeklyDateLabel(issue: AIWeeklyIssue): string {
  return `${issue.startDate.replaceAll('-', '.')} — ${issue.endDate.replaceAll('-', '.')}`;
}
