import Link from 'next/link';

import { formatCount } from '@/components/raisonne/works/lib';
import { isModuleEnabled, worksLabel } from '@/lib/records';
import { Skeleton } from '@/components/ui/skeleton';
import type { CatalogueCounts, SiteData } from '@/lib/types';
import { cn } from '@/lib/utils';

/**
 * The practice in numbers, each one a way into the catalogue rather than a
 * decoration: 49 exhibitions is a link to the 49 exhibitions.
 *
 * A count of zero is left out, so a new install shows two or three true
 * numbers instead of a row of noughts.
 */

export interface Highlight {
  label: string;
  count: number;
  href: string;
}

/** The highlights this install can honestly show, in a fixed order. */
export function highlightsFor(data: SiteData, counts: CatalogueCounts): Highlight[] {
  return [
    { label: worksLabel(data.settings), count: counts.works, href: '/works' },
    { label: 'Series', count: counts.series, href: '/works' },
    { label: 'Immersive', count: counts.installations, href: '/immersive' },
    { label: 'Exhibitions', count: counts.exhibitions, href: '/exhibitions' },
    { label: 'Solo exhibitions', count: counts.soloExhibitions, href: '/exhibitions' },
    { label: 'Collaborations', count: counts.collaborations, href: '/collaborations' },
    { label: 'Awards', count: counts.awards, href: '/awards' },
    { label: 'Writings', count: isModuleEnabled(data.settings, 'writings') ? data.writings.length : 0, href: '/writings' },
    { label: 'Press', count: counts.press, href: '/press' },
  ].filter(highlight => highlight.count > 0);
}

export function Highlights({ highlights, className }: { highlights: Highlight[]; className?: string }) {
  if (highlights.length === 0) return null;

  return (
    <ul
      data-slot="highlights"
      className={cn('grid grid-cols-2 gap-px overflow-hidden rounded-lg bg-border sm:grid-cols-3 lg:grid-cols-4', className)}
    >
      {highlights.map(highlight => (
        <li key={highlight.label} className="bg-background">
          <Link
            href={highlight.href}
            className="flex h-full flex-col gap-1 p-4 outline-none hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:ring-inset"
          >
            <span className="text-2xl font-semibold tracking-tight tabular-nums">{formatCount(highlight.count)}</span>
            <span className="text-sm text-muted-foreground">{highlight.label}</span>
          </Link>
        </li>
      ))}
    </ul>
  );
}

export function HighlightsSkeleton({ items = 8, className }: { items?: number; className?: string }) {
  return (
    <div role="status" className={cn('grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4', className)}>
      <span className="sr-only">Loading the highlights</span>
      {Array.from({ length: items }, (_, index) => (
        <div key={index} aria-hidden className="flex flex-col gap-2 p-4">
          <Skeleton className="h-7 w-16" />
          <Skeleton className="h-4 w-24" />
        </div>
      ))}
    </div>
  );
}
