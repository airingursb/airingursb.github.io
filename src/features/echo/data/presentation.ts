import type { Locale } from './i18n.ts';

type Composition = 'field' | 'desk' | 'horizon';
interface Presentation {
  readonly ink: string;
  readonly wash: string;
  readonly composition: Composition;
  readonly coverPosition?: string;
  readonly englishCoverHeadlineSize?: number;
  readonly caption: readonly [string, string];
  readonly teasers: readonly [readonly [string, string], readonly [string, string]];
}
const presentations: Readonly<Record<string, Presentation>> = {
  '01': { ink:'#3b5b49', wash:'#f0f1e7', composition:'desk', caption:['一封信，从第一笔开始。','A letter begins with the first mark.'], teasers:[['以创造，带动学习','在行动里，找到方向'],['Make something. Then learn.','Find direction by doing.']] },
  '02': { ink:'#395863', wash:'#eef1f0', composition:'horizon', caption:['两条水路，都还看不见终点。','Two channels. Neither reveals the whole journey.'], teasers:[['转岗之前，先问证据','多花的时间，换来什么'],['Can you really transfer?','What does overtime buy?']] },
  '03': { ink:'#784a3e', wash:'#f5f1e8', composition:'horizon', caption:['一个下午，也可以只属于今天。','An afternoon can belong to today.'], teasers:[['回报之外，还有生活','给一个下午留白'],['Beyond a return on time','An afternoon left open']] },
  '04': { ink:'#795334', wash:'#f7f0e3', composition:'field', caption:['留意那些让你停下来看一眼的事。','Notice what makes you stop and look.'], teasers:[['先察觉，再命名','留下一点喜欢的证据'],['Notice before naming','Small signs of delight']] },
  '05': { ink:'#354f6c', wash:'#eef1f4', composition:'desk', coverPosition:'50% 30%', caption:['工具替你加速，判断仍需要自己练习。','Tools make things faster. Judgment takes practice.'], teasers:[['做出来之后，还要理解','工具之外，留下判断'],['Beyond making it work','Keep the judgment']] },
  '06': { ink:'#714651', wash:'#f6eef0', composition:'desk', coverPosition:'50% 25%', englishCoverHeadlineSize:6.5, caption:['先把一件事，向自己说清楚。','Begin by explaining one thing to yourself.'], teasers:[['大纲里的理解缺口','不发表，也值得写'],['Gaps in the outline','Writing before sharing']] },
  '07': { ink:'#526044', wash:'#f0f2e7', composition:'field', coverPosition:'50% 85%', caption:['走进一条路之前，先问想走向哪里。','Before entering a path, ask where you want it to lead.'], teasers:[['想研究，还是想证明','把选择还给自己'],['Study or a status marker?','A choice of your own']] },
  '08': { ink:'#795137', wash:'#f6efe5', composition:'desk', coverPosition:'50% 0%', caption:['一张地图，可以容得下不止一条路。','A map has room for more than one route.'], teasers:[['给计划留几条分支','复盘，也允许改方向'],['Plan for several routes','Room to change course']] },
  '09': { ink:'#346258', wash:'#eaf2ed', composition:'field', caption:['一扇门的意义，也在于可以关上。','A door matters because it can also close.'], teasers:[['心态调整也有边界','原则要放回处境里'],['The limits of adapting','Principles in context']] },
  '10': { ink:'#496076', wash:'#eef2f5', composition:'desk', coverPosition:'50% 60%', englishCoverHeadlineSize:6.5, caption:['今天的桌上，先放一件做得了的事。','Make room for one thing you can begin today.'], teasers:[['惦记，不等于安排','先别急着责怪自己'],['Worrying is not planning','Before blaming yourself']] },
  '11': { ink:'#804c40', wash:'#f7eeea', composition:'field', coverPosition:'50% 25%', caption:['这株小苗，按自己的速度生长。','This small plant grows at its own pace.'], teasers:[['默认的路，也可以问','值得，由谁来定义'],['Question the expected path','Who defines worthwhile?']] },
  '12': { ink:'#59536d', wash:'#f0edf4', composition:'horizon', caption:['灯照见一小段路，就先走这一小段。','A lamp reveals a little of the path. Start there.'], teasers:[['把担忧，一件件分开','可行动，不等于可保证'],['Untangle the worries','Action without guarantees']] },
};
export function presentationFor(number: string) {
  const value = presentations[number];
  if (!value) throw new Error(`Missing issue presentation: ${number}`);
  return value;
}
export function editionCaption(number: string, lang: Locale) { return presentationFor(number).caption[lang === 'en' ? 1 : 0]; }
export function editionTeasers(number: string, lang: Locale) { return presentationFor(number).teasers[lang === 'en' ? 1 : 0]; }
