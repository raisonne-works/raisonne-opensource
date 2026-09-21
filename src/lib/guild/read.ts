import 'server-only';

/**
 * What the leaderboard and the guild page read.
 *
 * One source only: the chain snapshot this install refreshes with
 * `pnpm snapshot:chain`, plus the tiers and badges the artist wrote. Nothing
 * here calls a network, because a leaderboard spans every wallet and reading
 * every wallet live would mean walking whole contracts on a page load. An
 * install that has never taken a snapshot gets `null`, and the page says so
 * rather than showing an empty table that reads as "nobody collects this".
 *
 * The expensive half, walking the events, is done once per snapshot and kept
 * against the snapshot object itself, so every request after the first is a
 * few hundred comparisons.
 */

import { getBadgeCategories, getBadges, getChainSnapshot, getGuild, getSettings, getTiers } from '@/fixtures';
import { normalizeAddress } from '@/lib/chain/address';
import type { BadgeCategory, ChainSnapshot, GuildData, Badge as BadgeRecord, Tier } from '@/lib/types';

import { buildGuildFacts, type GuildFacts } from './facts';
import { buildStandings, findStanding, type Standing } from './standings';
import { tierDistribution, type TierCount } from './tiers';

/** Facts are per snapshot, so they live and die with the snapshot object. */
const factsCache = new WeakMap<ChainSnapshot, GuildFacts>();

function factsOf(snapshot: ChainSnapshot): GuildFacts {
  const cached = factsCache.get(snapshot);
  if (cached) return cached;
  const facts = buildGuildFacts(snapshot);
  factsCache.set(snapshot, facts);
  return facts;
}

/** Where the numbers came from, so a page can print one honest line about it. */
export interface SnapshotNote {
  /** ISO date-time the snapshot was taken. */
  computedAt: string;
  contracts: number;
  seriesCovered: number;
  holders: number;
  events: number;
  /** True when at least one contract hit the event cap. */
  truncated: boolean;
  /** Plain-words caveats, from the snapshot and from the history itself. */
  gaps: string[];
}

export interface GuildBoard {
  /** Every ranked wallet, in rank order. */
  standings: Standing[];
  total: number;
  facts: GuildFacts;
  tiers: Tier[];
  badges: BadgeRecord[];
  badgeCategories: BadgeCategory[];
  guild: GuildData | null;
  distribution: TierCount[];
  snapshot: SnapshotNote;
  /** Totals across the ranked list. Counts only: nothing here has a price. */
  totals: { wallets: number; worksHeld: number; seriesHeld: number; withBadges: number };
}

/**
 * The whole board, or null when this install has no snapshot to read.
 *
 * Note what is absent: no value, no spend, no estimate. The snapshot holds
 * counts and dates, so the board holds counts and dates.
 */
export function getGuildBoard(): GuildBoard | null {
  const snapshot = getChainSnapshot();
  if (!snapshot) return null;

  const facts = factsOf(snapshot);
  const tiers = getTiers();
  const badges = getBadges();
  const standings = buildStandings({
    rows: snapshot.leaderboard,
    facts,
    tiers,
    badges,
    // The artist's own label for a wallet is a private note until the install
    // says collector names may be published.
    showLabels: getSettings().showOwners,
  });

  const seriesHeld = new Set<string>();
  let worksHeld = 0;
  let withBadges = 0;
  for (const standing of standings) {
    worksHeld += standing.row.worksOwned;
    if (standing.badges.length > 0) withBadges += 1;
    for (const slug of standing.facts.seriesSlugs) seriesHeld.add(slug);
  }

  const gaps = [...(snapshot.insights?.gaps ?? [])];
  if (facts.historyNote) gaps.unshift(facts.historyNote);

  return {
    standings,
    total: standings.length,
    facts,
    tiers,
    badges,
    badgeCategories: getBadgeCategories(),
    guild: getGuild(),
    distribution: tierDistribution(standings, tiers),
    snapshot: {
      computedAt: snapshot.computedAt,
      contracts: snapshot.contracts.length,
      seriesCovered: new Set(snapshot.contracts.map(contract => contract.seriesSlug).filter(Boolean)).size,
      holders: snapshot.holders.length,
      events: snapshot.events.length,
      truncated: snapshot.contracts.some(contract => contract.truncated),
      gaps,
    },
    totals: { wallets: standings.length, worksHeld, seriesHeld: seriesHeld.size, withBadges },
  };
}

/**
 * One wallet's standing, for the signed-in visitor's own row and for the
 * collector pages. Null when the address is not on the ranked list, which is
 * a real answer: it holds nothing, or it is the artist's own wallet, or the
 * snapshot has not caught up with a purchase yet.
 */
export function getStanding(address: string | null | undefined): Standing | null {
  const owner = normalizeAddress(address ?? '');
  if (!owner) return null;
  return findStanding(getGuildBoard()?.standings ?? [], owner);
}

/** True when this install has a snapshot at all. */
export function hasChainSnapshot(): boolean {
  return getChainSnapshot() !== null;
}
