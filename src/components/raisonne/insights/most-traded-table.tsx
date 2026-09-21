import Link from 'next/link';

import { shortTokenId } from '@/components/raisonne/works/lib';
import { Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { formatNumber } from '@/lib/money';

export interface MostTradedRow {
  workId: string;
  tokenId: string;
  events: number;
  sales: number;
  /** Present only when the token is a work this catalogue carries. */
  work: { title: string; href: string } | null;
  seriesTitle: string | null;
  seriesHref: string | null;
}

/**
 * The works that changed hands most often.
 *
 * Ranked by events rather than by price, because events are what a public
 * chain records for every token, and a ranking by value would silently drop
 * every sale that settled where this install cannot see it.
 */
export function MostTradedTable({ rows, caption }: { rows: MostTradedRow[]; caption?: string }) {
  if (rows.length === 0) return null;

  return (
    <Table>
      {caption ? <TableCaption className="text-left">{caption}</TableCaption> : null}
      <TableHeader>
        <TableRow>
          <TableHead scope="col" className="w-10 text-right">
            #
          </TableHead>
          <TableHead scope="col">Work</TableHead>
          <TableHead scope="col">Series</TableHead>
          <TableHead scope="col" className="text-right">
            Events
          </TableHead>
          <TableHead scope="col" className="text-right">
            Priced sales
          </TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((row, index) => (
          <TableRow key={row.workId}>
            <TableCell className="py-2 text-right tabular-nums text-muted-foreground">{index + 1}</TableCell>
            <TableHead scope="row" className="h-auto max-w-64 py-2 font-normal text-pretty whitespace-normal">
              {row.work ? (
                <Link
                  href={row.work.href}
                  className="rounded-sm underline-offset-4 outline-none hover:underline focus-visible:ring-3 focus-visible:ring-ring/50"
                >
                  {row.work.title}
                </Link>
              ) : (
                <span>
                  Token <span className="font-mono text-xs">{shortTokenId(row.tokenId)}</span>
                  <span className="block text-xs text-muted-foreground">Not in this catalogue</span>
                </span>
              )}
            </TableHead>
            <TableCell className="py-2 text-muted-foreground">
              {row.seriesTitle ? (
                row.seriesHref ? (
                  <Link
                    href={row.seriesHref}
                    className="rounded-sm underline-offset-4 outline-none hover:underline focus-visible:ring-3 focus-visible:ring-ring/50"
                  >
                    {row.seriesTitle}
                  </Link>
                ) : (
                  row.seriesTitle
                )
              ) : (
                <span className="text-xs">Unmatched contract</span>
              )}
            </TableCell>
            <TableCell className="py-2 text-right font-medium tabular-nums">{formatNumber(row.events)}</TableCell>
            <TableCell className="py-2 text-right tabular-nums">{formatNumber(row.sales)}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
