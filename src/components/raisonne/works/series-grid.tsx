import type { ReactNode } from 'react';
import { LayersIcon } from 'lucide-react';

import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty';
import type { Series } from '@/lib/types';
import { cn } from '@/lib/utils';

import { GRID_CLASS, seriesHref } from './lib';
import { SeriesCard, SeriesCardSkeleton } from './series-card';
import { EMPTY_BLOCK_CLASS } from '@/components/raisonne/shell/measure';

/** Series in the shared media grid (2, 3, 4, 5 then 6 columns as the screen widens). */
export function SeriesGrid({
  series,
  empty,
  priorityCount = 0,
  itemClassName,
  className,
}: {
  series: Series[];
  /** Replaces the default empty state, e.g. with a "clear filters" action. */
  empty?: ReactNode;
  /** How many leading covers load eagerly (the ones above the fold). */
  priorityCount?: number;
  /** Per-tile classes, for example to hide the tiles past two full rows. */
  itemClassName?: (index: number) => string | undefined;
  className?: string;
}) {
  if (series.length === 0) {
    return (
      empty ?? (
        <Empty className={EMPTY_BLOCK_CLASS}>
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <LayersIcon />
            </EmptyMedia>
            <EmptyTitle>No series yet</EmptyTitle>
            <EmptyDescription>Import a wallet to find the contracts behind your work.</EmptyDescription>
          </EmptyHeader>
        </Empty>
      )
    );
  }

  return (
    <ul data-slot="series-grid" className={cn(GRID_CLASS, className)}>
      {series.map((item, index) => (
        <li
          key={item.slug}
          data-width={item.cover?.width ?? undefined}
          data-height={item.cover?.height ?? undefined}
          className={cn('min-w-0', itemClassName?.(index))}
        >
          <SeriesCard series={item} href={seriesHref(item)} priority={index < priorityCount} />
        </li>
      ))}
    </ul>
  );
}

export function SeriesGridSkeleton({ count = 10, className }: { count?: number; className?: string }) {
  return (
    <div className={cn(GRID_CLASS, className)} role="status" aria-label="Loading series">
      {Array.from({ length: count }, (_, index) => (
        <SeriesCardSkeleton key={index} />
      ))}
    </div>
  );
}
