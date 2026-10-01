import { editions } from './letters.ts';
import { choiceLetters } from './choices.ts';
import { learningTranslations } from './en/letters-learning.ts';
import { careerTranslations } from './en/letters-career.ts';
import { translateLetter } from './en/translation.ts';
import { localPath, type Locale } from './i18n.ts';

export const allLetters = [...editions, ...choiceLetters];
export const englishLetters = [
  ...editions.map((letter, index) => translateLetter(letter, learningTranslations[index])),
  ...choiceLetters.map((letter, index) => translateLetter(letter, careerTranslations[index])),
];
export function lettersFor(lang: Locale) { return lang === 'en' ? englishLetters : allLetters; }
export function issuePath(number: string, lang: Locale = 'zh'): string {
  return localPath('/issues/' + number + '/', lang);
}
