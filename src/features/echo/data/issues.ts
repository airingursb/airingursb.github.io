import { sections as learningSections, type Section } from './issue.ts';
import { issuePath } from './catalog.ts';
import { englishIssues } from './en/issues.ts';
import type { Locale } from './i18n.ts';

export interface Issue {
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
  readonly exercise: { readonly title: string; readonly steps: readonly (readonly [string, string])[] };
}

export const issues: readonly Issue[] = [
  {
    number: '01', category: '学习与行动', title: '为什么总在准备，却迟迟没有开始？',
    headline: ['为什么总在准备，', '却迟迟没有开始？'],
    dilemma: '教程看了不少，真正想做的事还停在起点。',
    quote: ['内驱力从来不是“找”到的，', '而是“做”出来的。'], source: 'output', note: '先问：\n你想做什么？',
    thesis: ['从一个想完成的小作品开始，', '让具体的问题决定下一步学什么。'], thesisNote: '把准备，\n接到一次创造上。',
    intro: '把学习，接到一次具体的创造上。',
    introNote: '从四组通信整理出的一条阅读线索。正文与页边批注为编辑归纳，蓝色摘句保留 Airing 的原话。',
    letterIds: ['output', 'practice', 'interest', 'mist'], letterNote: '四位读者，四组往返。', sections: learningSections,
    exercise: { title: '读完以后，留一件小事给自己。', steps: [
      ['选一个你想做出来的东西。', '一篇短文、一个页面、一件好用的小工具。'],
      ['把它缩成能动手的第一步。', '先写一段，先画一页，先让一个功能跑起来。'],
      ['遇到问题，再去学需要的部分。', '做完后，记下新理解的一件事。'],
    ] },
  },

];

export { issuePath };
export function issuesFor(lang: Locale): readonly Issue[] { return lang === 'en' ? englishIssues : issues; }
