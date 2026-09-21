import Link from 'next/link';
import { ArrowUpRightIcon } from 'lucide-react';

import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableRow } from '@/components/ui/table';
import type { Fact } from '@/lib/types';
import { cn } from '@/lib/utils';

/**
 * The labelled record table every page shares: a show's curator and dates, a
 * work's contract, an award's category. One row per fact, the label as a row
 * header so a screen reader reads "Curator, A. Placeholder" rather than two
 * loose strings.
 *
 * A fact with an href becomes a link: a path stays inside the site, an
 * absolute URL opens in a new tab and says so. Facts with nothing recorded
 * are the caller's job to leave out, because a catalogue lists what it knows
 * rather than printing "unknown".
 */
export function FactsTable({ facts, className }: { facts: Fact[]; className?: string }) {
  if (facts.length === 0) return null;

  return (
    <Table className={className}>
      <TableBody>
        {facts.map(fact => (
          <TableRow key={fact.label} className="hover:bg-transparent">
            {/* h-auto py-2 keeps the label on the same baseline as its value. */}
            <TableHead scope="row" className="h-auto w-32 py-2 align-top font-normal text-muted-foreground">
              {fact.label}
            </TableHead>
            <TableCell className="align-top text-pretty whitespace-normal">
              <FactValue fact={fact} />
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

function FactValue({ fact }: { fact: Fact }) {
  const href = fact.href ?? null;
  if (!href) return <>{fact.value}</>;

  const external = /^https?:\/\//i.test(href);
  if (!external) {
    return (
      <Link href={href} className="rounded-sm underline-offset-4 outline-none hover:underline focus-visible:ring-3 focus-visible:ring-ring/50">
        {fact.value}
      </Link>
    );
  }

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="rounded-sm underline-offset-4 outline-none hover:underline focus-visible:ring-3 focus-visible:ring-ring/50"
    >
      {fact.value}
      <ArrowUpRightIcon aria-hidden className="ml-0.5 inline size-3.5 -translate-y-px text-muted-foreground" />
      <span className="sr-only"> (opens in a new tab)</span>
    </a>
  );
}

export function FactsTableSkeleton({ rows = 5, className }: { rows?: number; className?: string }) {
  return (
    <div className={cn('flex flex-col gap-3', className)} role="status" aria-label="Loading the record">
      {Array.from({ length: rows }, (_, index) => (
        <div key={index} className="flex items-center gap-4">
          <Skeleton className="h-4 w-24 shrink-0" />
          <Skeleton className="h-4 w-full" />
        </div>
      ))}
    </div>
  );
}
