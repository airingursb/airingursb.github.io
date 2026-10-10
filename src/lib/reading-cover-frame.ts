export type ReadingCoverFrameKind =
  | 'detail'
  | 'card'
  | 'home-thumb'
  | 'weekly-story'
  | 'share';

const FRAME_MARKERS: Record<ReadingCoverFrameKind, string[]> = {
  detail: ['reading-poster', 'reading-caption', 'reading-zoom-label', 'reading-lightbox'],
  card: ['reading-card-cover'],
  'home-thumb': ['reading-home-thumb'],
  'weekly-story': ['weekly-story-cover'],
  share: ['share-image'],
};

export function readingCoverFrameHtml(
  kind: ReadingCoverFrameKind,
  hasCover: boolean,
  frame: string,
): string {
  return hasCover ? frame : '';
}

export function readingCoverFrameMarkers(kind: ReadingCoverFrameKind): string[] {
  return FRAME_MARKERS[kind];
}

export function skippedCoverLeavesNoFrame(kind: ReadingCoverFrameKind, html: string): boolean {
  return FRAME_MARKERS[kind].every((marker) => !html.includes(marker));
}
