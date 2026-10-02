import { sections as learningSections, type Section } from './issue.ts';
import { issuePath } from './catalog.ts';
import { englishIssues } from './en/issues.ts';
import type { Locale } from './i18n.ts';
import { restIssue } from './rest-issue.ts';
import { seasonAIssues } from './season-a-issues.ts';
import { seasonBIssues } from './season-b-issues.ts';

export interface Issue {
  readonly releaseAfter?: string;
  readonly number: string;
  readonly category: string;
  readonly title: string;
  readonly headline: readonly string[];
  readonly dilemma: string;
  readonly quote: readonly string[];
  readonly source: string;
  readonly note: string;
  readonly thesis: readonly string[];
  readonly thesisNote: string;
  readonly intro: string;
  readonly introNote: string;
  readonly letterIds: readonly string[];
  readonly letterNote: string;
  readonly sections: readonly Section[];
  readonly exercise?: { readonly title: string; readonly steps: readonly (readonly [string, string])[] };
  readonly reflection?: { readonly title: string; readonly question: string; readonly note: string };
}

export const issues: readonly Issue[] = [
  {
    number: '01', category: '学习与行动', title: '为什么总在准备，却迟迟没有开始？',
    headline: ['为什么总在准备，', '却迟迟没有开始？'],
    dilemma: '教程看了不少，真正想做的事还停在起点。',
    quote: ['内驱力从来不是“找”到的，', '而是“做”出来的。'], source: 'output', note: '先问：\n你想做什么？',
    thesis: ['从一个想完成的小作品开始，', '让具体的问题决定下一步学什么。'], thesisNote: '把准备，\n接到一次创造上。',
    intro: '把学习，接到一次具体的创造上。',
    introNote: '我从四组通信中整理出这条阅读线索。正文与页边批注是我的梳理，蓝色摘句保留回信原话。',
    letterIds: ['output', 'practice', 'interest', 'mist'], letterNote: '四位读者，四组往返。', sections: learningSections,
    exercise: { title: '读完以后，留一件小事给自己。', steps: [
      ['选一个你想做出来的东西。', '一篇短文、一个页面、一件好用的小工具。'],
      ['把它缩成能动手的第一步。', '先写一段，先画一页，先让一个功能跑起来。'],
      ['遇到问题，再去学需要的部分。', '做完后，记下新理解的一件事。'],
    ] },
  },
  {
    number: '02', category: '职业与选择', title: '选工作时，别只算这一次',
    headline: ['选工作时，', '别只算这一次'],
    dilemma: '薪水更高，却怕走偏；想要成长，又怕只是更忙。',
    quote: ['校招生第一段经验', '很重要，', '是之后社招的跳板。'], source: 'offer-autumn', note: '下一次求职，\n你能拿出什么？',
    thesis: ['把眼前的收入、每天积累的经验，', '和下一次求职的机会一起考虑。'], thesisNote: '眼前的好处，\n往后的代价。',
    intro: '把这份工作，放进下一次选择里看。',
    introNote: '行舟问第一份工作怎么选，知秋问第一次跳槽要不要冒险。我从四组往返里重新整理了四个问题：经验怎样积累，机会怎样核实，时间怎样交换，离开怎样安排。正文与页边批注是本期的梳理，蓝色摘句保留当时的回信原话。',
    letterIds: ['offer-autumn', 'offer-spring', 'offer-summer', 'four-options'], letterNote: '两位读者，四组往返。',
    sections: [
      {
        id: 'role', number: '01', dilemma: ['工资更高，', '会不会走偏？'], title: ['薪水之外，', '还要算下一次求职。'],
        paragraphs: [
          '行舟已经签了一份后端开发的工作，还是忍不住看朋友拿到了多少薪水。另一个测试开发机会收入更高，可他实习过，也知道自己并不喜欢。他问我，要不要见好就收，还是边实习边继续找；为了更高的收入牺牲工作生活平衡，又值不值得。',
          '我建议他一边实习，一边继续参加春招。这两个动作可以同时做：先用已有的机会积累经验，也给自己保留继续争取的空间。当时我还谈到春招补缺的机会；对他而言，接受已有的 offer，并不意味着必须立刻结束求职。',
          '我更在意的是，他下一次求职时希望做什么。如果仍然想做研发，第一份工作能让他做过什么项目、解决过什么问题，就会影响下一次面试。为了眼前的收入再去做自己不喜欢的测试开发，往后还可能要解释岗位匹配、补足研发经历。这个转换成本，也在这次选择的账上。',
          '所以我支持他先选后端，再继续找。判断落在他已有的实习感受、想走的方向和还能争取的机会这些具体条件上。薪酬差距当然要看，但把“下一次我能凭什么获得机会”写出来之后，才更容易判断眼前多拿到的钱，是否值得用这段经历去换。',
          '你也可以把两个选项各往后推一步：做完这份工作，简历上会多出什么？下一家想招的人，需要的正是这些经历吗？如果只能写下公司名和岗位名，却说不清自己会做成什么，关于“前景”的判断就还缺了一块。',
        ],
        quote: '我建议是有问题当下解决，而不是逃避或转嫁未来。', source: 'offer-autumn', note: '下一次面试，\n你准备讲什么？',
      },
      {
        id: 'people', number: '02', dilemma: ['说是有成长，', '证据在哪里？'], title: ['“以后能转岗”，', '要先问出证据。'],
        paragraphs: [
          '到了第二年 6 月，行舟又遇到一个可能的测试开发机会。前面的几次面试没有走到最后，求职时间也紧了。他了解到这次的工作可能偏开发，收入和城市里的机会也有吸引力，但仍然担心岗位发展和业务位置。录用当时还没有最终确定。',
          '我的建议有两个前提：先问清实际能做多少开发，再向内部的人打听，有没有从测试开发成功转到研发的案例。这两个问题分别核实眼前和以后：入职后能积累什么，以及这些积累是否真有机会接到下一步。',
          '“可以转岗”听起来像一条路。要把它写进自己的计划，还得知道谁走通过、需要什么条件、当前团队是否允许。把这些继续问细，是我从那封回信延伸出的核实办法。尤其在“先进去，以后再说”的想法很有吸引力时，要留意自己是否把未经确认的可能性，当成了已经得到的承诺。',
          '同样的问题也出现在他春天咨询的游戏公司机会里。我倾向于那里的技术挑战和城市机会，同时请他考察直属领导能否承担责任、团队怎样培养新人，以及换城市要割舍哪些关系。一份工作承诺的成长，需要具体的任务、愿意支持你的人和能够适应的生活来承接。',
          '如果这些信息能核实，我才会进一步讨论入职后的路径；核实不了，就应当把它保留为未知。机会紧迫，可以影响我们愿意接受多少不理想的条件，却不能替一个未知项提供证据。',
        ],
        quote: '另外，也咨询一下内部的人有没有测开成功活水转岗到开发的案例？', source: 'offer-summer', relatedSources: ['offer-spring'], note: '谁走通过？\n需要什么条件？',
      },
      {
        id: 'conditions', number: '03', dilemma: ['工作更忙，', '真的能成长吗？'], title: ['加班换来的，', '除了工资还有什么？'],
        paragraphs: [
          '知秋第一次准备跳槽，把四个选项列得很细。其中一家创业公司收入最高、责任范围也更大，代价是工作强度高，还要搬家。他担心公司最终没有做起来，投入的时间很多，下一次求职时却不如大公司的名字有用。',
          '我在回信里把这两个顾虑拆开。先看项目：按他提供的信息，我认为项目的深度和经验足以支持以后再去大公司求职。这给了我倾向这个选项的理由，但公司最终能否成功、他最终能获得多少回报，通信里都没有答案。',
          '再看时间。我的回信有一个具体条件：如果他原本也打算把空余时间用于成长，而这份工作的内容有深度、确实能学到东西，那么把一部分时间投入其中，同时获得更高收入，我认为值得考虑。这里需要比较的，是同一段时间在两种安排下，分别能留下什么。',
          '如果加班只是重复已经熟悉的事情，却说不出能负责什么项目、学会什么，那就缺少了我这条建议里的重要前提。忙碌本身无法回答“有没有成长”。反过来，有空余时间，也要看自己原本准备怎样使用它。两边都写具体，才不会拿工作里一个模糊的“成长”，去对比生活里一个同样模糊的“自由”。',
          '我较早给行舟的回信，对职业早期投入成长的态度很鲜明。到了知秋的问题里，这笔交换可以拆得更具体：多付出多少时间，收入增加多少，项目能带来什么经验，搬迁又要付出什么。把这些放在一起，才能判断自己愿不愿意接受这个交换。',
        ],
        quote: '跳回大厂这个项目的深度和项目经验是完全足够有竞争力的', source: 'four-options', relatedSources: ['offer-autumn'], note: '多投入的时间，\n会留下什么？',
      },
      {
        id: 'next-step', number: '04', dilemma: ['长期想离开，', '现在要走吗？'], title: ['可以暂时留下，', '但要说清为什么等。'],
        paragraphs: [
          '在知秋的四个选项中，我个人更倾向于 D，也就是那家创业公司；同时把留在原公司 A 放在了值得考虑的位置。他已经觉得原公司的长期成长有限，我仍建议可以先观察几个月。原因很具体：年中承诺的绩效，以及能否争取一次快速晋升。',
          '这两件事关系到何时离开、以什么经历和职级离开。判断“我以后还想不想留在这里”，和判断“我现在是否应该走”，需要看的时间范围不同。既然长期有离开的打算，就更值得算清短期等待能给下一步增加什么。',
          '但等待需要对象。整理这封信时，我会把“再等等”补成一句完整的话：等什么，在什么节点核实，如果没有发生，接下来怎么办？原信给了观察绩效、争取晋升的方向；具体节点仍要结合实际兑现情况和外部机会来安排，不能默认新机会会一直等着自己。',
          '给行舟的夏季回信也是如此。如果接受那个不够理想的岗位，我提出的后续路径是争取晋升，或积累经验后转向研发，并且明确提醒他规划时间节点。接受当下的安排之后，还需要继续推进下一步。',
          '回看这四组往返，我总会问到同一件事：做过这份工作以后，下次选择时，手里能多些什么？可能是一段能讲清楚的项目经验，可能是核实过的转岗路径，也可能是值得争取的晋升。把这些写具体，眼前的得失才有了往后的参照。',
        ],
        quote: '留在 A 也是短期较优但长期非最优的选择', source: 'four-options', relatedSources: ['offer-summer'], note: '等什么？\n等到什么时候？',
      },
    ],
    exercise: { title: '给每个选项，补上下一步。', steps: [
      ['这份经历，会怎样出现在下一次面试里？', '写出可能负责的项目、解决的问题和能说明的能力；只剩岗位名的地方，继续问。'],
      ['哪些好处已经确认，哪些还要找人核实？', '把实际工作、团队支持和转岗案例分别列出，给未知项写上要问的人。'],
      ['我准备投入什么，又准备等到什么时候？', '写清时间、搬迁与收入的交换，再定一个复查经验积累或等待事项的节点。'],
    ] },
  },
  restIssue,
  ...seasonAIssues,
  ...seasonBIssues,
];

export { issuePath };
export function issuesFor(lang: Locale): readonly Issue[] { return lang === 'en' ? englishIssues : issues; }
