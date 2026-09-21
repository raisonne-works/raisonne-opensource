import { PAGE_SIZE, clampPage, pageCount, type RawSearchParams } from '@/components/raisonne/catalogue/lib';
import { shortAddress } from '@/components/raisonne/works/lib';
import { isZeroAddress } from '@/lib/chain/address';
import type { ActivityEvent, ActivityEventType, Chain, LeaderboardRow } from '@/lib/types';

/**
 * Plain-words labels and small pure helpers for the collector surfaces.
 *
 * Nothing here reads data or touches the network, so the directory's URL
 * state, its filtering and its sorting all run on the server and only the
 * rows on screen reach the browser, exactly as the catalogue works.
 *
 * One rule runs through the whole file: a wallet is named by what the chain
 * says, and by nothing else. An ENS name is a public record, so it is used;
 * the artist's own note about a wallet is not, so it is shown only where the
 * install has said collector names may be published; and when there is
 * neither, the address itself is the name.
 */

export const COLLECTOR_PATH = '/collector';
export const DIRECTORY_PATH = '/collectors';

/** The public profile of one wallet. Addresses are lowercased everywhere. */
export function collectorHref(address: string): string {
  return `${COLLECTOR_PATH}/${address.toLowerCase()}`;
}

// ---------------------------------------------------------------------------
// Naming a wallet
// ---------------------------------------------------------------------------

/** The fields any of the collector shapes carry that could name a wallet. */
export interface NameableAddress {
  address: string;
  ens?: string | null;
  label?: string | null;
}

export interface CollectorNameOptions {
  /**
   * Whether the artist's own label for a wallet may be printed. It is the
   * artist's private note, not something the chain published, so it appears
   * only when settings.showOwners says collector names may be shown.
   */
  showLabel?: boolean;
}

/**
 * What to call this wallet: its ENS name when the chain resolves one, then
 * the artist's label where that is allowed, then the address itself. Never a
 * name invented from anything else.
 */
export function collectorName(entry: NameableAddress, { showLabel = false }: CollectorNameOptions = {}): string {
  const ens = entry.ens?.trim();
  if (ens) return ens;
  const label = showLabel ? entry.label?.trim() : '';
  if (label) return label;
  return shortAddress(entry.address);
}

/** True when the name on screen is the address itself, which is set in mono. */
export function nameIsAddress(entry: NameableAddress, options: CollectorNameOptions = {}): boolean {
  return !entry.ens?.trim() && !(options.showLabel && entry.label?.trim());
}

/**
 * Two characters for an avatar fallback, taken from the end of the address.
 *
 * Not the beginning. The characters right after 0x are the least distinctive
 * part of an address: vanity addresses, contract deployments and any set of
 * generated demo wallets share them, and a directory of eight collectors
 * showed eight identical "00" monograms. The last two vary.
 */
export function addressInitials(address: string): string {
  return address.replace(/^0x/i, '').slice(-2).toUpperCase();
}

// ---------------------------------------------------------------------------
// Events
// ---------------------------------------------------------------------------

export const EVENT_LABELS: Record<ActivityEventType, string> = {
  mint: 'Mint',
  sale: 'Sale',
  transfer: 'Transfer',
  burn: 'Burn',
};

export type EventDirection = 'in' | 'out' | 'other';

/** Whether this event brought a token to the address, took one away, or neither. */
export function eventDirection(event: ActivityEvent, address: string): EventDirection {
  const owner = address.toLowerCase();
  if (event.to?.toLowerCase() === owner) return 'in';
  if (event.from?.toLowerCase() === owner) return 'out';
  return 'other';
}

/**
 * What happened, from this wallet's side, in the words a collector would
 * use. A sale the install could not price is a transfer in the data, so it
 * reads as one here too.
 */
export function eventVerb(event: ActivityEvent, address: string): string {
  const direction = eventDirection(event, address);
  if (event.type === 'burn') return direction === 'out' ? 'Burned' : 'Burn';
  if (direction === 'in') {
    if (event.type === 'mint') return 'Minted';
    return event.type === 'sale' ? 'Bought' : 'Received';
  }
  if (direction === 'out') return event.type === 'sale' ? 'Sold' : 'Sent';
  return EVENT_LABELS[event.type];
}

/**
 * The other wallet in the event, or null when there is not one worth naming.
 *
 * A mint comes from the zero address and a burn goes to it. That is not a
 * collector, so it is never printed as one and never linked to a profile.
 */
export function eventCounterparty(event: ActivityEvent, address: string): string | null {
  const direction = eventDirection(event, address);
  const other = direction === 'in' ? event.from : direction === 'out' ? event.to : null;
  if (!other || isZeroAddress(other)) return null;
  return other;
}

/** Where a transaction is read on each chain. Tezos, Bitcoin and Solana keep their own explorers. */
const TX_EXPLORERS: Record<Chain, (hash: string) => string> = {
  ethereum: hash => `https://etherscan.io/tx/${hash}`,
  base: hash => `https://basescan.org/tx/${hash}`,
  tezos: hash => `https://tzkt.io/${hash}`,
  bitcoin: hash => `https://mempool.space/tx/${hash}`,
  solana: hash => `https://solscan.io/tx/${hash}`,
};

export function txExplorerUrl(chain: Chain, txHash: string): string | null {
  return txHash ? TX_EXPLORERS[chain](txHash) : null;
}

// ---------------------------------------------------------------------------
// The directory's URL state
// ---------------------------------------------------------------------------

export type DirectorySortId = 'rank' | 'works' | 'series' | 'recent' | 'earliest';

export const DIRECTORY_SORTS: { id: DirectorySortId; label: string }[] = [
  { id: 'rank', label: 'Rank' },
  { id: 'works', label: 'Most works' },
  { id: 'series', label: 'Most series' },
  { id: 'recent', label: 'Newest acquisition' },
  { id: 'earliest', label: 'Longest collecting' },
];

export const DEFAULT_DIRECTORY_SORT: DirectorySortId = 'rank';

export interface DirectoryState {
  q: string;
  /** A series slug, when the list is narrowed to the holders of one series. */
  series: string;
  sort: DirectorySortId;
  page: number;
}

function firstParam(params: RawSearchParams, key: string): string {
  const value = params[key];
  const raw = Array.isArray(value) ? value[0] : value;
  return typeof raw === 'string' ? raw.trim() : '';
}

/** The state a URL asks for, with anything unrecognised dropped. */
export function parseDirectoryState(params: RawSearchParams): DirectoryState {
  const sort = DIRECTORY_SORTS.find(option => option.id === firstParam(params, 'sort'))?.id ?? DEFAULT_DIRECTORY_SORT;
  const page = Number.parseInt(firstParam(params, 'page'), 10);
  return {
    q: firstParam(params, 'q').slice(0, 100),
    series: firstParam(params, 'series'),
    sort,
    page: Number.isFinite(page) && page > 0 ? Math.min(page, 1000) : 1,
  };
}

/**
 * The URL for a changed state. Every control on the directory is a link or a
 * GET form, so an order, a filter or a page is a place that can be shared.
 */
export function directoryHref(state: DirectoryState, change: Partial<DirectoryState> = {}): string {
  const next: DirectoryState = { ...state, ...change };
  if (!('page' in change)) next.page = 1;

  const params = new URLSearchParams();
  if (next.q) params.set('q', next.q);
  if (next.series) params.set('series', next.series);
  if (next.sort !== DEFAULT_DIRECTORY_SORT) params.set('sort', next.sort);
  if (next.page > 1) params.set('page', String(next.page));

  const query = params.toString();
  return query ? `${DIRECTORY_PATH}?${query}` : DIRECTORY_PATH;
}

export function isFilteredDirectory(state: DirectoryState): boolean {
  return Boolean(state.q || state.series);
}

// ---------------------------------------------------------------------------
// Filtering and sorting the directory
// ---------------------------------------------------------------------------

/** Free text over what is on screen: the address, its ENS name, and the label where one is shown. */
export function matchesQuery(row: LeaderboardRow, q: string, { showLabel = false }: CollectorNameOptions = {}): boolean {
  const needle = q.trim().toLowerCase();
  if (!needle) return true;
  const haystack = [row.address, row.ens ?? '', showLabel ? (row.label ?? '') : ''].join(' ').toLowerCase();
  return haystack.includes(needle);
}

function time(value: string | null | undefined): number {
  const parsed = value ? Date.parse(value) : NaN;
  return Number.isFinite(parsed) ? parsed : 0;
}

/** A copy of the rows in the asked-for order. Ties keep the snapshot's own rank, so an order is stable. */
export function sortRows(rows: readonly LeaderboardRow[], sort: DirectorySortId): LeaderboardRow[] {
  const byRank = (a: LeaderboardRow, b: LeaderboardRow) => a.rank - b.rank;
  const sorted = [...rows];
  switch (sort) {
    case 'works':
      return sorted.sort((a, b) => b.worksOwned - a.worksOwned || byRank(a, b));
    case 'series':
      return sorted.sort((a, b) => b.seriesCount - a.seriesCount || byRank(a, b));
    case 'recent':
      return sorted.sort((a, b) => time(b.lastAcquiredAt) - time(a.lastAcquiredAt) || byRank(a, b));
    case 'earliest':
      return sorted.sort((a, b) => {
        const left = time(a.firstAcquiredAt);
        const right = time(b.firstAcquiredAt);
        if (left && right && left !== right) return left - right;
        // A wallet whose first acquisition the snapshot cannot see sorts last
        // rather than first: an unknown date is not an early one.
        if (left !== right) return left ? -1 : 1;
        return byRank(a, b);
      });
    case 'rank':
    default:
      return sorted.sort(byRank);
  }
}

export interface DirectoryPage {
  rows: LeaderboardRow[];
  /** How many rows matched, before paging. */
  total: number;
  page: number;
  pages: number;
}

/** The filtered, sorted, single page of rows a request renders. */
export function directoryPage(
  rows: readonly LeaderboardRow[],
  state: DirectoryState,
  options: CollectorNameOptions = {},
): DirectoryPage {
  const matched = rows.filter(row => matchesQuery(row, state.q, options));
  const sorted = sortRows(matched, state.sort);
  const page = clampPage(state.page, sorted.length);
  const start = (page - 1) * PAGE_SIZE;
  return { rows: sorted.slice(start, start + PAGE_SIZE), total: sorted.length, page, pages: pageCount(sorted.length) };
}
