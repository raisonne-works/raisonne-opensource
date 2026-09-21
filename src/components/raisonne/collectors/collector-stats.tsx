import type { ReactNode } from 'react';

import { formatCount, formatDate } from '@/components/raisonne/works/lib';
import { Card, CardContent } from '@/components/ui/card';
import { formatTokenAmount } from '@/lib/money';
import type { CollectorStats } from '@/lib/types';
import { cn } from '@/lib/utils';

import type { PricedTotals } from '@/lib/collectors';

/**
 * The numbers at the top of a collector page.
 *
 * Counts are exact, because they are counted from tokens the install can
 * see. Money is not: there is no price oracle and no marketplace here, so a
 * holding has no market value at all, and a total appears only over the
 * events that actually carried a price, with the ones that did not carried
 * counted beside it. A tile with nothing true to print says "Not recorded"
 * rather than nought.
 */

export interface StatTile {
  label: string;
  value: ReactNode;
  /** One short line under the value: a date, a caveat, a count. */
  hint?: ReactNode;
}

export function StatGrid({ tiles, className }: { tiles: StatTile[]; className?: string }) {
  if (tiles.length === 0) return null;

  return (
    <dl
      className={cn(
        'grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6',
        tiles.length <= 4 && 'xl:grid-cols-4',
        className,
      )}
    >
      {tiles.map(tile => (
        <Card key={tile.label} size="sm" className="gap-1">
          <CardContent className="flex flex-col gap-1">
            <dt className="text-xs font-medium text-muted-foreground">{tile.label}</dt>
            <dd className="flex flex-col gap-0.5">
              <span className="text-2xl font-semibold tracking-tight tabular-nums">{tile.value}</span>
              {tile.hint ? <span className="text-xs text-muted-foreground">{tile.hint}</span> : null}
            </dd>
          </CardContent>
        </Card>
      ))}
    </dl>
  );
}

const NOT_RECORDED = <span className="text-xl font-normal text-muted-foreground">Not recorded</span>;

/**
 * One sentence for one condition, used everywhere that condition comes up.
 *
 * Three tiles used to give three different explanations of the same gap
 * ("Needs a chain snapshot", "Outside the snapshot's reach", "No priced
 * acquisitions in the snapshot"), and the first of them was simply wrong on
 * an install that does have a snapshot. A reader comparing two tiles should
 * be comparing the facts, not the wording.
 */
const NO_SNAPSHOT = 'Needs a chain snapshot';
const NOT_IN_SNAPSHOT = 'Not in this snapshot';

/** The standard set of tiles for a collector, on their own page and on a public one. */
export function CollectorStatTiles({
  stats,
  totals,
  holders,
  hasSnapshot = true,
  className,
}: {
  stats: CollectorStats;
  totals: PricedTotals;
  /** How many wallets the leaderboard holds, so a rank reads as "4 of 212". */
  holders?: number;
  /**
   * Whether this install has any chain data at all. It decides between two
   * facts a single tile used to mix up: "this install cannot see" and "this
   * install can see, and this wallet is not in it".
   */
  hasSnapshot?: boolean;
  className?: string;
}) {
  // A wallet holding nothing has no six facts to tile. Six cards reading 0,
  // 0 and four "Not recorded" say less than the one empty state the page
  // already renders under them, and they say it four different ways.
  if (stats.worksOwned === 0) return null;

  const first = formatDate(stats.firstAcquiredAt);
  const last = formatDate(stats.lastAcquiredAt);
  const spend = formatTokenAmount(totals.spend);
  const extraEditions = stats.editionsOwned - stats.worksOwned;

  const tiles: StatTile[] = [
    {
      label: 'Works held',
      value: formatCount(stats.worksOwned),
      hint: extraEditions > 0 ? `${formatCount(stats.editionsOwned)} editions in all` : undefined,
    },
    { label: 'Series', value: formatCount(stats.seriesCount) },
    {
      label: 'Rank',
      value: stats.rank ? `#${formatCount(stats.rank)}` : NOT_RECORDED,
      // Three different facts, and the tile has to say which one it is. An
      // install with no snapshot cannot rank anybody; an install with one
      // that has not ranked this wallet is a different thing entirely, and
      // telling a collector the data is missing when it is not sends them
      // looking for a problem nobody has.
      hint: stats.rank ? (holders ? `of ${formatCount(holders)} collectors` : undefined) : hasSnapshot ? 'Not on the leaderboard' : NO_SNAPSHOT,
    },
    {
      label: 'First acquired',
      value: first ? <span className="text-xl">{first}</span> : NOT_RECORDED,
      hint: first ? undefined : hasSnapshot ? NOT_IN_SNAPSHOT : NO_SNAPSHOT,
    },
    {
      label: 'Last acquired',
      value: last ? <span className="text-xl">{last}</span> : NOT_RECORDED,
      hint: last ? undefined : hasSnapshot ? NOT_IN_SNAPSHOT : NO_SNAPSHOT,
    },
    {
      label: 'Paid on-chain',
      value: spend ? <span className="text-xl">{spend}</span> : NOT_RECORDED,
      hint: spendHint(totals),
    },
  ];

  return <StatGrid tiles={tiles} className={className} />;
}

/**
 * What the money tile has to admit. A price is only in the snapshot when the
 * transaction itself carried the value, so anything settled in WETH or
 * through a marketplace contract is missing from the total, and the page
 * says how many events that is.
 */
function spendHint(totals: PricedTotals): string {
  if (!totals.spend) {
    return totals.unpricedIn > 0 ? `${formatCount(totals.unpricedIn)} acquisitions carry no price on-chain` : NOT_IN_SNAPSHOT;
  }
  // "over 1 acquisition" reads as "more than one". The total is across the
  // acquisitions, not above them.
  const priced = `from ${formatCount(totals.acquisitions)} ${totals.acquisitions === 1 ? 'acquisition' : 'acquisitions'}`;
  return totals.unpricedIn > 0 ? `${priced}, ${formatCount(totals.unpricedIn)} not priced` : priced;
}
