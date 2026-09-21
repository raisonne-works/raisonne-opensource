import type {
  ActivityEvent,
  ActivityEventType,
  Chain,
  Holding,
  InsightsSummary,
  LeaderboardRow,
  SalesStats,
  TokenAmount,
} from '@/lib/types';

/**
 * The explicit .ts extension is deliberate: scripts/snapshot-chain.ts loads
 * this file directly with node, which resolves ES modules by exact path.
 * Next and TypeScript both resolve it the same way.
 */
import { ZERO_ADDRESS, isZeroAddress, normalizeAddress, tokenKey } from './address.ts';

/**
 * Turning what an indexer says into what the pages show.
 *
 * Every function here is pure: no network, no filesystem, no env. That is
 * deliberate. `scripts/snapshot-chain.ts` imports this file directly so a
 * snapshot and a live read compute the same numbers from the same code, and
 * the leaderboard an install writes to disk is the leaderboard it would have
 * computed on the fly.
 *
 * The rule the whole file keeps: anything that cannot be worked out from the
 * events in hand is left absent. A sale with no price is a transfer. A
 * volume nobody can total is null, not zero. A page that gets null says so.
 */

/** Which series a contract belongs to, so a holding can name a catalogue record. */
export interface ContractIndex {
  /** Keyed by `${chain}:${contract}`, lowercased. */
  seriesByContract: Map<string, string>;
}

export function contractIndex(series: readonly { slug: string; chain: Chain; contract: string | null }[]): ContractIndex {
  const seriesByContract = new Map<string, string>();
  for (const entry of series) {
    if (!entry.contract) continue;
    seriesByContract.set(`${entry.chain}:${entry.contract.toLowerCase()}`, entry.slug);
  }
  return { seriesByContract };
}

export function seriesForContract(index: ContractIndex, chain: Chain, contract: string): string | null {
  return index.seriesByContract.get(`${chain}:${contract.toLowerCase()}`) ?? null;
}

// ---------------------------------------------------------------------------
// Events
// ---------------------------------------------------------------------------

/**
 * What a transfer was.
 *
 * From the zero address is a mint, to it is a burn, and a transfer that
 * carried native value was paid for, so it was a sale. Everything else is a
 * transfer: a marketplace sale settled in WETH looks exactly like a gift
 * from the transaction alone, and calling it a sale at a price of zero would
 * put a wrong number on a public page.
 */
export function eventTypeOf(from: string | null, to: string | null, valueWei: string | null): ActivityEventType {
  if (isZeroAddress(from) || from === null) return 'mint';
  if (isZeroAddress(to) || to === null) return 'burn';
  if (valueWei && valueWei !== '0') return 'sale';
  return 'transfer';
}

/** txHash:logIndex. Replaying a snapshot twice cannot make two rows of one event. */
export function activityEventId(txHash: string, logIndex: number, tokenId: string): string {
  return `${txHash}:${logIndex}:${tokenId}`;
}

export interface RawTransferLike {
  chain: Chain;
  contract: string;
  tokenId: string;
  from: string | null;
  to: string | null;
  quantity: number;
  blockNumber: number | null;
  txHash: string;
  logIndex: number;
  at: string | null;
  valueWei: string | null;
}

/** The chain's own currency symbol, for a native-value price. */
export const NATIVE_SYMBOL: Record<Chain, string> = {
  ethereum: 'ETH',
  base: 'ETH',
  tezos: 'XTZ',
  bitcoin: 'BTC',
  solana: 'SOL',
};

export function toActivityEvent(transfer: RawTransferLike, index: ContractIndex, knownWorkIds?: ReadonlySet<string>): ActivityEvent {
  const contract = transfer.contract.toLowerCase();
  const id = tokenKey(transfer.chain, contract, transfer.tokenId);
  const seriesSlug = seriesForContract(index, transfer.chain, contract);
  const price: TokenAmount | null = transfer.valueWei
    ? { raw: transfer.valueWei, decimals: 18, symbol: NATIVE_SYMBOL[transfer.chain] ?? 'ETH' }
    : null;

  return {
    id: activityEventId(transfer.txHash, transfer.logIndex, transfer.tokenId),
    type: eventTypeOf(transfer.from, transfer.to, transfer.valueWei),
    chain: transfer.chain,
    contract,
    tokenId: transfer.tokenId,
    workId: !knownWorkIds || knownWorkIds.has(id) ? id : null,
    seriesSlug,
    from: normalizeAddress(transfer.from),
    to: normalizeAddress(transfer.to),
    quantity: Math.max(1, transfer.quantity),
    at: transfer.at ?? new Date(0).toISOString(),
    blockNumber: transfer.blockNumber,
    txHash: transfer.txHash,
    price,
  };
}

/** Newest first, which is the order every feed reads in. */
export function sortEventsNewestFirst(events: readonly ActivityEvent[]): ActivityEvent[] {
  return [...events].sort((a, b) => {
    const byBlock = (b.blockNumber ?? 0) - (a.blockNumber ?? 0);
    if (byBlock !== 0) return byBlock;
    return Date.parse(b.at) - Date.parse(a.at);
  });
}

/** One row per event id, keeping the first seen. Two snapshots can be merged with this. */
export function dedupeEvents(events: readonly ActivityEvent[]): ActivityEvent[] {
  const byId = new Map<string, ActivityEvent>();
  for (const event of events) if (!byId.has(event.id)) byId.set(event.id, event);
  return [...byId.values()];
}

// ---------------------------------------------------------------------------
// Holdings
// ---------------------------------------------------------------------------

export interface RawHoldingLike {
  chain: Chain;
  contract: string;
  tokenId: string;
  balance: number;
  standard: Holding['standard'];
}

export function toHolding(raw: RawHoldingLike, index: ContractIndex, knownWorkIds?: ReadonlySet<string>): Holding {
  const contract = raw.contract.toLowerCase();
  const workId = tokenKey(raw.chain, contract, raw.tokenId);
  return {
    workId,
    chain: raw.chain,
    contract,
    tokenId: raw.tokenId,
    standard: raw.standard,
    balance: Math.max(1, raw.balance),
    seriesSlug: seriesForContract(index, raw.chain, contract),
    unlisted: knownWorkIds ? !knownWorkIds.has(workId) : undefined,
  };
}

/**
 * When each holding was acquired, from the event history. An install whose
 * snapshot does not reach back far enough simply leaves the date off, which
 * is why Holding.acquiredAt is optional.
 */
export function datedHoldings(holdings: readonly Holding[], events: readonly ActivityEvent[], owner: string): Holding[] {
  const address = normalizeAddress(owner);
  if (!address) return [...holdings];

  const arrivals = new Map<string, { at: string; tx: string }>();
  for (const event of events) {
    if (event.to !== address || !event.workId) continue;
    const seen = arrivals.get(event.workId);
    // The most recent arrival is the one that still holds: a token sold and
    // bought back is dated from the second purchase.
    if (!seen || Date.parse(event.at) > Date.parse(seen.at)) arrivals.set(event.workId, { at: event.at, tx: event.txHash });
  }

  return holdings.map(holding => {
    const arrival = arrivals.get(holding.workId);
    return arrival ? { ...holding, acquiredAt: arrival.at, acquiredTx: arrival.tx } : holding;
  });
}

// ---------------------------------------------------------------------------
// The leaderboard
// ---------------------------------------------------------------------------

export interface HolderLike {
  address: string;
  holdings: readonly Holding[];
  ens?: string | null;
  label?: string | null;
}

/**
 * Ranked by works held, then by how long they have held them, so a wallet
 * that bought early and kept the work outranks one that bought the same
 * number yesterday. No score model is baked in: an install that wants one
 * passes `score`, and the rows are then ranked by that instead.
 *
 * The zero address is never on the leaderboard, and neither is the artist.
 */
export function buildLeaderboard(
  holders: readonly HolderLike[],
  {
    events = [],
    exclude = [],
    score,
    limit = 500,
  }: {
    events?: readonly ActivityEvent[];
    exclude?: readonly string[];
    score?: (holder: HolderLike) => number | null;
    limit?: number;
  } = {},
): LeaderboardRow[] {
  const excluded = new Set([ZERO_ADDRESS, ...exclude.map(entry => entry.toLowerCase())]);
  const firstSeen = firstAndLastSeen(events);

  const rows = holders
    .filter(holder => !excluded.has(holder.address.toLowerCase()) && holder.holdings.length > 0)
    .map(holder => {
      const address = holder.address.toLowerCase();
      const seen = firstSeen.get(address);
      return {
        address,
        ens: holder.ens ?? null,
        label: holder.label ?? null,
        worksOwned: holder.holdings.length,
        seriesCount: new Set(holder.holdings.map(holding => holding.seriesSlug).filter(Boolean)).size,
        firstAcquiredAt: seen?.first ?? null,
        lastAcquiredAt: seen?.last ?? null,
        score: score?.(holder) ?? null,
        rank: 0,
      } satisfies LeaderboardRow;
    });

  rows.sort((a, b) => {
    if (a.score !== null && b.score !== null && a.score !== b.score) return b.score - a.score;
    if (a.worksOwned !== b.worksOwned) return b.worksOwned - a.worksOwned;
    if (a.seriesCount !== b.seriesCount) return b.seriesCount - a.seriesCount;
    const aFirst = a.firstAcquiredAt ? Date.parse(a.firstAcquiredAt) : Infinity;
    const bFirst = b.firstAcquiredAt ? Date.parse(b.firstAcquiredAt) : Infinity;
    if (aFirst !== bFirst) return aFirst - bFirst;
    return a.address.localeCompare(b.address);
  });

  // Equal standing takes equal rank, and the next row skips: 1, 2, 2, 4.
  //
  // "Equal" means level on every comparison the leaderboard page publishes as
  // a ranking rule, which includes the first acquisition. Leaving that one
  // out gave five wallets rank 4 while the page beside them printed first
  // acquisitions running from September 2023 to June 2024, so the one page
  // whose whole value is that it explains itself contradicted its own
  // explanation. Only the address, which the page says means nothing, is left
  // out of the tie: two wallets level on everything real take the same rank.
  let rank = 0;
  let previous: LeaderboardRow | null = null;
  return rows.slice(0, limit).map((row, index) => {
    const tied =
      previous !== null &&
      previous.worksOwned === row.worksOwned &&
      previous.seriesCount === row.seriesCount &&
      previous.score === row.score &&
      (previous.firstAcquiredAt ?? null) === (row.firstAcquiredAt ?? null);
    rank = tied ? rank : index + 1;
    previous = row;
    return { ...row, rank };
  });
}

function firstAndLastSeen(events: readonly ActivityEvent[]): Map<string, { first: string; last: string }> {
  const seen = new Map<string, { first: string; last: string }>();
  for (const event of events) {
    for (const address of [event.from, event.to]) {
      if (!address || isZeroAddress(address)) continue;
      const entry = seen.get(address);
      if (!entry) {
        seen.set(address, { first: event.at, last: event.at });
        continue;
      }
      if (Date.parse(event.at) < Date.parse(entry.first)) entry.first = event.at;
      if (Date.parse(event.at) > Date.parse(entry.last)) entry.last = event.at;
    }
  }
  return seen;
}

/**
 * Which tier a rank falls in, by percentile of the ranked field. A tier with
 * no range is never assigned automatically: the artist gives it by hand.
 */
export function tierForRank(
  rank: number,
  total: number,
  tiers: readonly { id: string; minPercentile?: number | null; maxPercentile?: number | null }[],
): string | null {
  if (total <= 0 || rank <= 0) return null;
  // Rank 1 of 100 is the 100th percentile; the last rank is just above zero.
  const percentile = ((total - rank + 1) / total) * 100;
  const match = tiers
    .filter(tier => typeof tier.minPercentile === 'number')
    .sort((a, b) => (b.minPercentile ?? 0) - (a.minPercentile ?? 0))
    .find(tier => percentile >= (tier.minPercentile ?? 0) && percentile <= (tier.maxPercentile ?? 100));
  return match?.id ?? null;
}

// ---------------------------------------------------------------------------
// Insights
// ---------------------------------------------------------------------------

function addWei(total: bigint | null, raw: string | null | undefined): bigint | null {
  if (!raw) return total;
  try {
    return (total ?? 0n) + BigInt(raw);
  } catch {
    return total;
  }
}

function weiAmount(total: bigint | null, symbol: string): TokenAmount | null {
  return total === null ? null : { raw: total.toString(), decimals: 18, symbol };
}

/** Per-series numbers, from the events and the holders in hand. */
export function buildSeriesStats(
  events: readonly ActivityEvent[],
  holders: readonly HolderLike[],
  seriesSlugs: readonly string[],
): SalesStats[] {
  return seriesSlugs.map(seriesSlug => {
    const own = events.filter(event => event.seriesSlug === seriesSlug);
    const tokens = new Set(own.map(event => event.tokenId));
    let volume: bigint | null = null;
    let low: bigint | null = null;
    let high: bigint | null = null;
    let symbol = 'ETH';

    for (const event of own) {
      if (event.type !== 'sale' || !event.price) continue;
      symbol = event.price.symbol;
      volume = addWei(volume, event.price.raw);
      const raw = BigInt(event.price.raw);
      if (low === null || raw < low) low = raw;
      if (high === null || raw > high) high = raw;
    }

    const dates = own.map(event => Date.parse(event.at)).filter(value => Number.isFinite(value) && value > 0);

    return {
      seriesSlug,
      holders: holders.filter(holder => holder.holdings.some(holding => holding.seriesSlug === seriesSlug)).length,
      tokens: tokens.size,
      sales: own.filter(event => event.type === 'sale').length,
      transfers: own.filter(event => event.type === 'transfer').length,
      mints: own.filter(event => event.type === 'mint').length,
      volume: weiAmount(volume, symbol),
      low: weiAmount(low, symbol),
      high: weiAmount(high, symbol),
      firstEventAt: dates.length ? new Date(Math.min(...dates)).toISOString() : null,
      lastEventAt: dates.length ? new Date(Math.max(...dates)).toISOString() : null,
    } satisfies SalesStats;
  });
}

/** The whole insights object, computed once and written into the snapshot. */
export function buildInsights(
  events: readonly ActivityEvent[],
  holders: readonly HolderLike[],
  seriesSlugs: readonly string[],
  { gaps = [], computedAt = new Date().toISOString() }: { gaps?: string[]; computedAt?: string } = {},
): InsightsSummary {
  const bySeries = buildSeriesStats(events, holders, seriesSlugs);

  let volume: bigint | null = null;
  let symbol = 'ETH';
  for (const event of events) {
    if (event.type !== 'sale' || !event.price) continue;
    symbol = event.price.symbol;
    volume = addWei(volume, event.price.raw);
  }

  const allTime = new Set<string>();
  for (const event of events) {
    for (const address of [event.from, event.to]) if (address && !isZeroAddress(address)) allTime.add(address);
  }

  const perWork = new Map<string, { seriesSlug: string | null; tokenId: string; events: number; sales: number }>();
  for (const event of events) {
    const id = event.workId ?? tokenKey(event.chain, event.contract, event.tokenId);
    const entry = perWork.get(id) ?? { seriesSlug: event.seriesSlug ?? null, tokenId: event.tokenId, events: 0, sales: 0 };
    entry.events += 1;
    if (event.type === 'sale') entry.sales += 1;
    perWork.set(id, entry);
  }

  const buckets = [
    { bucket: '1', test: (n: number) => n === 1 },
    { bucket: '2 to 5', test: (n: number) => n >= 2 && n <= 5 },
    { bucket: '6 to 20', test: (n: number) => n >= 6 && n <= 20 },
    { bucket: '21 or more', test: (n: number) => n >= 21 },
  ];

  const monthly = new Map<string, { month: string; sales: number; mints: number; transfers: number }>();
  for (const event of events) {
    const month = event.at.slice(0, 7);
    if (!/^\d{4}-\d{2}$/.test(month)) continue;
    const entry = monthly.get(month) ?? { month, sales: 0, mints: 0, transfers: 0 };
    if (event.type === 'sale') entry.sales += 1;
    else if (event.type === 'mint') entry.mints += 1;
    else if (event.type === 'transfer') entry.transfers += 1;
    monthly.set(month, entry);
  }

  return {
    computedAt,
    collectors: holders.filter(holder => holder.holdings.length > 0).length,
    allTimeCollectors: allTime.size,
    works: new Set(holders.flatMap(holder => holder.holdings.map(holding => holding.workId))).size,
    series: seriesSlugs.length,
    sales: events.filter(event => event.type === 'sale').length,
    mints: events.filter(event => event.type === 'mint').length,
    transfers: events.filter(event => event.type === 'transfer').length,
    volume: weiAmount(volume, symbol),
    bySeries,
    mostTraded: [...perWork.entries()]
      .map(([workId, entry]) => ({ workId, ...entry }))
      .sort((a, b) => b.events - a.events || b.sales - a.sales)
      .slice(0, 20),
    holdingDistribution: buckets.map(({ bucket, test }) => ({
      bucket,
      wallets: holders.filter(holder => test(holder.holdings.length)).length,
    })),
    monthly: [...monthly.values()].sort((a, b) => a.month.localeCompare(b.month)),
    gaps,
  };
}
