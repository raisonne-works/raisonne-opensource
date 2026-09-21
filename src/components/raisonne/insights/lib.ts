import { formatDate, formatMonth } from '@/components/raisonne/works/lib';
import { MONEY_LOCALE, formatNumber, formatTokenAmount } from '@/lib/money';
import type { ActivityEvent, ActivityEventType, Chain, InsightsSummary, SalesStats, TokenAmount } from '@/lib/types';

/**
 * Everything the insights pages need to turn a chain snapshot into rows a
 * reader can check. Pure: no fixtures, no env, no network, so the same
 * functions run on the server and inside the chart components.
 *
 * The one rule this file keeps, everywhere: a number the install cannot work
 * out from the snapshot in hand is absent, never zero and never estimated. A
 * count of zero events is a fact and prints as 0; a volume nobody could total
 * is null and prints as "not recorded", with the reason beside it.
 */

// ---------------------------------------------------------------------------
// Where a number came from
// ---------------------------------------------------------------------------

/**
 * Every figure on these pages is labelled with one of these. A reader should
 * never have to guess whether 4,031 works is what the catalogue holds or what
 * a contract reported.
 */
export type SourceId = 'catalogue' | 'snapshot' | 'derived';

export const SOURCE_LABELS: Record<SourceId, string> = {
  catalogue: 'Catalogue',
  snapshot: 'Chain snapshot',
  derived: 'Computed from the snapshot',
};

/** "Chain snapshot, 1 Sep 2026". The date is the snapshot's, not today's. */
export function sourceLabel(source: SourceId, computedAt: string | null): string {
  const date = source === 'catalogue' ? null : formatDate(computedAt);
  return date ? `${SOURCE_LABELS[source]}, ${date}` : SOURCE_LABELS[source];
}

// ---------------------------------------------------------------------------
// The three pages
// ---------------------------------------------------------------------------

export type InsightsTabId = 'overview' | 'collections' | 'activity';

export interface InsightsTab {
  id: InsightsTabId;
  href: string;
  label: string;
}

export const INSIGHTS_TABS: InsightsTab[] = [
  { id: 'overview', href: '/insights', label: 'Overview' },
  { id: 'collections', href: '/insights/collections', label: 'Collections' },
  { id: 'activity', href: '/insights/activity', label: 'Activity' },
];

// ---------------------------------------------------------------------------
// Events
// ---------------------------------------------------------------------------

export const EVENT_LABELS: Record<ActivityEventType, string> = {
  mint: 'Mint',
  sale: 'Sale',
  transfer: 'Transfer',
  burn: 'Burn',
};

/** One line a reader can hover or read in the legend, in plain words. */
export const EVENT_DESCRIPTIONS: Record<ActivityEventType, string> = {
  mint: 'The token was created and sent to its first holder.',
  sale: 'The transfer carried a payment in the chain’s own currency, so the price is public.',
  transfer: 'The token changed hands with no payment visible in the transaction.',
  burn: 'The token was sent to the zero address.',
};

export const EVENT_TYPES: ActivityEventType[] = ['mint', 'sale', 'transfer', 'burn'];

const TX_EXPLORERS: Record<Chain, (hash: string) => string> = {
  ethereum: hash => `https://etherscan.io/tx/${hash}`,
  base: hash => `https://basescan.org/tx/${hash}`,
  tezos: hash => `https://tzkt.io/${hash}`,
  bitcoin: hash => `https://mempool.space/tx/${hash}`,
  solana: hash => `https://solscan.io/tx/${hash}`,
};

function at(event: ActivityEvent): number {
  const parsed = Date.parse(event.at);
  return Number.isFinite(parsed) ? parsed : 0;
}

/**
 * Newest first, by the date of the block.
 *
 * A snapshot writes its events contract by contract, so the array it holds is
 * grouped rather than ordered, and a feed that printed it as it came would
 * claim an order it does not have. Date, not block number: block numbers on
 * Ethereum and on Base count different things and cannot be compared, which
 * only shows up on a catalogue that spans two chains.
 */
export function newestFirst(events: readonly ActivityEvent[]): ActivityEvent[] {
  return [...events].sort((a, b) => {
    const byDate = at(b) - at(a);
    if (byDate !== 0) return byDate;
    // Inside one chain and one moment, the higher block came later.
    if (a.chain === b.chain) return (b.blockNumber ?? 0) - (a.blockNumber ?? 0);
    return a.id.localeCompare(b.id);
  });
}

/** A transaction on its chain's explorer, so any row on these pages can be checked. */
export function txExplorerUrl(chain: Chain, txHash: string | null | undefined): string | null {
  if (!txHash) return null;
  return TX_EXPLORERS[chain](txHash);
}

/** The explorer's host, for the link's own label ("etherscan.io"). */
export function explorerHost(chain: Chain, txHash: string): string | null {
  const url = txExplorerUrl(chain, txHash);
  if (!url) return null;
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Amounts
// ---------------------------------------------------------------------------

function raw(value: TokenAmount | null | undefined): bigint | null {
  if (!value) return null;
  try {
    return BigInt(value.raw);
  } catch {
    return null;
  }
}

/** The largest of a set of amounts, or null when none of them carried a value. */
export function maxTokenAmount(values: readonly (TokenAmount | null | undefined)[]): TokenAmount | null {
  let best: TokenAmount | null = null;
  let bestRaw: bigint | null = null;
  for (const value of values) {
    const amount = raw(value);
    if (amount === null || !value) continue;
    if (bestRaw === null || amount > bestRaw) {
      bestRaw = amount;
      best = value;
    }
  }
  return best;
}

/** The smallest of a set of amounts, or null when none of them carried a value. */
export function minTokenAmount(values: readonly (TokenAmount | null | undefined)[]): TokenAmount | null {
  let best: TokenAmount | null = null;
  let bestRaw: bigint | null = null;
  for (const value of values) {
    const amount = raw(value);
    if (amount === null || !value) continue;
    if (bestRaw === null || amount < bestRaw) {
      bestRaw = amount;
      best = value;
    }
  }
  return best;
}

/**
 * A mean over the sales the snapshot could price. Integer division on the raw
 * value, so nothing is lost to a float, and null when there is nothing to
 * divide: an average of no sales is not zero.
 */
export function averageTokenAmount(total: TokenAmount | null | undefined, count: number): TokenAmount | null {
  const amount = raw(total);
  if (amount === null || !total || count <= 0) return null;
  return { ...total, raw: (amount / BigInt(count)).toString(), usd: null };
}

/**
 * An amount as a plain number of whole units, for a bar's height only.
 *
 * Never for a figure a reader sees: the exact string from formatTokenAmount()
 * is what gets printed, and this is what gets drawn.
 */
export function chartValue(value: TokenAmount | null | undefined): number {
  const amount = raw(value);
  if (amount === null || !value) return 0;
  return Number(amount) / 10 ** value.decimals;
}

// ---------------------------------------------------------------------------
// Months
// ---------------------------------------------------------------------------

/** "2026-01" as "Jan 2026". */
export function monthLabel(month: string): string {
  return formatMonth(`${month}-01T00:00:00.000Z`) ?? month;
}

/** "2026-01" as "Jan", for an axis that has the year in its caption. */
export function shortMonthLabel(month: string): string {
  return formatMonth(`${month}-01T00:00:00.000Z`, { withYear: false }) ?? month;
}

export interface MonthlyRow {
  month: string;
  label: string;
  mints: number;
  sales: number;
  transfers: number;
  total: number;
}

/** The monthly counts, oldest first, each with its own label and total. */
export function monthlyRows(insights: InsightsSummary | null): MonthlyRow[] {
  return (insights?.monthly ?? []).map(entry => ({
    month: entry.month,
    label: monthLabel(entry.month),
    mints: entry.mints,
    sales: entry.sales,
    transfers: entry.transfers,
    total: entry.mints + entry.sales + entry.transfers,
  }));
}

// ---------------------------------------------------------------------------
// This period against the last
// ---------------------------------------------------------------------------

export interface PeriodBounds {
  /** ISO date-time the window ends: the snapshot's own date, not today. */
  to: string;
  from: string;
  previousFrom: string;
  days: number;
}

export interface PeriodRow {
  slug: string;
  events: number;
  previousEvents: number;
  sales: number;
  previousSales: number;
  volume: TokenAmount | null;
  previousVolume: TokenAmount | null;
}

/** The two windows a "this period against the last" table compares. */
export function periodBounds(computedAt: string | null, days = 90): PeriodBounds | null {
  const end = computedAt ? Date.parse(computedAt) : NaN;
  if (!Number.isFinite(end)) return null;
  const span = days * 24 * 60 * 60 * 1000;
  return {
    to: new Date(end).toISOString(),
    from: new Date(end - span).toISOString(),
    previousFrom: new Date(end - span * 2).toISOString(),
    days,
  };
}

function sumPrices(events: readonly ActivityEvent[]): TokenAmount | null {
  let total: bigint | null = null;
  let symbol = '';
  let decimals = 18;
  for (const event of events) {
    const amount = raw(event.price);
    if (amount === null || !event.price) continue;
    // Two settlement currencies cannot be added honestly, so the whole total
    // is withheld rather than printed as if they were one.
    if (symbol && event.price.symbol !== symbol) return null;
    symbol = event.price.symbol;
    decimals = event.price.decimals;
    total = (total ?? 0n) + amount;
  }
  return total === null ? null : { raw: total.toString(), decimals, symbol };
}

/**
 * Per-series counts in the window and in the one before it, so a page can
 * say whether a series moved more or less than it used to. Series with no
 * event in either window are left out: a row of zeros against zeros says
 * nothing.
 */
export function seriesPeriodRows(
  events: readonly ActivityEvent[],
  bounds: PeriodBounds | null,
): PeriodRow[] {
  if (!bounds) return [];
  const to = Date.parse(bounds.to);
  const from = Date.parse(bounds.from);
  const previousFrom = Date.parse(bounds.previousFrom);

  const current = new Map<string, ActivityEvent[]>();
  const previous = new Map<string, ActivityEvent[]>();

  for (const event of events) {
    if (!event.seriesSlug) continue;
    const at = Date.parse(event.at);
    if (!Number.isFinite(at)) continue;
    const bucket = at > from && at <= to ? current : at > previousFrom && at <= from ? previous : null;
    if (!bucket) continue;
    bucket.set(event.seriesSlug, [...(bucket.get(event.seriesSlug) ?? []), event]);
  }

  const slugs = [...new Set([...current.keys(), ...previous.keys()])];
  return slugs
    .map(slug => {
      const now = current.get(slug) ?? [];
      const before = previous.get(slug) ?? [];
      return {
        slug,
        events: now.length,
        previousEvents: before.length,
        sales: now.filter(event => event.type === 'sale').length,
        previousSales: before.filter(event => event.type === 'sale').length,
        volume: sumPrices(now.filter(event => event.type === 'sale')),
        previousVolume: sumPrices(before.filter(event => event.type === 'sale')),
      } satisfies PeriodRow;
    })
    .sort((a, b) => b.sales - a.sales || b.events - a.events || a.slug.localeCompare(b.slug));
}

// ---------------------------------------------------------------------------
// What works sold for
// ---------------------------------------------------------------------------

export interface PriceBand {
  /** "0.25 to 0.5 ETH". */
  label: string;
  from: number;
  to: number;
  sales: number;
}

export interface PriceDistribution {
  symbol: string;
  bands: PriceBand[];
  /** Sales counted here: the priced ones, which is not all of them. */
  counted: number;
  /** Sales left out because the transaction carried no value. */
  uncounted: number;
}

const BAND_FORMAT = new Intl.NumberFormat(MONEY_LOCALE, { maximumFractionDigits: 6 });

/** A band width that lands on 1, 2, 2.5 or 5 times a power of ten. */
function niceStep(max: number, bands: number): number {
  const rough = max / Math.max(1, bands);
  if (!Number.isFinite(rough) || rough <= 0) return 1;
  const magnitude = 10 ** Math.floor(Math.log10(rough));
  const normalized = rough / magnitude;
  const step = normalized <= 1 ? 1 : normalized <= 2 ? 2 : normalized <= 2.5 ? 2.5 : normalized <= 5 ? 5 : 10;
  return step * magnitude;
}

/**
 * Prices grouped into bands, so a reader can see what a work of this
 * catalogue usually costs rather than only what the highest one did.
 *
 * Only sales whose price was in the transaction are counted, and the number
 * that were not is returned beside them, because a distribution drawn from
 * half the sales without saying so is a picture of nothing. Two settlement
 * currencies cannot share an axis either, so a mixed set returns null.
 */
export function priceDistribution(
  events: readonly ActivityEvent[],
  { bands = 6, maxBands = 12 }: { bands?: number; maxBands?: number } = {},
): PriceDistribution | null {
  const sales = events.filter(event => event.type === 'sale');
  const priced = sales.filter(event => event.price);
  if (priced.length < 2) return null;

  const symbol = priced[0]?.price?.symbol ?? '';
  if (!priced.every(event => event.price?.symbol === symbol)) return null;

  const values = priced.map(event => chartValue(event.price)).filter(value => Number.isFinite(value));
  const max = Math.max(...values);
  if (!(max > 0)) return null;

  const step = niceStep(max, bands);
  const count = Math.min(maxBands, Math.max(1, Math.ceil(max / step)));

  const rows: PriceBand[] = Array.from({ length: count }, (_, index) => {
    const from = index * step;
    const to = (index + 1) * step;
    return { label: `${BAND_FORMAT.format(from)} to ${BAND_FORMAT.format(to)} ${symbol}`, from, to, sales: 0 };
  });

  for (const value of values) {
    // The top band owns its upper edge, so the highest sale is inside the
    // chart rather than one step past the end of it.
    const index = Math.min(rows.length - 1, Math.floor(value / step));
    const row = rows[index];
    if (row) row.sales += 1;
  }

  return { symbol, bands: rows, counted: priced.length, uncounted: sales.length - priced.length };
}

/** The most recent sale of a series that carried a price in the transaction. */
export function lastPricedSale(events: readonly ActivityEvent[], seriesSlug: string): ActivityEvent | null {
  let best: ActivityEvent | null = null;
  for (const event of events) {
    if (event.seriesSlug !== seriesSlug || event.type !== 'sale' || !event.price) continue;
    if (!best || Date.parse(event.at) > Date.parse(best.at)) best = event;
  }
  return best;
}

// ---------------------------------------------------------------------------
// Series rows
// ---------------------------------------------------------------------------

export interface SeriesRow extends SalesStats {
  title: string;
  href: string | null;
  /** The newest sale that carried a price, when there is one. */
  lastSale: { at: string; price: TokenAmount; txHash: string; chain: Chain } | null;
}

/** Series stats with the catalogue's own titles and links attached, busiest first. */
export function seriesRows(
  stats: readonly SalesStats[],
  titles: ReadonlyMap<string, { title: string; href: string }>,
  events: readonly ActivityEvent[],
): SeriesRow[] {
  return stats
    .map(entry => {
      const known = titles.get(entry.seriesSlug);
      const sale = lastPricedSale(events, entry.seriesSlug);
      return {
        ...entry,
        title: known?.title ?? entry.seriesSlug,
        href: known?.href ?? null,
        lastSale:
          sale && sale.price
            ? { at: sale.at, price: sale.price, txHash: sale.txHash, chain: sale.chain }
            : null,
      } satisfies SeriesRow;
    })
    .sort((a, b) => b.holders - a.holders || b.tokens - a.tokens || a.title.localeCompare(b.title));
}

// ---------------------------------------------------------------------------
// Metrics
// ---------------------------------------------------------------------------

export interface Metric {
  id: string;
  label: string;
  /** The figure, already formatted. Null means the install cannot work it out. */
  value: string | null;
  /** What the figure counts, when the label alone could be read two ways. */
  hint?: string;
  /** Which of the three kinds of number this is, so a page can show only some. */
  sourceId: SourceId;
  /** The printed source line, with the snapshot's date where there is one. */
  source: string;
  /** Why the figure is absent. Printed in place of the value, never as a zero. */
  absent?: string;
}

/**
 * The overview tiles.
 *
 * Counts come from the snapshot and print as they are, zero included: no
 * event is a fact. Money is withheld whenever the snapshot could not total
 * it, because a sale settled in WETH or through a marketplace contract
 * carries no value in the transaction and cannot be counted.
 */
export function overviewMetrics({
  insights,
  catalogue,
  computedAt,
  contracts,
  chains,
}: {
  insights: InsightsSummary | null;
  catalogue: { works: number; series: number; tokensOnChain: number };
  computedAt: string | null;
  contracts: number;
  chains: readonly Chain[];
}): Metric[] {
  const fromCatalogue = sourceLabel('catalogue', computedAt);
  const fromSnapshot = sourceLabel('snapshot', computedAt);
  const derived = sourceLabel('derived', computedAt);

  const highest = insights ? maxTokenAmount(insights.bySeries.map(entry => entry.high)) : null;
  const lowest = insights ? minTokenAmount(insights.bySeries.map(entry => entry.low)) : null;
  const average = insights ? averageTokenAmount(insights.volume, insights.sales) : null;

  const noSnapshot = 'No chain snapshot';
  const noPrice = 'No sale in this snapshot carried a price in the transaction';

  return [
    {
      id: 'works',
      sourceId: 'catalogue',
      label: 'Works in the catalogue',
      value: formatNumber(catalogue.works),
      hint: 'Every work a visitor can open.',
      source: fromCatalogue,
    },
    {
      id: 'series',
      sourceId: 'catalogue',
      label: 'Series',
      value: formatNumber(catalogue.series),
      hint: 'Contracts and bodies of work in the catalogue.',
      source: fromCatalogue,
    },
    {
      id: 'tokens',
      sourceId: 'catalogue',
      label: 'Tokens on chain',
      value: formatNumber(catalogue.tokensOnChain),
      hint: 'What the contracts report between them, which is larger than the catalogue wherever it holds a sample of an edition.',
      source: fromCatalogue,
    },
    {
      id: 'collectors',
      sourceId: 'snapshot',
      label: 'Collectors now',
      value: insights ? formatNumber(insights.collectors) : null,
      hint: 'Wallets holding at least one work when the snapshot was taken.',
      source: fromSnapshot,
      absent: noSnapshot,
    },
    {
      id: 'all-time-collectors',
      sourceId: 'snapshot',
      label: 'All-time collectors',
      value: insights ? formatNumber(insights.allTimeCollectors) : null,
      hint: 'Every wallet that has ever held a work, including those that sold.',
      source: fromSnapshot,
      absent: noSnapshot,
    },
    {
      id: 'held',
      sourceId: 'snapshot',
      label: 'Works with a known holder',
      value: insights ? formatNumber(insights.works) : null,
      hint: 'Tokens the snapshot could match to a wallet.',
      source: fromSnapshot,
      absent: noSnapshot,
    },
    {
      id: 'mints',
      sourceId: 'snapshot',
      label: 'Mints',
      value: insights ? formatNumber(insights.mints) : null,
      hint: 'Tokens created, over the whole history the snapshot reaches.',
      source: fromSnapshot,
      absent: noSnapshot,
    },
    {
      id: 'sales',
      sourceId: 'snapshot',
      label: 'Sales with a public price',
      value: insights ? formatNumber(insights.sales) : null,
      hint: 'Transfers that carried a payment in the chain’s own currency.',
      source: fromSnapshot,
      absent: noSnapshot,
    },
    {
      id: 'transfers',
      sourceId: 'snapshot',
      label: 'Transfers',
      value: insights ? formatNumber(insights.transfers) : null,
      hint: 'Tokens that changed hands with no price visible in the transaction.',
      source: fromSnapshot,
      absent: noSnapshot,
    },
    {
      id: 'volume',
      sourceId: 'derived',
      label: 'Volume, public sales',
      value: formatTokenAmount(insights?.volume),
      hint: 'The sum of the priced sales above, and of nothing else.',
      source: derived,
      absent: insights ? noPrice : noSnapshot,
    },
    {
      id: 'average',
      sourceId: 'derived',
      label: 'Average priced sale',
      value: formatTokenAmount(average),
      hint: 'Volume divided by the number of priced sales.',
      source: derived,
      absent: insights ? noPrice : noSnapshot,
    },
    {
      id: 'highest',
      sourceId: 'derived',
      label: 'Highest priced sale',
      value: formatTokenAmount(highest),
      hint: lowest ? `Lowest recorded: ${formatTokenAmount(lowest)}.` : undefined,
      source: derived,
      absent: insights ? noPrice : noSnapshot,
    },
    {
      id: 'contracts',
      sourceId: 'snapshot',
      label: 'Contracts read',
      value: contracts > 0 ? formatNumber(contracts) : null,
      hint: chains.length ? `On ${chains.join(', ')}.` : undefined,
      source: fromSnapshot,
      absent: noSnapshot,
    },
  ];
}

/**
 * What these pages deliberately do not show, and why.
 *
 * Every line here is a figure a marketplace dashboard would print and this
 * install cannot honestly compute from public chain data alone. Saying so is
 * the point: the alternative is a zero that reads as a fact.
 */
export const NOT_COMPUTED: { label: string; reason: string }[] = [
  {
    label: 'Floor price',
    reason: 'A floor is the lowest open listing, which lives in a marketplace’s order book rather than on the chain.',
  },
  {
    label: 'Market cap',
    reason: 'It is a floor price multiplied by a supply, so without a floor there is no figure to print.',
  },
  {
    label: 'Active listings and offers',
    reason: 'Listings and offers are held off chain by each marketplace until one is filled.',
  },
  {
    label: 'Dollar values',
    reason: 'Converting an amount needs a rate for the day of the sale, and this install stores no price feed it could name.',
  },
  {
    label: 'Average spend per collector',
    reason: 'It would divide a total the sales below cannot complete, because a sale settled in WETH carries no value in the transaction.',
  },
];

// ---------------------------------------------------------------------------
// The activity feed
// ---------------------------------------------------------------------------

export const ACTIVITY_PAGE_SIZE = 50;

export interface ActivityQuery {
  type: ActivityEventType | 'all';
  series: string | null;
  page: number;
}

type RawParams = Record<string, string | string[] | undefined>;

function one(value: string | string[] | undefined): string | null {
  const first = Array.isArray(value) ? value[0] : value;
  return typeof first === 'string' && first.length > 0 ? first : null;
}

/** ?type, ?series and ?page, each read defensively: a URL is a stranger's text. */
export function parseActivityQuery(params: RawParams, knownSeries: readonly string[]): ActivityQuery {
  const type = one(params.type);
  const series = one(params.series);
  const page = Number.parseInt(one(params.page) ?? '1', 10);
  return {
    type: EVENT_TYPES.includes(type as ActivityEventType) ? (type as ActivityEventType) : 'all',
    series: series && knownSeries.includes(series) ? series : null,
    page: Number.isFinite(page) && page > 1 ? Math.min(page, 1000) : 1,
  };
}

/** The URL for one state of the feed. Page 1 and "all" drop out of the query. */
export function activityHref(query: Partial<ActivityQuery>): string {
  const search = new URLSearchParams();
  if (query.type && query.type !== 'all') search.set('type', query.type);
  if (query.series) search.set('series', query.series);
  if (query.page && query.page > 1) search.set('page', String(query.page));
  const text = search.toString();
  return text ? `/insights/activity?${text}` : '/insights/activity';
}

export function filterEvents(events: readonly ActivityEvent[], query: ActivityQuery): ActivityEvent[] {
  return events.filter(event => {
    if (query.type !== 'all' && event.type !== query.type) return false;
    if (query.series && event.seriesSlug !== query.series) return false;
    return true;
  });
}

/** One row of the feed, resolved against the catalogue by the page that renders it. */
export interface ActivityRowData {
  id: string;
  type: ActivityEventType;
  at: string;
  chain: Chain;
  contract: string;
  tokenId: string;
  quantity: number;
  from: string | null;
  to: string | null;
  price: TokenAmount | null;
  txHash: string;
  /** Present only when the token is a work this catalogue carries. */
  work: { title: string; href: string } | null;
  seriesTitle: string | null;
}

/** How many of each kind are in a set of events, for the filter's counts. */
export function eventCounts(events: readonly ActivityEvent[]): Record<ActivityEventType | 'all', number> {
  const counts = { all: events.length, mint: 0, sale: 0, transfer: 0, burn: 0 };
  for (const event of events) counts[event.type] += 1;
  return counts;
}

// ---------------------------------------------------------------------------
// Charts
// ---------------------------------------------------------------------------

/**
 * Chart ink: one accent and two greys.
 *
 * Three greys is what this used to be, and it encoded almost nothing. The
 * third of them measured about 1.35:1 against a white plot area and about
 * 1.9:1 against a dark one, so in both themes the series a reader most
 * needed to pick out was the one closest to the background, and two of the
 * three were hard to tell apart at a value of 1.
 *
 * So: the series the chart is about takes the one accent, which differs from
 * the others by hue as well as by lightness; everything else is grey,
 * because grey here means context. `soft` is kept well above the background
 * in both themes rather than fading into it.
 *
 * The greys are mixes of the one foreground token so they invert with the
 * theme; --chart-1 to --chart-5 are fixed values and the darkest of them
 * disappears on a dark card.
 */
export const CHART_INK = {
  /** The one accent. The series the chart exists to show. */
  accent: 'var(--chart-accent)',
  strong: 'var(--foreground)',
  mid: 'color-mix(in oklab, var(--foreground) 62%, transparent)',
  soft: 'color-mix(in oklab, var(--foreground) 42%, transparent)',
} as const;

/**
 * Two overrides every chart on these pages needs.
 *
 * Recharts 3 draws an axis label inside `.recharts-cartesian-axis-tick-label`
 * and hard-codes `fill="#666"` on it. The shared chart component styles
 * `.recharts-cartesian-axis-tick text`, which that structure no longer
 * matches, so the labels keep a grey that reads on white and disappears on a
 * dark card. The grid line is the same story at the other end: it is left so
 * faint in dark mode that the bars float. Both are pointed at tokens here, so
 * they follow the theme like everything else.
 *
 * The grid rule carries `!` because the rule it replaces is written with an
 * extra attribute selector and would otherwise win on specificity.
 */
export const CHART_CLASS =
  '[&_.recharts-cartesian-axis-tick-value]:fill-muted-foreground [&_.recharts-cartesian-grid_line]:stroke-muted-foreground/25!';

/**
 * The legend's swatches, enlarged.
 *
 * shadcn's ChartLegendContent draws them at 8 px, which is small enough that
 * telling two series apart by colour means leaning in. This is the one place
 * the chart component is adjusted from outside, rather than edited, since
 * src/components/ui is generated.
 */
export const CHART_LEGEND_CLASS = '[&_div.h-2]:size-3.5';

/** How many months a time chart draws before it starts scrolling a table instead. */
export const CHART_MONTHS = 24;
