// Shared metadata date format for detail pages (DESIGN.md → Detail-page dates).
// Chinese: 2026.08.15 (mono-friendly, matches notes / weekly / diorama).
// English: Aug 15, 2026.
export type DisplayLang = 'zh' | 'en';

const TIME_ZONE = 'Asia/Shanghai';

export function formatDisplayDate(value: string | number | Date | null | undefined, lang: DisplayLang): string {
  if (value == null || value === '') return '';
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  if (lang === 'en') {
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric', timeZone: TIME_ZONE });
  }
  const parts = new Intl.DateTimeFormat('en-CA', { year: 'numeric', month: '2-digit', day: '2-digit', timeZone: TIME_ZONE }).formatToParts(date);
  const pick = (type: string) => parts.find((part) => part.type === type)?.value ?? '';
  return `${pick('year')}.${pick('month')}.${pick('day')}`;
}
