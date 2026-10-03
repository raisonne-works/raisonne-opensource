import Link from 'next/link';
import { UsersIcon } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import type { Series } from '@/lib/types';
import { cn } from '@/lib/utils';

import { CHAIN_LABELS, GRID_SIZES, SERIES_KIND_LABELS, plural, seriesTitle } from './lib';
import { MediaStill } from './media-still';

/**
 * A series in the grid: its cover fills a square frame, the caption gives
 * the facts a collector scans for (year, chain, size) and flags the
 * exceptions: one of ones, platform tokens and co-authored contracts.
 */
export function SeriesCard({
  series,
  href,
  sizes = GRID_SIZES,
  priority = false,
  className,
}: {
  series: Series;
  href: string;
  sizes?: string;
  priority?: boolean;
  className?: string;
}) {
  const facts = [
    series.year !== null ? String(series.year) : null,
    CHAIN_LABELS[series.chain],
    series.kind === 'one-of-one' ? null : plural(series.workCount, 'work'),
  ].filter(Boolean);

  return (
    <Link
      href={href}
      className={cn(
        'group/series-card flex min-w-0 flex-col gap-2.5 rounded-lg outline-none focus-visible:ring-3 focus-visible:ring-ring/50',
        className,
      )}
    >
      <MediaStill
        media={series.cover}
        alt=""
        sizes={sizes}
        priority={priority}
        fit="cover"
        className="transition-opacity group-hover/series-card:opacity-90"
      />
      <div data-slot="series-card-caption" className="flex min-w-0 flex-col gap-1">
        <span
          data-slot="series-card-title"
          className="line-clamp-2 text-sm font-medium underline-offset-4 group-hover/series-card:underline"
          title={series.name}
        >
          {seriesTitle(series)}
        </span>
        <span data-slot="series-card-meta" className="truncate text-xs text-muted-foreground">{facts.join(' · ')}</span>
        {series.kind !== 'series' || series.coAuthored ? (
          <span data-slot="series-card-badges" className="flex flex-wrap gap-1 pt-0.5">
            {series.kind !== 'series' ? (
              <Badge variant="outline" className="font-normal">
                {SERIES_KIND_LABELS[series.kind]}
              </Badge>
            ) : null}
            {series.coAuthored ? (
              <Badge>
                <UsersIcon aria-hidden data-icon="inline-start" />
                Co-authored
              </Badge>
            ) : null}
          </span>
        ) : null}
      </div>
    </Link>
  );
}

export function SeriesCardSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn('flex flex-col gap-2.5', className)} aria-hidden>
      <Skeleton className="aspect-square w-full rounded-lg" />
      <div className="flex flex-col gap-1.5">
        <Skeleton className="h-4 w-2/3" />
        <Skeleton className="h-3 w-1/2" />
      </div>
    </div>
  );
}
