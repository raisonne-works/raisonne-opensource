import { fillTokens } from '@/lib/records';
import { Skeleton } from '@/components/ui/skeleton';
import type { CatalogueCounts, Stat } from '@/lib/types';
import { cn } from '@/lib/utils';

/**
 * The numbers the catalogue can prove: works, series, shows, years. A stat's
 * value is free text with tokens in it, so "{{artworks}}" is the live count
 * and "7" is simply seven. A token nobody recognises is left as it was
 * written, so a typo shows up here instead of quietly becoming a zero.
 */
export function Stats({
  stats,
  counts,
  className,
}: {
  stats: Stat[];
  counts: CatalogueCounts;
  className?: string;
}) {
  const shown = stats.slice(0, 6);
  if (shown.length === 0) return null;

  return (
    <dl
      data-slot="stats"
      className={cn(
        'grid grid-cols-2 gap-x-6 gap-y-8 sm:grid-cols-3 lg:grid-cols-[repeat(auto-fit,minmax(11rem,1fr))]',
        className,
      )}
    >
      {shown.map((stat, index) => (
        <div key={`${stat.label}-${index}`} className="flex min-w-0 flex-col gap-1">
          <dd className="text-3xl font-semibold tracking-tight tabular-nums sm:text-4xl">
            {fillTokens(stat.value, counts)}
          </dd>
          <dt className="text-sm font-medium">{stat.label}</dt>
          {stat.description ? (
            <p className="text-sm text-pretty text-muted-foreground">{fillTokens(stat.description, counts)}</p>
          ) : null}
        </div>
      ))}
    </dl>
  );
}

export function StatsSkeleton({ items = 4, className }: { items?: number; className?: string }) {
  return (
    <div
      role="status"
      className={cn('grid grid-cols-2 gap-x-6 gap-y-8 sm:grid-cols-3 lg:grid-cols-4', className)}
    >
      <span className="sr-only">Loading the catalogue numbers</span>
      {Array.from({ length: items }, (_, index) => (
        <div key={index} aria-hidden className="flex flex-col gap-2">
          <Skeleton className="h-9 w-20" />
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-4 w-32" />
        </div>
      ))}
    </div>
  );
}
