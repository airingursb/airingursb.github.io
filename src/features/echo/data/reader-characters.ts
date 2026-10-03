/** Fixed visual identities for pseudonymous readers; independent of locale and issue. */
export const readerCharacters = {
  'output': { id: 'output', character: 'rabbit', name: { zh: '小兔子', en: 'Rabbit' } },
  'practice': { id: 'practice', character: 'fox', name: { zh: '小狐狸', en: 'Fox' } },
  'interest': { id: 'interest', character: 'penguin', name: { zh: '小企鹅', en: 'Penguin' } },
  'mist': { id: 'mist', character: 'cat', name: { zh: '小橘猫', en: 'Orange cat' } },
  'offer-autumn': { id: 'offer-autumn', character: 'otter', name: { zh: '小水獭', en: 'Otter' } },
  'four-options': { id: 'four-options', character: 'owl', name: { zh: '小猫头鹰', en: 'Owl' } },
  'time-race': { id: 'time-race', character: 'capybara', name: { zh: '水豚', en: 'Capybara' } },
  'notice-joy': { id: 'notice-joy', character: 'chick', name: { zh: '小鸡', en: 'Chick' } },
  'judgment-and-tools': { id: 'judgment-and-tools', character: 'panda', name: { zh: '熊猫', en: 'Panda' } },
  'record-and-return': { id: 'record-and-return', character: 'raccoon', name: { zh: '小浣熊', en: 'Raccoon' } },
  'study-purpose': { id: 'study-purpose', character: 'deer', name: { zh: '小鹿', en: 'Deer' } },
  'branching-plans': { id: 'branching-plans', character: 'squirrel', name: { zh: '小松鼠', en: 'Squirrel' } },
  'work-boundaries': { id: 'work-boundaries', character: 'hedgehog', name: { zh: '小刺猬', en: 'Hedgehog' } },
  'starting-gently': { id: 'starting-gently', character: 'red-panda', name: { zh: '小熊猫', en: 'Red panda' } },
  'own-measure': { id: 'own-measure', character: 'koala', name: { zh: '考拉', en: 'Koala' } },
  'certain-ground': { id: 'certain-ground', character: 'seal', name: { zh: '小海豹', en: 'Seal' } },
} as const;
export type ReaderId = keyof typeof readerCharacters;

export const readersByLetter: Readonly<Record<string, ReaderId>> = {
  'output': 'output',
  'practice': 'practice',
  'interest': 'interest',
  'mist': 'mist',
  'offer-autumn': 'offer-autumn',
  'offer-spring': 'offer-autumn',
  'offer-summer': 'offer-autumn',
  'four-options': 'four-options',
  'time-race': 'time-race',
  'useful-hours': 'time-race',
  'evening-letter': 'mist',
  'notice-joy': 'notice-joy',
  'judgment-and-tools': 'judgment-and-tools',
  'record-and-return': 'record-and-return',
  'study-purpose': 'study-purpose',
  'branching-plans': 'branching-plans',
  'work-boundaries': 'work-boundaries',
  'starting-gently': 'starting-gently',
  'own-measure': 'own-measure',
  'certain-ground': 'certain-ground',
};

export function readerForLetter(letterId: string) {
  const readerId = readersByLetter[letterId];
  if (!readerId) throw new Error(`Missing Echo reader identity: ${letterId}`);
  return readerCharacters[readerId];
}
