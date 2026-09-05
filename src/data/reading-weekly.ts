export type ReadingWeeklyLanguage = 'zh' | 'en';

export type LocalizedEditorialText = {
  readonly zh: string;
  readonly en: string;
};

export type WeeklyStoryEditorial = {
  readonly slug: string;
  readonly note: LocalizedEditorialText;
};

export type WeeklySection = {
  readonly label: LocalizedEditorialText;
  readonly title: LocalizedEditorialText;
  readonly introduction: LocalizedEditorialText;
  readonly stories: readonly WeeklyStoryEditorial[];
};

export type ReadingWeeklyIssue = {
  readonly slug: string;
  readonly edition: string;
  readonly weekKey: string;
  readonly status: 'draft' | 'published';
  readonly startDate: string;
  readonly endDate: string;
  readonly title: LocalizedEditorialText;
  readonly titleLines: {
    readonly zh: readonly string[];
    readonly en: readonly string[];
  };
  readonly deck: LocalizedEditorialText;
  readonly editorNote: LocalizedEditorialText;
  readonly lead: WeeklyStoryEditorial;
  readonly sections: readonly WeeklySection[];
};

export const readingWeeklyIssues: readonly ReadingWeeklyIssue[] = [
  {
    slug: '2026-w36',
    edition: '001',
    weekKey: '2026-W36',
    status: 'draft',
    startDate: '2026-08-31T00:00:00+08:00',
    endDate: '2026-09-06T23:59:59+08:00',
    title: {
      zh: 'Agent 的下半场，不在聊天框里',
      en: 'The next phase of agents lives beyond the chat box',
    },
    titleLines: {
      zh: ['Agent 的下半场', '不在聊天框里'],
      en: ['The next phase of agents', 'lives beyond the chat box'],
    },
    deck: {
      zh: '从 Harness 的状态权威，到可接管的工作界面，再到真实部署成本：本周 8 篇阅读，重新回答 Agent 到底是什么。',
      en: 'From authoritative harness state to takeover-ready interfaces and real deployment costs: eight reads that reconsider what an agent actually is.',
    },
    editorNote: {
      zh: '这周保存下来的内容几乎都在绕开“模型又强了多少”，转而讨论 Agent 作为工作系统的基本条件：状态要有权威来源，执行要能被中止，界面要允许人随时接管，成本也要进入产品判断。它们给出的答案并不一致，尤其在“该忘掉多少历史”上甚至相互冲突。正因为如此，我把它们编在一起。',
      en: 'Most of this week’s saved pieces move past “how much stronger is the model?” and ask what an agent needs as a working system: authoritative state, bounded execution, interfaces people can take over, and costs that shape the product. Their answers conflict, especially on how much history to keep. That tension is why they belong together.',
    },
    lead: {
      slug: 'r-qu_vv-mrhe_lujnn',
      note: {
        zh: '比“再包一层 while 循环”更重要的是，先回答状态归谁、谁能中止、一次工作在哪里结束。',
        en: 'Before adding another loop, decide who owns state, who can stop the work, and where one run ends.',
      },
    },
    sections: [
      {
        label: { zh: '01 / 状态与控制', en: '01 / State and control' },
        title: { zh: '可靠性，是一种连续保存进展的能力', en: 'Reliability means preserving verified progress' },
        introduction: {
          zh: '上下文不是越多越好，也不是越少越好。真正的问题是：哪些状态必须持续，哪些尝试值得留下。',
          en: 'More context is not automatically better, and neither is less. The real question is which state must persist and which attempts are worth keeping.',
        },
        stories: [
          {
            slug: 'r--ixvcbfk7khjxuaw',
            note: {
              zh: '70 轮之后，真正难的不是继续生成代码，而是让已经验收过的结果不被下一轮抹掉。',
              en: 'After 70 rounds, the hard part is not generating more code. It is keeping the next round from erasing work that already passed review.',
            },
          },
          {
            slug: 'r-xmpcvejgv7rgvrdl',
            note: {
              zh: '只保留当前状态与最新观察，是对“上下文越多越好”最干脆的一次反驳。',
              en: 'Keeping only current state and the latest observation is a clean rebuttal to the idea that more context is always better.',
            },
          },
          {
            slug: 'r-g2kftponbjs_bvhl',
            note: {
              zh: '另一种相反提醒：尝试历史中的反馈也可能是能力本身。关键不是多或少，而是保留什么。',
              en: 'The counterpoint: feedback embedded in attempt history may itself be capability. The choice is not more or less, but what survives.',
            },
          },
        ],
      },
      {
        label: { zh: '02 / 工作界面', en: '02 / Working interfaces' },
        title: { zh: '把委派、观察和接管放进同一个空间', en: 'Put delegation, observation, and takeover in one place' },
        introduction: {
          zh: '如果 Agent 会持续工作，聊天记录就不该继续充当产品的唯一容器。',
          en: 'If an agent keeps working, a chat transcript cannot remain the product’s only container.',
        },
        stories: [
          {
            slug: 'r-kticvij6qrltkeki',
            note: {
              zh: '二维画布把“委派”变成可见的空间关系，适合观察 Agent 如何收集、组织、执行。',
              en: 'A two-dimensional canvas turns delegation into a visible spatial relationship across collecting, organizing, and executing.',
            },
          },
          {
            slug: 'r-7yi8vqzedioj0yco',
            note: {
              zh: '当 Bot 成为长期存在的对象，入口就不再是一次聊天，而是一个可接管、可恢复的工作单元。',
              en: 'Once a bot becomes persistent, the entry point is no longer a conversation but a recoverable unit of work that people can take over.',
            },
          },
        ],
      },
      {
        label: { zh: '03 / 规模与现场', en: '03 / Scale and fieldwork' },
        title: { zh: '算力账单之外，还有组织的账', en: 'Beyond compute, there is the cost of the organization' },
        introduction: {
          zh: '基础设施决定能跑多少实例，现场工作决定这些实例有没有创造价值。',
          en: 'Infrastructure determines how many instances can run. Fieldwork determines whether any of them create value.',
        },
        stories: [
          {
            slug: 'r-ckpyvvyokzb4i2re',
            note: {
              zh: '浏览器变轻不是参数竞赛；当数百个实例同时工作，30MB 会直接变成产品边界。',
              en: 'A lighter browser is not a benchmark trophy. At hundreds of concurrent instances, 30 MB becomes a product boundary.',
            },
          },
          {
            slug: 'r-e8jtbhbrnsdepjzd',
            note: {
              zh: '把十分钟压到十秒不等于创造价值。Agent 最终仍要进入组织现场，面对数据、权限和人。',
              en: 'Reducing ten minutes to ten seconds is not the same as creating value. Agents still have to meet real data, permissions, and people.',
            },
          },
        ],
      },
    ],
  },
] as const;

export function editorialText(text: LocalizedEditorialText, lang: ReadingWeeklyLanguage): string {
  return text[lang];
}

export function weeklyDateRange(issue: ReadingWeeklyIssue, lang: ReadingWeeklyLanguage): string {
  const locale = lang === 'en' ? 'en-US' : 'zh-CN';
  const format = new Intl.DateTimeFormat(locale, {
    month: lang === 'en' ? 'short' : 'numeric',
    day: 'numeric',
    timeZone: 'Asia/Shanghai',
  });
  return `${format.format(new Date(issue.startDate))} — ${format.format(new Date(issue.endDate))}`;
}
