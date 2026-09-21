import 'server-only';

import {
  getChainSnapshot,
  getCollectorUpdates,
  getDrops,
  getSeries,
  getSettings,
  getTier,
  getWorkById,
} from '@/fixtures';
import { isSameAddress, normalizeAddress } from '@/lib/chain/address';
import { datedHoldings } from '@/lib/chain/derive';
import {
  chainDataState,
  getCollector,
  getCollectorActivity,
  getCollectorStats,
  getHoldersOfSeries,
  getHoldings,
  getLeaderboard,
  type HoldingsSource,
} from '@/lib/chain/holdings';
import type { AwardedBadge, Standing } from '@/lib/guild';
import { getStanding } from '@/lib/guild/read';
import { sumTokenAmounts } from '@/lib/money';
import { dropStatus, isModuleEnabled } from '@/lib/records';
import type {
  ActivityEvent,
  Collector,
  CollectorStats,
  CollectorUpdate,
  Drop,
  Holding,
  LeaderboardRow,
  Series,
  Tier,
  TokenAmount,
  Work,
} from '@/lib/types';

/**
 * Everything the three collector pages read, assembled in one place.
 *
 * The pages are the only callers, and they hand their components plain
 * objects, so nothing under src/components reads data.
 *
 * Two rules decide where a number comes from:
 *
 *  - The signed-in collector's own page may spend a live chain read, because
 *    one person is waiting for one address and the answer is cached.
 *  - A public profile and the directory read the snapshot and nothing else.
 *    Reading the chain for any address a visitor types into the URL would
 *    turn the install's Alchemy key into a public API, and the snapshot is
 *    what the leaderboard and the counts are computed from anyway.
 *
 * Anything neither source can answer is absent, not zero. There is no price
 * oracle and no marketplace here, so a holding has no market value, and a
 * total is printed only over the events that actually carried a price.
 */

// ---------------------------------------------------------------------------
// Shapes the pages render
// ---------------------------------------------------------------------------

/** One series a wallet holds work from, with the catalogue records resolved. */
export interface HeldGroup {
  seriesSlug: string | null;
  series: Series | null;
  works: Work[];
  /** Tokens on the artist's contracts that the catalogue has no record of. */
  unresolved: Holding[];
  /** Tokens held, counting ERC-1155 balances. */
  editions: number;
}

/** One event, with whatever the catalogue knows about the token it moved. */
export interface ActivityRow {
  event: ActivityEvent;
  work: Work | null;
  series: Series | null;
}

/** What the snapshot could price, and what it could not, so a page can caveat a total. */
export interface PricedTotals {
  /** Sum of the prices paid by this wallet, when every priced event used one currency. */
  spend: TokenAmount | null;
  /** Sum of the prices received. */
  proceeds: TokenAmount | null;
  acquisitions: number;
  disposals: number;
  /** Events in and out that carried no price, which is most of them on most chains. */
  unpricedIn: number;
  unpricedOut: number;
}

export interface CollectorProfile {
  collector: Collector;
  stats: CollectorStats;
  groups: HeldGroup[];
  activity: ActivityRow[];
  /** This wallet's row on the ranked list, when the snapshot ranks it. */
  standing: Standing | null;
  tier: Tier | null;
  badges: AwardedBadge[];
  totals: PricedTotals;
  /** Where the holdings came from: a live read, the snapshot, or nowhere. */
  source: HoldingsSource;
  /** When the snapshot behind the ranks and the events was taken. */
  snapshotAt: string | null;
  /** What that snapshot could not see, in the snapshot's own words. */
  gaps: string[];
  /** Set when a live read was tried and failed, so the page can say why. */
  error: string | null;
}

// ---------------------------------------------------------------------------
// Building one profile
// ---------------------------------------------------------------------------

function seriesOf(slug: string | null | undefined): Series | null {
  return slug ? getSeries(slug) : null;
}

/** Holdings grouped by series, largest group first, with the catalogue records attached. */
function groupHoldings(holdings: readonly Holding[]): HeldGroup[] {
  const groups = new Map<string, HeldGroup>();

  for (const holding of holdings) {
    const key = holding.seriesSlug ?? '';
    const group = groups.get(key) ?? {
      seriesSlug: holding.seriesSlug ?? null,
      series: seriesOf(holding.seriesSlug),
      works: [],
      unresolved: [],
      editions: 0,
    };
    const work = getWorkById(holding.workId);
    if (work) group.works.push(work);
    else group.unresolved.push(holding);
    group.editions += Math.max(1, holding.balance);
    groups.set(key, group);
  }

  return [...groups.values()].sort((a, b) => {
    const size = b.works.length + b.unresolved.length - (a.works.length + a.unresolved.length);
    if (size !== 0) return size;
    return (a.series?.name ?? '').localeCompare(b.series?.name ?? '');
  });
}

function activityRows(events: readonly ActivityEvent[]): ActivityRow[] {
  return events.map(event => {
    const work = event.workId ? getWorkById(event.workId) : null;
    return { event, work, series: work ? seriesOf(work.seriesSlug) : seriesOf(event.seriesSlug) };
  });
}

/**
 * What this wallet paid and received, over the events that carried a price.
 *
 * A sale settled in WETH or routed through a marketplace contract carries no
 * value in the transaction, so the snapshot holds no price for it. Those are
 * counted rather than guessed at, and the page prints the count beside the
 * total so nobody reads a partial sum as a complete one.
 */
function pricedTotals(events: readonly ActivityEvent[], address: string): PricedTotals {
  const inbound = events.filter(event => isSameAddress(event.to, address));
  const outbound = events.filter(event => isSameAddress(event.from, address));
  const paid = inbound.map(event => event.price).filter((price): price is TokenAmount => Boolean(price));
  const received = outbound.map(event => event.price).filter((price): price is TokenAmount => Boolean(price));

  return {
    spend: paid.length ? sumTokenAmounts(paid) : null,
    proceeds: received.length ? sumTokenAmounts(received) : null,
    acquisitions: paid.length,
    disposals: received.length,
    unpricedIn: inbound.length - paid.length,
    unpricedOut: outbound.length - received.length,
  };
}

/**
 * The tier and badges for one wallet.
 *
 * The guild package works these out from the snapshot for the leaderboard,
 * and the same function answers here, so a collector cannot be a Patron on
 * one page and nothing on another. The snapshot's own tierId is the fallback
 * for an install whose guild data names tiers but ranks nobody.
 */
function guildFor(address: string, stats: CollectorStats): {
  standing: Standing | null;
  tier: Tier | null;
  badges: AwardedBadge[];
} {
  const standing = getStanding(address);
  return {
    standing,
    tier: standing?.tier ?? (stats.tierId ? getTier(stats.tierId) : null),
    badges: standing?.badges ?? [],
  };
}

/** The leaderboard row for one address, which is where a rank, a tier and badges come from. */
function rowFor(address: string): LeaderboardRow | null {
  const snapshot = getChainSnapshot();
  return snapshot?.leaderboard.find(entry => isSameAddress(entry.address, address)) ?? null;
}

/**
 * Counts and dates from a set of holdings. The same arithmetic
 * getCollectorStats() does on the live path, for the snapshot-only path a
 * public profile takes.
 */
function statsFrom(address: string, holdings: readonly Holding[], row: LeaderboardRow | null): CollectorStats {
  const bySeries = new Map<string, number>();
  for (const holding of holdings) {
    if (!holding.seriesSlug) continue;
    bySeries.set(holding.seriesSlug, (bySeries.get(holding.seriesSlug) ?? 0) + 1);
  }

  const dates = holdings
    .map(holding => (holding.acquiredAt ? Date.parse(holding.acquiredAt) : NaN))
    .filter(value => Number.isFinite(value));

  return {
    address,
    worksOwned: holdings.length,
    editionsOwned: holdings.reduce((total, holding) => total + Math.max(1, holding.balance), 0),
    seriesCount: bySeries.size,
    firstAcquiredAt: dates.length ? new Date(Math.min(...dates)).toISOString() : (row?.firstAcquiredAt ?? null),
    lastAcquiredAt: dates.length ? new Date(Math.max(...dates)).toISOString() : (row?.lastAcquiredAt ?? null),
    bySeries: [...bySeries.entries()]
      .map(([seriesSlug, works]) => ({ seriesSlug, works }))
      .sort((a, b) => b.works - a.works),
    score: row?.score ?? null,
    tierId: row?.tierId ?? null,
    badgeIds: row?.badgeIds ?? [],
    rank: row?.rank ?? null,
  };
}

/** How many events a profile lists. The snapshot holds more; a page is not a ledger. */
export const ACTIVITY_LIMIT = 60;

/**
 * The signed-in collector's own profile. This is the one path allowed a live
 * read, and the only one that ever sees an address the snapshot has never
 * heard of, because a wallet that bought a work this morning should still
 * see it this morning.
 */
export async function loadOwnProfile(address: string): Promise<CollectorProfile | null> {
  const owner = normalizeAddress(address);
  if (!owner) return null;

  const [{ holdings, source, error }, stats] = await Promise.all([getHoldings(owner), getCollectorStats(owner)]);
  const events = getCollectorActivity(owner, Number.MAX_SAFE_INTEGER);
  const resolved = stats ?? statsFrom(owner, holdings, rowFor(owner));
  const chain = chainDataState();

  return {
    collector: collectorFacts(owner),
    stats: resolved,
    groups: groupHoldings(holdings),
    activity: activityRows(events.slice(0, ACTIVITY_LIMIT)),
    ...guildFor(owner, resolved),
    totals: pricedTotals(events, owner),
    source,
    snapshotAt: chain.computedAt,
    gaps: chain.gaps,
    error,
  };
}

/**
 * A public profile, from the snapshot alone. Null when the snapshot has
 * never seen this address, which is the honest answer: the install cannot
 * say that a wallet holds nothing, only that its last snapshot did not
 * record it.
 */
export function loadPublicProfile(address: string): CollectorProfile | null {
  const owner = normalizeAddress(address);
  const snapshot = getChainSnapshot();
  if (!owner || !snapshot) return null;

  const holder = snapshot.holders.find(entry => isSameAddress(entry.address, owner));
  const row = rowFor(owner);
  const allEvents = snapshot.events.filter(
    event => isSameAddress(event.from, owner) || isSameAddress(event.to, owner),
  );
  if (!holder && !row && allEvents.length === 0) return null;

  const holdings = datedHoldings(holder?.holdings ?? [], allEvents, owner);
  const stats = statsFrom(owner, holdings, row);
  const chain = chainDataState();

  return {
    collector: collectorFacts(owner),
    stats,
    groups: groupHoldings(holdings),
    activity: activityRows(allEvents.slice(0, ACTIVITY_LIMIT)),
    ...guildFor(owner, stats),
    totals: pricedTotals(allEvents, owner),
    source: 'snapshot',
    snapshotAt: chain.computedAt,
    gaps: chain.gaps,
    error: null,
  };
}

/**
 * The public facts about an address: the ENS name the snapshot resolved, the
 * artist's own label, and whether the address owns this install. Never a
 * name, an email or an avatar this install made up. getCollector() answers
 * for any well-formed address, so the fallback is only ever reached by a
 * string that is not one.
 */
function collectorFacts(address: string): Collector {
  return (
    getCollector(address) ?? {
      address,
      chain: 'ethereum',
      ens: null,
      label: null,
      isOwner: false,
      firstSeenAt: null,
      lastSeenAt: null,
    }
  );
}

// ---------------------------------------------------------------------------
// The directory
// ---------------------------------------------------------------------------

/** Rows the directory may page through. Well past any one artist's holder count. */
const DIRECTORY_LIMIT = 10_000;

export interface DirectoryData {
  rows: LeaderboardRow[];
  /**
   * Wallets on the whole ranked list, whatever the rows here are narrowed to.
   * Tier bands are percentiles of the whole list, so a series filter must not
   * change which tier a wallet is in.
   */
  rankedTotal: number;
  /** Series a visitor can narrow the list to, with the holders each one has. */
  series: { slug: string; name: string; holders: number }[];
  /** ISO date-time of the snapshot these rows came from. */
  computedAt: string | null;
  hasSnapshot: boolean;
  gaps: string[];
}

/**
 * Every holder the snapshot knows, and the series filter the page offers.
 * Whole-contract reads never happen here: the leaderboard is computed once,
 * by `pnpm snapshot:chain`, and read from the file.
 */
export function loadDirectory(seriesSlug?: string): DirectoryData {
  const chain = chainDataState();
  const ranked = getLeaderboard(DIRECTORY_LIMIT);
  const rows = seriesSlug ? getHoldersOfSeries(seriesSlug) : ranked;

  const snapshot = getChainSnapshot();
  const holderCounts = new Map<string, number>();
  for (const holder of snapshot?.holders ?? []) {
    for (const slug of new Set(holder.holdings.map(holding => holding.seriesSlug).filter(Boolean))) {
      holderCounts.set(slug as string, (holderCounts.get(slug as string) ?? 0) + 1);
    }
  }

  const series = [...holderCounts.entries()]
    .map(([slug, holders]) => ({ slug, name: getSeries(slug)?.name ?? slug, holders }))
    .sort((a, b) => b.holders - a.holders || a.name.localeCompare(b.name));

  return {
    rows,
    rankedTotal: ranked.length,
    series,
    computedAt: chain.computedAt,
    hasSnapshot: chain.hasSnapshot,
    gaps: chain.gaps,
  };
}

// ---------------------------------------------------------------------------
// What the artist has to say to their collectors
// ---------------------------------------------------------------------------

/**
 * The artist's notes, narrowed to this wallet: a note about a series is for
 * the people holding it, and a note with no series is for everyone.
 */
export function updatesFor(stats: CollectorStats, limit = 5): CollectorUpdate[] {
  const held = new Set(stats.bySeries.map(entry => entry.seriesSlug));
  return getCollectorUpdates()
    .filter(update => !update.seriesSlug || held.has(update.seriesSlug))
    .slice(0, limit);
}

/**
 * Releases that have not happened yet, for the early-access block. Real
 * announced drops, never a placeholder: an install with nothing announced
 * shows nothing.
 */
export function upcomingDrops(limit = 3): Drop[] {
  if (!isModuleEnabled(getSettings(), 'drops')) return [];
  const now = Date.now();
  return getDrops()
    .filter(drop => {
      const status = dropStatus(drop, now);
      return status === 'scheduled' || status === 'announced' || status === 'live';
    })
    .slice(0, limit);
}
