/**
 * One wallet's standing: its row on the leaderboard, its tier and its badges,
 * plus the facts all three were worked out from.
 *
 * The ranking itself is not decided here. It is decided once, in
 * `buildLeaderboard` in src/lib/chain/derive.ts, and written into the
 * snapshot, so the order on this page is the order in the file and a reader
 * can reproduce it with the same snapshot. What this module adds is the part
 * a page has to explain: which tier a rank falls in, which badges the facts
 * support, and the words for both.
 *
 * Pure and client safe.
 */

import { isSameAddress, normalizeAddress } from '@/lib/chain/address';
import type { LeaderboardRow, Badge as BadgeRecord, Tier } from '@/lib/types';

import { awardBadges, type AwardedBadge } from './badges';
import { factsFor, type GuildFacts, type HolderFacts } from './facts';
import { assignTier } from './tiers';

/** Rows on one page of the leaderboard. */
export const LEADERBOARD_PAGE_SIZE = 25;

/** The furthest page anyone can ask for, so a crawler cannot walk forever. */
export const MAX_PAGE = 200;

export interface Standing {
  rank: number;
  address: string;
  /**
   * The public name for the wallet: its ENS name, or the artist's own label
   * where the install publishes those. Null means the address is the name.
   */
  name: string | null;
  /** True when the name came from the artist's notes rather than from a name service. */
  namedByArtist: boolean;
  row: LeaderboardRow;
  tier: Tier | null;
  badges: AwardedBadge[];
  facts: HolderFacts;
}

/**
 * Turn the snapshot's rows into standings.
 *
 * `showLabels` follows settings.showOwners: an ENS name is a public record
 * and is always used, but the artist's private note about a wallet is only
 * printed where the install says collector names may be shown.
 *
 * The percentile a tier is read from is of the whole ranked list, not of a
 * page, so the rows are passed in whole and filtered afterwards.
 */
export function buildStandings({
  rows,
  facts,
  tiers = [],
  badges = [],
  showLabels = false,
}: {
  rows: readonly LeaderboardRow[];
  facts: GuildFacts;
  tiers?: readonly Tier[];
  badges?: readonly BadgeRecord[];
  showLabels?: boolean;
}): Standing[] {
  const total = rows.length;
  return rows.map(row => {
    const own = factsFor(facts, row.address);
    const ens = row.ens?.trim() || null;
    const label = showLabels ? row.label?.trim() || null : null;
    return {
      rank: row.rank,
      address: normalizeAddress(row.address) ?? row.address,
      name: ens ?? label,
      namedByArtist: !ens && Boolean(label),
      row,
      tier: assignTier(row, total, tiers),
      badges: awardBadges(own, facts, { records: badges, given: row.badgeIds ?? [] }),
      facts: own,
    } satisfies Standing;
  });
}

/** How many of these wallets hold each badge, keyed by badge id. */
export function badgeCounts(standings: readonly Standing[]): Map<string, number> {
  const counts = new Map<string, number>();
  for (const standing of standings) {
    for (const badge of standing.badges) counts.set(badge.id, (counts.get(badge.id) ?? 0) + 1);
  }
  return counts;
}

export function findStanding(standings: readonly Standing[], address: string | null | undefined): Standing | null {
  if (!address) return null;
  return standings.find(standing => isSameAddress(standing.address, address)) ?? null;
}

// ---------------------------------------------------------------------------
// Searching and paging
// ---------------------------------------------------------------------------

/**
 * What a search box is allowed to look at: exactly what is on screen. An
 * address, the ENS name beside it, the tier it sits in, and the artist's
 * label only where that label is published, so a search cannot be used to
 * confirm a private note nobody can see.
 */
export function matchesQuery(standing: Standing, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  if (standing.address.includes(q)) return true;
  if (standing.row.ens?.toLowerCase().includes(q)) return true;
  if (standing.namedByArtist && standing.name?.toLowerCase().includes(q)) return true;
  if (standing.tier?.name.toLowerCase().includes(q)) return true;
  return false;
}

export function filterStandings(
  standings: readonly Standing[],
  { query = '', tierId = null }: { query?: string; tierId?: string | null } = {},
): Standing[] {
  return standings.filter(standing => {
    if (tierId && standing.tier?.id !== tierId) return false;
    return matchesQuery(standing, query);
  });
}

export function pageCount(total: number, size = LEADERBOARD_PAGE_SIZE): number {
  return Math.max(1, Math.min(MAX_PAGE, Math.ceil(total / size)));
}

export function clampPage(page: number, total: number, size = LEADERBOARD_PAGE_SIZE): number {
  if (!Number.isFinite(page) || page < 1) return 1;
  return Math.min(Math.floor(page), pageCount(total, size));
}

export function pageOf<T>(rows: readonly T[], page: number, size = LEADERBOARD_PAGE_SIZE): T[] {
  const start = (clampPage(page, rows.length, size) - 1) * size;
  return rows.slice(start, start + size);
}

// ---------------------------------------------------------------------------
// The words
// ---------------------------------------------------------------------------

/**
 * How the order is decided, in the order it is decided, written to match
 * `buildLeaderboard` exactly. If that function changes, this changes with it:
 * a leaderboard that will not say how it ranks is a leaderboard nobody should
 * believe.
 */
export const RANKING_STEPS: { title: string; detail: string }[] = [
  {
    title: 'Works held, most first',
    detail: 'Tokens of this artist that the wallet holds now, counted from the snapshot. Editions of the same token count once.',
  },
  {
    title: 'Then series covered',
    detail: 'Two wallets holding the same number of works are separated by how many different series they are spread across.',
  },
  {
    title: 'Then who was here first',
    detail: 'Still level, the earlier first acquisition in the snapshot history ranks higher, so holding early and holding on counts for something.',
  },
  {
    title: 'Then the address, so the order never wanders',
    detail: 'A last tie is broken by the address itself. It means nothing, and it means two identical snapshots always list the same order.',
  },
];

/** What the ranking deliberately does not count, so nobody has to guess. */
export const RANKING_EXCLUSIONS: string[] = [
  'Money. A sale settled in WETH or through a marketplace contract carries no value in the transaction, so this install cannot see most prices and does not rank on any of them.',
  'Trading. Volume, flips and profit are not counted, in either direction.',
  'Anything off the chain. No email, no sign-up, no social account and nothing said in a chat room.',
  "The artist's own wallets and the zero address, which are left out of the ranking entirely.",
];
