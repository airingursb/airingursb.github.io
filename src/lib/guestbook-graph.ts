// Pure model for the homepage guestbook drawn as `git log --graph`
// (src/components/GuestbookCard.astro, src/scripts/guestbook.ts).
//
// main (lane 0) is the guestbook itself; every post is a coloured branch;
// every root comment is a commit whose short hash comes from its id; the
// latest reply hangs off its commit as a dashed fork on the rightmost lane.
// Kept free of DOM so tests can run it in node.

export interface FeedReply {
  nickname: string;
  is_author?: boolean;
  content: string;
  created_at: string;
}

export interface FeedItem {
  type: 'post' | 'inline';
  id: number;
  post_slug: string;
  nickname?: string;
  content: string;
  selected_text?: string | null;
  created_at: string;
  latest_reply?: FeedReply | null;
}

export interface PendingCommit {
  id: number;
  hash: string;
  nickname: string;
  content: string;
  created_at: string;
  status: 'pending' | 'approved';
  /** ms epoch of the submit, for expiry */
  at: number;
}

export type GraphRow =
  | { kind: 'pend'; lane: 0; pend: PendingCommit }
  | { kind: 'commit'; lane: number; item: FeedItem; head: boolean; deco: 'head' | 'first' | null; firstOfSlug: boolean }
  | { kind: 'reply'; lane: number; item: FeedItem; reply: FeedReply };

export const GUESTBOOK_SLUG = 'guestbook';
/** Article lanes beyond this reuse a lane whose branch has ended. */
export const MAX_ARTICLE_LANES = 6;

/** 32-bit FNV-1a. */
export function fnv1a(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function hex7(seed: string): string {
  return ('0000000' + fnv1a(seed).toString(16)).slice(-7);
}

/**
 * 7-hex "commit hash" for a comment. Post and inline ids live in different
 * tables, so the type is part of the seed. A pending commit uses the id the
 * server returned, so it keeps its hash once it is approved.
 */
export function commitHash(type: 'post' | 'inline', id: number | string): string {
  return hex7((type === 'inline' ? 'i' : 'c') + id);
}

export function replyHash(item: Pick<FeedItem, 'type' | 'id'>): string {
  return hex7('r' + (item.type === 'inline' ? 'i' : 'c') + item.id);
}

export interface Layout {
  rows: GraphRow[];
  /** number of lanes including main and the reply lane */
  lanes: number;
  /** lane used by reply forks (rightmost) */
  replyLane: number;
  /** per article lane: [first row index, last row index] of each branch drawn on it */
  segments: Array<{ lane: number; slug: string; from: number; to: number; open: boolean }>;
}

/**
 * Lay out pending commits, then feed items (newest first), into lanes.
 * A branch occupies its lane from its newest to its oldest visible commit;
 * a lane is reused once its branch has ended. `hasMore` says older commits
 * exist below the last row, so the branches still open at the bottom keep
 * running down instead of merging back into main.
 */
export function layoutGraph(items: FeedItem[], pending: PendingCommit[], hasMore: boolean): Layout {
  const rows: GraphRow[] = [];
  pending.forEach((p) => rows.push({ kind: 'pend', lane: 0, pend: p }));

  // Last index (in `items`) of each slug, to know when its lane frees up.
  const lastIdx: Record<string, number> = {};
  items.forEach((m, i) => { lastIdx[m.post_slug] = i; });

  const laneOf: Record<string, number> = { [GUESTBOOK_SLUG]: 0 };
  const laneBusyUntil: number[] = []; // by lane: item index of its current branch's last commit
  const segBySlug: Record<string, { lane: number; slug: string; from: number; to: number; open: boolean }> = {};
  const segments: Layout['segments'] = [];
  const seen = new Set<string>();
  let maxLane = 0;
  let headDone = false;

  items.forEach((m, i) => {
    const slug = m.post_slug;
    const firstOfSlug = !seen.has(slug);
    seen.add(slug);
    if (!(slug in laneOf)) {
      let lane = 0;
      for (let l = 1; l <= MAX_ARTICLE_LANES; l++) {
        if (laneBusyUntil[l] === undefined || laneBusyUntil[l] < i) { lane = l; break; }
      }
      if (!lane) {
        // Every lane is busy: take the one whose branch ends first.
        lane = 1;
        for (let l = 2; l <= MAX_ARTICLE_LANES; l++) if (laneBusyUntil[l] < laneBusyUntil[lane]) lane = l;
      }
      laneOf[slug] = lane;
      laneBusyUntil[lane] = lastIdx[slug];
      if (lane > maxLane) maxLane = lane;
    }
    const lane = laneOf[slug];
    const rowIndex = rows.length;
    if (lane > 0) {
      let seg = segBySlug[slug];
      if (!seg) {
        seg = { lane, slug, from: rowIndex, to: rowIndex, open: false };
        segBySlug[slug] = seg;
        segments.push(seg);
      }
      seg.to = rowIndex;
    }
    const head = !headDone;
    headDone = true;
    rows.push({ kind: 'commit', lane, item: m, head, deco: head ? 'head' : firstOfSlug ? 'first' : null, firstOfSlug });
    if (m.latest_reply) rows.push({ kind: 'reply', lane: -1, item: m, reply: m.latest_reply });
    // Once a slug's last commit is placed, its lane may be reused.
    if (lastIdx[slug] === i && slug !== GUESTBOOK_SLUG) delete laneOf[slug];
  });

  const replyLane = maxLane + 1;
  rows.forEach((r) => { if (r.kind === 'reply') r.lane = replyLane; });
  // A branch still open at the bottom: no later branch took its lane.
  if (hasMore) {
    const lastSegOnLane: Record<number, typeof segments[number]> = {};
    segments.forEach((s) => { lastSegOnLane[s.lane] = s; });
    Object.values(lastSegOnLane).forEach((s) => { s.open = true; });
  }
  const anyReply = rows.some((r) => r.kind === 'reply');
  return { rows, lanes: (anyReply ? replyLane : maxLane) + 1, replyLane, segments };
}

// ── pending commits (localStorage) ──────────────────────────────────────────

export const PENDING_KEY = 'gb_pending_v1';
/** A 'pending' commit waits for review for up to 3 days. */
export const PENDING_TTL_MS = 3 * 24 * 3600 * 1000;
/**
 * An 'approved' commit is public at once; if the feed still lacks it after
 * 10 minutes the async AI review took it down, so stop showing it.
 */
export const APPROVED_TTL_MS = 10 * 60 * 1000;

export function prunePending(list: PendingCommit[], feed: Array<Pick<FeedItem, 'type' | 'id'>>, now: number): PendingCommit[] {
  const live = new Set(feed.filter((m) => m.type === 'post').map((m) => m.id));
  return (Array.isArray(list) ? list : []).filter((p) => {
    if (!p || typeof p.id !== 'number') return false;
    if (live.has(p.id)) return false;
    const ttl = p.status === 'approved' ? APPROVED_TTL_MS : PENDING_TTL_MS;
    return now - (p.at || 0) < ttl;
  });
}
