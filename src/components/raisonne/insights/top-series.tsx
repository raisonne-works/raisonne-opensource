import Link from 'next/link';
import { MinusIcon, TrendingDownIcon, TrendingUpIcon } from 'lucide-react';

import { formatDate } from '@/components/raisonne/works/lib';
import { Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { formatChange, formatNumber, formatTokenAmount } from '@/lib/money';

import { chartValue, type PeriodBounds, type PeriodRow } from './lib';

export interface TopSeriesRow extends PeriodRow {
  title: string;
  href: string | null;
}

/**
 * The series that moved, this period against the one before it.
 *
 * Both windows are measured back from the snapshot's own date, not from
 * today, so the comparison does not quietly shrink as a snapshot ages. A
 * series with nothing to compare against says so instead of showing a rise
 * of a hundred per cent from zero, which is not a percentage.
 */
export function TopSeries({ rows, bounds }: { rows: TopSeriesRow[]; bounds: PeriodBounds }) {
  if (rows.length === 0) return null;

  return (
    <Table>
      <TableCaption className="text-left">
        The {bounds.days} days to {formatDate(bounds.to)}, against the {bounds.days} before them.
      </TableCaption>
      <TableHeader>
        <TableRow>
          <TableHead scope="col">Series</TableHead>
          <TableHead scope="col" className="text-right">
            Events
          </TableHead>
          <TableHead scope="col" className="text-right">
            Sales
          </TableHead>
          <TableHead scope="col" className="text-right">
            Sales, change
          </TableHead>
          <TableHead scope="col" className="text-right">
            Volume
          </TableHead>
          <TableHead scope="col" className="text-right">
            Volume, change
          </TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map(row => (
          <TableRow key={row.slug}>
            <TableHead scope="row" className="h-auto max-w-56 py-2 font-normal text-pretty whitespace-normal">
              {row.href ? (
                <Link
                  href={row.href}
                  className="rounded-sm underline-offset-4 outline-none hover:underline focus-visible:ring-3 focus-visible:ring-ring/50"
                >
                  {row.title}
                </Link>
              ) : (
                row.title
              )}
            </TableHead>
            <TableCell className="py-2 text-right tabular-nums">{formatNumber(row.events)}</TableCell>
            <TableCell className="py-2 text-right tabular-nums">{formatNumber(row.sales)}</TableCell>
            <TableCell className="py-2 text-right">
              <Change current={row.sales} previous={row.previousSales} />
            </TableCell>
            <TableCell className="py-2 text-right font-medium tabular-nums">
              {formatTokenAmount(row.volume) ?? <span className="text-xs font-normal text-muted-foreground">Not recorded</span>}
            </TableCell>
            <TableCell className="py-2 text-right">
              {/* Both windows have to carry a total before a movement between
                  them means anything. A period whose sales all settled off
                  chain has no volume, and calling that a fall of a hundred
                  per cent would be a claim the snapshot cannot support. */}
              {row.volume && row.previousVolume ? (
                <Change current={chartValue(row.volume)} previous={chartValue(row.previousVolume)} />
              ) : (
                <span className="text-xs text-muted-foreground">Nothing to compare</span>
              )}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

/**
 * A movement against the last period. Direction is carried by an icon and by
 * the sign in the text, never by colour alone.
 */
function Change({ current, previous }: { current: number; previous: number }) {
  const change = formatChange(current, previous);

  if (!change) {
    return (
      <span className="text-xs text-muted-foreground">{previous === 0 && current > 0 ? 'First in this period' : 'Nothing to compare'}</span>
    );
  }

  const Icon = change.direction === 'up' ? TrendingUpIcon : change.direction === 'down' ? TrendingDownIcon : MinusIcon;

  return (
    <span className="inline-flex items-center justify-end gap-1 text-sm tabular-nums">
      <Icon aria-hidden className="size-3.5 shrink-0 text-muted-foreground" />
      {change.label}
    </span>
  );
}
