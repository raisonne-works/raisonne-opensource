import { type HeadingLevel } from '@/components/raisonne/shell/heading';
import { Skeleton } from '@/components/ui/skeleton';
import type { Artist } from '@/lib/types';
import { cn } from '@/lib/utils';

import { iconByName } from './artist-links';

type ResearchArea = NonNullable<Artist['researchAreas']>[number];

/**
 * What the practice is actually asking, in the artist's own words: three or
 * four lines of enquiry, each with a name.
 *
 * Plain rows rather than cards, because the About page is already a page of
 * text and a grid of boxes would make it look like a product.
 */
export function ResearchAreas({
  areas,
  headingLevel = 3,
  className,
}: {
  areas: ResearchArea[];
  headingLevel?: HeadingLevel;
  className?: string;
}) {
  const Heading = `h${headingLevel}` as const;
  if (areas.length === 0) return null;

  return (
    <ul data-slot="research-areas" className={cn('grid gap-8 sm:grid-cols-2 lg:grid-cols-3', className)}>
      {areas.map((area, index) => {
        const Icon = iconByName(area.icon);
        return (
          <li key={`${area.title}-${index}`} className="flex flex-col gap-2">
            <Icon aria-hidden className="size-5 text-muted-foreground" />
            <Heading className="text-base font-medium">{area.title}</Heading>
            {area.description ? (
              <p className="text-sm text-pretty text-muted-foreground">{area.description}</p>
            ) : null}
          </li>
        );
      })}
    </ul>
  );
}

export function ResearchAreasSkeleton({ items = 3, className }: { items?: number; className?: string }) {
  return (
    <div role="status" className={cn('grid gap-8 sm:grid-cols-2 lg:grid-cols-3', className)}>
      <span className="sr-only">Loading the areas of research</span>
      {Array.from({ length: items }, (_, index) => (
        <div key={index} aria-hidden className="flex flex-col gap-2">
          <Skeleton className="size-5 rounded-md" />
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-4 w-full" />
        </div>
      ))}
    </div>
  );
}
