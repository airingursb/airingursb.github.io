import issue004Columns from './ai-weekly/004.columns.json' with { type: 'json' };
import issue003Columns from './ai-weekly/003.columns.json' with { type: 'json' };
import issue002Columns from './ai-weekly/002.columns.json' with { type: 'json' };
import issue001Columns from './ai-weekly/001.columns.json' with { type: 'json' };

export type WeeklyLocale = 'zh' | 'en';
type WeeklyText = Readonly<Record<WeeklyLocale, string>>;

export type AIWeeklyIssue = {
  readonly number: string;
  readonly startDate: string;
  readonly endDate: string;
  readonly publishedAt: string;
  readonly scheduledFor?: string;
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
  "number": "004",
  "startDate": "2026-10-11",
  "endDate": "2026-10-17",
  "publishedAt": "2026-10-19",
  "href": {
    "zh": "/reading/weekly/004/",
    "en": "/en/reading/weekly/004/"
  },
  "cover": {
    "zh": "/reading/weekly/004/shelf-cover-zh.webp",
    "en": "/reading/weekly/004/shelf-cover-en.webp"
  },
  "shareCover": {
    "zh": "/reading/weekly/004/cover-zh.png",
    "en": "/reading/weekly/004/cover-en.png"
  },
  "socialImage": {
    "zh": "/reading/weekly/004/social-zh.jpg",
    "en": "/reading/weekly/004/social-en.jpg"
  },
  "columns": issue004Columns,
  "title": {
    "zh": [
      "Agent 常驻之后，",
      "怎样放心交付？"
    ],
    "en": [
      "Always on.",
      "Ready to hand over?"
    ]
  },
  "description": {
    "zh": "这周，AI 开始长期待在工位上。我们把问题往前推一步：它忙了一夜之后，怎样留下别人能接手的工作？",
    "en": "AI is staying at its desk. This week, we ask what it should leave behind so someone else can confidently pick up the work."
  },
  "topics": [
    {
      "anchor": "personal-agent",
      "title": {
        "zh": "Personal Agent",
        "en": "Personal agents"
      },
      "description": {
        "zh": "从常驻产品到持久任务，追问谁负责、谁验收、怎样接着做。",
        "en": "From persistent agents to durable tasks: ownership, acceptance and continuity."
      },
      "count": 4
    },
    {
      "anchor": "engineering",
      "title": {
        "zh": "Agent 工程",
        "en": "Agent engineering"
      },
      "description": {
        "zh": "让正确发生在流程里，把人的精力留给重要判断。",
        "en": "Build correctness into the workflow; save attention for judgment."
      },
      "count": 4
    },
    {
      "anchor": "research",
      "title": {
        "zh": "研究观察",
        "en": "Research"
      },
      "description": {
        "zh": "灵感、改进、解释与自主性，需要不同的验证。",
        "en": "Ideas, improvement, explanations and autonomy need different tests."
      },
      "count": 4
    },
    {
      "anchor": "tools",
      "title": {
        "zh": "本周工具架",
        "en": "Tools to try"
      },
      "description": {
        "zh": "画图、路由、真机测试与可继续编辑的产物。",
        "en": "Diagrams, routing, mobile testing and work you can keep editing."
      },
      "count": 5
    },
    {
      "anchor": "people",
      "title": {
        "zh": "人与产品",
        "en": "People & products"
      },
      "description": {
        "zh": "长期信任、研究证据，以及新人怎样学会判断。",
        "en": "Long-term trust, research evidence and how beginners learn judgment."
      },
      "count": 5
    }
  ]
},
  {
    "number": "003",
    "startDate": "2026-10-04",
    "endDate": "2026-10-10",
    "publishedAt": "2026-10-13",
    "scheduledFor": "2026-10-12",
    "href": {
      "zh": "/reading/weekly/003/",
      "en": "/en/reading/weekly/003/"
    },
    "cover": {
      "zh": "/reading/weekly/003/assets/shelf-cover.webp",
      "en": "/reading/weekly/003/assets/shelf-cover-en.webp"
    },
    "shareCover": {
      "zh": "/reading/weekly/003/assets/share-cover-03.png",
      "en": "/reading/weekly/003/assets/share-cover-03-en.png"
    },
    "socialImage": {
      "zh": "/reading/weekly/003/social-zh.jpg",
      "en": "/reading/weekly/003/social-en.jpg"
    },
    "columns": issue003Columns,
    "title": {
      "zh": [
        "OpenAI 的数学手稿：",
        "突破与抵制之间"
      ],
      "en": [
        "OpenAI’s mathematics:",
        "progress and resistance"
      ]
    },
    "description": {
      "zh": "OpenAI 公布 700 多份 AI 数学手稿，随后出现修订、撤回与抵制。从事件经过读起，看 AI 的贡献、数学家的分歧，以及新的合作方式。",
      "en": "OpenAI released 700-plus AI mathematics manuscripts. Explore the research, corrections and objections, and how people and AI might collaborate."
    },
    "topics": [
      {
        "anchor": "mathematics",
        "title": {
          "zh": "AI 与数学",
          "en": "AI and mathematics"
        },
        "description": {
          "zh": "突破、抵制与新的科研分工",
          "en": "Breakthroughs, resistance and research roles"
        },
        "count": 1
      },
      {
        "anchor": "engineering",
        "title": {
          "zh": "Agent 怎样承担工作",
          "en": "Agents taking on work"
        },
        "description": {
          "zh": "记忆的取舍与行动的责任",
          "en": "Memory choices and responsibility for actions"
        },
        "count": 4
      },
      {
        "anchor": "research",
        "title": {
          "zh": "AI 究竟在改进什么",
          "en": "What is AI improving?"
        },
        "description": {
          "zh": "自我改进与协作的边界",
          "en": "The limits of improvement and collaboration"
        },
        "count": 3
      },
      {
        "anchor": "tools",
        "title": {
          "zh": "本周新品架",
          "en": "This week’s shelf"
        },
        "description": {
          "zh": "10 款产品，快速认识",
          "en": "A quick look at ten products"
        },
        "count": 10
      },
      {
        "anchor": "notes",
        "title": {
          "zh": "一周的其他线索",
          "en": "Other threads"
        },
        "description": {
          "zh": "产品观察、阅读与图解",
          "en": "Products, reading and visual thinking"
        },
        "count": 8
      }
    ]
  },
  {
    number: '002',
    startDate: '2026-09-27',
    endDate: '2026-10-03',
    publishedAt: '2026-10-05',
    href: { zh: '/reading/weekly/002/', en: '/en/reading/weekly/002/' },
    cover: { zh: '/reading/weekly/002/assets/shelf-cover.webp', en: '/reading/weekly/002/assets/shelf-cover-en.webp' },
    shareCover: { zh: '/reading/weekly/002/assets/share-cover-02.png', en: '/reading/weekly/002/assets/share-cover-02-en.png' },
    socialImage: { zh: '/reading/weekly/002/social-zh.jpg', en: '/reading/weekly/002/social-en.jpg' },
    columns: issue002Columns,
    title: { zh: ['Opus 5.5，', '把代码拍成电影'], en: ['Opus 5.5:', 'making films with code'] },
    description: {
      zh: '从代码生成影片，到更省上下文的 Agent 运行方式，本期追踪的是：更快、更便宜的能力，怎样变成可控的工作流。',
      en: 'From films built with code to leaner agents: how do faster, cheaper tools become workflows we can control?',
    },
    topics: [
      { anchor: 'creation', title: { zh: 'Opus 5.5 × 代码拍电影', en: 'Opus 5.5 × films from code' }, description: { zh: '制作流程与创作短读', en: 'Workflow and creative notes' }, count: 4 },
      { anchor: 'runtime', title: { zh: 'Agent 的工作台', en: 'The agent workspace' }, description: { zh: '上下文、Pi 1.0 与 Mods', en: 'Context, Pi 1.0 and Mods' }, count: 5 },
      { anchor: 'quality', title: { zh: '成本与质量', en: 'Cost and quality' }, description: { zh: '决策分流与自动评测', en: 'Routing and evaluations' }, count: 3 },
      { anchor: 'tools', title: { zh: '这一周的新品架', en: 'This week’s tool shelf' }, description: { zh: '10 款工具，短读速览', en: '10 tools, in brief' }, count: 10 },
      { anchor: 'signals', title: { zh: '值得留意的变化', en: 'Changes to watch' }, description: { zh: '发布、观点与生态观察', en: 'Launches, opinions and ecosystem' }, count: 7 },
    ],
  },
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
