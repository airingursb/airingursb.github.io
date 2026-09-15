export type BearPlacement = 'header' | 'footer';
export type BearObject = 'bear' | 'mug' | 'laptop' | 'plant' | 'lamp' | 'book' | 'letter' | 'camera' | 'curtain' | 'bird' | 'mailbox';
export type BearInput = 'pointer' | 'keyboard';
export type BearEvent = {
  readonly name: string;
  readonly data: { readonly placement: BearPlacement; readonly version: 1; readonly object?: BearObject; readonly input?: BearInput };
};

export function canTrackBearPage(url: URL): boolean {
  return ['ursb.me', 'www.ursb.me', 'airingursb.github.io'].includes(url.hostname)
    && url.pathname === '/'
    && !['scene', 'preview'].some(key => url.searchParams.has(key));
}

/** Counts visits to a scene, not identities. Umami owns visitor deduplication. */
export class BearAnalyticsState {
  private viewed = false;
  private engaged = false;
  private readonly placement: BearPlacement;
  constructor(placement: BearPlacement) { this.placement = placement; }

  view(): BearEvent[] {
    if (this.viewed) return [];
    this.viewed = true;
    return [{ name: `bear-${this.placement}-view`, data: { placement: this.placement, version: 1 } }];
  }

  click(object: BearObject, input: BearInput): BearEvent[] {
    const events = this.view();
    const data = { placement: this.placement, version: 1, object, input } as const;
    if (!this.engaged) {
      this.engaged = true;
      events.push({ name: `bear-${this.placement}-engage`, data });
    }
    events.push({ name: `bear-${this.placement}-click`, data });
    return events;
  }
}
