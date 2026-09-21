import { Trophy } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty';
import { Skeleton } from '@/components/ui/skeleton';
import type { Award } from '@/lib/types';
import { cn } from '@/lib/utils';

import { ExternalLink } from './external-link';
import { sortByYearDesc } from './format';
import { EMPTY_BLOCK_CLASS } from '@/components/raisonne/shell/measure';

/**
 * One award as a list row: year, title (linked when there is a page for it),
 * the organisation that gave it and the result. Grouped lists pass
 * showYear={false}.
 */
export function AwardRow({ award, showYear = true }: { award: Award; showYear?: boolean }) {
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
        <span className="font-mono text-sm leading-6 text-muted-foreground tabular-nums">{award.year}</span>
      ) : null}
      <div className="min-w-0">
        <p className="leading-6 font-medium text-pretty">
          <ExternalLink href={award.url}>{award.title}</ExternalLink>
        </p>
        {award.organization ? <p className="text-sm text-pretty text-muted-foreground">{award.organization}</p> : null}
      </div>
      {award.result ? (
        <div className={cn('sm:row-start-1 sm:pt-0.5', showYear ? 'col-start-2 sm:col-start-3' : 'sm:col-start-2')}>
          <Badge variant="outline">{award.result}</Badge>
        </div>
      ) : null}
    </li>
  );
}

/** Awards, newest first. */
export function AwardList({ awards, className }: { awards: Award[]; className?: string }) {
  if (awards.length === 0) return <AwardListEmpty className={className} />;
  return (
    <ol className={cn('divide-y divide-border border-y border-border', className)}>
      {sortByYearDesc(awards).map(award => (
        <AwardRow key={award.id} award={award} />
      ))}
    </ol>
  );
}

export function AwardListEmpty({ className }: { className?: string }) {
  return (
    <Empty className={cn(EMPTY_BLOCK_CLASS, className)}>
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <Trophy />
        </EmptyMedia>
        <EmptyTitle>No awards yet</EmptyTitle>
        <EmptyDescription>Prizes, grants and shortlists appear here once they are added.</EmptyDescription>
      </EmptyHeader>
    </Empty>
  );
}

export function AwardListSkeleton({ rows = 3, className }: { rows?: number; className?: string }) {
  return (
    <div role="status" className={className}>
      <span className="sr-only">Loading awards</span>
      <div aria-hidden className="divide-y divide-border border-y border-border">
        {Array.from({ length: rows }, (_, index) => (
          <div
            key={index}
            className="grid grid-cols-[3.5rem_minmax(0,1fr)] gap-x-4 py-3 sm:grid-cols-[4.5rem_minmax(0,1fr)_auto]"
          >
            <Skeleton className="mt-1 h-4 w-10" />
            <div className="space-y-2 py-1">
              <Skeleton className="h-4 w-2/3" />
              <Skeleton className="h-3.5 w-1/3" />
            </div>
            <Skeleton className="mt-0.5 hidden h-5 w-20 rounded-4xl sm:block" />
          </div>
        ))}
      </div>
    </div>
  );
}
