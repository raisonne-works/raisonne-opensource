import Link from 'next/link';

import { collectorHref, collectorName, nameIsAddress } from '@/components/raisonne/collectors/lib';
import { TierChip } from '@/components/raisonne/collectors/tier-badges';
import { formatCount, formatDate, shortAddress } from '@/components/raisonne/works/lib';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import type { Standing } from '@/lib/guild';
import { cn } from '@/lib/utils';

import { BadgeChips } from './badge-chips';
import { tierHref } from './lib';

/**
 * The ranked holders, as rows.
 *
 * What a row says is exactly what the snapshot holds: how many works the
 * wallet holds, across how many series, and the earliest acquisition the
 * event history could date. There is no value column, because a sale settled
 * in WETH or through a marketplace contract carries no value in the
 * transaction, so this install cannot see most prices and will not print a
 * total it cannot stand behind.
 *
 * The signed-in visitor's own row is marked in place as well as pinned above
 * the table, so finding yourself in the list does not mean counting rows.
 *
 * Narrow screens do not lose columns. Series, the first acquisition and the
 * tier are hidden as columns below the breakpoint where they would not fit,
 * and repeated under the name as a labelled line, because the filter chips
 * directly above this table are about tiers and a phone was showing the
 * filter without the thing it filters on.
 */
export function LeaderboardTable({
  standings,
  ownAddress = null,
  caption,
  linkProfiles = true,
  className,
}: {
  standings: readonly Standing[];
  /** The signed-in wallet, lowercased, when there is one. */
  ownAddress?: string | null;
  /** Read out before the table. */
  caption: string;
  /** Whether this install publishes a page per wallet (settings.publicCollectorProfiles). */
  linkProfiles?: boolean;
  className?: string;
}) {
  // An install with no tiers written down has no tier column, rather than a
  // column of empty cells asking what it is for.
  const showTier = standings.some(standing => standing.tier !== null);

  return (
    <Table className={className}>
      <caption className="sr-only">{caption}</caption>
      <TableHeader>
        <TableRow>
          <TableHead className="w-14 text-right">Rank</TableHead>
          <TableHead>Collector</TableHead>
          <TableHead className="w-20 text-right">Works</TableHead>
          <TableHead className="hidden w-20 text-right md:table-cell">Series</TableHead>
          <TableHead className="hidden w-36 lg:table-cell">First acquisition</TableHead>
          {showTier ? <TableHead className="hidden w-32 sm:table-cell">Tier</TableHead> : null}
        </TableRow>
      </TableHeader>
      <TableBody>
        {standings.map(standing => (
          <Row
            key={standing.address}
            standing={standing}
            isOwn={standing.address === ownAddress}
            showTier={showTier}
            linkProfiles={linkProfiles}
          />
        ))}
      </TableBody>
    </Table>
  );
}

function Row({
  standing,
  isOwn,
  showTier,
  linkProfiles,
}: {
  standing: Standing;
  isOwn: boolean;
  showTier: boolean;
  linkProfiles: boolean;
}) {
  const { row } = standing;
  const name = collectorName(row, { showLabel: standing.namedByArtist });
  const asAddress = nameIsAddress(row, { showLabel: standing.namedByArtist });
  const first = formatDate(row.firstAcquiredAt ?? null);
  const nameClass = cn('truncate font-medium', asAddress && 'font-mono text-[0.8rem]');

  return (
    <TableRow data-own={isOwn || undefined} className={cn(isOwn && 'bg-muted/60')}>
      <TableCell className="text-right font-medium tabular-nums">{formatCount(standing.rank)}</TableCell>

      <TableCell className="max-w-[34ch]">
        <div className="flex flex-col gap-1.5">
          <div className="flex flex-wrap items-center gap-2">
            {linkProfiles ? (
              <Link
                href={collectorHref(standing.address)}
                className={cn(nameClass, 'underline-offset-4 hover:underline focus-visible:underline')}
              >
                {name}
              </Link>
            ) : (
              <span className={nameClass} title={standing.address}>
                {name}
              </span>
            )}
            {isOwn ? (
              <Badge variant="outline" className="shrink-0">
                You
              </Badge>
            ) : null}
          </div>
          {asAddress ? null : (
            <span className="truncate font-mono text-xs text-muted-foreground">{shortAddress(standing.address)}</span>
          )}
          <BadgeChips badges={standing.badges} max={3} />

          {/* The columns this width cannot carry, as labelled pairs. Hidden
              from the moment each one has a column of its own, so nothing is
              ever said twice. */}
          <dl className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground lg:hidden">
            <div className="flex gap-1 md:hidden">
              <dt>Series</dt>
              <dd className="tabular-nums text-foreground">{formatCount(row.seriesCount)}</dd>
            </div>
            <div className="flex gap-1">
              <dt>First</dt>
              <dd className="text-foreground">{first ?? 'Not recorded'}</dd>
            </div>
            {showTier && standing.tier ? (
              <div className="flex gap-1 sm:hidden">
                <dt>Tier</dt>
                <dd className="text-foreground">{standing.tier.name}</dd>
              </div>
            ) : null}
          </dl>
        </div>
      </TableCell>

      <TableCell className="text-right tabular-nums">{formatCount(row.worksOwned)}</TableCell>
      <TableCell className="hidden text-right tabular-nums md:table-cell">{formatCount(row.seriesCount)}</TableCell>
      <TableCell className="hidden whitespace-nowrap lg:table-cell">
        {first ? (
          <time dateTime={row.firstAcquiredAt ?? undefined}>{first}</time>
        ) : (
          <span className="text-muted-foreground">Not recorded</span>
        )}
      </TableCell>
      {showTier ? (
        <TableCell className="hidden sm:table-cell">
          {standing.tier ? (
            <Link
              href={tierHref(standing.tier.id)}
              className="inline-flex rounded-4xl focus-visible:ring-3 focus-visible:ring-ring/50"
            >
              <TierChip tier={standing.tier} />
            </Link>
          ) : null}
        </TableCell>
      ) : null}
    </TableRow>
  );
}
