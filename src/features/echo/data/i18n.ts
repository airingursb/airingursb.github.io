export type Locale = 'zh' | 'en';
export function localeOf(path: string): Locale { return path.startsWith('/en/') ? 'en' : 'zh'; }
export function localPath(path: string, lang: Locale): string { return (lang === 'en' ? '/en' : '') + '/echo' + path; }
export function exchangeCount(count: number, lang: Locale): string { return lang === 'en' ? `${count} ${count === 1 ? 'exchange' : 'exchanges'}` : `${count} 组往返`; }
export function themeCount(count: number, lang: Locale): string { return lang === 'en' ? `${count} ${count === 1 ? 'theme' : 'themes'}` : `${count} 个主题`; }
export function archiveCount(issues: number, letters: number, lang: Locale): string { return `${lang === 'en' ? `${issues} ${issues === 1 ? 'issue' : 'issues'}` : `${issues} 期专题`} · ${exchangeCount(letters, lang)}`; }

const zh = {
  name: '回声', journal: '通信期刊', preview: '通信期刊', skip: '跳到正文', archive: '通信目录',
  issue: '专题', issueNav: '专题期数', dilemma: '困境归纳', read: '开始阅读', letters: '本期来信',
  openLetters: '拆开本期来信', cover: '回到封面', fullReading: '本期完整阅读', exercise: '一个小练习 · 编辑建议',
  editorial: '专题选编 · 摘句保留回信原话，其余为编辑整理',
  footer: '一些具体的问题，一些可以继续往前走的回答。',
  footerNote: '观点由通信整理，往返全文已脱敏。', write: '给 Airing 写信',
  fromDilemma: '从你的困境读起', contents: '本期目录', contentsLabel: '本期阅读目录', note: '阅读札记',
  quote: 'Airing · 回信原句', readReply: '读这封回信', openLetter: '拆开这封来信', openReply: '打开这封回信全文',
  correspondence: '本期通信', threadNote: '行舟的三次往返，按时间排列；最后一组来自知秋。',
  colophon: '由电子来信转录 · 来信者使用代号 · 全文已脱敏',
  trail: '一条持续的往返 / 行舟', trailNote: '每一封都连着上一次，也带来了新的条件。',
  trailFirst: '要不要继续找', trailSecond: '要不要换团队', trailThird: '怎样接受不完美',
  incoming: '来信', reply: '回信', envelope: '回到信封', correspondenceNav: '往返阅读导航',
  echoLetters: '回声通信', toAiring: 'Airing 亲启', recipient: '收信人', alias: '来信者代号',
  stationery: '通信笺', greeting: '见字如面', to: '写给',
  attachment: '原信附图', fullImage: '查看原图', openImage: '打开原信附图，查看完整尺寸',
  imageAlt: '原信附图：改变习惯时，把注意力放在增加好习惯上，例如多喝水、运动和读书。',
  incomingMark: '来 / 致 Airing', replyMark: '回 / 自 Airing',
  skipLetter: '跳至来信正文', transcript: '原信转录 · 完整往返', farewell: '一封信，从这里到那里。',
  privacy: '由电子来信转录。称谓与署名使用编辑分配的代号，身份、履历及私人链接等以〔〕标明脱敏。保留原话与问答顺序，长段仅作阅读分段；来信与回信日期依据通信记录。原信未署名时，页面署名依据通信记录。',
  backLetters: '收好这封信，回到本期来信', next: '下一组', continue: '继续读信',
  newest: '新一期', readIssue: '读本期专题',
  archiveNote: '由电子来信整理，原信以代号与脱敏文本呈现。专题正文为编辑归纳，回信原句均可追到完整往返。',
  backBlog: '回到博客', translated: '英文译文', original: '阅读中文原文',
} as const;

const en: Readonly<Record<keyof typeof zh, string>> = {
  name: 'Echo', journal: 'Letters & replies', preview: 'Correspondence journal', skip: 'Skip to content', archive: 'All issues',
  issue: 'Issue', issueNav: 'Choose an issue', dilemma: 'The question', read: 'Start reading', letters: 'The letters',
  openLetters: 'Open the letters', cover: 'Back to the cover', fullReading: 'Read this issue', exercise: 'A small exercise · Editorial suggestion',
  editorial: 'An editorial edition. Quoted replies are translated; the surrounding text is editorial commentary.',
  footer: 'Specific questions. Replies that help us take another step.',
  footerNote: 'Drawn from correspondence. Complete exchanges are anonymized and translated from Chinese.', write: 'Write to Airing',
  fromDilemma: 'Start with your question', contents: 'Contents', contentsLabel: 'In this issue', note: 'Reading notes',
  quote: 'Airing · From a reply, translated', readReply: 'Read this reply', openLetter: 'Open this letter', openReply: 'Read the complete reply',
  correspondence: 'Correspondence', threadNote: 'Three exchanges with Xingzhou, in date order, followed by one with Zhiqiu.',
  colophon: 'From email correspondence · Reader aliases · Complete anonymized translations',
  trail: 'An ongoing conversation / Xingzhou', trailNote: 'Each letter follows the last, with a new set of circumstances.',
  trailFirst: 'Keep looking?', trailSecond: 'Change teams?', trailThird: 'Accept an imperfect choice?',
  incoming: 'Letter', reply: 'Reply', envelope: 'Envelope', correspondenceNav: 'Navigate this exchange',
  echoLetters: 'Echo correspondence', toAiring: 'For Airing', recipient: 'To', alias: 'Reader alias',
  stationery: 'Correspondence', greeting: 'Across the page', to: 'to',
  attachment: 'Original attachment', fullImage: 'Full-size image', openImage: 'Open the original attachment at full size',
  imageAlt: 'Original attachment with Chinese and English captions about building good habits. An English transcription follows below.',
  incomingMark: 'IN / TO AIRING', replyMark: 'OUT / FROM AIRING',
  skipLetter: 'Skip to the letter', transcript: 'Translated correspondence', farewell: 'A letter, from here to there.',
  privacy: 'Translated in full from anonymized Chinese email transcripts. Reader names and signatures are editorial aliases; square brackets mark redacted identities, biographical details and private links. The original sequence and tone are retained, with long passages divided for reading. Letter and reply dates come from the correspondence records. Where an original has no signature, the displayed attribution also comes from those records.',
  backLetters: 'Return to this issue’s letters', next: 'Next exchange', continue: 'Continue reading',
  newest: 'Latest issue', readIssue: 'Read this issue',
  archiveNote: 'Drawn from email correspondence, with reader aliases and anonymized transcripts. Issue essays are editorial commentary; every quoted reply links to the complete exchange. English pages translate the Chinese originals.',
  backBlog: 'Back to the blog', translated: 'English translation', original: 'Read the Chinese original',
};
export const copy = { zh, en } as const;
