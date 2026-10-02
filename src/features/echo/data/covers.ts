import learning from '../assets/cover-learning.png';
import choices from '../assets/cover-choices.png';
import rest from '../assets/cover-rest.png';
import joy from '../assets/cover-joy.png';
import judgment from '../assets/cover-judgment.png';
import writing from '../assets/cover-writing.png';
import study from '../assets/cover-study.png';
import planning from '../assets/cover-planning.png';
import boundaries from '../assets/cover-boundaries.png';
import starting from '../assets/cover-starting.png';
import measure from '../assets/cover-measure.png';
import uncertainty from '../assets/cover-uncertainty.png';
import type { ImageMetadata } from 'astro';
import { editionCaption } from './presentation';
import type { Locale } from './i18n';
const art: Readonly<Record<string, ImageMetadata>> = { '01':learning, '02':choices, '03':rest, '04':joy, '05':judgment, '06':writing, '07':study, '08':planning, '09':boundaries, '10':starting, '11':measure, '12':uncertainty };
export function issueArt(number: string) {
  const value = art[number];
  if (!value) throw new Error(`Missing cover illustration: ${number}`);
  return value;
}
export function shareCover(number: string, lang: Locale) { return `/echo/share/${number}-${lang}.png`; }
export function artDescription(number: string, lang: Locale) {
  if (Number(number) >= 4) return (lang === 'en' ? 'A watercolor illustration of Airing’s bear. ' : 'Airing 的小熊水彩插画。') + editionCaption(number, lang);
  if (number === '03') return lang === 'en' ? 'Airing’s bear sets down a letter and looks through a post-office window at the evening light.' : '小熊把信暂放桌上，望着邮局窗外的傍晚。';
  return lang === 'en'
    ? number === '02' ? 'Airing’s bear watches two paper boats take different channels in a stream.' : 'Airing’s bear writes a first letter as a paper bird takes flight.'
    : number === '02' ? '小熊在岔流边，望着驶向两条水路的纸船。' : '小熊写下第一封信，一只纸鸟从书桌起飞。';
}
