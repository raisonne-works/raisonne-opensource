import type { ReactNode } from 'react';
import { ImagesIcon } from 'lucide-react';

import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty';
import type { Work } from '@/lib/types';
import { cn } from '@/lib/utils';

import { GRID_CLASS, workHref } from './lib';
import { WorkCard, WorkCardSkeleton } from './work-card';
import { EMPTY_BLOCK_CLASS } from '@/components/raisonne/shell/measure';

/**
 * Works in the shared media grid: 2 columns on phones, 3 on tablets,
 * 4 from 1280 px, 5 from 1920 px and 6 from 2560 px.
 */
export function WorkGrid({
  works,
  hrefFor = workHref,
  empty,
  priorityCount = 0,
  itemClassName,
  className,
}: {
  works: Work[];
  hrefFor?: (work: Work) => string;
  /** Replaces the default empty state. */
  empty?: ReactNode;
  /** How many leading cards load eagerly (the ones above the fold). */
  priorityCount?: number;
  /** Per-tile classes, for example to hide the tiles past two full rows. */
  itemClassName?: (index: number) => string | undefined;
  className?: string;
}) {
  if (works.length === 0) {
    return (
      empty ?? (
        <Empty className={EMPTY_BLOCK_CLASS}>
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <ImagesIcon />
            </EmptyMedia>
            <EmptyTitle>No works yet</EmptyTitle>
            <EmptyDescription>Works appear here once their tokens are imported.</EmptyDescription>
          </EmptyHeader>
        </Empty>
      )
    );
  }

  return (
    <ul data-slot="work-grid" className={cn(GRID_CLASS, className)}>
      {works.map((work, index) => (
        <li
          key={work.id}
          data-width={work.media.width ?? undefined}
          data-height={work.media.height ?? undefined}
          className={cn('min-w-0', itemClassName?.(index))}
        >
          <WorkCard work={work} href={hrefFor(work)} priority={index < priorityCount} />
        </li>
      ))}
    </ul>
  );
}

export function WorkGridSkeleton({ count = 12, className }: { count?: number; className?: string }) {
  return (
    <div className={cn(GRID_CLASS, className)} role="status" aria-label="Loading works">
      {Array.from({ length: count }, (_, index) => (
        <WorkCardSkeleton key={index} />
      ))}
    </div>
  );
}
