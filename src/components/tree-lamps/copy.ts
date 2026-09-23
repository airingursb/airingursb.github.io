export const lampCopy = {
  zh: {
    checking: '正在看看树下的灯。', ready: '可以为今晚点亮一盏小灯。', pending: '正在点亮小灯。',
    lit: '小灯亮了。今晚路过这里的人，都能看见。', already: '你今晚已经点过一盏灯了。',
    occupied: '这盏灯刚刚被另一位读者点亮了，可以选另一盏。', full: '今晚的六盏灯都亮了。',
    daytime: '小灯在新加坡傍晚六点后亮起。', unavailable: '暂时连不上小灯，稍后再点一下即可重试。',
    session: '浏览器没有保留点灯记录，允许此网站的 Cookie 后可再试。',
    light: (index: number) => `点亮第 ${index + 1} 盏小灯`,
    glowing: (index: number) => `第 ${index + 1} 盏小灯，今晚已点亮`,
    resting: (index: number) => `第 ${index + 1} 盏小灯，等待傍晚`,
  },
  en: {
    checking: 'Checking the lights under the tree.', ready: 'You can light one little lamp for tonight.', pending: 'Lighting your little lamp.',
    lit: 'Your lamp is lit. Everyone who visits tonight can see it.', already: 'You have already lit a lamp tonight.',
    occupied: 'Another reader just lit this lamp. You can choose a different one.', full: 'All six lamps are glowing tonight.',
    daytime: 'The lamps open at 6 pm in Singapore.', unavailable: 'The lamps could not connect. Tap again to retry.',
    session: 'Your browser did not keep the lamp session. Allow cookies for this site, then try again.',
    light: (index: number) => `Light lamp ${index + 1}`,
    glowing: (index: number) => `Lamp ${index + 1}, lit tonight`,
    resting: (index: number) => `Lamp ${index + 1}, waiting for evening`,
  },
} as const;
export type LampMessage = 'checking' | 'ready' | 'pending' | 'lit' | 'already' | 'occupied' | 'full' | 'daytime' | 'unavailable' | 'session';
