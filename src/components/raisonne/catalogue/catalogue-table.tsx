import Link from 'next/link';
import { ArrowDownIcon, ArrowUpIcon, ArrowUpRightIcon, ChevronRightIcon } from 'lucide-react';

import { CopyButton } from '@/components/raisonne/shell/copy-button';
import { CHAIN_LABELS, hostOf, shortAddress } from '@/components/raisonne/works/lib';
import { MediaStill } from '@/components/raisonne/works/media-still';
import { Badge } from '@/components/ui/badge';
import { HoverCard, HoverCardContent, HoverCardTrigger } from '@/components/ui/hover-card';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { cn } from '@/lib/utils';

import { catalogueHref, type CatalogueConfig, type CatalogueState, type SortId } from './lib';
import type { CatalogueEntry } from './entry';

/**
 * The catalogue as rows: the facts a researcher wants side by side, each row
 * opening with a thumbnail small enough to scan and large enough to
 * recognise, and the full image one hover away.
 *
 * The columns a reader expects to sort by are sortable, as links, so the
 * order stays in the URL like every other part of the state. A cell with
 * nothing recorded in it is left blank rather than filled with a dash, which
 * reads as unconverted markup rather than as an absence.
 *
 * The contract address copies with one click and links to the explorer of
 * its own chain, never to a hardcoded one, because a catalogue that sends a
 * Tezos contract to Etherscan is worse than no link.
 */
export function CatalogueTable({
  entries,
  showType = false,
  caption,
  state,
  config,
  className,
}: {
  entries: CatalogueEntry[];
  showType?: boolean;
  /** Read out to screen readers before the table. */
  caption: string;
  /** With the state and its list's config, the header cells sort. */
  state?: CatalogueState;
  config?: CatalogueConfig;
  className?: string;
}) {
  const showChain = entries.some(entry => entry.chain);
  const showContract = entries.some(entry => entry.contract);
  const sortable = state && config ? { state, config } : null;

  return (
    <Table className={className}>
      <caption className="sr-only">{caption}</caption>
      <TableHeader>
        <TableRow>
          <TableHead className="w-14">
            <span className="sr-only">Image</span>
          </TableHead>
          <TableHead>
            <SortHead label="Title" ascending="a-z" descending="z-a" sortable={sortable} />
          </TableHead>
          {showType ? <TableHead className="hidden sm:table-cell">Type</TableHead> : null}
          <TableHead className="w-24">
            <SortHead label="Year" ascending="oldest" descending="newest" sortable={sortable} />
          </TableHead>
          <TableHead className="hidden w-[22ch] md:table-cell">Medium</TableHead>
          {showChain ? <TableHead className="hidden w-28 lg:table-cell">Chain</TableHead> : null}
          {showContract ? <TableHead className="hidden w-48 lg:table-cell">Contract</TableHead> : null}
          <TableHead className="w-20 text-right">
            <span className="sr-only">Open</span>
          </TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {entries.map(entry => (
          <TableRow key={entry.key}>
            <TableCell>
              <MediaStill
                media={entry.media}
                alt=""
                sizes="48px"
                fit={entry.fit}
                className="size-10 rounded-md"
              />
            </TableCell>
            <TableCell className="max-w-[36ch] font-medium">
              <RowTitle entry={entry} />
            </TableCell>
            {showType ? (
              <TableCell className="hidden sm:table-cell">
                <Badge variant="outline" className="font-normal">
                  {entry.typeLabel}
                </Badge>
              </TableCell>
            ) : null}
            <TableCell className="font-mono text-xs tabular-nums">{entry.year ?? ''}</TableCell>
            <TableCell className="hidden max-w-[22ch] md:table-cell">
              <span className="block truncate text-muted-foreground" title={mediumLabel(entry)}>
                {mediumLabel(entry)}
              </span>
            </TableCell>
            {showChain ? (
              <TableCell className="hidden lg:table-cell text-muted-foreground">
                {entry.chain ? CHAIN_LABELS[entry.chain] : ''}
              </TableCell>
            ) : null}
            {showContract ? (
              <TableCell className="hidden lg:table-cell">
                {entry.contract ? (
                  <span className="flex items-center gap-1">
                    <span className="font-mono text-xs" title={entry.contract}>
                      {shortAddress(entry.contract)}
                    </span>
                    <CopyButton value={entry.contract} label={`Copy the contract address for ${entry.title}`} />
                    {entry.explorerUrl ? (
                      <a
                        href={entry.explorerUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label={`${entry.title} on ${hostOf(entry.explorerUrl)} (opens in a new tab)`}
                        className="rounded-sm text-muted-foreground outline-none hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50"
                      >
                        <ArrowUpRightIcon aria-hidden className="size-3.5" />
                      </a>
                    ) : null}
                  </span>
                ) : (
                  <span className="text-muted-foreground">Not on chain</span>
                )}
              </TableCell>
            ) : null}
            <TableCell className="text-right">
              <RowOpen entry={entry} />
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

/** The title, with the record's image on hover for anyone scanning the rows. */
function RowTitle({ entry }: { entry: CatalogueEntry }) {
  const href = entry.href ?? entry.externalHref;
  const external = !entry.href && Boolean(entry.externalHref);
  const label = (
    <span className="block truncate" title={entry.fullTitle ?? entry.title}>
      {entry.title}
    </span>
  );

  const link = href ? (
    external ? (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className="block min-w-0 rounded-sm underline-offset-4 outline-none hover:underline focus-visible:ring-3 focus-visible:ring-ring/50"
      >
        {label}
      </a>
    ) : (
      <Link
        href={href}
        className="block min-w-0 rounded-sm underline-offset-4 outline-none hover:underline focus-visible:ring-3 focus-visible:ring-ring/50"
      >
        {label}
      </Link>
    )
  ) : (
    label
  );

  if (!entry.media?.still) return <>{link}</>;

  return (
    <HoverCard>
      <HoverCardTrigger render={<span className="block min-w-0" />}>{link}</HoverCardTrigger>
      <HoverCardContent side="right" align="start" className="w-56">
        <MediaStill media={entry.media} alt="" sizes="224px" fit={entry.fit} />
        {entry.subtitle ? <p className="mt-2 line-clamp-2 text-xs text-muted-foreground">{entry.subtitle}</p> : null}
      </HoverCardContent>
    </HoverCard>
  );
}

/** Kind and medium as one list, with nothing said twice. */
function mediumLabel(entry: CatalogueEntry): string {
  const seen = new Set<string>();
  const parts: string[] = [];
  for (const value of [entry.kind, ...entry.medium]) {
    const name = value?.trim();
    if (!name) continue;
    const key = name.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    parts.push(name);
  }
  return parts.join(', ');
}

/**
 * A sortable column heading. It is a link, like every other control on a
 * list, so the order it sets is in the URL; the arrow says which way the
 * list is running and clicking again turns it round.
 */
function SortHead({
  label,
  ascending,
  descending,
  sortable,
}: {
  label: string;
  /** The sort this column sets first. */
  ascending: SortId;
  descending: SortId;
  sortable: { state: CatalogueState; config: CatalogueConfig } | null;
}) {
  if (!sortable) return <>{label}</>;
  const { state, config } = sortable;
  const isAscending = state.sort === ascending;
  const isDescending = state.sort === descending;
  const next = isAscending ? descending : ascending;

  return (
    <Link
      href={catalogueHref(config, state, { sort: next })}
      scroll={false}
      aria-label={`Sort by ${label.toLowerCase()}`}
      aria-sort={isAscending ? 'ascending' : isDescending ? 'descending' : 'none'}
      className="inline-flex items-center gap-1 rounded-sm underline-offset-4 outline-none hover:text-foreground hover:underline focus-visible:ring-3 focus-visible:ring-ring/50"
    >
      {label}
      {isAscending ? (
        <ArrowUpIcon aria-hidden className="size-3" />
      ) : isDescending ? (
        <ArrowDownIcon aria-hidden className="size-3" />
      ) : null}
    </Link>
  );
}

function RowOpen({ entry }: { entry: CatalogueEntry }) {
  const href = entry.href ?? entry.externalHref;
  if (!href) return <span className="text-xs text-muted-foreground">Listed only</span>;
  const external = !entry.href;
  const className =
    'inline-flex items-center gap-0.5 rounded-sm text-xs underline-offset-4 outline-none hover:underline focus-visible:ring-3 focus-visible:ring-ring/50';

  return external ? (
    <a href={href} target="_blank" rel="noopener noreferrer" className={className}>
      Open
      <ArrowUpRightIcon aria-hidden className="size-3" />
      <span className="sr-only"> {entry.title} (opens in a new tab)</span>
    </a>
  ) : (
    <Link href={href} className={className}>
      Open
      <ChevronRightIcon aria-hidden className="size-3" />
      <span className="sr-only"> {entry.title}</span>
    </Link>
  );
}

export function CatalogueTableSkeleton({ rows = 8, className }: { rows?: number; className?: string }) {
  return (
    <div role="status" className={cn('w-full', className)}>
      <span className="sr-only">Loading the catalogue</span>
      <div aria-hidden className="divide-y divide-border border-y border-border">
        {Array.from({ length: rows }, (_, index) => (
          <div key={index} className="grid grid-cols-[minmax(0,1fr)_5rem_8rem] items-center gap-4 py-3">
            <Skeleton className="h-4 w-3/5" />
            <Skeleton className="h-4 w-10" />
            <Skeleton className="hidden h-4 w-24 md:block" />
          </div>
        ))}
      </div>
    </div>
  );
}
