import { editions } from './letters.ts';
import { choiceLetters } from './choices.ts';
import { restLetters } from './rest.ts';
import { seasonALetters } from './season-a-letters.ts';
import { seasonBLetters } from './season-b-letters.ts';
import { englishSeasonALetters } from './en/season-a-letters.ts';
import { englishSeasonBLetters } from './en/season-b-letters.ts';
import { learningTranslations } from './en/letters-learning.ts';
import { careerTranslations } from './en/letters-career.ts';
import { restTranslations } from './en/letters-rest.ts';
import { translateLetter } from './en/translation.ts';
import { localPath, type Locale } from './i18n.ts';

export const allLetters = [...editions, ...choiceLetters, ...restLetters, ...seasonALetters, ...seasonBLetters];
export const englishLetters = [
  ...editions.map((letter, index) => translateLetter(letter, learningTranslations[index])),
  ...choiceLetters.map((letter, index) => translateLetter(letter, careerTranslations[index])),
  ...restLetters.map((letter, index) => translateLetter(letter, restTranslations[index])),
  ...englishSeasonALetters,
  ...englishSeasonBLetters,
];
export function lettersFor(lang: Locale) { return lang === 'en' ? englishLetters : allLetters; }
export function issuePath(number: string, lang: Locale = 'zh'): string {
  return localPath('/issues/' + number + '/', lang);
}
