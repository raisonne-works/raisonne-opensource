import Link from 'next/link';

import { formatDate } from '@/components/raisonne/works/lib';
import { Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { formatNumber, formatTokenAmount } from '@/lib/money';

import type { SeriesRow } from './lib';

/**
 * Every series the snapshot saw, with what it can honestly say about each:
 * how many wallets hold it, how many tokens it reached, what happened to
 * them, and the prices that were visible in the transactions.
 *
 * A blank cell is deliberate. A series whose sales all settled off chain has
 * no volume, no low and no high, and printing a zero there would claim it
 * never sold.
 */
export function SeriesTable({ rows, caption }: { rows: SeriesRow[]; caption?: string }) {
  if (rows.length === 0) return null;

  return (
    <Table>
      {caption ? <TableCaption className="text-left">{caption}</TableCaption> : null}
      <TableHeader>
        <TableRow>
          <TableHead scope="col">Series</TableHead>
          <TableHead scope="col" className="text-right">
            Holders
          </TableHead>
          <TableHead scope="col" className="text-right">
            Tokens
          </TableHead>
          <TableHead scope="col" className="text-right">
            Mints
          </TableHead>
          <TableHead scope="col" className="text-right">
            Sales
          </TableHead>
          <TableHead scope="col" className="text-right">
            Transfers
          </TableHead>
          <TableHead scope="col" className="text-right">
            Volume
          </TableHead>
          <TableHead scope="col" className="text-right">
            Low
          </TableHead>
          <TableHead scope="col" className="text-right">
            High
          </TableHead>
          <TableHead scope="col" className="text-right">
            Last recorded sale
          </TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map(row => (
          <TableRow key={row.seriesSlug}>
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
            <TableCell className="py-2 text-right tabular-nums">{formatNumber(row.holders)}</TableCell>
            <TableCell className="py-2 text-right tabular-nums">{formatNumber(row.tokens)}</TableCell>
            <TableCell className="py-2 text-right tabular-nums">{formatNumber(row.mints)}</TableCell>
            <TableCell className="py-2 text-right tabular-nums">{formatNumber(row.sales)}</TableCell>
            <TableCell className="py-2 text-right tabular-nums">{formatNumber(row.transfers)}</TableCell>
            <TableCell className="py-2 text-right font-medium tabular-nums">
              {formatTokenAmount(row.volume) ?? <Absent />}
            </TableCell>
            <TableCell className="py-2 text-right tabular-nums">{formatTokenAmount(row.low) ?? <Absent />}</TableCell>
            <TableCell className="py-2 text-right tabular-nums">{formatTokenAmount(row.high) ?? <Absent />}</TableCell>
            <TableCell className="py-2 text-right whitespace-nowrap tabular-nums">
              {row.lastSale ? (
                <>
                  <span className="font-medium">{formatTokenAmount(row.lastSale.price)}</span>
                  <span className="block text-xs text-muted-foreground">{formatDate(row.lastSale.at)}</span>
                </>
              ) : (
                <Absent />
              )}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

/** A figure the snapshot does not carry. Never a zero, and never a bare dash. */
function Absent() {
  return <span className="text-xs text-muted-foreground">Not recorded</span>;
}
