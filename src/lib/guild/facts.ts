/**
 * What the chain snapshot says about each wallet, and nothing else.
 *
 * Every field here is counted from the snapshot the install refreshes with
 * `pnpm snapshot:chain`: the holders it found, the tokens in their wallets
 * and the transfer events it could read. Nothing is estimated, nothing is
 * priced, and a fact the snapshot cannot support is null rather than zero.
 *
 * Two rules keep this honest:
 *
 *  1. Time is measured from the snapshot, not from the clock. A wallet that
 *     is one day short of "held a year" when the snapshot was taken stays one
 *     day short until the next snapshot, so the page cannot disagree with the
 *     note under it about when the numbers were read.
 *  2. A truncated history is an incomplete history. When a contract hit the
 *     event cap, the snapshot holds recent transfers only, so a wallet can
 *     look like it never sold and like it arrived late. `historyComplete`
 *     says so, and the badge rules that depend on the whole history stand
 *     down rather than award something that might be wrong.
 *
 * Pure and client safe: it takes plain data and returns plain data.
 */

import { isZeroAddress, normalizeAddress } from '@/lib/chain/address';
import type { ActivityEvent, Chain, ChainSnapshot, Holding } from '@/lib/types';

const DAY_MS = 86_400_000;

/** How much of one series a wallet holds, of what the snapshot found in wallets. */
export interface SeriesHolding {
  seriesSlug: string;
  /** Tokens of the series this wallet holds. */
  works: number;
  /** Tokens of the series the snapshot found in any wallet. */
  ofTokens: number;
  /** works / ofTokens as a percentage, or null when the snapshot found none. */
  share: number | null;
}

/** Everything the rules are allowed to ask about one wallet. */
export interface HolderFacts {
  address: string;
  worksOwned: number;
  /** Tokens counted with their balances, so an ERC-1155 held five times counts five. */
  editionsOwned: number;
  seriesSlugs: string[];
  chains: Chain[];
  /** The oldest acquisition the snapshot could date, of the works still held. */
  earliestHoldingAt: string | null;
  /** The first and last event in this history that involved the wallet. */
  firstEventAt: string | null;
  lastEventAt: string | null;
  /** Tokens that arrived straight from the zero address, which is to say a mint. */
  mintedIn: number;
  /** Events where the wallet received a token, and where it sent one. */
  received: number;
  sentOut: number;
  bySeries: SeriesHolding[];
  /** Series the wallet arrived in within the opening window. */
  openedWith: string[];
  /** Series where this wallet is the first holder the history shows. */
  firstHolderOf: string[];
}

/** The snapshot, read once, in the shape the rules need. */
export interface GuildFacts {
  /** ISO date-time the snapshot was taken. Every rule is evaluated at this moment. */
  computedAt: string;
  /** False when a contract hit the event cap, or when the run skipped events. */
  historyComplete: boolean;
  /** Why the history is incomplete, in plain words, or null when it is not. */
  historyNote: string | null;
  /** Tokens per series that the snapshot found in a wallet. */
  seriesTokens: Map<string, number>;
  /** When each series opened: the first mint the history holds. */
  seriesOpenedAt: Map<string, string>;
  byAddress: Map<string, HolderFacts>;
}

/** The part of a snapshot these facts are built from. */
export type FactSource = Pick<ChainSnapshot, 'computedAt' | 'contracts' | 'holders' | 'events'>;

/** How close to a series opening still counts as being there at the opening. */
export const OPENING_WINDOW_DAYS = 7;

/** Whole days between two ISO date-times, or null when either is missing. */
export function daysBetween(from: string | null | undefined, to: string | null | undefined): number | null {
  if (!from || !to) return null;
  const start = Date.parse(from);
  const end = Date.parse(to);
  if (!Number.isFinite(start) || !Number.isFinite(end)) return null;
  return Math.floor((end - start) / DAY_MS);
}

function earlier(a: string | null, b: string): string {
  if (!a) return b;
  return Date.parse(b) < Date.parse(a) ? b : a;
}

function later(a: string | null, b: string): string {
  if (!a) return b;
  return Date.parse(b) > Date.parse(a) ? b : a;
}

function blank(address: string): HolderFacts {
  return {
    address,
    worksOwned: 0,
    editionsOwned: 0,
    seriesSlugs: [],
    chains: [],
    earliestHoldingAt: null,
    firstEventAt: null,
    lastEventAt: null,
    mintedIn: 0,
    received: 0,
    sentOut: 0,
    bySeries: [],
    openedWith: [],
    firstHolderOf: [],
  };
}

function holdingsOf(holdings: readonly Holding[]): {
  worksOwned: number;
  editionsOwned: number;
  seriesSlugs: string[];
  chains: Chain[];
  earliestHoldingAt: string | null;
  perSeries: Map<string, number>;
} {
  const seriesSlugs = new Set<string>();
  const chains = new Set<Chain>();
  const perSeries = new Map<string, number>();
  let editionsOwned = 0;
  let earliestHoldingAt: string | null = null;

  for (const holding of holdings) {
    editionsOwned += Number.isFinite(holding.balance) ? holding.balance : 1;
    chains.add(holding.chain);
    if (holding.seriesSlug) {
      seriesSlugs.add(holding.seriesSlug);
      perSeries.set(holding.seriesSlug, (perSeries.get(holding.seriesSlug) ?? 0) + 1);
    }
    if (holding.acquiredAt) earliestHoldingAt = earlier(earliestHoldingAt, holding.acquiredAt);
  }

  return {
    worksOwned: holdings.length,
    editionsOwned,
    seriesSlugs: [...seriesSlugs].sort(),
    chains: [...chains],
    earliestHoldingAt,
    perSeries,
  };
}

/**
 * Read a snapshot into facts, once.
 *
 * The events are walked twice: once forwards to find when each series opened
 * and who held each one first, and once to add up what each wallet did. Both
 * passes are linear, which matters on a snapshot holding ten thousand events.
 */
export function buildGuildFacts(source: FactSource): GuildFacts {
  const { computedAt, contracts = [], holders = [], events = [] } = source;

  const truncated = contracts.some(contract => contract.truncated);
  const historyComplete = events.length > 0 && !truncated;
  const historyNote = truncated
    ? 'One or more contracts hit the event cap when this snapshot was taken, so the history it holds is the recent part only.'
    : events.length === 0
      ? 'This snapshot holds no transfer events, so nothing that depends on history can be worked out from it.'
      : null;

  // What the snapshot found in wallets, per series. This is the only supply
  // figure it can stand behind: tokens nobody holds, or holders it did not
  // reach, are not in it, and the wording on the page says exactly that.
  const seriesTokens = new Map<string, Set<string>>();
  for (const holder of holders) {
    for (const holding of holder.holdings) {
      if (!holding.seriesSlug) continue;
      const tokens = seriesTokens.get(holding.seriesSlug) ?? new Set<string>();
      tokens.add(holding.workId);
      seriesTokens.set(holding.seriesSlug, tokens);
    }
  }

  const ascending = [...events].sort((a, b) => Date.parse(a.at) - Date.parse(b.at));

  const seriesOpenedAt = new Map<string, string>();
  const firstHolder = new Map<string, string>();
  for (const event of ascending) {
    if (!event.seriesSlug) continue;
    if (event.type === 'mint' && !seriesOpenedAt.has(event.seriesSlug)) seriesOpenedAt.set(event.seriesSlug, event.at);
    if (!firstHolder.has(event.seriesSlug) && event.to && !isZeroAddress(event.to)) firstHolder.set(event.seriesSlug, event.to);
  }
  // A series whose mints are older than the snapshot reaches still opened at
  // some point; the earliest event it does hold is the closest thing to it,
  // and every rule that uses this is gated on a complete history anyway.
  for (const event of ascending) {
    if (event.seriesSlug && !seriesOpenedAt.has(event.seriesSlug)) seriesOpenedAt.set(event.seriesSlug, event.at);
  }

  const byAddress = new Map<string, HolderFacts>();
  const arrivals = new Map<string, Map<string, string>>();

  for (const holder of holders) {
    const address = normalizeAddress(holder.address);
    if (!address) continue;
    const counted = holdingsOf(holder.holdings);
    byAddress.set(address, {
      ...blank(address),
      worksOwned: counted.worksOwned,
      editionsOwned: counted.editionsOwned,
      seriesSlugs: counted.seriesSlugs,
      chains: counted.chains,
      earliestHoldingAt: counted.earliestHoldingAt,
      bySeries: counted.seriesSlugs.map(seriesSlug => {
        const works = counted.perSeries.get(seriesSlug) ?? 0;
        const ofTokens = seriesTokens.get(seriesSlug)?.size ?? 0;
        return { seriesSlug, works, ofTokens, share: ofTokens > 0 ? (works / ofTokens) * 100 : null };
      }),
    });
  }

  const touch = (address: string): HolderFacts => {
    const existing = byAddress.get(address);
    if (existing) return existing;
    const fresh = blank(address);
    byAddress.set(address, fresh);
    return fresh;
  };

  for (const event of ascending) {
    recordSide(event, event.to, 'in', touch, arrivals);
    recordSide(event, event.from, 'out', touch, arrivals);
  }

  for (const [seriesSlug, address] of firstHolder) {
    const facts = byAddress.get(address);
    if (facts) facts.firstHolderOf.push(seriesSlug);
  }

  for (const [address, perSeries] of arrivals) {
    const facts = byAddress.get(address);
    if (!facts) continue;
    for (const [seriesSlug, at] of perSeries) {
      const opened = seriesOpenedAt.get(seriesSlug);
      const days = daysBetween(opened, at);
      if (days !== null && days <= OPENING_WINDOW_DAYS) facts.openedWith.push(seriesSlug);
    }
    facts.openedWith.sort();
  }

  return {
    computedAt,
    historyComplete,
    historyNote,
    seriesTokens: new Map([...seriesTokens].map(([slug, tokens]) => [slug, tokens.size])),
    seriesOpenedAt,
    byAddress,
  };
}

function recordSide(
  event: ActivityEvent,
  address: string | null,
  direction: 'in' | 'out',
  touch: (address: string) => HolderFacts,
  arrivals: Map<string, Map<string, string>>,
): void {
  if (!address || isZeroAddress(address)) return;
  const owner = normalizeAddress(address);
  if (!owner) return;

  const facts = touch(owner);
  facts.firstEventAt = earlier(facts.firstEventAt, event.at);
  facts.lastEventAt = later(facts.lastEventAt, event.at);

  if (direction === 'out') {
    facts.sentOut += 1;
    return;
  }

  facts.received += 1;
  if (event.type === 'mint' || (event.from !== null && isZeroAddress(event.from))) facts.mintedIn += 1;

  if (event.seriesSlug) {
    const perSeries = arrivals.get(owner) ?? new Map<string, string>();
    perSeries.set(event.seriesSlug, earlier(perSeries.get(event.seriesSlug) ?? null, event.at));
    arrivals.set(owner, perSeries);
  }
}

/** The facts for one address, or an empty set of them, so a caller never branches on null. */
export function factsFor(facts: GuildFacts, address: string): HolderFacts {
  const owner = normalizeAddress(address);
  return (owner ? facts.byAddress.get(owner) : null) ?? blank(owner ?? address);
}
