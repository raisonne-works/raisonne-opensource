import { Newspaper } from 'lucide-react';

import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty';
import { Skeleton } from '@/components/ui/skeleton';
import type { PressItem } from '@/lib/types';
import { cn } from '@/lib/utils';

import { ExternalLink } from './external-link';
import { formatPressDate, sortPress } from './format';
import { EMPTY_BLOCK_CLASS } from '@/components/raisonne/shell/measure';

/**
 * One article as a list row: headline (linked to the article), outlet, and
 * the date as data on the right. Grouped lists pass withYear={false} so the
 * date reads "18 Apr" under a year heading.
 */
export function PressRow({ item, withYear = true }: { item: PressItem; withYear?: boolean }) {
  const date = formatPressDate(item, { withYear });
  return (
    <li className="grid grid-cols-[minmax(0,1fr)_auto] gap-x-4 py-3 break-inside-avoid">
      <div className="min-w-0">
        <p className="leading-6 font-medium text-pretty">
          <ExternalLink href={item.url}>{item.title}</ExternalLink>
        </p>
        <p className="text-sm text-muted-foreground">{item.outlet}</p>
      </div>
      {date ? (
        <time
          dateTime={date.dateTime}
          className="font-mono text-sm leading-6 whitespace-nowrap text-muted-foreground tabular-nums"
        >
          {date.label}
        </time>
      ) : (
        <span aria-hidden />
      )}
    </li>
  );
}

/** Press, newest first. `limit` keeps the first n. */
export function PressList({ press, limit, className }: { press: PressItem[]; limit?: number; className?: string }) {
  if (press.length === 0) return <PressListEmpty className={className} />;
  const sorted = sortPress(press);
  const rows = limit && limit > 0 ? sorted.slice(0, limit) : sorted;
  return (
    <ol className={cn('divide-y divide-border border-y border-border', className)}>
      {rows.map(item => (
        <PressRow key={item.id} item={item} />
      ))}
    </ol>
  );
}

export function PressListEmpty({ className }: { className?: string }) {
  return (
    <Empty className={cn(EMPTY_BLOCK_CLASS, className)}>
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <Newspaper />
        </EmptyMedia>
        <EmptyTitle>No press yet</EmptyTitle>
        <EmptyDescription>Reviews, interviews and features appear here once they are added.</EmptyDescription>
      </EmptyHeader>
    </Empty>
  );
}

export function PressListSkeleton({ rows = 4, className }: { rows?: number; className?: string }) {
  return (
    <div role="status" className={className}>
      <span className="sr-only">Loading press</span>
      <div aria-hidden className="divide-y divide-border border-y border-border">
        {Array.from({ length: rows }, (_, index) => (
          <div key={index} className="grid grid-cols-[minmax(0,1fr)_auto] gap-x-4 py-3">
            <div className="space-y-2 py-1">
              <Skeleton className="h-4 w-4/5" />
              <Skeleton className="h-3.5 w-1/4" />
            </div>
            <Skeleton className="mt-1 h-4 w-20" />
          </div>
        ))}
      </div>
    </div>
  );
}
