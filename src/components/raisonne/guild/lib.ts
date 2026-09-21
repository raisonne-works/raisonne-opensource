import type { RawSearchParams } from '@/components/raisonne/catalogue/lib';
import { LEADERBOARD_PAGE_SIZE, MAX_PAGE } from '@/lib/guild';

/**
 * The leaderboard's URL state and the links between its two pages.
 *
 * Every control on the leaderboard is a link or a GET form, so a search, a
 * tier filter and a page are all places that can be shared, bookmarked,
 * printed in a footnote and opened with no JavaScript at all. Nothing on
 * these pages is state the browser keeps to itself.
 *
 * Pure and client safe.
 */

export const LEADERBOARD_PATH = '/leaderboard';

/** Where the tier and badge model is explained in full. */
export const GUILD_PATH = '/leaderboard/guild';

/** An id from the data, made safe to put in a fragment. */
function anchorId(prefix: string, id: string): string {
  const slug = id
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);
  return `${prefix}-${slug || 'unnamed'}`;
}

export function tierAnchor(id: string): string {
  return anchorId('tier', id);
}

export function badgeAnchor(id: string): string {
  return anchorId('badge', id);
}

/** A link from a chip on the leaderboard to the paragraph that explains it. */
export function tierHref(id: string): string {
  return `${GUILD_PATH}#${tierAnchor(id)}`;
}

export function badgeHref(id: string): string {
  return `${GUILD_PATH}#${badgeAnchor(id)}`;
}

// ---------------------------------------------------------------------------
// The URL
// ---------------------------------------------------------------------------

export interface LeaderboardState {
  q: string;
  /** A Tier.id, or an empty string for every tier. */
  tier: string;
  page: number;
}

export const EMPTY_LEADERBOARD_STATE: LeaderboardState = { q: '', tier: '', page: 1 };

function firstParam(params: RawSearchParams, key: string): string {
  const value = params[key];
  const raw = Array.isArray(value) ? value[0] : value;
  return typeof raw === 'string' ? raw.trim() : '';
}

/**
 * What the URL asks for, with anything unrecognised dropped. The search is
 * cut to 100 characters and the page to the last one a crawler may walk, so
 * neither a long query string nor a guessed page number can cost a render.
 */
export function parseLeaderboardState(params: RawSearchParams, tierIds: readonly string[] = []): LeaderboardState {
  const tier = firstParam(params, 'tier');
  const page = Number.parseInt(firstParam(params, 'page'), 10);
  return {
    q: firstParam(params, 'q').slice(0, 100),
    tier: tierIds.includes(tier) ? tier : '',
    page: Number.isFinite(page) && page > 0 ? Math.min(page, MAX_PAGE) : 1,
  };
}

/** The URL for a changed state. Changing anything but the page returns to page one. */
export function leaderboardHref(state: LeaderboardState, change: Partial<LeaderboardState> = {}): string {
  const next: LeaderboardState = { ...state, ...change };
  if (!('page' in change)) next.page = 1;

  const params = new URLSearchParams();
  if (next.q) params.set('q', next.q);
  if (next.tier) params.set('tier', next.tier);
  if (next.page > 1) params.set('page', String(next.page));

  const query = params.toString();
  return query ? `${LEADERBOARD_PATH}?${query}` : LEADERBOARD_PATH;
}

export function isFiltered(state: LeaderboardState): boolean {
  return Boolean(state.q || state.tier);
}

/** Which row numbers this page is showing, for the count line above the table. */
export function shownRange(state: LeaderboardState, matched: number): { from: number; to: number } {
  const from = matched === 0 ? 0 : (state.page - 1) * LEADERBOARD_PAGE_SIZE + 1;
  return { from, to: Math.min(matched, state.page * LEADERBOARD_PAGE_SIZE) };
}
