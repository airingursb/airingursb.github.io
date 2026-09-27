import type { Correspondence, Manuscript } from '../letters.ts';

export interface ManuscriptTranslation {
  readonly salutation: string;
  readonly closing: string;
  readonly paragraphs: readonly string[];
}
export interface LetterTranslation {
  readonly code: string;
  readonly label: string;
  readonly title: string;
  readonly round?: string;
  readonly incoming: ManuscriptTranslation;
  readonly reply: ManuscriptTranslation;
}
class IncompleteTranslation extends Error {
  constructor(id: string) { super(`Incomplete English correspondence: ${id}`); }
}
function manuscript(source: Manuscript, translated: ManuscriptTranslation, code: string): Manuscript {
  if (source.paragraphs.length !== translated.paragraphs.length) throw new IncompleteTranslation(source.id);
  return {
    ...source,
    label: source.id === 'incoming' ? 'Letter' : 'Reply',
    sender: source.id === 'incoming' ? code : 'Airing',
    recipient: source.id === 'incoming' ? 'Airing' : code,
    signature: source.id === 'incoming' ? code : 'Airing',
    salutation: translated.salutation, closing: translated.closing,
    paragraphs: source.paragraphs.map((paragraph, index) => {
      const text = translated.paragraphs[index];
      if (!text) throw new IncompleteTranslation(paragraph.id);
      return { ...paragraph, text };
    }),
  };
}
export function translateLetter(source: Correspondence, translation: LetterTranslation): Correspondence {
  return { ...source, code: translation.code, label: translation.label, title: translation.title, round: translation.round,
    incoming: manuscript(source.incoming, translation.incoming, translation.code),
    reply: manuscript(source.reply, translation.reply, translation.code),
  };
}
