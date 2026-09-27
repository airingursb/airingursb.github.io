import learning from '../assets/cover-learning.png';
import type { Locale } from './i18n';
export function issueArt(_number: string) { return learning; }
export function shareCover(number: string, lang: Locale) { return `/echo/share/${number}-${lang}.png`; }
export function artDescription(number: string, lang: Locale) {
  return lang === 'en'
    ? number === '02' ? 'Airing’s bear watches two paper boats take different channels in a stream.' : 'Airing’s bear writes a first letter as a paper bird takes flight.'
    : number === '02' ? '小熊在岔流边，望着驶向两条水路的纸船。' : '小熊写下第一封信，一只纸鸟从书桌起飞。';
}
