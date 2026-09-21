import { Landmark } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty';
import { Skeleton } from '@/components/ui/skeleton';
import type { Exhibition, ExhibitionKind } from '@/lib/types';
import { cn } from '@/lib/utils';

import { ExternalLink } from './external-link';
import { EXHIBITION_KIND_LABEL, exhibitionPlace, sortByYearDesc } from './format';
import { EMPTY_BLOCK_CLASS } from '@/components/raisonne/shell/measure';

/**
 * Solo shows carry the filled badge; every other kind is outlined. On paper,
 * where backgrounds do not print, every badge is outlined.
 */
export function ExhibitionKindBadge({ kind, className }: { kind: ExhibitionKind; className?: string }) {
  return (
    <Badge variant={kind === 'solo' ? 'secondary' : 'outline'} className={cn('print:border-border', className)}>
      {EXHIBITION_KIND_LABEL[kind]}
    </Badge>
  );
}

/**
 * One exhibition as a list row: year, title (linked when there is a page for
 * it), venue and place, kind. Grouped lists pass showYear={false} and print
 * the year once per group instead.
 */
export function ExhibitionRow({ exhibition, showYear = true }: { exhibition: Exhibition; showYear?: boolean }) {
  const place = exhibitionPlace(exhibition);
  return (
    <li
      className={cn(
        'grid gap-x-4 gap-y-1.5 py-3 break-inside-avoid',
        showYear
          ? 'grid-cols-[3.5rem_minmax(0,1fr)] sm:grid-cols-[4.5rem_minmax(0,1fr)_auto]'
          : 'grid-cols-[minmax(0,1fr)] sm:grid-cols-[minmax(0,1fr)_auto]',
      )}
    >
      {showYear ? (
        <span className="font-mono text-sm leading-6 text-muted-foreground tabular-nums">{exhibition.year}</span>
      ) : null}
      <div className="min-w-0">
        <p className="leading-6 font-medium text-pretty">
          <ExternalLink href={exhibition.url}>{exhibition.title}</ExternalLink>
        </p>
        {place ? <p className="text-sm text-pretty text-muted-foreground">{place}</p> : null}
      </div>
      <div className={cn('sm:row-start-1 sm:pt-0.5', showYear ? 'col-start-2 sm:col-start-3' : 'sm:col-start-2')}>
        <ExhibitionKindBadge kind={exhibition.kind} />
      </div>
    </li>
  );
}

/** A flat list of exhibitions, newest first. `limit` keeps the first n. */
export function ExhibitionList({
  exhibitions,
  limit,
  className,
}: {
  exhibitions: Exhibition[];
  limit?: number;
  className?: string;
}) {
  if (exhibitions.length === 0) return <ExhibitionListEmpty className={className} />;
  const sorted = sortByYearDesc(exhibitions);
  const rows = limit && limit > 0 ? sorted.slice(0, limit) : sorted;
  return (
    <ol className={cn('divide-y divide-border border-y border-border', className)}>
      {rows.map(exhibition => (
        <ExhibitionRow key={exhibition.id} exhibition={exhibition} />
      ))}
    </ol>
  );
}

export function ExhibitionListEmpty({ className }: { className?: string }) {
  return (
    <Empty className={cn(EMPTY_BLOCK_CLASS, className)}>
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <Landmark />
        </EmptyMedia>
        <EmptyTitle>No exhibitions yet</EmptyTitle>
        <EmptyDescription>Solo and group shows, biennales, festivals and fairs appear here once they are added.</EmptyDescription>
      </EmptyHeader>
    </Empty>
  );
}

export function ExhibitionListSkeleton({ rows = 5, className }: { rows?: number; className?: string }) {
  return (
    <div role="status" className={className}>
      <span className="sr-only">Loading exhibitions</span>
      <div aria-hidden className="divide-y divide-border border-y border-border">
        {Array.from({ length: rows }, (_, index) => (
          <div
            key={index}
            className="grid grid-cols-[3.5rem_minmax(0,1fr)] gap-x-4 py-3 sm:grid-cols-[4.5rem_minmax(0,1fr)_auto]"
          >
            <Skeleton className="mt-1 h-4 w-10" />
            <div className="space-y-2 py-1">
              <Skeleton className="h-4 w-3/5" />
              <Skeleton className="h-3.5 w-2/5" />
            </div>
            <Skeleton className="mt-0.5 hidden h-5 w-14 rounded-4xl sm:block" />
          </div>
        ))}
      </div>
    </div>
  );
}
