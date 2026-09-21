import 'server-only';

import { getChainSnapshot, getSiteData } from '@/fixtures';
import { artistWalletAddresses, chainCacheSeconds } from '@/lib/config';
import type {
  ActivityEvent,
  Chain,
  Collector,
  CollectorStats,
  Holding,
  InsightsSummary,
  LeaderboardRow,
  SalesStats,
} from '@/lib/types';

import { isSameAddress, normalizeAddress } from './address';
import { ChainError, alchemyConfigured, alchemySupports, getHoldingsForOwner } from './alchemy';
import { createTtlCache } from './cache';
import { contractIndex, datedHoldings, toHolding } from './derive';

/**
 * What the collector, guild and insights pages read.
 *
 * Two sources, in this order:
 *
 *  1. A live read, for one signed-in address, through Alchemy. It answers
 *     "what does this wallet hold right now", which is the only question
 *     worth a network call while someone is waiting.
 *  2. The snapshot the install refreshes with `pnpm snapshot:chain`. It
 *     answers everything that spans every wallet: the leaderboard, the
 *     holder counts, the event feed, the insights. Those are never computed
 *     live, because doing so would mean reading every contract's whole
 *     history on a page load.
 *
 * With neither, the functions here return empty results with `source: 'none'`
 * and the pages render the panel that names ALCHEMY_API_KEY and the snapshot
 * command. Nothing is estimated, and no count is filled in from the CMS.
 */

// ---------------------------------------------------------------------------
// The artist's own contracts
// ---------------------------------------------------------------------------

export interface ArtistContract {
  chain: Chain;
  contract: string;
  seriesSlug: string;
}

/** Every contract in the catalogue, which is the only set of contracts this install asks about. */
export function artistContracts(): ArtistContract[] {
  const seen = new Map<string, ArtistContract>();
  for (const series of getSiteData().series) {
    const contract = series.contract?.toLowerCase();
    if (!contract) continue;
    const key = `${series.chain}:${contract}`;
    if (!seen.has(key)) seen.set(key, { chain: series.chain, contract, seriesSlug: series.slug });
  }
  return [...seen.values()];
}

function catalogueIndex() {
  return contractIndex(getSiteData().series);
}

function knownWorkIds(): Set<string> {
  return new Set(getSiteData().works.map(work => work.id));
}

// ---------------------------------------------------------------------------
// One address
// ---------------------------------------------------------------------------

export type HoldingsSource = 'live' | 'snapshot' | 'none';

export interface HoldingsResult {
  address: string;
  holdings: Holding[];
  source: HoldingsSource;
  /** ISO date-time the snapshot was taken, when the answer came from one. */
  computedAt: string | null;
  /** Set when a live read was attempted and failed, so the page can say why. */
  error: string | null;
}

const holdingsCache = createTtlCache<HoldingsResult>(chainCacheSeconds());

/**
 * What one wallet holds of the artist's work.
 *
 * Cached per address for RAISONNE_CHAIN_CACHE_SECONDS, and two requests that
 * arrive together share one read. A collector who wants the truth right now
 * presses the re-sync button, which calls refreshHoldings().
 */
export async function getHoldings(address: string): Promise<HoldingsResult> {
  const owner = normalizeAddress(address);
  if (!owner) return { address: '', holdings: [], source: 'none', computedAt: null, error: 'Not an address' };
  return holdingsCache.fetch(owner, () => readHoldings(owner));
}

/** Drops the cached read for this address, so the next one goes to the chain. */
export function refreshHoldings(address: string): void {
  const owner = normalizeAddress(address);
  if (owner) holdingsCache.delete(owner);
}

async function readHoldings(owner: string): Promise<HoldingsResult> {
  const index = catalogueIndex();
  const known = knownWorkIds();
  const contracts = artistContracts();

  if (alchemyConfigured() && contracts.length) {
    const byChain = new Map<Chain, string[]>();
    for (const entry of contracts) {
      if (!alchemySupports(entry.chain)) continue;
      byChain.set(entry.chain, [...(byChain.get(entry.chain) ?? []), entry.contract]);
    }

    if (byChain.size) {
      try {
        const holdings: Holding[] = [];
        for (const [chain, addresses] of byChain) {
          const raw = await getHoldingsForOwner(chain, owner, addresses);
          for (const entry of raw) holdings.push(toHolding(entry, index, known));
        }
        const snapshot = getChainSnapshot();
        const dated = snapshot ? datedHoldings(holdings, eventsForAddress(snapshot.events, owner), owner) : holdings;
        return { address: owner, holdings: dated, source: 'live', computedAt: new Date().toISOString(), error: null };
      } catch (error) {
        const message = error instanceof ChainError ? error.message : 'The chain could not be read';
        const fallback = holdingsFromSnapshot(owner);
        if (fallback) return { ...fallback, error: message };
        return { address: owner, holdings: [], source: 'none', computedAt: null, error: message };
      }
    }
  }

  return (
    holdingsFromSnapshot(owner) ?? {
      address: owner,
      holdings: [],
      source: 'none',
      computedAt: null,
      error: null,
    }
  );
}

function holdingsFromSnapshot(owner: string): HoldingsResult | null {
  const snapshot = getChainSnapshot();
  if (!snapshot) return null;
  const holder = snapshot.holders.find(entry => isSameAddress(entry.address, owner));
  return {
    address: owner,
    holdings: holder ? datedHoldings(holder.holdings, eventsForAddress(snapshot.events, owner), owner) : [],
    source: 'snapshot',
    computedAt: snapshot.computedAt,
    error: null,
  };
}

function eventsForAddress(events: readonly ActivityEvent[], owner: string): ActivityEvent[] {
  return events.filter(event => isSameAddress(event.from, owner) || isSameAddress(event.to, owner));
}

// ---------------------------------------------------------------------------
// What a collector page prints
// ---------------------------------------------------------------------------

/** The public facts about one address, with no sign-in required. */
export function getCollector(address: string): Collector | null {
  const owner = normalizeAddress(address);
  if (!owner) return null;
  const snapshot = getChainSnapshot();
  const holder = snapshot?.holders.find(entry => isSameAddress(entry.address, owner));
  const row = snapshot?.leaderboard.find(entry => isSameAddress(entry.address, owner));
  const artist = getSiteData().artist;
  return {
    address: owner,
    chain: 'ethereum',
    ens: holder?.ens ?? row?.ens ?? null,
    label: row?.label ?? null,
    isOwner: artistWalletAddresses(artist.wallets).includes(owner),
    firstSeenAt: row?.firstAcquiredAt ?? null,
    lastSeenAt: row?.lastAcquiredAt ?? null,
  };
}

/** Counts and dates for one address. Money fields stay absent unless the events carried prices. */
export async function getCollectorStats(address: string): Promise<CollectorStats | null> {
  const owner = normalizeAddress(address);
  if (!owner) return null;

  const { holdings } = await getHoldings(owner);
  const snapshot = getChainSnapshot();
  const row = snapshot?.leaderboard.find(entry => isSameAddress(entry.address, owner));

  const bySeries = new Map<string, number>();
  for (const holding of holdings) {
    if (!holding.seriesSlug) continue;
    bySeries.set(holding.seriesSlug, (bySeries.get(holding.seriesSlug) ?? 0) + 1);
  }

  const dates = holdings
    .map(holding => (holding.acquiredAt ? Date.parse(holding.acquiredAt) : NaN))
    .filter(value => Number.isFinite(value));

  return {
    address: owner,
    worksOwned: holdings.length,
    editionsOwned: holdings.reduce((total, holding) => total + holding.balance, 0),
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

/** One address's own history, newest first. Snapshot only: an event feed is not a live question. */
export function getCollectorActivity(address: string, limit = 50): ActivityEvent[] {
  const owner = normalizeAddress(address);
  const snapshot = getChainSnapshot();
  if (!owner || !snapshot) return [];
  return eventsForAddress(snapshot.events, owner).slice(0, limit);
}

/** True when this address holds at least one work of any of these series. */
export async function holdsAny(address: string, seriesSlugs: readonly string[]): Promise<boolean> {
  const { holdings } = await getHoldings(address);
  if (!seriesSlugs.length) return holdings.length > 0;
  return holdings.some(holding => holding.seriesSlug !== null && seriesSlugs.includes(holding.seriesSlug ?? ''));
}

/** True when this address holds this exact token. What a phygital order checks. */
export async function holdsWork(address: string, workId: string): Promise<boolean> {
  const { holdings } = await getHoldings(address);
  return holdings.some(holding => holding.workId === workId);
}

// ---------------------------------------------------------------------------
// Everyone, from the snapshot
// ---------------------------------------------------------------------------

/** The public leaderboard. Empty when the install has never run a chain snapshot. */
export function getLeaderboard(limit = 100): LeaderboardRow[] {
  return (getChainSnapshot()?.leaderboard ?? []).slice(0, limit);
}

export function getInsights(): InsightsSummary | null {
  return getChainSnapshot()?.insights ?? null;
}

export function getSeriesStats(seriesSlug: string): SalesStats | null {
  return getInsights()?.bySeries.find(entry => entry.seriesSlug === seriesSlug) ?? null;
}

/** The public activity feed, newest first. */
export function getActivity(limit = 50): ActivityEvent[] {
  return (getChainSnapshot()?.events ?? []).slice(0, limit);
}

/** Everyone holding a work of one series, for the series page's collector strip. */
export function getHoldersOfSeries(seriesSlug: string): LeaderboardRow[] {
  const snapshot = getChainSnapshot();
  if (!snapshot) return [];
  const addresses = new Set(
    snapshot.holders
      .filter(holder => holder.holdings.some(holding => holding.seriesSlug === seriesSlug))
      .map(holder => holder.address.toLowerCase()),
  );
  return snapshot.leaderboard.filter(row => addresses.has(row.address.toLowerCase()));
}

/** Where the numbers on a page came from, so it can print a line saying so. */
export function chainDataState(): { hasSnapshot: boolean; computedAt: string | null; live: boolean; gaps: string[] } {
  const snapshot = getChainSnapshot();
  return {
    hasSnapshot: snapshot !== null,
    computedAt: snapshot?.computedAt ?? null,
    live: alchemyConfigured(),
    gaps: snapshot?.insights?.gaps ?? [],
  };
}
