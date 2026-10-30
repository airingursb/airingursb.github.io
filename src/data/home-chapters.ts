// Homepage chapters: the cards are grouped like directories in a home folder.
// One source of truth for the chapter headings (ChapterHead.astro) and the
// bottom prompt / ⌘K panel (src/scripts/home-nav.ts). The card order itself
// lives in src/pages/index.astro — keep the two in sync.

export interface HomeChapter {
  id: string;
  path: string;
  zh: string;
  en: string;
  desc: { zh: string; en: string };
  /** DOM ids of the cards in this chapter, in page order */
  cards: string[];
}

export const HOME_CHAPTERS: HomeChapter[] = [
  { id: 'home', path: '~/', zh: '首页', en: 'home', cards: ['intro'],
    desc: { zh: '从这里开始', en: 'Start here' } },
  { id: 'writing', path: '~/writing', zh: '写作', en: 'writing',
    cards: ['writing', 'ai-weekly', 'channel', 'comics-card', 'letter'],
    desc: { zh: '长文、周刊、频道碎碎念、四格漫画，还有读者来信', en: 'Essays, the weekly, channel posts, comics and letters' } },
  { id: 'building', path: '~/building', zh: '作品', en: 'building',
    cards: ['projects', 'github', 'repos', 'vibe-coding', 'sessions', 'skills', 'setup'],
    desc: { zh: '上架的 App、开源仓库，以及背后的工时、技能和装备', en: 'Apps, repos, and the hours, skills and gear behind them' } },
  { id: 'life', path: '~/life', zh: '生活', en: 'life',
    cards: ['photos-card', 'footprints', 'workouts-card', 'music', 'now-playing', 'mood', 'activity'],
    desc: { zh: '照片、足迹、运动、耳机里的歌，和每天的心情', en: 'Photos, places, workouts, music and everyday moods' } },
  { id: 'inbox', path: '~/inbox', zh: '输入', en: 'inbox',
    cards: ['reading-stream-card', 'bookmarks', 'reading', 'movies', 'highlights'],
    desc: { zh: '每天在读的、收藏的、看过的书和电影，以及划下的句子', en: 'What I read, save, watch and highlight' } },
  { id: 'guestbook', path: '~/guestbook', zh: '留言', en: 'guestbook', cards: ['guestbook'],
    desc: { zh: '路过的话，留一句再走', en: 'Leave a line before you go' } },
];

/** card id → [中文名, English name, file name] */
export const HOME_CARDS: Record<string, [string, string, string]> = {
  'intro': ['自我介绍', 'Intro', 'README.md'],
  'writing': ['文章 · 笔记', 'Posts & notes', 'posts.md'],
  'ai-weekly': ['AI 趋势周刊', 'AI weekly', 'weekly.md'],
  'channel': ['频道', 'Channel', 'channel.log'],
  'comics-card': ['四格', 'Comics', 'comics/'],
  'letter': ['来信 · 回声', 'Letters', 'letters/'],
  'projects': ['项目', 'Apps', 'apps/'],
  'github': ['GitHub', 'GitHub', 'github.json'],
  'repos': ['仓库', 'Repos', 'repos/'],
  'vibe-coding': ['Vibe Coding', 'Vibe coding', 'ccusage.log'],
  'sessions': ['工作时长', 'Work hours', 'hours.csv'],
  'skills': ['技能', 'Skills', 'skills/'],
  'setup': ['装备', 'Setup', 'setup.conf'],
  'photos-card': ['相册', 'Photos', 'photos/'],
  'footprints': ['足迹', 'Footprints', 'trace.geo'],
  'workouts-card': ['运动记录', 'Workouts', 'workouts.gpx'],
  'music': ['音乐记录', 'Music', 'scrobbles.db'],
  'now-playing': ['正在听', 'Now playing', 'np.m3u'],
  'mood': ['心情', 'Mood', 'mood.log'],
  'activity': ['活动', 'Activity', 'htop.txt'],
  'reading-stream-card': ['阅读流', 'Reading stream', 'feed.rss'],
  'bookmarks': ['收藏夹', 'Bookmarks', 'bookmarks/'],
  'reading': ['阅读记录', 'Books', 'books/'],
  'movies': ['观影记录', 'Movies', 'movies/'],
  'highlights': ['书摘', 'Highlights', 'highlights.md'],
  'guestbook': ['留言板', 'Guestbook', 'guestbook.git'],
};

/** extra words the ⌘K filter matches on */
export const HOME_CARD_ALIASES: Record<string, string> = {
  'intro': 'irc 首页 home about', 'writing': '博客 blog 文章 笔记 notes', 'ai-weekly': '周刊 ai weekly', 'channel': 'telegram tg 频道',
  'comics-card': '漫画 comic', 'letter': '信 mail 回声 echo', 'projects': 'app 应用 moflow moneywise', 'github': 'git 开源',
  'repos': 'git 开源 star', 'vibe-coding': 'claude ccusage ai token', 'sessions': 'rize 时间 工时', 'skills': '技能 tree radar 雷达',
  'setup': 'neofetch 设备 mac app', 'photos-card': '照片 photo 摄影', 'footprints': '地图 城市 map travel 旅行',
  'workouts-card': '徒步 跑步 hike run 运动', 'music': '歌 音乐 lastfm', 'now-playing': '歌 音乐 听 lastfm', 'mood': '心情 天气',
  'activity': '活动 htop 身体', 'reading-stream-card': 'rss 订阅 阅读', 'bookmarks': '收藏 raindrop 链接', 'reading': '书 读书 豆瓣 book',
  'movies': '电影 影 film 豆瓣', 'highlights': '书 划线 readwise 摘抄', 'guestbook': '留言 git message',
};

/** cards that sit side by side in the two-column grid */
export const HOME_CARD_PAIRS: Record<string, string> = {
  'github': 'repos', 'repos': 'github', 'music': 'now-playing', 'now-playing': 'music',
  'mood': 'activity', 'activity': 'mood', 'reading': 'movies', 'movies': 'reading',
};
