export type QueryTicket = { readonly query: string; readonly revision: number };
export type SearchReaction = 'found' | 'empty';

export class SearchQueryState {
  query = '';
  revision = 0;
  private confirmed = false;
  private started = false;
  private outcome: SearchReaction | null = null;

  input(value: string): boolean {
    const query = value.trim();
    if (query === this.query) return false;
    this.query = query;
    this.revision++;
    this.confirmed = false;
    this.started = false;
    this.outcome = null;
    return true;
  }

  start(query: string): boolean {
    if (!this.query || query.trim() !== this.query) return false;
    this.started = true;
    this.outcome = null;
    return true;
  }

  complete(query: string, count: number): void {
    if (this.started && query.trim() === this.query && Number.isInteger(count) && count >= 0) {
      this.outcome = count > 0 ? 'found' : 'empty';
    }
  }

  confirm(): QueryTicket | null {
    if (!this.query || this.confirmed) return null;
    this.confirmed = true;
    return { query: this.query, revision: this.revision };
  }

  current(ticket: QueryTicket): boolean {
    return ticket.query === this.query && ticket.revision === this.revision;
  }

  reaction(ticket: QueryTicket): SearchReaction | null {
    return this.current(ticket) ? this.outcome : null;
  }
}
