import Link from 'next/link';
import type { ReactNode } from 'react';
import { ExternalLinkIcon } from 'lucide-react';

import { CopyButton } from '@/components/raisonne/shell/copy-button';
import { Table, TableBody, TableCell, TableHead, TableRow } from '@/components/ui/table';
import { cn } from '@/lib/utils';

/**
 * The labelled facts a catalogue keeps: a scannable strip for the few a
 * visitor wants first, and a table for the full record.
 *
 * A fact with nothing recorded is left out by the caller, so neither shape
 * ever prints "unknown" in a row of its own. Values that are data (addresses,
 * token ids, dates, numbers) are set in mono, which is the house rule.
 *
 * (The shared FactsTable the plan puts in shell/facts.tsx has not landed; when
 * it does, these two can call it instead of rendering their own markup.)
 */
export interface FactItem {
  label: string;
  value: ReactNode;
  /** Makes the value a link. An http(s) link opens in a new tab. */
  href?: string | null;
  /** Data, not prose: addresses, ids, dates, counts. */
  mono?: boolean;
  /** Adds a copy button after the value. */
  copy?: string | null;
  /** A longer value the row may break across lines (an address, a long id). */
  wrap?: boolean;
}

function isExternal(href: string): boolean {
  return /^https?:\/\//i.test(href);
}

function FactValue({ fact }: { fact: FactItem }) {
  const body = <span className={cn(fact.mono && 'font-mono', fact.wrap && 'break-all')}>{fact.value}</span>;

  if (!fact.href) {
    return fact.copy ? (
      <span className="inline-flex min-w-0 items-start gap-1">
        {body}
        <CopyButton value={fact.copy} label={`Copy the ${fact.label.toLowerCase()}`} />
      </span>
    ) : (
      body
    );
  }

  const external = isExternal(fact.href);
  const link = external ? (
    <a
      href={fact.href}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-1 underline-offset-4 hover:underline"
    >
      {body}
      <ExternalLinkIcon aria-hidden className="size-3.5 shrink-0 text-muted-foreground" />
      <span className="sr-only">(opens in a new tab)</span>
    </a>
  ) : (
    <Link href={fact.href} className="underline-offset-4 hover:underline">
      {body}
    </Link>
  );

  return fact.copy ? (
    <span className="inline-flex min-w-0 items-start gap-1">
      {link}
      <CopyButton value={fact.copy} label={`Copy the ${fact.label.toLowerCase()}`} />
    </span>
  ) : (
    link
  );
}

/** A strip of facts: two columns on phones, a wrapping row from sm. */
export function FactList({ facts, className }: { facts: FactItem[]; className?: string }) {
  if (facts.length === 0) return null;
  return (
    <dl
      data-slot="fact-list"
      className={cn('grid grid-cols-2 gap-x-8 gap-y-4 text-sm sm:flex sm:flex-wrap sm:items-start', className)}
    >
      {facts.map(fact => (
        <div key={fact.label} className="flex min-w-0 flex-col gap-1">
          <dt className="text-xs text-muted-foreground">{fact.label}</dt>
          <dd className="flex min-h-6 min-w-0 items-center">
            <FactValue fact={fact} />
          </dd>
        </div>
      ))}
    </dl>
  );
}

/** The same facts as rows, for a full record. */
export function FactTable({ facts, className }: { facts: FactItem[]; className?: string }) {
  if (facts.length === 0) return null;
  return (
    <Table data-slot="fact-table" className={className}>
      <TableBody>
        {facts.map(fact => (
          <TableRow key={fact.label} className="hover:bg-transparent">
            {/* h-auto py-2: label and value share a baseline. */}
            <TableHead scope="row" className="h-auto w-32 py-2 align-top font-normal text-muted-foreground">
              {fact.label}
            </TableHead>
            <TableCell className="align-top whitespace-normal">
              <FactValue fact={fact} />
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
