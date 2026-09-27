export const READING_BATCH_SIZE = 12;

type ReadingFilter = {
  readonly source: string;
  readonly month: string;
  readonly limit: number;
};

export function readingWindow<T extends { readonly source: string; readonly month: string }>(
  cards: readonly T[],
  filter: ReadingFilter,
): { readonly total: number; readonly visible: readonly T[] } {
  const matches = cards.filter((card) =>
    (filter.source === 'all' || card.source === filter.source)
    && (filter.month === 'all' || card.month === filter.month));
  return { total: matches.length, visible: matches.slice(0, filter.limit) };
}
